import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, FileText } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useZURB } from '@/contexts/ZURBContext';
import { DEFAULT_TYPOLOGIES } from '@/constants/typologies';

export default function SiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { projects, scenarios, createScenario } = useZURB();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarioNotes, setScenarioNotes] = useState<string>('');

  const site = useMemo(() => {
    for (const project of projects) {
      const found = project.sites.find(s => s.id === id);
      if (found) return found;
    }
    return null;
  }, [projects, id]);

  const siteScenarios = useMemo(() => {
    return scenarios[id || ''] || [];
  }, [scenarios, id]);

  const handleCreateScenario = () => {
    if (scenarioName.trim() && id) {
      const newScenario = createScenario(id, scenarioName.trim(), scenarioNotes.trim());
      setScenarioName('');
      setScenarioNotes('');
      setModalVisible(false);
      router.push({ pathname: '/scenario/[id]', params: { id: newScenario.id } } as any);
    }
  };

  if (!site) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Site not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: site.name,
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mapContainer}>
          {Platform.OS !== 'web' ? (
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: site.location.latitude,
                longitude: site.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: site.location.latitude,
                  longitude: site.location.longitude,
                }}
                title={site.name}
              />
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapPlaceholder]}>
              <Text style={styles.mapPlaceholderText}>
                Map view (available on mobile)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Area</Text>
            <Text style={styles.infoValue}>{site.areaHa.toFixed(2)} ha</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blocks</Text>
            <Text style={styles.infoValue}>{site.blocks.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {site.location.latitude.toFixed(4)}, {site.location.longitude.toFixed(4)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Typologies</Text>
          {DEFAULT_TYPOLOGIES.map(typology => (
            <View key={typology.code} style={styles.typologyCard}>
              <View style={styles.typologyHeader}>
                <Text style={styles.typologyCode}>{typology.code}</Text>
                <Text style={styles.typologyName}>{typology.name}</Text>
              </View>
              <Text style={styles.typologyDesc}>{typology.description}</Text>
              <View style={styles.typologyStats}>
                <Text style={styles.typologyStat}>
                  {typology.defaultGfaM2} m² GFA
                </Text>
                <Text style={styles.typologyStat}>
                  {typology.unitsPerBlock} units/block
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenarios</Text>
          {siteScenarios.length === 0 ? (
            <View style={styles.emptyScenarios}>
              <Text style={styles.emptyText}>No scenarios yet. Create one to get started.</Text>
            </View>
          ) : (
            <View style={styles.scenariosList}>
              {siteScenarios.map(scenario => (
                <TouchableOpacity
                  key={scenario.id}
                  style={styles.scenarioCard}
                  onPress={() => {
                    router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } } as any);
                  }}
                  testID={`scenario-${scenario.id}`}
                >
                  <View style={styles.scenarioHeader}>
                    <FileText size={18} color="#007AFF" />
                    <Text style={styles.scenarioName}>{scenario.name}</Text>
                  </View>
                  {scenario.notes ? (
                    <Text style={styles.scenarioNotes} numberOfLines={2}>
                      {scenario.notes}
                    </Text>
                  ) : null}
                  <View style={styles.scenarioFooter}>
                    <Text style={styles.scenarioItems}>{scenario.items.length} items</Text>
                    <Text style={styles.scenarioDate}>
                      {new Date(scenario.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setModalVisible(true)}
            testID="create-scenario-button"
          >
            <Plus size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Create Scenario</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Scenario</Text>

            <TextInput
              style={styles.input}
              placeholder="Scenario Name"
              value={scenarioName}
              onChangeText={setScenarioName}
              testID="scenario-name-input"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              value={scenarioNotes}
              onChangeText={setScenarioNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="scenario-notes-input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setScenarioName('');
                  setScenarioNotes('');
                }}
                testID="cancel-button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateScenario}
                disabled={!scenarioName.trim()}
                testID="confirm-create-button"
              >
                <Text style={styles.createButtonText}>Create</Text>
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
  mapContainer: {
    height: 250,
    backgroundColor: '#E5E5EA',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#666666',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 16,
  },
  typologyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typologyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  typologyCode: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#007AFF',
    width: 30,
  },
  typologyName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    flex: 1,
  },
  typologyDesc: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  typologyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  typologyStat: {
    fontSize: 12,
    color: '#999999',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  emptyScenarios: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  scenariosList: {
    gap: 12,
    marginBottom: 16,
  },
  scenarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    flex: 1,
  },
  scenarioNotes: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  scenarioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scenarioItems: {
    fontSize: 12,
    color: '#007AFF',
  },
  scenarioDate: {
    fontSize: 12,
    color: '#999999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
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
  textArea: {
    height: 100,
    paddingTop: 12,
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
});
