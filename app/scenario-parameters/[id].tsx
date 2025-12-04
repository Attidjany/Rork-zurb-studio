import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Settings, DollarSign, Building2, Home, ShoppingBag, Edit2, Trash2, RotateCcw } from 'lucide-react-native';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import { fetchLiveGoldPrice, getCachedGoldPrice, getDefaultGoldPrice, GoldPriceData, USD_TO_XOF } from '@/lib/goldPrice';

export default function ScenarioParametersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    scenarios,
    projects,
    sites,
    getProjectConstructionCostsByProjectId,
    getScenarioConstructionCostsByScenarioId,
    getProjectHousingTypesByProjectId,
    getScenarioHousingTypesByScenarioId,
    getProjectEquipmentUtilityTypesByProjectId,
    getScenarioEquipmentUtilityTypesByScenarioId,
    loadProjectConstructionCosts,
    loadScenarioConstructionCosts,
    loadProjectHousingTypes,
    loadScenarioHousingTypes,
    loadProjectEquipmentUtilityTypes,
    loadScenarioEquipmentUtilityTypes,
    updateScenarioConstructionCost,
    updateScenarioHousingType,
    updateScenarioEquipmentUtilityType,
    deleteScenarioConstructionCost,
    deleteScenarioHousingType,
    deleteScenarioEquipmentUtilityType,
  } = useZURB();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData>(getCachedGoldPrice() || getDefaultGoldPrice());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

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

  const projectConstructionCosts = useMemo(() => {
    if (!project) return [];
    return getProjectConstructionCostsByProjectId(project.id);
  }, [getProjectConstructionCostsByProjectId, project]);

  const scenarioConstructionCosts = useMemo(() => {
    if (!scenario) return [];
    return getScenarioConstructionCostsByScenarioId(scenario.id);
  }, [getScenarioConstructionCostsByScenarioId, scenario]);

  const projectHousingTypes = useMemo(() => {
    if (!project) return [];
    return getProjectHousingTypesByProjectId(project.id);
  }, [getProjectHousingTypesByProjectId, project]);

  const scenarioHousingTypes = useMemo(() => {
    if (!scenario) return [];
    return getScenarioHousingTypesByScenarioId(scenario.id);
  }, [getScenarioHousingTypesByScenarioId, scenario]);

  const projectEquipmentUtilityTypes = useMemo(() => {
    if (!project) return [];
    return getProjectEquipmentUtilityTypesByProjectId(project.id);
  }, [getProjectEquipmentUtilityTypesByProjectId, project]);

  const scenarioEquipmentUtilityTypes = useMemo(() => {
    if (!scenario) return [];
    return getScenarioEquipmentUtilityTypesByScenarioId(scenario.id);
  }, [getScenarioEquipmentUtilityTypesByScenarioId, scenario]);

  const mergedConstructionCosts = useMemo(() => {
    return scenarioConstructionCosts.length > 0 ? scenarioConstructionCosts : projectConstructionCosts;
  }, [scenarioConstructionCosts, projectConstructionCosts]);

  const mergedHousingTypes = useMemo(() => {
    return scenarioHousingTypes.length > 0 ? scenarioHousingTypes : projectHousingTypes;
  }, [scenarioHousingTypes, projectHousingTypes]);

  const mergedEquipmentUtilityTypes = useMemo(() => {
    return scenarioEquipmentUtilityTypes.length > 0 ? scenarioEquipmentUtilityTypes : projectEquipmentUtilityTypes;
  }, [scenarioEquipmentUtilityTypes, projectEquipmentUtilityTypes]);

  const hasScenarioOverrides = scenarioConstructionCosts.length > 0 || scenarioHousingTypes.length > 0 || scenarioEquipmentUtilityTypes.length > 0;

  const handleResetToProjectSettings = useCallback(async () => {
    Alert.alert(
      'Reset to Project Settings',
      'This will delete all scenario-specific parameters and use the project defaults. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const deletePromises = [
              ...scenarioConstructionCosts.map(c => deleteScenarioConstructionCost(c.id)),
              ...scenarioHousingTypes.map(h => deleteScenarioHousingType(h.id)),
              ...scenarioEquipmentUtilityTypes.map(e => deleteScenarioEquipmentUtilityType(e.id)),
            ];
            await Promise.all(deletePromises);
            Alert.alert('Success', 'Scenario parameters have been reset to project defaults');
          },
        },
      ]
    );
  }, [scenarioConstructionCosts, scenarioHousingTypes, scenarioEquipmentUtilityTypes, deleteScenarioConstructionCost, deleteScenarioHousingType, deleteScenarioEquipmentUtilityType]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadProjectConstructionCosts(),
      loadScenarioConstructionCosts(),
      loadProjectHousingTypes(),
      loadScenarioHousingTypes(),
      loadProjectEquipmentUtilityTypes(),
      loadScenarioEquipmentUtilityTypes(),
    ]);
    setRefreshing(false);
  }, [
    loadProjectConstructionCosts,
    loadScenarioConstructionCosts,
    loadProjectHousingTypes,
    loadScenarioHousingTypes,
    loadProjectEquipmentUtilityTypes,
    loadScenarioEquipmentUtilityTypes,
  ]);

  const fetchGoldPrice = useCallback(async () => {
    const price = await fetchLiveGoldPrice();
    setGoldPrice(price);
  }, []);

  useEffect(() => {
    fetchGoldPrice();
  }, [fetchGoldPrice]);

  useEffect(() => {
    console.log('[ScenarioParameters] Scenario:', scenario?.name);
    console.log('[ScenarioParameters] Project Construction Costs:', projectConstructionCosts.length);
    console.log('[ScenarioParameters] Scenario Construction Costs:', scenarioConstructionCosts.length);
    console.log('[ScenarioParameters] Project Housing Types:', projectHousingTypes.length);
    console.log('[ScenarioParameters] Scenario Housing Types:', scenarioHousingTypes.length);
    console.log('[ScenarioParameters] Project Equipment/Utility:', projectEquipmentUtilityTypes.length);
    console.log('[ScenarioParameters] Scenario Equipment/Utility:', scenarioEquipmentUtilityTypes.length);
  }, [scenario, projectConstructionCosts, scenarioConstructionCosts, projectHousingTypes, scenarioHousingTypes, projectEquipmentUtilityTypes, scenarioEquipmentUtilityTypes]);

  if (!scenario || !site || !project) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Scenario not found</Text>
      </View>
    );
  }

  const apartmentTypes = mergedHousingTypes.filter(h => h.category === 'apartment');
  const villaTypes = mergedHousingTypes.filter(h => h.category === 'villa');
  const commercialTypes = mergedHousingTypes.filter(h => h.category === 'commercial');
  const equipmentTypes = mergedEquipmentUtilityTypes.filter(e => e.category === 'equipment');
  const utilityTypes = mergedEquipmentUtilityTypes.filter(e => e.category === 'utility');

  const renderHousingType = (type: any) => {
    const costConfig = mergedConstructionCosts.find(c => c.code === type.default_cost_type);
    const costPerM2XOF = costConfig
      ? costConfig.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF
      : 0;
    const totalCost = type.default_area_m2 * costPerM2XOF;
    const yearlyRevenue = type.default_rent_monthly * 12;
    const isEditing = editingId === type.id;
    const isScenarioType = scenarioHousingTypes.some(h => h.id === type.id);

    return (
      <View key={type.id} style={styles.paramCard}>
        <View style={[styles.paramHeader, isScenarioType && styles.paramHeaderWithActions]}>
          <View style={styles.paramIcon}>
            <DollarSign size={18} color="#007AFF" />
          </View>
          <View style={styles.paramHeaderText}>
            {isEditing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.input}
                  value={editValues.code !== undefined ? editValues.code : type.code}
                  onChangeText={(text) => setEditValues({...editValues, code: text})}
                  placeholder="Code"
                />
                <TextInput
                  style={styles.input}
                  value={editValues.name !== undefined ? editValues.name : type.name}
                  onChangeText={(text) => setEditValues({...editValues, name: text})}
                  placeholder="Name"
                />
                <TextInput
                  style={styles.input}
                  value={String(editValues.default_area_m2 !== undefined ? editValues.default_area_m2 : type.default_area_m2)}
                  onChangeText={(text) => setEditValues({...editValues, default_area_m2: parseFloat(text) || 0})}
                  placeholder="Area (m²)"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={editValues.default_cost_type !== undefined ? editValues.default_cost_type : type.default_cost_type}
                  onChangeText={(text) => setEditValues({...editValues, default_cost_type: text})}
                  placeholder="Cost Type"
                />
                <TextInput
                  style={styles.input}
                  value={String(editValues.default_rent_monthly !== undefined ? editValues.default_rent_monthly : type.default_rent_monthly)}
                  onChangeText={(text) => setEditValues({...editValues, default_rent_monthly: parseFloat(text) || 0})}
                  placeholder="Monthly Rent (XOF)"
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <>
                <Text style={styles.paramTitle}>{type.code}</Text>
                <Text style={styles.paramSubtitle}>{type.name}</Text>
                <View style={styles.costTypeBadge}>
                  <Text style={styles.costTypeBadgeText}>Cost Type: {type.default_cost_type}</Text>
                </View>
              </>
            )}
          </View>
          {isScenarioType && (
            <View style={styles.actionButtons}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      await updateScenarioHousingType(type.id, editValues);
                      setEditingId(null);
                      setEditValues({});
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditingId(null);
                      setEditValues({});
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      setEditingId(type.id);
                      setEditValues({
                        code: type.code,
                        name: type.name,
                        default_area_m2: type.default_area_m2,
                        default_cost_type: type.default_cost_type,
                        default_rent_monthly: type.default_rent_monthly,
                      });
                    }}
                  >
                    <Edit2 size={18} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Housing Type',
                        `Are you sure you want to delete ${type.code}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteScenarioHousingType(type.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {!isEditing && (
          <>
            <View style={styles.paramGrid}>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Build Area</Text>
                <Text style={styles.paramItemValue}>
                  {type.default_area_m2.toFixed(0)} m²
                </Text>
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Cost/m²</Text>
                <Text style={styles.paramItemValue}>
                  {costPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
                {costConfig && (
                  <Text style={styles.paramItemSubtext}>
                    {costConfig.gold_grams_per_m2.toFixed(2)} g Au/m²
                  </Text>
                )}
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Monthly Rent</Text>
                <Text style={styles.paramItemValue}>
                  {type.default_rent_monthly.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
            </View>

            <View style={styles.paramSummary}>
              <View style={styles.paramSummaryItem}>
                <Text style={styles.paramSummaryLabel}>Total Build Cost</Text>
                <Text style={styles.paramSummaryValue}>
                  {totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
              <View style={styles.paramSummaryItem}>
                <Text style={styles.paramSummaryLabel}>Yearly Revenue</Text>
                <Text style={styles.paramSummaryValue}>
                  {yearlyRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderEquipmentUtilityType = (type: any, category: 'equipment' | 'utility') => {
    const costConfig = mergedConstructionCosts.find(c => c.code === type.cost_type);
    const buildAreaM2 = type.land_area_m2 * (type.building_occupation_pct / 100);
    const costPerM2XOF = costConfig
      ? costConfig.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF
      : 0;
    const totalCost = buildAreaM2 * costPerM2XOF;
    const isEditing = editingId === type.id;
    const isScenarioType = scenarioEquipmentUtilityTypes.some(e => e.id === type.id);
    const iconColor = category === 'equipment' ? '#FF9500' : '#34C759';
    const iconBgStyle = category === 'equipment' ? styles.equipmentIcon : styles.utilityIcon;

    return (
      <View key={type.id} style={styles.paramCard}>
        <View style={[styles.paramHeader, isScenarioType && styles.paramHeaderWithActions]}>
          <View style={[styles.paramIcon, iconBgStyle]}>
            <Settings size={18} color={iconColor} />
          </View>
          <View style={styles.paramHeaderText}>
            {isEditing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.input}
                  value={editValues.code !== undefined ? editValues.code : type.code}
                  onChangeText={(text) => setEditValues({...editValues, code: text})}
                  placeholder="Code"
                />
                <TextInput
                  style={styles.input}
                  value={editValues.name !== undefined ? editValues.name : type.name}
                  onChangeText={(text) => setEditValues({...editValues, name: text})}
                  placeholder="Name"
                />
                <TextInput
                  style={styles.input}
                  value={String(editValues.land_area_m2 !== undefined ? editValues.land_area_m2 : type.land_area_m2)}
                  onChangeText={(text) => setEditValues({...editValues, land_area_m2: parseFloat(text) || 0})}
                  placeholder="Land Area (m²)"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={String(editValues.building_occupation_pct !== undefined ? editValues.building_occupation_pct : type.building_occupation_pct)}
                  onChangeText={(text) => setEditValues({...editValues, building_occupation_pct: parseFloat(text) || 0})}
                  placeholder="Building Occupation (%)"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={editValues.cost_type !== undefined ? editValues.cost_type : type.cost_type}
                  onChangeText={(text) => setEditValues({...editValues, cost_type: text})}
                  placeholder="Cost Type"
                />
              </View>
            ) : (
              <>
                <Text style={styles.paramTitle}>{type.code}</Text>
                <Text style={styles.paramSubtitle}>{type.name} ({category === 'equipment' ? 'Equipment' : 'Utility'})</Text>
                <View style={styles.costTypeBadge}>
                  <Text style={styles.costTypeBadgeText}>Cost Type: {type.cost_type}</Text>
                </View>
              </>
            )}
          </View>
          {isScenarioType && (
            <View style={styles.actionButtons}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      await updateScenarioEquipmentUtilityType(type.id, editValues);
                      setEditingId(null);
                      setEditValues({});
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditingId(null);
                      setEditValues({});
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      setEditingId(type.id);
                      setEditValues({
                        code: type.code,
                        name: type.name,
                        land_area_m2: type.land_area_m2,
                        building_occupation_pct: type.building_occupation_pct,
                        cost_type: type.cost_type,
                      });
                    }}
                  >
                    <Edit2 size={18} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      Alert.alert(
                        `Delete ${category === 'equipment' ? 'Equipment' : 'Utility'} Type`,
                        `Are you sure you want to delete ${type.code}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteScenarioEquipmentUtilityType(type.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {!isEditing && (
          <>
            <View style={styles.paramGrid}>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Land Area</Text>
                <Text style={styles.paramItemValue}>
                  {type.land_area_m2.toFixed(0)} m²
                </Text>
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Occupation</Text>
                <Text style={styles.paramItemValue}>
                  {type.building_occupation_pct.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramItemLabel}>Build Area</Text>
                <Text style={styles.paramItemValue}>
                  {buildAreaM2.toFixed(0)} m²
                </Text>
              </View>
            </View>

            <View style={styles.paramSummary}>
              <View style={styles.paramSummaryItem}>
                <Text style={styles.paramSummaryLabel}>Total Build Cost</Text>
                <Text style={styles.paramSummaryValue}>
                  {totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

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
            These parameters override project defaults for this scenario only. They were copied from the project when you created this scenario and can be edited below.
          </Text>
        </View>

        {hasScenarioOverrides && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetToProjectSettings}
          >
            <RotateCcw size={18} color="#FF3B30" />
            <Text style={styles.resetButtonText}>Reset to Project Settings</Text>
          </TouchableOpacity>
        )}

        {mergedConstructionCosts.length === 0 && mergedHousingTypes.length === 0 && mergedEquipmentUtilityTypes.length === 0 ? (
          <View style={styles.emptyState}>
            <Settings size={48} color="#CED4DA" />
            <Text style={styles.emptyStateTitle}>No Parameters Found</Text>
            <Text style={styles.emptyStateText}>
              The project doesn&apos;t have any parameters configured yet.
              {'\n'}
              Please configure parameters in the project settings first.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push(`/project-parameters/${project.id}`)}
            >
              <Text style={styles.emptyStateButtonText}>Go to Project Parameters</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {mergedConstructionCosts.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Construction Costs per m²</Text>
            </View>
            <Text style={styles.sectionDesc}>
              {scenarioConstructionCosts.length > 0
                ? `Scenario-specific construction costs (${scenarioConstructionCosts.length} items)`
                : `Inherited from project (${projectConstructionCosts.length} items) - Scenario has no custom costs yet`}
            </Text>

            {mergedConstructionCosts.map(cost => {
              const isEditing = editingId === cost.id;
              const isScenarioCost = scenarioConstructionCosts.some(c => c.id === cost.id);
              
              return (
                <View key={cost.id} style={styles.costCard}>
                  <View style={[styles.costHeader, isScenarioCost && styles.costHeaderWithActions]}>
                    <View style={styles.costHeaderContent}>
                      {isEditing ? (
                        <View style={styles.editForm}>
                          <TextInput
                            style={styles.input}
                            value={editValues.code !== undefined ? editValues.code : cost.code}
                            onChangeText={(text) => setEditValues({...editValues, code: text})}
                            placeholder="Code"
                          />
                          <TextInput
                            style={styles.input}
                            value={editValues.name !== undefined ? editValues.name : cost.name}
                            onChangeText={(text) => setEditValues({...editValues, name: text})}
                            placeholder="Name"
                          />
                          <TextInput
                            style={styles.input}
                            value={String(editValues.gold_grams_per_m2 !== undefined ? editValues.gold_grams_per_m2 : cost.gold_grams_per_m2)}
                            onChangeText={(text) => setEditValues({...editValues, gold_grams_per_m2: parseFloat(text) || 0})}
                            placeholder="Gold g/m²"
                            keyboardType="numeric"
                          />
                        </View>
                      ) : (
                        <View>
                          <Text style={styles.costCode}>{cost.code}</Text>
                          <Text style={styles.costName}>{cost.name}</Text>
                        </View>
                      )}
                    </View>
                    {isScenarioCost && (
                      <View style={styles.actionButtons}>
                        {isEditing ? (
                          <>
                            <TouchableOpacity
                              style={styles.saveButton}
                              onPress={async () => {
                                await updateScenarioConstructionCost(cost.id, editValues);
                                setEditingId(null);
                                setEditValues({});
                              }}
                            >
                              <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => {
                                setEditingId(null);
                                setEditValues({});
                              }}
                            >
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.iconButton}
                              onPress={() => {
                                setEditingId(cost.id);
                                setEditValues({
                                  code: cost.code,
                                  name: cost.name,
                                  gold_grams_per_m2: cost.gold_grams_per_m2,
                                });
                              }}
                            >
                              <Edit2 size={18} color="#007AFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.iconButton}
                              onPress={() => {
                                Alert.alert(
                                  'Delete Construction Cost',
                                  `Are you sure you want to delete ${cost.code}?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Delete',
                                      style: 'destructive',
                                      onPress: () => deleteScenarioConstructionCost(cost.id),
                                    },
                                  ]
                                );
                              }}
                            >
                              <Trash2 size={18} color="#FF3B30" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  {!isEditing && (
                    <View style={styles.costDetails}>
                      <View style={styles.costDetailRow}>
                        <Text style={styles.costDetailLabel}>Gold Content:</Text>
                        <Text style={styles.costDetailValue}>{cost.gold_grams_per_m2.toFixed(2)} g Au/m²</Text>
                      </View>
                      <View style={styles.costDetailRow}>
                        <Text style={styles.costDetailLabel}>Cost per m²:</Text>
                        <Text style={styles.costDetailValue}>
                          {(cost.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {apartmentTypes.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Building2 size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Apartment Housing Types</Text>
            </View>
            <Text style={styles.sectionDesc}>
              {scenarioHousingTypes.some(h => h.category === 'apartment')
                ? 'Scenario-specific apartment configurations'
                : 'Inherited from project'}
            </Text>
            {apartmentTypes.map(type => renderHousingType(type))}
          </View>
        ) : null}

        {villaTypes.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Home size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Villa Housing Types</Text>
            </View>
            <Text style={styles.sectionDesc}>
              {scenarioHousingTypes.some(h => h.category === 'villa')
                ? 'Scenario-specific villa configurations'
                : 'Inherited from project'}
            </Text>
            {villaTypes.map(type => renderHousingType(type))}
          </View>
        ) : null}

        {commercialTypes.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShoppingBag size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Commercial Housing Types</Text>
            </View>
            <Text style={styles.sectionDesc}>
              {scenarioHousingTypes.some(h => h.category === 'commercial')
                ? 'Scenario-specific commercial configurations'
                : 'Inherited from project'}
            </Text>
            {commercialTypes.map(type => renderHousingType(type))}
          </View>
        ) : null}

        {(equipmentTypes.length > 0 || utilityTypes.length > 0) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Equipment & Utility Buildings</Text>
            </View>
            <Text style={styles.sectionDesc}>
              {scenarioEquipmentUtilityTypes.length > 0
                ? 'Scenario-specific equipment and utility configurations'
                : 'Inherited from project'}
            </Text>
            {equipmentTypes.map(type => renderEquipmentUtilityType(type, 'equipment'))}
            {utilityTypes.map(type => renderEquipmentUtilityType(type, 'utility'))}
          </View>
        ) : null}
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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
  paramHeaderWithActions: {
    alignItems: 'flex-start',
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
  equipmentIcon: {
    backgroundColor: '#FFF3E0',
  },
  utilityIcon: {
    backgroundColor: '#E8F5E9',
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
    alignSelf: 'flex-start',
  },
  costTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#007AFF',
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
  costHeaderWithActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  costHeaderContent: {
    flex: 1,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  editForm: {
    gap: 8,
    width: '100%',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    color: '#6C757D',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
