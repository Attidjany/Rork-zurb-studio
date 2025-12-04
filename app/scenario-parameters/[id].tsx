import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Settings, DollarSign, Building2, Home, ShoppingBag } from 'lucide-react-native';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import { fetchLiveGoldPrice, getCachedGoldPrice, getDefaultGoldPrice, GoldPriceData, USD_TO_XOF } from '@/lib/goldPrice';
import { CONSTRUCTION_COSTS, HOUSING_TYPES } from '@/constants/typologies';

const CONSTRUCTION_COST_TYPES = ['ZME', 'ZHE', 'ZOS', 'ZMER', 'ZHER'];
const APARTMENT_TYPES = ['AMS', 'AML', 'AH'];
const VILLA_TYPES = ['BMS', 'BML', 'BH', 'CH', 'CO'];
const COMMERCIAL_TYPES = ['XM', 'XH'];

export default function ScenarioParametersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    scenarios,
    projects,
    sites,
    getProjectCostParamsByProjectId,
    getScenarioCostParamsByScenarioId,
    upsertScenarioCostParam,
    loadProjectCostParams,
    loadScenarioCostParams,
  } = useZURB();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData>(getCachedGoldPrice() || getDefaultGoldPrice());
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    build_area_m2: string;
    cost_type: string;
    rent_monthly: string;
  }>({
    build_area_m2: '',
    cost_type: '',
    rent_monthly: '',
  });

  const scenario = useMemo(() => {
    return scenarios.find(s => s.id === id) || null;
  }, [scenarios, id]);

  const site = useMemo(() => {
    if (!scenario) return null;
    return sites.find(s => s.id === scenario.site_id) || null;
  }, [sites, scenario]);

  const project = useMemo(() => {
    if (!site) return null;
    return projects.find(p => p.id === site.project_id) || null;
  }, [projects, site]);

  const projectParams = useMemo(() => {
    if (!project) return [];
    return getProjectCostParamsByProjectId(project.id);
  }, [getProjectCostParamsByProjectId, project]);

  const scenarioParams = useMemo(() => {
    if (!scenario) return [];
    return getScenarioCostParamsByScenarioId(scenario.id);
  }, [getScenarioCostParamsByScenarioId, scenario]);

  const mergedParams = useMemo(() => {
    const merged = projectParams.map(pp => {
      const override = scenarioParams.find(sp => sp.unit_type === pp.unit_type);
      return override || pp;
    });
    console.log('[ScenarioParameters] Merged params:', merged.length);
    return merged;
  }, [projectParams, scenarioParams]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProjectCostParams(), loadScenarioCostParams()]);
    setRefreshing(false);
  }, [loadProjectCostParams, loadScenarioCostParams]);

  const fetchGoldPrice = useCallback(async () => {
    const price = await fetchLiveGoldPrice();
    setGoldPrice(price);
  }, []);

  useEffect(() => {
    fetchGoldPrice();
  }, [fetchGoldPrice]);

  const startEditing = useCallback((unitType: string, currentValues: {
    build_area_m2: number;
    rent_monthly: number;
  }) => {
    const config = HOUSING_TYPES[unitType];
    setEditingParam(unitType);
    setEditValues({
      build_area_m2: currentValues.build_area_m2.toString(),
      cost_type: config.defaultCostType,
      rent_monthly: currentValues.rent_monthly.toString(),
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingParam(null);
    setEditValues({
      build_area_m2: '',
      cost_type: '',
      rent_monthly: '',
    });
  }, []);

  const saveParam = useCallback(async (unitType: string) => {
    if (!scenario) return;

    const buildArea = parseFloat(editValues.build_area_m2);
    const rentMonthly = parseFloat(editValues.rent_monthly);

    if (isNaN(buildArea) || isNaN(rentMonthly) || !editValues.cost_type) {
      return;
    }

    const costTypeConfig = CONSTRUCTION_COSTS[editValues.cost_type];
    const costPerM2 = costTypeConfig.goldGramsPerM2 * goldPrice.pricePerGram;

    await upsertScenarioCostParam(scenario.id, unitType, buildArea, costPerM2, rentMonthly);
    cancelEditing();
  }, [scenario, editValues, upsertScenarioCostParam, cancelEditing, goldPrice]);

  const resetToProjectDefaults = useCallback(async (unitType: string) => {
    if (!scenario) return;
    
    const projectParam = projectParams.find(pp => pp.unit_type === unitType);
    if (!projectParam) return;

    await upsertScenarioCostParam(
      scenario.id, 
      unitType, 
      projectParam.build_area_m2, 
      projectParam.cost_per_m2, 
      projectParam.rent_monthly
    );
  }, [scenario, projectParams, upsertScenarioCostParam]);

  const renderHousingTypeCard = useCallback((param: any, type: string) => {
    const isEditing = editingParam === param.unit_type;
    const config = HOUSING_TYPES[type];
    const costTypeConfig = CONSTRUCTION_COSTS[config.defaultCostType];
    const calculatedCostPerM2XOF = costTypeConfig.goldGramsPerM2 * goldPrice.pricePerGram * USD_TO_XOF;
    const isOverridden = scenarioParams.some(sp => sp.unit_type === param.unit_type);

    return (
      <View key={param.unit_type} style={styles.paramCard}>
        <View style={styles.paramHeader}>
          <View style={styles.paramIcon}>
            <DollarSign size={18} color={isOverridden ? '#34C759' : '#007AFF'} />
          </View>
          <View style={styles.paramHeaderText}>
            <Text style={styles.paramTitle}>{type}</Text>
            <Text style={styles.paramSubtitle}>{config.name}</Text>
            <View style={styles.costTypeBadge}>
              <Text style={styles.costTypeBadgeText}>Cost Type: {config.defaultCostType}</Text>
            </View>
            {isOverridden && (
              <Text style={styles.overrideLabel}>Custom Override</Text>
            )}
            {!isOverridden && (
              <Text style={styles.defaultLabel}>Using Project Default</Text>
            )}
          </View>
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
              <Text style={styles.inputLabel}>Cost Type</Text>
              <View style={styles.costTypeOptions}>
                {CONSTRUCTION_COST_TYPES.map(costType => {
                  const costConfig = CONSTRUCTION_COSTS[costType];
                  const costXOF = (costConfig.goldGramsPerM2 * goldPrice.pricePerGram * USD_TO_XOF).toLocaleString(undefined, {maximumFractionDigits: 0});
                  return (
                    <TouchableOpacity
                      key={costType}
                      style={[
                        styles.costTypeOption,
                        editValues.cost_type === costType && styles.costTypeOptionSelected,
                      ]}
                      onPress={() => setEditValues(prev => ({ ...prev, cost_type: costType }))}
                    >
                      <Text style={[
                        styles.costTypeOptionCode,
                        editValues.cost_type === costType && styles.costTypeOptionTextSelected,
                      ]}>{costType}</Text>
                      <Text style={[
                        styles.costTypeOptionValue,
                        editValues.cost_type === costType && styles.costTypeOptionTextSelected,
                      ]}>{costXOF} XOF/m²</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Monthly Rent (XOF)</Text>
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
                onPress={() => saveParam(param.unit_type)}
              >
                <Text style={styles.saveButtonText}>Save Override</Text>
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
                  {calculatedCostPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
                {costTypeConfig && (
                  <Text style={styles.paramItemSubtext}>
                    {costTypeConfig.goldGramsPerM2.toFixed(2)} g Au/m²
                  </Text>
                )}
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Monthly Rent</Text>
                <Text style={styles.paramItemValue}>
                  {param.rent_monthly.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
            </View>

            <View style={styles.paramSummary}>
              <View style={styles.paramSummaryItem}>
                <Text style={styles.paramSummaryLabel}>Total Build Cost</Text>
                <Text style={styles.paramSummaryValue}>
                  {(param.build_area_m2 * calculatedCostPerM2XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
              <View style={styles.paramSummaryItem}>
                <Text style={styles.paramSummaryLabel}>Yearly Revenue</Text>
                <Text style={styles.paramSummaryValue}>
                  {(param.rent_monthly * 12).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editTrigger}
                onPress={() => startEditing(param.unit_type, {
                  build_area_m2: param.build_area_m2,
                  rent_monthly: param.rent_monthly,
                })}
              >
                <Text style={styles.editTriggerText}>Edit Parameters</Text>
              </TouchableOpacity>
              
              {isOverridden && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => resetToProjectDefaults(param.unit_type)}
                >
                  <Text style={styles.resetButtonText}>Reset to Project Default</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    );
  }, [editingParam, editValues, cancelEditing, saveParam, startEditing, scenarioParams, resetToProjectDefaults, goldPrice]);

  if (!scenario || !site || !project) {
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
          title: 'Scenario Parameters',
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
        <View style={styles.headerCard}>
          <Text style={styles.scenarioName}>{scenario.name}</Text>
          <Text style={styles.scenarioMeta}>
            Site: {site.name} • Project: {project.name}
          </Text>
          <TouchableOpacity
            style={styles.viewScenarioButton}
            onPress={() => router.push(`/scenario/${scenario.id}`)}
          >
            <Text style={styles.viewScenarioButtonText}>View Scenario Summary</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <Settings size={18} color="#007AFF" />
          </View>
          <Text style={styles.infoText}>
            These parameters override project defaults for this scenario only. 
            Leave unchanged to inherit from project settings.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Construction Costs per m²</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Base construction costs (inherited from project)
          </Text>

          {CONSTRUCTION_COST_TYPES.map(type => {
            const param = mergedParams.find(p => p.unit_type === type);
            if (!param) return null;

            const config = CONSTRUCTION_COSTS[type];

            return (
              <View key={param.unit_type} style={styles.costCard}>
                <View style={styles.costHeader}>
                  <Text style={styles.costCode}>{type}</Text>
                  <Text style={styles.costName}>{config.name}</Text>
                </View>

                <View style={styles.costDetails}>
                  <View style={styles.costDetailRow}>
                    <Text style={styles.costDetailLabel}>Gold Content:</Text>
                    <Text style={styles.costDetailValue}>{config.goldGramsPerM2.toFixed(2)} g Au/m²</Text>
                  </View>
                  <View style={styles.costDetailRow}>
                    <Text style={styles.costDetailLabel}>Cost per m²:</Text>
                    <Text style={styles.costDetailValue}>{(config.goldGramsPerM2 * goldPrice.pricePerGram * USD_TO_XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Apartment Housing Types</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Configure apartment unit types for this scenario
          </Text>

          {APARTMENT_TYPES.map(type => {
            const param = mergedParams.find(p => p.unit_type === type);
            if (!param) return null;
            return renderHousingTypeCard(param, type);
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Home size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Villa Housing Types</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Configure villa unit types for this scenario
          </Text>

          {VILLA_TYPES.map(type => {
            const param = mergedParams.find(p => p.unit_type === type);
            if (!param) return null;
            return renderHousingTypeCard(param, type);
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShoppingBag size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Commercial Housing Types</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Configure commercial unit types for this scenario
          </Text>

          {COMMERCIAL_TYPES.map(type => {
            const param = mergedParams.find(p => p.unit_type === type);
            if (!param) return null;
            return renderHousingTypeCard(param, type);
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
  headerCard: {
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
  scenarioName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 8,
  },
  scenarioMeta: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 16,
  },
  viewScenarioButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewScenarioButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  infoIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0D47A1',
    lineHeight: 18,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
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
  paramHeaderText: {
    flex: 1,
  },
  paramTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 4,
  },
  paramSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
    marginBottom: 6,
  },
  costTypeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  costTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  overrideLabel: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600' as const,
    marginTop: 4,
  },
  defaultLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500' as const,
    marginTop: 4,
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
  paramItemSubtext: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 2,
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
  actionButtons: {
    gap: 12,
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
  resetButton: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#8D6E00',
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
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  costCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  costHeader: {
    marginBottom: 8,
  },
  costCode: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 4,
  },
  costName: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
  },
  costDetails: {
    gap: 8,
  },
  costDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costDetailLabel: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '500' as const,
  },
  costDetailValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#212529',
  },
  costTypeOptions: {
    gap: 8,
  },
  costTypeOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costTypeOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  costTypeOptionCode: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#212529',
  },
  costTypeOptionValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  costTypeOptionTextSelected: {
    color: '#007AFF',
  },
});
