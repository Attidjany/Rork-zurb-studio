import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, MapPin, Trash2 } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { calculatePolygonArea, getPolygonCenter } from '@/utils/geometry';

type Site = {
  id: string;
  project_id: string;
  name: string;
  area_ha: number | null;
  created_at: string;
  updated_at: string;
};

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const projectQuery = trpc.projects.get.useQuery({ projectId: id as string }, { enabled: !!id });
  const sitesQuery = trpc.sites.list.useQuery({ projectId: id as string }, { enabled: !!id });
  const createSiteMutation = trpc.sites.create.useMutation({
    onSuccess: () => {
      console.log('[Site] Site created successfully');
      sitesQuery.refetch();
      resetForm();
    },
    onError: (error) => {
      console.error('[Site] Error creating site:', error);
    },
  });
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [siteName, setSiteName] = useState<string>('');
  const [usePolygon, setUsePolygon] = useState<boolean>(false);
  const [polygonCoords, setPolygonCoords] = useState<{ latitude: string; longitude: string }[]>([{ latitude: '14.6937', longitude: '-17.4441' }]);
  const [siteArea, setSiteArea] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('14.6937');
  const [longitude, setLongitude] = useState<string>('-17.4441');

  const handleCreateSite = () => {
    if (!siteName.trim() || !id) return;

    console.log('[Site] Creating site:', siteName);

    if (usePolygon) {
      const coords = polygonCoords
        .map(c => ({
          latitude: parseFloat(c.latitude),
          longitude: parseFloat(c.longitude),
        }))
        .filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));

      if (coords.length >= 3) {
        const area = calculatePolygonArea(coords);
        const center = getPolygonCenter(coords);
        createSiteMutation.mutate({
          projectId: id,
          name: siteName.trim(),
          areaHa: area,
          latitude: center.latitude,
          longitude: center.longitude,
          polygon: coords,
        });
      }
    } else {
      if (siteArea.trim()) {
        const area = parseFloat(siteArea);
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (!isNaN(area) && !isNaN(lat) && !isNaN(lng)) {
          createSiteMutation.mutate({
            projectId: id,
            name: siteName.trim(),
            areaHa: area,
            latitude: lat,
            longitude: lng,
          });
        }
      }
    }
  };

  const resetForm = () => {
    setSiteName('');
    setSiteArea('');
    setLatitude('14.6937');
    setLongitude('-17.4441');
    setUsePolygon(false);
    setPolygonCoords([{ latitude: '14.6937', longitude: '-17.4441' }]);
    setModalVisible(false);
  };

  const addPolygonPoint = () => {
    setPolygonCoords([...polygonCoords, { latitude: '', longitude: '' }]);
  };

  const removePolygonPoint = (index: number) => {
    if (polygonCoords.length > 1) {
      setPolygonCoords(polygonCoords.filter((_, i) => i !== index));
    }
  };

  const updatePolygonPoint = (index: number, field: 'latitude' | 'longitude', value: string) => {
    const updated = [...polygonCoords];
    updated[index][field] = value;
    setPolygonCoords(updated);
  };

  const calculatedArea = useMemo(() => {
    if (!usePolygon) return null;
    const coords = polygonCoords
      .map(c => ({
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
      }))
      .filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));
    
    if (coords.length >= 3) {
      return calculatePolygonArea(coords).toFixed(2);
    }
    return null;
  }, [usePolygon, polygonCoords]);

  const renderSite = ({ item }: { item: Site }) => (
    <TouchableOpacity
      style={styles.siteCard}
      onPress={() => {
        router.push({ pathname: '/site/[id]', params: { id: item.id } } as any);
      }}
      testID={`site-${item.id}`}
    >
      <View style={styles.siteHeader}>
        <MapPin size={20} color="#007AFF" />
        <Text style={styles.siteName}>{item.name}</Text>
      </View>
      {item.area_ha && (
        <Text style={styles.siteArea}>{item.area_ha.toFixed(2)} ha</Text>
      )}
    </TouchableOpacity>
  );

  if (projectQuery.isLoading || sitesQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!projectQuery.data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  const project = projectQuery.data;
  const sites = sitesQuery.data || [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: project.name,
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {project.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{project.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sites</Text>

          {sites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sites yet. Create your first site.</Text>
            </View>
          ) : (
            <FlatList
              data={sites}
              renderItem={renderSite}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.sitesList}
            />
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        testID="create-site-button"
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Site</Text>

            <TextInput
              style={styles.input}
              placeholder="Site Name"
              value={siteName}
              onChangeText={setSiteName}
              testID="site-name-input"
            />

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, !usePolygon && styles.toggleButtonActive]}
                onPress={() => setUsePolygon(false)}
              >
                <Text style={[styles.toggleButtonText, !usePolygon && styles.toggleButtonTextActive]}>Single Point</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, usePolygon && styles.toggleButtonActive]}
                onPress={() => setUsePolygon(true)}
              >
                <Text style={[styles.toggleButtonText, usePolygon && styles.toggleButtonTextActive]}>Polygon</Text>
              </TouchableOpacity>
            </View>

            {!usePolygon ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Area (hectares)"
                  value={siteArea}
                  onChangeText={setSiteArea}
                  keyboardType="decimal-pad"
                  testID="site-area-input"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Latitude"
                  value={latitude}
                  onChangeText={setLatitude}
                  keyboardType="decimal-pad"
                  testID="latitude-input"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Longitude"
                  value={longitude}
                  onChangeText={setLongitude}
                  keyboardType="decimal-pad"
                  testID="longitude-input"
                />
              </>
            ) : (
              <ScrollView style={styles.polygonContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.polygonLabel}>Coordinates (min 3 points)</Text>
                {polygonCoords.map((coord, index) => (
                  <View key={index} style={styles.coordRow}>
                    <TextInput
                      style={[styles.input, styles.coordInput]}
                      placeholder="Latitude"
                      value={coord.latitude}
                      onChangeText={(val) => updatePolygonPoint(index, 'latitude', val)}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[styles.input, styles.coordInput]}
                      placeholder="Longitude"
                      value={coord.longitude}
                      onChangeText={(val) => updatePolygonPoint(index, 'longitude', val)}
                      keyboardType="decimal-pad"
                    />
                    {polygonCoords.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removePolygonPoint(index)}
                        style={styles.removeButton}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addPolygonPoint}>
                  <Plus size={16} color="#007AFF" />
                  <Text style={styles.addButtonText}>Add Point</Text>
                </TouchableOpacity>
                {calculatedArea && (
                  <View style={styles.areaDisplay}>
                    <Text style={styles.areaDisplayLabel}>Calculated Area:</Text>
                    <Text style={styles.areaDisplayValue}>{calculatedArea} ha</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={resetForm}
                testID="cancel-button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateSite}
                disabled={!siteName.trim() || (!usePolygon && !siteArea.trim()) || (usePolygon && polygonCoords.filter(c => c.latitude && c.longitude).length < 3) || createSiteMutation.isPending}
                testID="confirm-create-button"
              >
                {createSiteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#999999',
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 16,
  },
  sitesList: {
    gap: 12,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    flex: 1,
  },
  siteArea: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  siteLocation: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  siteBlocks: {
    fontSize: 14,
    color: '#999999',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#000000',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666666',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666666',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  polygonContainer: {
    maxHeight: 300,
  },
  polygonLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666666',
    marginBottom: 12,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  coordInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed' as const,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  areaDisplay: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  areaDisplayLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  areaDisplayValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
});
