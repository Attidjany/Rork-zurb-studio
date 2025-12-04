import { Stack, useLocalSearchParams } from 'expo-router';
import { DollarSign, TrendingUp } from 'lucide-react-native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import { fetchLiveGoldPrice, getCachedGoldPrice, getDefaultGoldPrice, GoldPriceData } from '@/lib/goldPrice';

const UNIT_TYPE_LABELS: { [key: string]: string } = {
  XM: 'Extra Small',
  AMS: 'Small Apartment',
  AML: 'Large Apartment',
  AH: 'Apartment High-end',
  villa_200: 'Villa 200m²',
  villa_300: 'Villa 300m²',
  villa_500: 'Villa 500m²',
  villa_1000: 'Villa 1000m²',
};

export default function ProjectParametersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    projects,
    getProjectCostParamsByProjectId,
    updateProjectCostParam,
    loadProjectCostParams,
  } = useZURB();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData>(getCachedGoldPrice() || getDefaultGoldPrice());
  const [loadingGoldPrice, setLoadingGoldPrice] = useState<boolean>(false);
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    build_area_m2: string;
    cost_per_m2: string;
    rent_monthly: string;
  }>({
    build_area_m2: '',
    cost_per_m2: '',
    rent_monthly: '',
  });

  const project = useMemo(() => {
    return projects.find(p => p.id === id) || null;
  }, [projects, id]);

  const costParams = useMemo(() => {
    const params = getProjectCostParamsByProjectId(id || '');
    console.log('[ProjectParameters] Cost params for project', id, ':', params.length);
    return params;
  }, [getProjectCostParamsByProjectId, id]);

  const handleRefresh = useCallback(async () => {
    console.log('[ProjectParameters] Refreshing...');
    setRefreshing(true);
    await loadProjectCostParams();
    setRefreshing(false);
  }, [loadProjectCostParams]);

  const fetchGoldPrice = useCallback(async () => {
    setLoadingGoldPrice(true);
    const price = await fetchLiveGoldPrice();
    setGoldPrice(price);
    setLoadingGoldPrice(false);
  }, []);

  useEffect(() => {
    fetchGoldPrice();
  }, [fetchGoldPrice]);

  const startEditing = useCallback((paramId: string, currentValues: {
    build_area_m2: number;
    cost_per_m2: number;
    rent_monthly: number;
  }) => {
    setEditingParam(paramId);
    setEditValues({
      build_area_m2: currentValues.build_area_m2.toString(),
      cost_per_m2: currentValues.cost_per_m2.toString(),
      rent_monthly: currentValues.rent_monthly.toString(),
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingParam(null);
    setEditValues({
      build_area_m2: '',
      cost_per_m2: '',
      rent_monthly: '',
    });
  }, []);

  const saveParam = useCallback(async (paramId: string) => {
    const buildArea = parseFloat(editValues.build_area_m2);
    const costPerM2 = parseFloat(editValues.cost_per_m2);
    const rentMonthly = parseFloat(editValues.rent_monthly);

    if (isNaN(buildArea) || isNaN(costPerM2) || isNaN(rentMonthly)) {
      return;
    }

    await updateProjectCostParam(paramId, {
      build_area_m2: buildArea,
      cost_per_m2: costPerM2,
      rent_monthly: rentMonthly,
    });

    cancelEditing();
  }, [editValues, updateProjectCostParam, cancelEditing]);

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
          title: 'Project Parameters',
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
        <View style={styles.projectCard}>
          <Text style={styles.projectName}>{project.name}</Text>
          {project.description && (
            <Text style={styles.projectDesc}>{project.description}</Text>
          )}
        </View>

        <View style={styles.goldPriceCard}>
          <View style={styles.goldPriceHeader}>
            <View style={styles.goldPriceIcon}>
              <TrendingUp size={20} color="#FFB700" />
            </View>
            <View style={styles.goldPriceInfo}>
              <Text style={styles.goldPriceLabel}>Live Gold Price (updates daily)</Text>
              <View style={styles.goldPriceRow}>
                <Text style={styles.goldPriceValue}>
                  ${goldPrice.pricePerGram.toFixed(2)} / g
                </Text>
                <Text style={styles.goldPriceSeparator}>•</Text>
                <Text style={styles.goldPriceValue}>
                  ${goldPrice.pricePerOz.toFixed(2)} / oz
                </Text>
              </View>
              <Text style={styles.goldPriceTimestamp}>
                Last updated: {new Date(goldPrice.timestamp).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={fetchGoldPrice}
              disabled={loadingGoldPrice}
            >
              {loadingGoldPrice ? (
                <ActivityIndicator size="small" color="#FFB700" />
              ) : (
                <Text style={styles.refreshButtonText}>Refresh</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Parameters</Text>
          <Text style={styles.sectionDesc}>
            Configure default costs and rents for each unit type
          </Text>

          {costParams.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No cost parameters found. Pull down to refresh or check your project setup.
              </Text>
            </View>
          )}

          {costParams.map(param => {
            const isEditing = editingParam === param.id;
            const unitLabel = UNIT_TYPE_LABELS[param.unit_type] || param.unit_type;

            return (
              <View key={param.id} style={styles.paramCard}>
                <View style={styles.paramHeader}>
                  <View style={styles.paramIcon}>
                    <DollarSign size={18} color="#007AFF" />
                  </View>
                  <Text style={styles.paramTitle}>{unitLabel}</Text>
                </View>

                {isEditing ? (
                  <View style={styles.editForm}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Build Area (m²)</Text>
                      <TextInput
                        style={styles.input}
                        value={editValues.build_area_m2}
                        onChangeText={(text) => setEditValues(prev => ({ ...prev, build_area_m2: text }))}
                        keyboardType="decimal-pad"
                        placeholder="Build area"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Cost per m² ($)</Text>
                      <TextInput
                        style={styles.input}
                        value={editValues.cost_per_m2}
                        onChangeText={(text) => setEditValues(prev => ({ ...prev, cost_per_m2: text }))}
                        keyboardType="decimal-pad"
                        placeholder="Cost per m²"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Monthly Rent ($)</Text>
                      <TextInput
                        style={styles.input}
                        value={editValues.rent_monthly}
                        onChangeText={(text) => setEditValues(prev => ({ ...prev, rent_monthly: text }))}
                        keyboardType="decimal-pad"
                        placeholder="Monthly rent"
                      />
                    </View>

                    <View style={styles.editButtons}>
                      <TouchableOpacity
                        style={[styles.editButton, styles.cancelButton]}
                        onPress={cancelEditing}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButton, styles.saveButton]}
                        onPress={() => saveParam(param.id)}
                      >
                        <Text style={styles.saveButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.paramGrid}>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Build Area</Text>
                        <Text style={styles.paramItemValue}>
                          {param.build_area_m2.toFixed(0)} m²
                        </Text>
                      </View>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Cost/m²</Text>
                        <Text style={styles.paramItemValue}>
                          ${param.cost_per_m2.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.paramItem}>
                        <Text style={styles.paramItemLabel}>Monthly Rent</Text>
                        <Text style={styles.paramItemValue}>
                          ${param.rent_monthly.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.paramSummary}>
                      <View style={styles.paramSummaryItem}>
                        <Text style={styles.paramSummaryLabel}>Total Build Cost</Text>
                        <Text style={styles.paramSummaryValue}>
                          ${(param.build_area_m2 * param.cost_per_m2).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.paramSummaryItem}>
                        <Text style={styles.paramSummaryLabel}>Yearly Revenue</Text>
                        <Text style={styles.paramSummaryValue}>
                          ${(param.rent_monthly * 12).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.editTrigger}
                      onPress={() => startEditing(param.id, {
                        build_area_m2: param.build_area_m2,
                        cost_per_m2: param.cost_per_m2,
                        rent_monthly: param.rent_monthly,
                      })}
                    >
                      <Text style={styles.editTriggerText}>Edit Parameters</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 16,
    color: '#6C757D',
  },
  content: {
    flex: 1,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  projectName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 8,
  },
  projectDesc: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
  },
  goldPriceCard: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  goldPriceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldPriceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 183, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goldPriceInfo: {
    flex: 1,
  },
  goldPriceLabel: {
    fontSize: 13,
    color: '#8D6E00',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  goldPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  goldPriceValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#8D6E00',
  },
  goldPriceSeparator: {
    fontSize: 14,
    color: '#8D6E00',
  },
  goldPriceTimestamp: {
    fontSize: 11,
    color: '#A67C00',
    marginTop: 2,
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 183, 0, 0.15)',
    minWidth: 80,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8D6E00',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 16,
    lineHeight: 20,
  },
  paramCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  paramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paramIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paramTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#212529',
  },
  paramGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  paramItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  paramItemLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 6,
    fontWeight: '500' as const,
  },
  paramItemValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#212529',
  },
  paramSummary: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  paramSummaryItem: {
    flex: 1,
    borderTopWidth: 2,
    borderTopColor: '#E9ECEF',
    paddingTop: 12,
  },
  paramSummaryLabel: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  paramSummaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  editTrigger: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  editTriggerText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#212529',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 22,
  },
});
