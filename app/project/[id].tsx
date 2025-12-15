import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, MapPin, Copy, Trash2, Settings, FileText, Edit3 } from 'lucide-react-native';
import React, { useState } from 'react';
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
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';

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
  const { projects, getSitesByProjectId, getScenariosBySiteId, createSite, createScenario, deleteScenario, duplicateScenario, isLoading, loadSites, loadProjects, loadScenarios, deleteSite, duplicateSite, updateSite, updateScenario } = useZURB();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [siteName, setSiteName] = useState<string>('');
  const [siteArea, setSiteArea] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [scenarioModalVisible, setScenarioModalVisible] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarioNotes, setScenarioNotes] = useState<string>('');
  const [isCreatingScenario, setIsCreatingScenario] = useState<boolean>(false);
  const [renameModalVisible, setRenameModalVisible] = useState<{ type: 'site' | 'scenario'; id: string; currentName: string } | null>(null);
  const [renameName, setRenameName] = useState<string>('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProjects(), loadSites(), loadScenarios()]);
    setRefreshing(false);
  };

  const handleDeleteSite = async (siteId: string) => {
    Alert.alert(
      'Delete Site',
      'Are you sure you want to delete this site?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSite(siteId);
          },
        },
      ]
    );
  };

  const handleDuplicateSite = async (siteId: string) => {
    await duplicateSite(siteId);
  };

  const handleCreateScenario = async () => {
    if (!scenarioName.trim() || !scenarioModalVisible) return;

    setIsCreatingScenario(true);
    try {
      const result = await createScenario(scenarioModalVisible, scenarioName.trim(), scenarioNotes.trim() || undefined);
      if (result) {
        setScenarioName('');
        setScenarioNotes('');
        setScenarioModalVisible(null);
      }
    } finally {
      setIsCreatingScenario(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    Alert.alert(
      'Delete Scenario',
      'Are you sure you want to delete this scenario?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteScenario(scenarioId);
          },
        },
      ]
    );
  };

  const handleDuplicateScenario = async (scenarioId: string) => {
    await duplicateScenario(scenarioId);
  };

  const project = projects.find(p => p.id === id);
  const projectSites = getSitesByProjectId(id || '');

  const handleCreateSite = async () => {
    if (!siteName.trim() || !siteArea.trim() || !id) return;

    const area = parseFloat(siteArea);
    if (isNaN(area)) return;

    setIsCreating(true);
    try {
      const result = await createSite(id, siteName.trim(), area);
      if (result) {
        resetForm();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSiteName('');
    setSiteArea('');
    setModalVisible(false);
  };

  const renderSite = ({ item }: { item: Site }) => {
    const siteScenarios = getScenariosBySiteId(item.id);

    return (
    <View style={styles.siteCard}>
      <TouchableOpacity
        style={styles.siteCardMain}
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
      <View style={styles.siteActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setRenameModalVisible({ type: 'site', id: item.id, currentName: item.name });
            setRenameName(item.name);
          }}
          testID={`rename-site-${item.id}`}
        >
          <Edit3 size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDuplicateSite(item.id)}
          testID={`duplicate-site-${item.id}`}
        >
          <Copy size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDeleteSite(item.id)}
          testID={`delete-site-${item.id}`}
        >
          <Trash2 size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <View style={styles.siteScenariosSection}>
        <View style={styles.siteScenariosHeader}>
          <Text style={styles.siteScenariosTitle}>Scenarios ({siteScenarios.length})</Text>
          <TouchableOpacity
            style={styles.addScenarioButton}
            onPress={() => setScenarioModalVisible(item.id)}
            testID={`add-scenario-${item.id}`}
          >
            <Plus size={14} color="#007AFF" />
            <Text style={styles.addScenarioButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {siteScenarios.length > 0 && (
          <View style={styles.scenariosList}>
            {siteScenarios.map(scenario => (
              <TouchableOpacity
                key={scenario.id}
                style={[
                  styles.scenarioItem,
                  scenario.is_auto_scenario && styles.scenarioItemAuto,
                ]}
                onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: scenario.id } } as any)}
                testID={`scenario-${scenario.id}`}
              >
                <FileText size={14} color={scenario.is_auto_scenario ? "#FF9500" : "#6C757D"} />
                <Text style={[
                  styles.scenarioItemName,
                  scenario.is_auto_scenario && styles.scenarioItemNameAuto,
                ]} numberOfLines={1}>{scenario.name}</Text>
                <View style={styles.scenarioItemActions}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setRenameModalVisible({ type: 'scenario', id: scenario.id, currentName: scenario.name });
                      setRenameName(scenario.name);
                    }}
                    style={styles.scenarioItemAction}
                  >
                    <Edit3 size={12} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDuplicateScenario(scenario.id);
                    }}
                    style={styles.scenarioItemAction}
                  >
                    <Copy size={12} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteScenario(scenario.id);
                    }}
                    style={styles.scenarioItemAction}
                  >
                    <Trash2 size={12} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Project not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: project.name,
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push({ pathname: '/project-parameters/[id]', params: { id } } as any)}
              testID="project-parameters-button"
            >
              <Settings size={22} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {project.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{project.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sites</Text>

          {projectSites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sites yet. Create your first site.</Text>
            </View>
          ) : (
            <FlatList
              data={projectSites}
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

            <TextInput
              style={styles.input}
              placeholder="Area (hectares)"
              value={siteArea}
              onChangeText={setSiteArea}
              keyboardType="decimal-pad"
              testID="site-area-input"
            />

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
                disabled={!siteName.trim() || !siteArea.trim() || isCreating}
                testID="confirm-create-button"
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={scenarioModalVisible !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setScenarioModalVisible(null)}
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
                  setScenarioModalVisible(null);
                  setScenarioName('');
                  setScenarioNotes('');
                }}
                testID="cancel-scenario-button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateScenario}
                disabled={!scenarioName.trim() || isCreatingScenario}
                testID="confirm-create-scenario-button"
              >
                {isCreatingScenario ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={renameModalVisible !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setRenameModalVisible(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename {renameModalVisible?.type === 'site' ? 'Site' : 'Scenario'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={renameName}
              onChangeText={setRenameName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRenameModalVisible(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={async () => {
                  if (renameModalVisible && renameName.trim()) {
                    if (renameModalVisible.type === 'site') {
                      await updateSite(renameModalVisible.id, { name: renameName.trim() });
                    } else {
                      await updateScenario(renameModalVisible.id, { name: renameName.trim() });
                    }
                    setRenameModalVisible(null);
                  }
                }}
                disabled={!renameName.trim()}
              >
                <Text style={styles.createButtonText}>Rename</Text>
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
  headerButton: {
    padding: 8,
    marginRight: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  siteCardMain: {
    padding: 16,
  },
  siteActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F7',
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
  siteScenariosSection: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  siteScenariosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  siteScenariosTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666666',
  },
  addScenarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
  },
  addScenarioButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  scenariosList: {
    gap: 6,
  },
  scenarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  scenarioItemAuto: {
    backgroundColor: '#FFF8F0',
    borderColor: '#FFD3A0',
  },
  scenarioItemName: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    fontWeight: '500' as const,
  },
  scenarioItemNameAuto: {
    color: '#FF9500',
    fontWeight: '600' as const,
    fontStyle: 'italic' as const,
  },
  scenarioItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  scenarioItemAction: {
    padding: 4,
  },
});
