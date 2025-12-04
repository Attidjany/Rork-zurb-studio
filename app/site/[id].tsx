import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, FileText, Copy, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import {
  VILLA_LAYOUTS,
  APARTMENT_LAYOUT,
  BUILDING_TYPES,
  EQUIPMENT_OPTIONS,
  UTILITY_OPTIONS,
} from '@/constants/typologies';
import { DbBlock, DbHalfBlock, VillaLayout, HalfBlockType } from '@/types';

export default function SiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    sites,
    getBlocksBySiteId,
    getHalfBlocksByBlockId,
    getScenariosBySiteId,
    createScenario,
    deleteScenario,
    duplicateScenario,
    loadSites,
    loadBlocks,
    loadHalfBlocks,
    updateHalfBlock,
    createUnit,
  } = useZURB();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [scenarioName, setScenarioName] = useState<string>('');
  const [scenarioNotes, setScenarioNotes] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [configModalVisible, setConfigModalVisible] = useState<boolean>(false);
  const [selectedHalfBlock, setSelectedHalfBlock] = useState<DbHalfBlock | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSites(), loadBlocks(), loadHalfBlocks()]);
    setRefreshing(false);
  };

  const handleDeleteScenario = (scenarioId: string) => {
    Alert.alert(
      'Delete Scenario',
      'Are you sure you want to delete this scenario?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteScenario(scenarioId);
          },
        },
      ]
    );
  };

  const handleDuplicateScenario = async (scenarioId: string) => {
    await duplicateScenario(scenarioId);
  };

  const site = useMemo(() => {
    return sites.find(s => s.id === id) || null;
  }, [sites, id]);

  const siteBlocks = useMemo(() => {
    return getBlocksBySiteId(id || '');
  }, [getBlocksBySiteId, id]);

  const siteScenarios = useMemo(() => {
    return getScenariosBySiteId(id || '');
  }, [getScenariosBySiteId, id]);

  const handleCreateScenario = async () => {
    if (scenarioName.trim() && id) {
      const newScenario = await createScenario(id, scenarioName.trim(), scenarioNotes.trim());
      if (newScenario) {
        setScenarioName('');
        setScenarioNotes('');
        setModalVisible(false);
        router.push({ pathname: '/scenario/[id]', params: { id: newScenario.id } } as any);
      }
    }
  };

  const openHalfBlockConfig = (halfBlock: DbHalfBlock) => {
    setSelectedHalfBlock(halfBlock);
    setConfigModalVisible(true);
  };

  const handleSelectType = async (type: HalfBlockType) => {
    if (!selectedHalfBlock) return;

    await updateHalfBlock(selectedHalfBlock.id, type);
    setConfigModalVisible(false);
    setSelectedHalfBlock(null);
  };

  const handleSelectVillaLayout = async (layout: VillaLayout) => {
    if (!selectedHalfBlock) return;

    await updateHalfBlock(selectedHalfBlock.id, 'villas', layout);
    setConfigModalVisible(false);
    setSelectedHalfBlock(null);
  };

  if (!site) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Site not found</Text>
      </View>
    );
  }

  const numBlocks = Math.floor(site.area_ha / 6);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: site.name,
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Area</Text>
            <Text style={styles.infoValue}>{site.area_ha.toFixed(2)} ha</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>6ha Blocks</Text>
            <Text style={styles.infoValue}>{numBlocks}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocks Configuration</Text>
          {siteBlocks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.emptyText}>Generating blocks...</Text>
            </View>
          ) : (
            siteBlocks.map((block: DbBlock) => {
              const halfBlocks = getHalfBlocksByBlockId(block.id);
              const northHB = halfBlocks.find((hb: DbHalfBlock) => hb.position === 'north');
              const southHB = halfBlocks.find((hb: DbHalfBlock) => hb.position === 'south');

              return (
                <View key={block.id} style={styles.blockCard}>
                  <Text style={styles.blockTitle}>Block {block.block_number}</Text>

                  <TouchableOpacity
                    style={styles.halfBlockRow}
                    onPress={() => northHB && openHalfBlockConfig(northHB)}
                    testID={`north-half-block-${block.block_number}`}
                  >
                    <View style={styles.halfBlockInfo}>
                      <Text style={styles.halfBlockLabel}>North Half</Text>
                      {northHB?.type ? (
                        <Text style={styles.halfBlockValue}>
                          {northHB.type === 'villas' ? 'Villas' : 'Apartments'}
                          {northHB.villa_layout && ` (${northHB.villa_layout.replace('_', ' ')})`}
                        </Text>
                      ) : (
                        <Text style={styles.halfBlockPlaceholder}>Not configured</Text>
                      )}
                    </View>
                    <ChevronRight size={20} color="#999" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.halfBlockRow}
                    onPress={() => southHB && openHalfBlockConfig(southHB)}
                    testID={`south-half-block-${block.block_number}`}
                  >
                    <View style={styles.halfBlockInfo}>
                      <Text style={styles.halfBlockLabel}>South Half</Text>
                      {southHB?.type ? (
                        <Text style={styles.halfBlockValue}>
                          {southHB.type === 'villas' ? 'Villas' : 'Apartments'}
                          {southHB.villa_layout && ` (${southHB.villa_layout.replace('_', ' ')})`}
                        </Text>
                      ) : (
                        <Text style={styles.halfBlockPlaceholder}>Not configured</Text>
                      )}
                    </View>
                    <ChevronRight size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
                <View key={scenario.id} style={styles.scenarioCard}>
                  <TouchableOpacity
                    style={styles.scenarioCardMain}
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
                    <Text style={styles.scenarioDate}>
                      {new Date(scenario.created_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.scenarioActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDuplicateScenario(scenario.id)}
                      testID={`duplicate-scenario-${scenario.id}`}
                    >
                      <Copy size={16} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeleteScenario(scenario.id)}
                      testID={`delete-scenario-${scenario.id}`}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setModalVisible(true)}
            testID="create-scenario-button"
          >
            <Text style={styles.actionButtonText}>+ Create Scenario</Text>
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

      <Modal
        visible={configModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure Half Block</Text>

            {!selectedHalfBlock?.type ? (
              <View>
                <Text style={styles.modalSubtitle}>Select Type</Text>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleSelectType('villas')}
                  testID="select-villas"
                >
                  <Text style={styles.optionButtonText}>Villas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleSelectType('apartments')}
                  testID="select-apartments"
                >
                  <Text style={styles.optionButtonText}>Apartment Buildings</Text>
                </TouchableOpacity>
              </View>
            ) : selectedHalfBlock.type === 'villas' ? (
              <View>
                <Text style={styles.modalSubtitle}>Select Villa Layout</Text>
                {VILLA_LAYOUTS.map(layout => (
                  <TouchableOpacity
                    key={layout.id}
                    style={styles.optionButton}
                    onPress={() => handleSelectVillaLayout(layout.id)}
                    testID={`villa-layout-${layout.id}`}
                  >
                    <Text style={styles.optionButtonText}>{layout.name}</Text>
                    <Text style={styles.optionButtonDesc}>{layout.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View>
                <Text style={styles.modalSubtitle}>Apartment Layout</Text>
                <Text style={styles.modalText}>
                  {APARTMENT_LAYOUT.apartmentBuildings} apartment buildings
                </Text>
                <Text style={styles.modalText}>
                  {APARTMENT_LAYOUT.equipmentSpots} equipment spots
                </Text>
                <Text style={styles.modalText}>
                  {APARTMENT_LAYOUT.utilitySpots} utility spot
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setConfigModalVisible(false)}
                >
                  <Text style={styles.actionButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 16 }]}
              onPress={() => {
                setConfigModalVisible(false);
                setSelectedHalfBlock(null);
              }}
              testID="close-config"
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  blockCard: {
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
  blockTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  halfBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F7',
  },
  halfBlockInfo: {
    flex: 1,
  },
  halfBlockLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  halfBlockValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#000000',
  },
  halfBlockPlaceholder: {
    fontSize: 16,
    color: '#999999',
    fontStyle: 'italic' as const,
  },
  emptyScenarios: {
    padding: 32,
    alignItems: 'center',
  },
  scenariosList: {
    gap: 12,
    marginBottom: 16,
  },
  scenarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  scenarioCardMain: {
    padding: 16,
  },
  scenarioActions: {
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
  scenarioDate: {
    fontSize: 12,
    color: '#999999',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
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
  optionButton: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 4,
  },
  optionButtonDesc: {
    fontSize: 14,
    color: '#666666',
  },
});
