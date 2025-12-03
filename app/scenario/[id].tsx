import { Stack, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2, DollarSign, TrendingUp } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZUDS } from '@/contexts/ZUDSContext';
import { DEFAULT_TYPOLOGIES } from '@/constants/typologies';
import { ScenarioItem } from '@/types';
import { calculateScenarioResults } from '@/utils/calculations';

export default function ScenarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scenarios, updateScenario, costParams, mixRules, getRentsMap, overheads } = useZUDS();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedTypology, setSelectedTypology] = useState<string>('');
  const [units, setUnits] = useState<string>('');
  const [gfa, setGfa] = useState<string>('');

  const scenario = useMemo(() => {
    if (!id) return null;
    for (const siteScenarios of Object.values(scenarios)) {
      const found = siteScenarios.find(s => s.id === id);
      if (found) return found;
    }
    return null;
  }, [scenarios, id]);

  const results = useMemo(() => {
    if (!scenario) return null;
    const rentsMap = getRentsMap();
    return calculateScenarioResults(
      scenario.items,
      costParams,
      mixRules,
      rentsMap,
      overheads
    );
  }, [scenario, costParams, mixRules, getRentsMap, overheads]);

  const handleAddItem = () => {
    if (!scenario || !selectedTypology || !units.trim() || !gfa.trim()) return;

    const newItem: ScenarioItem = {
      id: Date.now().toString(),
      blockId: 'default-block',
      typologyCode: selectedTypology,
      units: parseInt(units, 10),
      gfaM2: parseFloat(gfa),
    };

    const updatedItems = [...scenario.items, newItem];
    updateScenario(scenario.id, { items: updatedItems });

    setSelectedTypology('');
    setUnits('');
    setGfa('');
    setModalVisible(false);
  };

  const handleRemoveItem = (itemId: string) => {
    if (!scenario) return;
    const updatedItems = scenario.items.filter(item => item.id !== itemId);
    updateScenario(scenario.id, { items: updatedItems });
  };

  const handleSelectTypology = (code: string) => {
    setSelectedTypology(code);
    const typology = DEFAULT_TYPOLOGIES.find(t => t.code === code);
    if (typology) {
      setGfa(typology.defaultGfaM2.toString());
    }
  };

  if (!scenario) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Scenario not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: scenario.name,
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {scenario.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{scenario.notes}</Text>
          </View>
        ) : null}

        {results && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Units</Text>
              <Text style={styles.summaryValue}>{results.totalUnits}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total GFA</Text>
              <Text style={styles.summaryValue}>{results.totalGfa.toLocaleString()} m²</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <DollarSign size={16} color="#FF9500" />
              <Text style={styles.summaryLabel}>Construction Cost</Text>
              <Text style={[styles.summaryValue, styles.costValue]}>
                ${results.constructionCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <DollarSign size={16} color="#34C759" />
              <Text style={styles.summaryLabel}>Expected Revenue</Text>
              <Text style={[styles.summaryValue, styles.revenueValue]}>
                ${results.expectedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <TrendingUp size={16} color={results.margin >= 0 ? '#34C759' : '#FF3B30'} />
              <Text style={styles.summaryLabel}>Margin</Text>
              <Text
                style={[
                  styles.summaryValue,
                  styles.marginValue,
                  results.margin >= 0 ? styles.positiveMargin : styles.negativeMargin,
                ]}
              >
                ${results.margin.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scenario Items</Text>

          {scenario.items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No items yet. Add typologies to build your scenario.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {scenario.items.map(item => {
                const typology = DEFAULT_TYPOLOGIES.find(t => t.code === item.typologyCode);
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemHeaderLeft}>
                        <Text style={styles.itemCode}>{item.typologyCode}</Text>
                        <Text style={styles.itemName}>{typology?.name || 'Unknown'}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(item.id)}
                        style={styles.removeButton}
                        testID={`remove-item-${item.id}`}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.itemStats}>
                      <View style={styles.itemStat}>
                        <Text style={styles.itemStatLabel}>Units</Text>
                        <Text style={styles.itemStatValue}>{item.units}</Text>
                      </View>
                      <View style={styles.itemStat}>
                        <Text style={styles.itemStatLabel}>GFA</Text>
                        <Text style={styles.itemStatValue}>{item.gfaM2} m²</Text>
                      </View>
                      <View style={styles.itemStat}>
                        <Text style={styles.itemStatLabel}>Total GFA</Text>
                        <Text style={styles.itemStatValue}>
                          {(item.units * item.gfaM2).toLocaleString()} m²
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            testID="add-item-button"
          >
            <Plus size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Typology</Text>
          </TouchableOpacity>
        </View>

        {results && Object.keys(results.breakdownByCategory).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Breakdown by Category</Text>
            {Object.entries(results.breakdownByCategory).map(([category, data]) => (
              <View key={category} style={styles.breakdownCard}>
                <Text style={styles.breakdownCategory}>{category}</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Units</Text>
                  <Text style={styles.breakdownValue}>{data.units}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>GFA</Text>
                  <Text style={styles.breakdownValue}>{data.gfa.toLocaleString()} m²</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Cost</Text>
                  <Text style={styles.breakdownValue}>
                    ${data.cost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Revenue</Text>
                  <Text style={styles.breakdownValue}>
                    ${data.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Typology</Text>

            <Text style={styles.modalLabel}>Select Typology</Text>
            <FlatList
              data={DEFAULT_TYPOLOGIES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.typologyOption,
                    selectedTypology === item.code && styles.typologyOptionSelected,
                  ]}
                  onPress={() => handleSelectTypology(item.code)}
                  testID={`typology-${item.code}`}
                >
                  <Text
                    style={[
                      styles.typologyOptionCode,
                      selectedTypology === item.code && styles.typologyOptionTextSelected,
                    ]}
                  >
                    {item.code}
                  </Text>
                  <Text
                    style={[
                      styles.typologyOptionName,
                      selectedTypology === item.code && styles.typologyOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.code}
              scrollEnabled={false}
              style={styles.typologyList}
            />

            <TextInput
              style={styles.input}
              placeholder="Number of Units"
              value={units}
              onChangeText={setUnits}
              keyboardType="number-pad"
              testID="units-input"
            />

            <TextInput
              style={styles.input}
              placeholder="GFA per Unit (m²)"
              value={gfa}
              onChangeText={setGfa}
              keyboardType="decimal-pad"
              testID="gfa-input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedTypology('');
                  setUnits('');
                  setGfa('');
                }}
                testID="cancel-button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleAddItem}
                disabled={!selectedTypology || !units.trim() || !gfa.trim()}
                testID="confirm-add-button"
              >
                <Text style={styles.createButtonText}>Add</Text>
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
  notesCard: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#856404',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  notesText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  summaryCard: {
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  costValue: {
    color: '#FF9500',
  },
  revenueValue: {
    color: '#34C759',
  },
  marginValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  positiveMargin: {
    color: '#34C759',
  },
  negativeMargin: {
    color: '#FF3B30',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
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
    lineHeight: 20,
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemCode: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#007AFF',
    width: 30,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemStat: {
    flex: 1,
  },
  itemStatLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  itemStatValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000000',
  },
  addButton: {
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
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  breakdownCard: {
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
  breakdownCategory: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#007AFF',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000000',
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666666',
    marginBottom: 12,
  },
  typologyList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  typologyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    marginBottom: 8,
  },
  typologyOptionSelected: {
    backgroundColor: '#007AFF',
  },
  typologyOptionCode: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#007AFF',
    width: 30,
  },
  typologyOptionName: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  typologyOptionTextSelected: {
    color: '#FFFFFF',
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
});
