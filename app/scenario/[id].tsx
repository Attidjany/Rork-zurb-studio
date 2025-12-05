import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Settings2 } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import {
  UNIT_BUILD_AREAS,
  BUILDING_TYPES,
  VILLA_LAYOUTS,
  HOUSING_TYPES,
} from '@/constants/typologies';
import { DbBlock, DbHalfBlock } from '@/types';

export default function ScenarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    scenarios,
    sites,
    projects,
    getBlocksBySiteId,
    getHalfBlocksByBlockId,
    getUnitsByHalfBlockId,
    getProjectConstructionCostsByProjectId,
    getProjectHousingTypesByProjectId,
    getProjectEquipmentUtilityTypesByProjectId,
    loadScenarios,
    loadBlocks,
    loadHalfBlocks,
    loadUnits,
    loadProjectConstructionCosts,
    loadProjectHousingTypes,
    loadProjectEquipmentUtilityTypes,
    getScenarioConstructionCostsByScenarioId,
    getScenarioHousingTypesByScenarioId,
    getScenarioEquipmentUtilityTypesByScenarioId,
    loadScenarioConstructionCosts,
    loadScenarioHousingTypes,
    loadScenarioEquipmentUtilityTypes,
  } = useZURB();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { user } = useAuth();
  const [occupancyRates, setOccupancyRates] = useState<{
    min_area_m2: number;
    max_area_m2: number | null;
    people_per_unit: number;
    category: string;
  }[]>([]);

  useEffect(() => {
    const loadOccupancyRates = async () => {
      if (!user) return;
      
      try {
        const { data: accountSettings, error: settingsError } = await supabase
          .from('account_settings')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (settingsError) throw settingsError;

        const { data: rates, error: ratesError } = await supabase
          .from('account_occupancy_rates')
          .select('*')
          .eq('account_settings_id', accountSettings.id)
          .order('category', { ascending: true })
          .order('min_area_m2', { ascending: true });

        if (ratesError) throw ratesError;

        setOccupancyRates(rates || []);
      } catch (error) {
        console.error('[Scenario] Error loading occupancy rates:', error);
      }
    };

    loadOccupancyRates();
  }, [user]);

  const getOccupancyRate = useCallback((area: number, category: 'villa' | 'apartment'): number => {
    const rate = occupancyRates.find(
      r => r.category === category &&
           r.min_area_m2 <= area &&
           (r.max_area_m2 === null || area <= r.max_area_m2)
    );
    return rate ? rate.people_per_unit : (category === 'villa' ? 4 : 3);
  }, [occupancyRates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadScenarios(), loadBlocks(), loadHalfBlocks(), loadUnits(), loadProjectConstructionCosts(), loadProjectHousingTypes(), loadProjectEquipmentUtilityTypes(), loadScenarioConstructionCosts(), loadScenarioHousingTypes(), loadScenarioEquipmentUtilityTypes()]);
    setRefreshing(false);
  };

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
  }, [scenario, getScenarioConstructionCostsByScenarioId]);

  const projectHousingTypes = useMemo(() => {
    if (!project) return [];
    return getProjectHousingTypesByProjectId(project.id);
  }, [getProjectHousingTypesByProjectId, project]);

  const scenarioHousingTypes = useMemo(() => {
    if (!scenario) return [];
    return getScenarioHousingTypesByScenarioId(scenario.id);
  }, [scenario, getScenarioHousingTypesByScenarioId]);

  const projectEquipmentUtilityTypes = useMemo(() => {
    if (!project) return [];
    return getProjectEquipmentUtilityTypesByProjectId(project.id);
  }, [getProjectEquipmentUtilityTypesByProjectId, project]);

  const scenarioEquipmentUtilityTypes = useMemo(() => {
    if (!scenario) return [];
    return getScenarioEquipmentUtilityTypesByScenarioId(scenario.id);
  }, [scenario, getScenarioEquipmentUtilityTypesByScenarioId]);

  const mergedConstructionCosts = useMemo(() => {
    return scenarioConstructionCosts.length > 0 ? scenarioConstructionCosts : projectConstructionCosts;
  }, [scenarioConstructionCosts, projectConstructionCosts]);

  const mergedHousingTypes = useMemo(() => {
    return scenarioHousingTypes.length > 0 ? scenarioHousingTypes : projectHousingTypes;
  }, [scenarioHousingTypes, projectHousingTypes]);

  const mergedEquipmentUtilityTypes = useMemo(() => {
    return scenarioEquipmentUtilityTypes.length > 0 ? scenarioEquipmentUtilityTypes : projectEquipmentUtilityTypes;
  }, [scenarioEquipmentUtilityTypes, projectEquipmentUtilityTypes]);

  const siteBlocks = useMemo(() => {
    if (!scenario) return [];
    return getBlocksBySiteId(scenario.site_id);
  }, [getBlocksBySiteId, scenario]);

  const summary = useMemo(() => {
    if (!scenario) {
      return {
        totalResidentialUnits: 0,
        totalBuildArea: 0,
        totalCosts: 0,
        totalRevenue: 0,
        unitsByType: {},
        equipmentByType: {},
        utilityByType: {},
        equipmentCount: 0,
        utilityCount: 0,
        rentalPeriodYears: 20,
        estimatedPopulation: 0,
      };
    }

    let totalResidentialUnits = 0;
    let totalBuildArea = 0;
    let totalCosts = 0;
    let totalRevenue = 0;
    let equipmentCount = 0;
    let utilityCount = 0;
    let estimatedPopulation = 0;
    const unitsByType: { [key: string]: number } = {};
    const equipmentByType: { [key: string]: number } = {};
    const utilityByType: { [key: string]: number } = {};

    siteBlocks.forEach((block: DbBlock) => {
      const halfBlocks = getHalfBlocksByBlockId(block.id);

      halfBlocks.forEach((hb: DbHalfBlock) => {
        const units = getUnitsByHalfBlockId(hb.id);

        if (hb.type === 'villas' && hb.villa_layout) {
          const units = getUnitsByHalfBlockId(hb.id);
          
          units.forEach(unit => {
            if (unit.unit_type === 'villa' && unit.size_m2) {
              totalResidentialUnits++;
              
              const villaType = unit.building_type || 'BMS';
              unitsByType[villaType] = (unitsByType[villaType] || 0) + 1;
              
              const projectHousing = mergedHousingTypes.find(h => h.code === villaType);
              const housingConfig = HOUSING_TYPES[villaType];
              const buildArea = projectHousing ? projectHousing.default_area_m2 : (housingConfig?.defaultArea || unit.size_m2 * 0.3);
              
              const costTypeCode = projectHousing?.default_cost_type || housingConfig?.defaultCostType || 'ZME';
              const costParam = mergedConstructionCosts.find((c) => c.code === costTypeCode);
              const costPerM2 = costParam ? costParam.gold_grams_per_m2 * 85 * 656 : 1000;
              
              const rentMonthly = projectHousing ? projectHousing.default_rent_monthly : (housingConfig?.defaultRent || 500000);

              const occupancyRate = getOccupancyRate(unit.size_m2, 'villa');
              estimatedPopulation += occupancyRate;

              totalBuildArea += buildArea;
              totalCosts += buildArea * costPerM2;
              totalRevenue += rentMonthly * 12 * (scenario.rental_period_years || 20);
            }
          });
        } else if (hb.type === 'apartments' && hb.apartment_layout) {
          const buildingConfig = BUILDING_TYPES.find(bt => bt.id === hb.apartment_layout);
          if (buildingConfig?.units) {
            Object.entries(buildingConfig.units).forEach(([unitType, count]) => {
              const numBuildings = units.filter(u => u.unit_type === 'apartment').length;
              const totalCount = count * numBuildings;
              
              totalResidentialUnits += totalCount;
              unitsByType[unitType] = (unitsByType[unitType] || 0) + totalCount;

              const projectHousing = mergedHousingTypes.find(h => h.code === unitType);
              const costParam = mergedConstructionCosts.find((c) => c.code === projectHousing?.default_cost_type);
              const housingConfig = HOUSING_TYPES[unitType];
              const buildArea = projectHousing ? projectHousing.default_area_m2 : (housingConfig?.defaultArea || 80);
              const costPerM2 = costParam ? costParam.gold_grams_per_m2 * 85 * 656 : 900;
              const rentMonthly = projectHousing ? projectHousing.default_rent_monthly : (housingConfig?.defaultRent || 400);

              const occupancyRate = getOccupancyRate(buildArea, 'apartment');
              estimatedPopulation += occupancyRate * totalCount;

              totalBuildArea += buildArea * totalCount;
              totalCosts += buildArea * costPerM2 * totalCount;
              totalRevenue += rentMonthly * 12 * (scenario.rental_period_years || 20) * totalCount;
            });
          }

          units.forEach(unit => {
            if (unit.unit_type === 'equipment') {
              equipmentCount++;
              const buildingType = unit.building_type || 'EQS';
              equipmentByType[buildingType] = (equipmentByType[buildingType] || 0) + 1;
              
              const projectEquipment = mergedEquipmentUtilityTypes.find(e => e.code === buildingType && e.category === 'equipment');
              const buildingTypeConfig = BUILDING_TYPES.find(bt => bt.id === buildingType);
              
              const landArea = projectEquipment ? projectEquipment.land_area_m2 : (buildingTypeConfig?.landArea || 1800);
              const occupation = projectEquipment ? projectEquipment.building_occupation_pct : (buildingTypeConfig?.buildingOccupation || 0.3);
              const buildArea = landArea * occupation;
              
              const costTypeCode = projectEquipment ? projectEquipment.cost_type : 'ZMER';
              const projectCost = mergedConstructionCosts.find(c => c.code === costTypeCode);
              const costPerM2 = projectCost ? projectCost.gold_grams_per_m2 * 85 * 656 : 0;

              totalBuildArea += buildArea;
              totalCosts += buildArea * costPerM2;
            } else if (unit.unit_type === 'utility') {
              utilityCount++;
              const buildingType = unit.building_type || 'UTL';
              utilityByType[buildingType] = (utilityByType[buildingType] || 0) + 1;
              
              const projectUtility = mergedEquipmentUtilityTypes.find(e => e.code === buildingType && e.category === 'utility');
              const buildingTypeConfig = BUILDING_TYPES.find(bt => bt.id === buildingType);
              
              const landArea = projectUtility ? projectUtility.land_area_m2 : (buildingTypeConfig?.landArea || 1800);
              const occupation = projectUtility ? projectUtility.building_occupation_pct : (buildingTypeConfig?.buildingOccupation || 0.3);
              const buildArea = landArea * occupation;
              
              const costTypeCode = projectUtility ? projectUtility.cost_type : 'ZMER';
              const projectCost = mergedConstructionCosts.find(c => c.code === costTypeCode);
              const costPerM2 = projectCost ? projectCost.gold_grams_per_m2 * 85 * 656 : 0;

              totalBuildArea += buildArea;
              totalCosts += buildArea * costPerM2;
            }
          });
        }
      });
    });

    const rentalPeriodYears = scenario.rental_period_years || 20;

    return {
      totalResidentialUnits,
      totalBuildArea,
      totalCosts,
      totalRevenue,
      unitsByType,
      equipmentByType,
      utilityByType,
      equipmentCount,
      utilityCount,
      rentalPeriodYears,
      estimatedPopulation,
    };
  }, [scenario, siteBlocks, getHalfBlocksByBlockId, getUnitsByHalfBlockId, mergedConstructionCosts, mergedHousingTypes, mergedEquipmentUtilityTypes, getOccupancyRate]);

  if (!scenario || !site) {
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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <TouchableOpacity
          style={styles.parametersButton}
          onPress={() => router.push(`/scenario-parameters/${id}`)}
        >
          <Settings2 size={20} color="#007AFF" />
          <Text style={styles.parametersButtonText}>Configure Scenario Parameters</Text>
        </TouchableOpacity>



        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Scenario Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Residential Units</Text>
            <Text style={styles.summaryValue}>{summary.totalResidentialUnits}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Population</Text>
            <Text style={styles.summaryValue}>{summary.estimatedPopulation} people</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Equipment Buildings</Text>
            <Text style={styles.summaryValue}>{summary.equipmentCount}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Utility Buildings</Text>
            <Text style={styles.summaryValue}>{summary.utilityCount}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Build Area</Text>
            <Text style={styles.summaryValue}>{summary.totalBuildArea.toFixed(0)} m²</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Costs</Text>
            <Text style={styles.summaryValue}>
              {summary.totalCosts.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expected Revenue</Text>
            <Text style={styles.summaryValue}>
              {summary.totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rental Period</Text>
            <Text style={styles.summaryValue}>{summary.rentalPeriodYears} years</Text>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Residential Units</Text>
          {Object.entries(summary.unitsByType).length === 0 ? (
            <Text style={styles.emptyText}>No units configured yet</Text>
          ) : (
            Object.entries(summary.unitsByType).map(([type, count]) => {
              const projectHousing = mergedHousingTypes.find(h => h.code === type);
              const housingConfig = HOUSING_TYPES[type];
              const name = projectHousing ? projectHousing.name : (housingConfig?.name || type);
              const area = projectHousing ? projectHousing.default_area_m2 : (housingConfig?.defaultArea || 0);
              return (
                <View key={type} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelContainer}>
                    <Text style={styles.breakdownLabel}>{type}</Text>
                    <Text style={styles.breakdownSubLabel}>{name}</Text>
                  </View>
                  <View style={styles.breakdownValueContainer}>
                    <Text style={styles.breakdownValue}>{count} units</Text>
                    {area > 0 && (
                      <Text style={styles.breakdownSubValue}>
                        {area.toFixed(0)} m² each
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {(Object.keys(summary.equipmentByType).length > 0 || Object.keys(summary.utilityByType).length > 0) && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Equipment & Utility Buildings</Text>
            
            {Object.entries(summary.equipmentByType).map(([type, count]) => {
              const projectEquipment = mergedEquipmentUtilityTypes.find(e => e.code === type && e.category === 'equipment');
              const name = projectEquipment ? projectEquipment.name : type;
              const area = projectEquipment ? projectEquipment.land_area_m2 : 0;
              return (
                <View key={`equipment-${type}`} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelContainer}>
                    <Text style={styles.breakdownLabel}>{type}</Text>
                    <Text style={styles.breakdownSubLabel}>{name} (Equipment)</Text>
                  </View>
                  <View style={styles.breakdownValueContainer}>
                    <Text style={styles.breakdownValue}>{count} building{count > 1 ? 's' : ''}</Text>
                    {area > 0 && (
                      <Text style={styles.breakdownSubValue}>
                        {area.toFixed(0)} m² land
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
            
            {Object.entries(summary.utilityByType).map(([type, count]) => {
              const projectUtility = mergedEquipmentUtilityTypes.find(e => e.code === type && e.category === 'utility');
              const name = projectUtility ? projectUtility.name : type;
              const area = projectUtility ? projectUtility.land_area_m2 : 0;
              return (
                <View key={`utility-${type}`} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelContainer}>
                    <Text style={styles.breakdownLabel}>{type}</Text>
                    <Text style={styles.breakdownSubLabel}>{name} (Utility)</Text>
                  </View>
                  <View style={styles.breakdownValueContainer}>
                    <Text style={styles.breakdownValue}>{count} building{count > 1 ? 's' : ''}</Text>
                    {area > 0 && (
                      <Text style={styles.breakdownSubValue}>
                        {area.toFixed(0)} m² land
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {scenario.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{scenario.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
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
  parametersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
    gap: 8,
  },
  parametersButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#000000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000000',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic' as const,
    textAlign: 'center',
    paddingVertical: 16,
  },
  breakdownLabelContainer: {
    flex: 1,
  },
  breakdownSubLabel: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  breakdownValueContainer: {
    alignItems: 'flex-end',
  },
  breakdownSubValue: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});
