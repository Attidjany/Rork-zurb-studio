import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Settings, Sparkles } from 'lucide-react-native';
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import { useAuth } from '@/contexts/AuthContext';

import {
  VILLA_LAYOUTS,
  APARTMENT_LAYOUTS,
  BUILDING_TYPES,
  EQUIPMENT_OPTIONS,
  UTILITY_OPTIONS,
  VILLA_TYPE_OPTIONS,
  HOUSING_TYPES,
  CONSTRUCTION_COSTS,
} from '@/constants/typologies';
import { supabase } from '@/lib/supabase';
import { DbBlock, DbHalfBlock, VillaLayout, ApartmentLayout, HalfBlockType, BuildingType } from '@/types';

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[FetchRetry] Attempt ${attempt + 1}/${maxRetries} for ${url}`);
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : baseDelayMs * Math.pow(2, attempt);
        
        console.log(`[FetchRetry] Rate limited (429), waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`[FetchRetry] Server error (${response.status}), waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`[FetchRetry] Attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`[FetchRetry] Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

type UnitTypeInfo = {
  count: number;
  totalArea: number;
  monthlyRent: number;
  costType: string;
  unitCost: number;
  totalTypeCost: number;
};

type ProjectHousingType = {
  code: string;
  name?: string;
  default_rent_monthly?: number;
};

type ScenarioResult = {
  scenarios: {
    name: string;
    strategyDescription: string;
    rentalPeriodYears: number;
    housingTypeRentals: {
      code: string;
      proposedRent: number;
      reasoning: string;
    }[];
    thinkingProcess: string[];
  }[];
};

async function generateExtremeScenarios(
  siteId: string,
  userId: string,
  totalConstructionCost: number,
  unitTypeCounts: { [key: string]: UnitTypeInfo },
  maxPeriod: number,
  projectHousingTypes: ProjectHousingType[] | null,
  addThought: (thought: string) => void
) {
  // EXTREME 1: Longest period + lowest rent for 100% surplus
  addThought('\n🔴 EXTREME 1: Finding lowest rent for 100% surplus...');
  
  // Target: 100% surplus means total revenue = 2 * totalConstructionCost
  const targetRevenue100 = totalConstructionCost * 2;
  
  // Use maximum period allowed
  const extreme1Period = maxPeriod;
  
  // Calculate required monthly rent to achieve target
  const totalMonthsExtreme1 = extreme1Period * 12;
  
  // Calculate proportional rent reduction needed
  const currentTotalMonthlyRent = Object.values(unitTypeCounts).reduce((sum, v) => sum + (v.monthlyRent * v.count), 0);
  const currentTotalRevenue = currentTotalMonthlyRent * totalMonthsExtreme1;
  const rentMultiplier100 = targetRevenue100 / currentTotalRevenue;
  
  const extreme1Rentals: { code: string; rent: number }[] = [];
  let extreme1TotalRevenue = 0;
  const extreme1RentalDetails: string[] = [];
  
  for (const [code, info] of Object.entries(unitTypeCounts)) {
    const adjustedRent = Math.round(info.monthlyRent * rentMultiplier100);
    extreme1Rentals.push({ code, rent: adjustedRent });
    extreme1TotalRevenue += adjustedRent * info.count * totalMonthsExtreme1;
    const housing = HOUSING_TYPES[code];
    const projectHousing = projectHousingTypes?.find(h => h.code === code);
    const name = projectHousing?.name || housing?.name || code;
    const pctChange = ((adjustedRent - info.monthlyRent) / info.monthlyRent * 100).toFixed(0);
    extreme1RentalDetails.push(`${name}: ${adjustedRent.toLocaleString()} XOF/month (${parseInt(pctChange) >= 0 ? '+' : ''}${pctChange}%)`);
  }
  
  const extreme1Surplus = ((extreme1TotalRevenue - totalConstructionCost) / totalConstructionCost) * 100;
  const extreme1BreakEvenMonths = totalConstructionCost / (extreme1TotalRevenue / totalMonthsExtreme1);
  const extreme1BreakEvenYears = Math.floor(extreme1BreakEvenMonths / 12);
  const extreme1BreakEvenMonthsRem = Math.round(extreme1BreakEvenMonths % 12);
  const extreme1BreakEvenDisplay = extreme1BreakEvenMonthsRem > 0
    ? `${extreme1BreakEvenYears} years ${extreme1BreakEvenMonthsRem} months`
    : `${extreme1BreakEvenYears} years`;
  
  const extreme1Notes = `🔴 EXTREME TEST: Maximum period with lowest possible rent for 100% surplus.\n\n` +
    `📊 Financial Summary:\n` +
    `• Duration: ${extreme1Period} years (maximum allowed)\n` +
    `• Total Investment: ${totalConstructionCost.toLocaleString()} XOF\n` +
    `• Total Revenue: ${extreme1TotalRevenue.toLocaleString()} XOF\n` +
    `• Surplus: +${extreme1Surplus.toFixed(1)}% (${(extreme1TotalRevenue - totalConstructionCost).toLocaleString()} XOF)\n` +
    `• ⏱️ Break-even: ${extreme1BreakEvenDisplay}\n\n` +
    `🏠 Rental Levels (lowest for 100% surplus):\n${extreme1RentalDetails.join('\n')}`;
  
  const { data: extreme1Scenario, error: err1 } = await supabase
    .from('scenarios')
    .insert({
      site_id: siteId,
      name: '🔴 Extreme: 100% Surplus (Lowest Rent)',
      notes: extreme1Notes,
      rental_period_years: extreme1Period,
      is_auto_scenario: true,
      created_by: userId,
    })
    .select()
    .single();
  
  if (!err1 && extreme1Scenario) {
    await new Promise(resolve => setTimeout(resolve, 500));
    for (const rental of extreme1Rentals) {
      await supabase
        .from('scenario_housing_types')
        .update({ default_rent_monthly: rental.rent })
        .eq('scenario_id', extreme1Scenario.id)
        .eq('code', rental.code);
    }
    addThought(`   ✅ Created: ${extreme1Period} yrs, +${extreme1Surplus.toFixed(0)}% surplus, break-even ${extreme1BreakEvenDisplay}`);
  }
  
  // EXTREME 2: Lowest rent for 30% surplus in 7 years
  addThought('\n🔴 EXTREME 2: Finding lowest rent for 30% surplus in 7 years...');
  
  const extreme2Period = 7;
  const targetRevenue30 = totalConstructionCost * 1.30; // 30% surplus
  const totalMonthsExtreme2 = extreme2Period * 12;
  
  const currentTotalRevenue7yr = currentTotalMonthlyRent * totalMonthsExtreme2;
  const rentMultiplier30 = targetRevenue30 / currentTotalRevenue7yr;
  
  const extreme2Rentals: { code: string; rent: number }[] = [];
  let extreme2TotalRevenue = 0;
  const extreme2RentalDetails: string[] = [];
  
  for (const [code, info] of Object.entries(unitTypeCounts)) {
    const adjustedRent = Math.round(info.monthlyRent * rentMultiplier30);
    extreme2Rentals.push({ code, rent: adjustedRent });
    extreme2TotalRevenue += adjustedRent * info.count * totalMonthsExtreme2;
    const housing = HOUSING_TYPES[code];
    const projectHousing = projectHousingTypes?.find(h => h.code === code);
    const name = projectHousing?.name || housing?.name || code;
    const pctChange = ((adjustedRent - info.monthlyRent) / info.monthlyRent * 100).toFixed(0);
    extreme2RentalDetails.push(`${name}: ${adjustedRent.toLocaleString()} XOF/month (${parseInt(pctChange) >= 0 ? '+' : ''}${pctChange}%)`);
  }
  
  const extreme2Surplus = ((extreme2TotalRevenue - totalConstructionCost) / totalConstructionCost) * 100;
  const extreme2BreakEvenMonths = totalConstructionCost / (extreme2TotalRevenue / totalMonthsExtreme2);
  const extreme2BreakEvenYears = Math.floor(extreme2BreakEvenMonths / 12);
  const extreme2BreakEvenMonthsRem = Math.round(extreme2BreakEvenMonths % 12);
  const extreme2BreakEvenDisplay = extreme2BreakEvenMonthsRem > 0
    ? `${extreme2BreakEvenYears} years ${extreme2BreakEvenMonthsRem} months`
    : `${extreme2BreakEvenYears} years`;
  
  const extreme2Notes = `🔴 EXTREME TEST: Minimum surplus (30%) in shortest viable period (7 years).\n\n` +
    `📊 Financial Summary:\n` +
    `• Duration: ${extreme2Period} years\n` +
    `• Total Investment: ${totalConstructionCost.toLocaleString()} XOF\n` +
    `• Total Revenue: ${extreme2TotalRevenue.toLocaleString()} XOF\n` +
    `• Surplus: +${extreme2Surplus.toFixed(1)}% (${(extreme2TotalRevenue - totalConstructionCost).toLocaleString()} XOF)\n` +
    `• ⏱️ Break-even: ${extreme2BreakEvenDisplay}\n\n` +
    `🏠 Rental Levels (minimum for 30% in 7 years):\n${extreme2RentalDetails.join('\n')}`;
  
  const { data: extreme2Scenario, error: err2 } = await supabase
    .from('scenarios')
    .insert({
      site_id: siteId,
      name: '🔴 Extreme: 30% Surplus in 7 Years',
      notes: extreme2Notes,
      rental_period_years: extreme2Period,
      is_auto_scenario: true,
      created_by: userId,
    })
    .select()
    .single();
  
  if (!err2 && extreme2Scenario) {
    await new Promise(resolve => setTimeout(resolve, 500));
    for (const rental of extreme2Rentals) {
      await supabase
        .from('scenario_housing_types')
        .update({ default_rent_monthly: rental.rent })
        .eq('scenario_id', extreme2Scenario.id)
        .eq('code', rental.code);
    }
    addThought(`   ✅ Created: ${extreme2Period} yrs, +${extreme2Surplus.toFixed(0)}% surplus, break-even ${extreme2BreakEvenDisplay}`);
  }
  
  addThought('\n🔴 Extreme scenarios generated!');
}

export default function SiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    sites,
    projects,
    getBlocksBySiteId,
    getHalfBlocksByBlockId,
    getUnitsByHalfBlockId,
    loadSites,
    loadBlocks,
    loadHalfBlocks,
    loadUnits,
    loadScenarios,
    updateHalfBlock,
    createUnit,
    updateUnit,
    loadScenarioHousingTypes,
    loadScenarioConstructionCosts,
    loadScenarioEquipmentUtilityTypes,
  } = useZURB();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [configModalVisible, setConfigModalVisible] = useState<boolean>(false);
  const [selectedHalfBlockId, setSelectedHalfBlockId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<DbBlock | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState<boolean>(false);
  const [selectedHalfBlocks, setSelectedHalfBlocks] = useState<Set<string>>(new Set());
  const [buildingAssignModalVisible, setBuildingAssignModalVisible] = useState<boolean>(false);
  const [villaTypeModalVisible, setVillaTypeModalVisible] = useState<boolean>(false);
  const [generatingScenarios, setGeneratingScenarios] = useState<boolean>(false);
  const [aiThinking, setAiThinking] = useState<string[]>([]);
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(false);
  const [generationComplete, setGenerationComplete] = useState<boolean>(false);

  const handleRefresh = useCallback(async () => {
    console.log('[Site] Manual refresh triggered');
    setRefreshing(true);
    await Promise.all([loadSites(), loadBlocks(), loadHalfBlocks(), loadUnits()]);
    setRefreshing(false);
  }, [loadSites, loadBlocks, loadHalfBlocks, loadUnits]);

  const site = useMemo(() => {
    return sites.find(s => s.id === id) || null;
  }, [sites, id]);

  const siteBlocks = useMemo(() => {
    return getBlocksBySiteId(id || '');
  }, [getBlocksBySiteId, id]);

  const openHalfBlockConfig = useCallback((halfBlock: DbHalfBlock, block: DbBlock) => {
    setSelectedHalfBlockId(halfBlock.id);
    setSelectedBlock(block);
    setConfigModalVisible(true);
  }, []);

  const handleSelectType = useCallback(async (type: HalfBlockType) => {
    if (!selectedHalfBlockId) return;
    console.log('[Site] Selecting type:', type, 'for half block:', selectedHalfBlockId);
    await updateHalfBlock(selectedHalfBlockId, type);
  }, [selectedHalfBlockId, updateHalfBlock]);

  const handleSelectVillaLayout = useCallback(async (layout: VillaLayout) => {
    if (!selectedHalfBlockId) return;
    console.log('[Site] Selecting villa layout:', layout, 'for half block:', selectedHalfBlockId);
    await updateHalfBlock(selectedHalfBlockId, 'villas', layout);
    
    const villaConfig = VILLA_LAYOUTS.find(l => l.id === layout);
    const units = getUnitsByHalfBlockId(selectedHalfBlockId);
    
    if (units.length === 0 && villaConfig) {
      console.log('[Site] Creating', villaConfig.plots.length, 'villa units');
      let unitNumber = 1;
      for (const plot of villaConfig.plots) {
        for (let i = 0; i < plot.count; i++) {
          await createUnit(
            selectedHalfBlockId,
            unitNumber++,
            'villa',
            plot.size,
            undefined,
            undefined,
            undefined
          );
        }
      }
      await loadUnits();
    }
    
    setConfigModalVisible(false);
    setVillaTypeModalVisible(false);
    setSelectedHalfBlockId(null);
    setSelectedBlock(null);
  }, [selectedHalfBlockId, updateHalfBlock, getUnitsByHalfBlockId, createUnit, loadUnits]);

  const handleSelectApartmentLayout = useCallback(async (layout: ApartmentLayout) => {
    if (!selectedHalfBlockId) return;
    console.log('[Site] Selecting apartment layout:', layout, 'for half block:', selectedHalfBlockId);
    await updateHalfBlock(selectedHalfBlockId, 'apartments', undefined, layout);
    
    const units = getUnitsByHalfBlockId(selectedHalfBlockId);
    const apartmentConfig = APARTMENT_LAYOUTS.find(l => l.id === layout);
    
    if (units.length === 0 && apartmentConfig) {
      console.log('[Site] Creating', apartmentConfig.totalBuildings, 'apartment units');
      for (let i = 0; i < apartmentConfig.totalBuildings; i++) {
        let unitType = 'apartment';
        let buildingType: BuildingType = layout;
        
        if (i >= apartmentConfig.apartmentBuildings && i < apartmentConfig.apartmentBuildings + apartmentConfig.equipmentSpots) {
          unitType = 'equipment';
          buildingType = 'EQS';
        } else if (i >= apartmentConfig.apartmentBuildings + apartmentConfig.equipmentSpots) {
          unitType = 'utility';
          buildingType = 'UTL';
        }
        
        await createUnit(
          selectedHalfBlockId,
          i + 1,
          unitType,
          undefined,
          buildingType,
          undefined,
          undefined
        );
      }
      await loadUnits();
    }
    
    setConfigModalVisible(false);
    setSelectedHalfBlockId(null);
    setSelectedBlock(null);
  }, [selectedHalfBlockId, updateHalfBlock, getUnitsByHalfBlockId, createUnit, loadUnits]);

  const toggleBulkSelect = useCallback((halfBlockId: string) => {
    setSelectedHalfBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(halfBlockId)) {
        newSet.delete(halfBlockId);
      } else {
        newSet.add(halfBlockId);
      }
      return newSet;
    });
  }, []);

  const applyBulkType = useCallback(async (type: HalfBlockType, villaLayout?: VillaLayout) => {
    const promises = Array.from(selectedHalfBlocks).map(hbId =>
      updateHalfBlock(hbId, type, villaLayout)
    );
    await Promise.all(promises);
    setSelectedHalfBlocks(new Set());
    setBulkEditMode(false);
  }, [selectedHalfBlocks, updateHalfBlock]);

  const handleUpdateBuildingType = useCallback(async (unitId: string, buildingType: BuildingType) => {
    await updateUnit(unitId, { building_type: buildingType });
  }, [updateUnit]);

  const handleUpdateVillaType = useCallback(async (unitId: string, villaType: BuildingType) => {
    console.log('[Site] Updating villa type for unit:', unitId, 'to:', villaType);
    await updateUnit(unitId, { building_type: villaType });
  }, [updateUnit]);

  const handleUpdateEquipmentName = useCallback(async (unitId: string, equipmentName: string) => {
    await updateUnit(unitId, { equipment_name: equipmentName });
  }, [updateUnit]);

  const handleUpdateUtilityName = useCallback(async (unitId: string, utilityName: string) => {
    await updateUnit(unitId, { utility_name: utilityName });
  }, [updateUnit]);



  const handleGenerateAutoScenarios = useCallback(async () => {
    if (!id || !user || !site) return;
    
    setGeneratingScenarios(true);
    setShowAiOverlay(true);
    setGenerationComplete(false);
    setAiThinking([]);
    
    const addThought = (thought: string) => {
      setAiThinking(prev => [...prev, thought]);
    };
    
    addThought('🔍 Analyzing block configuration...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const blocks = getBlocksBySiteId(id);
    const project = projects.find(p => p.id === site.project_id);
    
    const { data: projectHousingTypes } = await supabase
      .from('project_housing_types')
      .select('*')
      .eq('project_id', project?.id || '');
    
    const unitTypeCounts: { [key: string]: { count: number; totalArea: number; monthlyRent: number; costType: string; unitCost: number; totalTypeCost: number } } = {};
    let totalConstructionCost = 0;
    let totalMonthlyRent = 0;
    
    const { data: projectConstructionCosts } = await supabase
      .from('project_construction_costs')
      .select('*')
      .eq('project_id', project?.id || '');
    
    const goldPrice = 55720;
    
    blocks.forEach(block => {
      const hbs = getHalfBlocksByBlockId(block.id);
      hbs.forEach(hb => {
        if (hb.type === 'villas' && hb.villa_layout) {
          const units = getUnitsByHalfBlockId(hb.id);
          units.forEach(unit => {
            if (unit.unit_type === 'villa' && unit.building_type) {
              const villaType = unit.building_type;
              const projectHousing = projectHousingTypes?.find(h => h.code === villaType);
              const housing = HOUSING_TYPES[villaType];
              
              if (housing || projectHousing) {
                const area = projectHousing?.default_area_m2 || housing?.defaultArea || 100;
                const rent = projectHousing?.default_rent_monthly || housing?.defaultRent || 500000;
                const costTypeCode = projectHousing?.default_cost_type || housing?.defaultCostType || 'ZME';
                
                const projectCost = projectConstructionCosts?.find(c => c.code === costTypeCode);
                const defaultCostConfig = CONSTRUCTION_COSTS[costTypeCode];
                const goldGramsPerM2 = projectCost?.gold_grams_per_m2 || defaultCostConfig?.goldGramsPerM2 || 14.91;
                const costPerM2 = goldGramsPerM2 * goldPrice;
                const unitCost = area * costPerM2;
                
                if (!unitTypeCounts[villaType]) {
                  unitTypeCounts[villaType] = { count: 0, totalArea: 0, monthlyRent: rent, costType: costTypeCode, unitCost, totalTypeCost: 0 };
                }
                unitTypeCounts[villaType].count++;
                unitTypeCounts[villaType].totalArea += area;
                unitTypeCounts[villaType].totalTypeCost += unitCost;
                
                totalConstructionCost += unitCost;
                totalMonthlyRent += rent;
              }
            }
          });
        } else if (hb.type === 'apartments' && hb.apartment_layout) {
          const buildingConfig = BUILDING_TYPES.find(bt => bt.id === hb.apartment_layout);
          const units = getUnitsByHalfBlockId(hb.id);
          const numApartmentBuildings = units.filter(u => u.unit_type === 'apartment').length;
          
          if (buildingConfig?.units) {
            Object.entries(buildingConfig.units).forEach(([unitType, countPerBuilding]) => {
              const projectHousing = projectHousingTypes?.find(h => h.code === unitType);
              const housing = HOUSING_TYPES[unitType];
              
              if (housing || projectHousing) {
                const totalCount = countPerBuilding * numApartmentBuildings;
                const area = projectHousing?.default_area_m2 || housing?.defaultArea || 80;
                const rent = projectHousing?.default_rent_monthly || housing?.defaultRent || 300000;
                const costTypeCode = projectHousing?.default_cost_type || housing?.defaultCostType || 'ZME';
                
                const projectCost = projectConstructionCosts?.find(c => c.code === costTypeCode);
                const defaultCostConfig = CONSTRUCTION_COSTS[costTypeCode];
                const goldGramsPerM2 = projectCost?.gold_grams_per_m2 || defaultCostConfig?.goldGramsPerM2 || 14.91;
                const costPerM2 = goldGramsPerM2 * goldPrice;
                const unitCost = area * costPerM2;
                
                if (!unitTypeCounts[unitType]) {
                  unitTypeCounts[unitType] = { count: 0, totalArea: 0, monthlyRent: rent, costType: costTypeCode, unitCost, totalTypeCost: 0 };
                }
                unitTypeCounts[unitType].count += totalCount;
                unitTypeCounts[unitType].totalArea += area * totalCount;
                unitTypeCounts[unitType].totalTypeCost += unitCost * totalCount;
                
                totalConstructionCost += unitCost * totalCount;
                totalMonthlyRent += rent * totalCount;
              }
            });
          }
        }
      });
    });
    
    const unitTypes = Object.keys(unitTypeCounts);
    const totalUnits = Object.values(unitTypeCounts).reduce((sum, v) => sum + v.count, 0);
    
    if (totalUnits === 0) {
      addThought('⚠️ No units configured yet. Please configure blocks first.');
      setGenerationComplete(true);
      setGeneratingScenarios(false);
      return;
    }
    
    addThought(`📊 Identified ${totalUnits} units across ${unitTypes.length} housing types:`);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    unitTypes.forEach(type => {
      const info = unitTypeCounts[type];
      const housing = HOUSING_TYPES[type];
      const projectHousing = projectHousingTypes?.find(h => h.code === type);
      const name = projectHousing?.name || housing?.name || type;
      addThought(`   • ${info.count}x ${name} @ ${info.monthlyRent.toLocaleString()} XOF/month`);
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addThought(`💰 Total investment required: ${totalConstructionCost.toLocaleString()} XOF`);
    addThought(`📈 Current monthly income potential: ${totalMonthlyRent.toLocaleString()} XOF`);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const annualRent = totalMonthlyRent * 12;
    const breakEvenYears = totalConstructionCost / annualRent;
    const maxPeriod = project?.max_rental_period_years || 30;
    
    addThought(`⏱️ Minimum break-even: ${breakEvenYears.toFixed(1)} years at current rates`);
    addThought(`📋 Maximum allowed rental period: ${maxPeriod} years`);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addThought('🧠 Thinking about optimal combinations...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addThought('🧠 Thinking about optimal combinations...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const unitTypeDetails = unitTypes.map(type => {
        const info = unitTypeCounts[type];
        const housing = HOUSING_TYPES[type];
        const projectHousing = projectHousingTypes?.find(h => h.code === type);
        const name = projectHousing?.name || housing?.name || type;
        return `- ${type} (${name}): ${info.count} units × ${info.unitCost.toLocaleString()} XOF = ${info.totalTypeCost.toLocaleString()} XOF total construction, base rent ${info.monthlyRent.toLocaleString()} XOF/month`;
      }).join('\n');
      
      const prompt = `Analyze this real estate project and generate 2-3 profitable scenarios.
CONTEXT:
- Investment: ${totalConstructionCost.toLocaleString()} XOF
- Max Period: ${maxPeriod} years
- Current Income: ${totalMonthlyRent.toLocaleString()} XOF
- Break-even: ${breakEvenYears.toFixed(1)} years

UNITS:
${unitTypeDetails}

TASK:
Generate these scenarios JSON:
1. AFFORDABLE: Lower rents (-5 to -15%), longer period, 15-25% surplus.
2. BALANCED: Base rents (±5%), medium period, 25-35% surplus.
3. ACCELERATED: Higher rents (+5 to +15%), shorter period, 15-25% surplus.

OUTPUT FORMAT:
{
  "scenarios": [
    {
      "name": "Scenario Name",
      "strategyDescription": "Brief strategy description",
      "rentalPeriodYears": number,
      "housingTypeRentals": [
        { "code": "unit_code", "proposedRent": number, "reasoning": "brief reason" }
      ],
      "thinkingProcess": ["step 1", "step 2"]
    }
  ]
}

Ensure surplus is POSITIVE (10-40%).
Keep thinkingProcess concise (max 3 steps).`;

      addThought('🤖 AI analyzing optimal rental levels per housing type...');
      
      console.log('[Site] Calling AI generateObject via backend proxy...');
      
      let result: ScenarioResult;
      try {
        const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';
        addThought('🔄 Connecting to AI service...');
        
        const response = await fetchWithRetry(
          `${baseUrl}/api/ai/generate-scenarios-object`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
          },
          3,
          3000
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        
        // The generateObject from SDK returns the object directly matching the schema (or .object property depending on version, but usually direct)
        // Let's assume the backend returns result.object or just result
        // Based on backend implementation: return c.json(result); 
        // generateObject returns { object: T, ... } or just T? 
        // It returns { object: T, usage: ... } in newer SDK, but let's check my backend code.
        // Backend calls generateObject. 
        // Docs say: "generateObject... Returns a promise that resolves to a result object that contains the generated object."
        // It usually returns { object: ... }.
        // BUT wait, in backend/hono.ts I wrote: return c.json(result);
        // If generateObject returns { object: ... }, then result.object is what we want.
        
        if (data.object) {
          result = data.object;
        } else if (data.scenarios) {
           result = data;
        } else {
           // Maybe it is wrapped in object
           result = data.object || data;
        }

      } catch (aiError: any) {
        console.error('[Site] AI generateObject error:', aiError?.message || JSON.stringify(aiError));
        throw aiError;
      }
      
      console.log('[Site] AI generated scenarios:', result);
      
      addThought('✨ Processing AI recommendations...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const createdScenarios: string[] = [];
      for (const scenarioData of result.scenarios) {
        addThought(`\n📝 Creating "${scenarioData.name}"...`);
        
        for (const thought of scenarioData.thinkingProcess.slice(0, 3)) {
          addThought(`   💭 ${thought}`);
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        let scenarioTotalRent = 0;
        for (const rental of scenarioData.housingTypeRentals) {
          const typeInfo = unitTypeCounts[rental.code];
          if (typeInfo) {
            scenarioTotalRent += rental.proposedRent * typeInfo.count * 12 * scenarioData.rentalPeriodYears;
          }
        }
        
        const actualSurplus = totalConstructionCost > 0 
          ? ((scenarioTotalRent - totalConstructionCost) / totalConstructionCost) * 100 
          : 0;
        
        const surplusDisplay = Math.abs(actualSurplus).toFixed(1);
        const surplusSign = actualSurplus >= 0 ? '+' : '-';
        
        const rentalSummary = scenarioData.housingTypeRentals.map(r => {
          const typeInfo = unitTypeCounts[r.code];
          const housing = HOUSING_TYPES[r.code];
          const projectHousing = projectHousingTypes?.find(h => h.code === r.code);
          const name = projectHousing?.name || housing?.name || r.code;
          const originalRent = typeInfo?.monthlyRent || 0;
          const diff = originalRent > 0 ? ((r.proposedRent - originalRent) / originalRent * 100).toFixed(0) : '0';
          return `${name}: ${r.proposedRent.toLocaleString()} XOF/month (${parseInt(diff) >= 0 ? '+' : ''}${diff}%)`;
        }).join('\n');
        
        const breakEvenMonths = totalConstructionCost / (scenarioTotalRent / (scenarioData.rentalPeriodYears * 12));
        const breakEvenYearsCalc = Math.floor(breakEvenMonths / 12);
        const breakEvenMonthsRemainder = Math.round(breakEvenMonths % 12);
        const breakEvenDisplay = breakEvenMonthsRemainder > 0 
          ? `${breakEvenYearsCalc} years ${breakEvenMonthsRemainder} months`
          : `${breakEvenYearsCalc} years`;
        
        const enrichedNotes = `${scenarioData.strategyDescription}\n\n` +
          `📊 Financial Summary:\n` +
          `• Duration: ${scenarioData.rentalPeriodYears} years\n` +
          `• Total Investment: ${totalConstructionCost.toLocaleString()} XOF\n` +
          `• Total Revenue: ${scenarioTotalRent.toLocaleString()} XOF\n` +
          `• Surplus: ${surplusSign}${surplusDisplay}% (${(scenarioTotalRent - totalConstructionCost).toLocaleString()} XOF)\n` +
          `• ⏱️ Break-even: ${breakEvenDisplay}\n\n` +
          `🏠 Rental Levels:\n${rentalSummary}`;
        
        const { data: newScenario, error } = await supabase
          .from('scenarios')
          .insert({
            site_id: id,
            name: scenarioData.name,
            notes: enrichedNotes,
            rental_period_years: scenarioData.rentalPeriodYears,
            is_auto_scenario: true,
            created_by: user.id,
          })
          .select()
          .single();
        
        if (!error && newScenario) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let updateCount = 0;
          for (const rental of scenarioData.housingTypeRentals) {
            const { error: updateError } = await supabase
              .from('scenario_housing_types')
              .update({ default_rent_monthly: Math.round(rental.proposedRent) })
              .eq('scenario_id', newScenario.id)
              .eq('code', rental.code);
            
            if (!updateError) {
              updateCount++;
              console.log(`[Site] Updated ${rental.code} rent to ${rental.proposedRent} for scenario ${newScenario.id}`);
            } else {
              console.error(`[Site] Failed to update ${rental.code}:`, updateError);
            }
          }
          
          createdScenarios.push(scenarioData.name);
          addThought(`   ✅ ${scenarioData.name}: ${scenarioData.rentalPeriodYears} yrs, ${surplusSign}${surplusDisplay}% surplus`);
          console.log('[Site] Created smart scenario:', scenarioData.name, 'updated', updateCount, 'housing types');
        } else {
          console.error('[Site] Failed to create scenario:', error);
          addThought(`   ❌ Failed to create ${scenarioData.name}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (createdScenarios.length > 0) {
        addThought(`\n🎉 Successfully generated ${createdScenarios.length} optimized scenarios!`);
        addThought('💡 Each scenario has custom rental levels per housing type');
      }
      
      addThought('\n🔴 Generating extreme test scenarios...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await generateExtremeScenarios(
        id,
        user.id,
        totalConstructionCost,
        unitTypeCounts,
        maxPeriod,
        projectHousingTypes,
        addThought
      );
      
      await Promise.all([
        loadScenarios(),
        loadScenarioHousingTypes(),
        loadScenarioConstructionCosts(),
        loadScenarioEquipmentUtilityTypes(),
      ]);
      setGenerationComplete(true);
      setGeneratingScenarios(false);
    } catch (error: any) {
      console.error('[Site] Error generating scenarios:', error);
      const errorMessage = error?.message || 'Failed to generate scenarios';
      const errorLower = errorMessage.toLowerCase();
      const isNetworkError = errorLower.includes('load failed') || 
                             errorLower.includes('network') ||
                             errorLower.includes('fetch') ||
                             errorLower.includes('timeout') ||
                             errorLower.includes('server did not start') ||
                             errorLower.includes('rate limit') ||
                             errorLower.includes('temporarily unavailable') ||
                             errorLower.includes('high traffic') ||
                             errorMessage.includes('408') ||
                             errorMessage.includes('429') ||
                             errorMessage.includes('500') ||
                             errorMessage.includes('502') ||
                             errorMessage.includes('503') ||
                             errorMessage.includes('504');
      
      if (isNetworkError) {
        addThought('⚠️ Network error - creating optimized fallback scenarios...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const periodOptions = [
          { name: 'Affordable Access', years: Math.min(Math.ceil(breakEvenYears * 1.3), maxPeriod), rentMultiplier: 0.9 },
          { name: 'Balanced Growth', years: Math.min(Math.ceil(breakEvenYears * 1.2), maxPeriod), rentMultiplier: 1.0 },
          { name: 'Accelerated Return', years: Math.min(Math.ceil(breakEvenYears * 1.15), maxPeriod), rentMultiplier: 1.1 },
        ];
        
        for (const option of periodOptions) {
          let totalRent = 0;
          const rentalDetails: string[] = [];
          
          for (const [code, info] of Object.entries(unitTypeCounts)) {
            const adjustedRent = Math.round(info.monthlyRent * option.rentMultiplier);
            totalRent += adjustedRent * info.count * 12 * option.years;
            const housing = HOUSING_TYPES[code];
            const projectHousing = projectHousingTypes?.find(h => h.code === code);
            const name = projectHousing?.name || housing?.name || code;
            rentalDetails.push(`${name}: ${adjustedRent.toLocaleString()} XOF/month`);
          }
          
          const surplus = ((totalRent - totalConstructionCost) / totalConstructionCost) * 100;
          
          if (surplus < 10) continue;
          
          const fallbackBreakEvenMonths = totalConstructionCost / (totalRent / (option.years * 12));
          const fallbackBreakEvenYears = Math.floor(fallbackBreakEvenMonths / 12);
          const fallbackBreakEvenMonthsRemainder = Math.round(fallbackBreakEvenMonths % 12);
          const fallbackBreakEvenDisplay = fallbackBreakEvenMonthsRemainder > 0
            ? `${fallbackBreakEvenYears} years ${fallbackBreakEvenMonthsRemainder} months`
            : `${fallbackBreakEvenYears} years`;
          
          const notes = `Auto-generated ${option.name.toLowerCase()} scenario.\n\n` +
            `📊 Financial Summary:\n` +
            `• Duration: ${option.years} years\n` +
            `• Total Investment: ${totalConstructionCost.toLocaleString()} XOF\n` +
            `• Total Revenue: ${totalRent.toLocaleString()} XOF\n` +
            `• Surplus: +${surplus.toFixed(1)}% (${(totalRent - totalConstructionCost).toLocaleString()} XOF)\n` +
            `• ⏱️ Break-even: ${fallbackBreakEvenDisplay}\n\n` +
            `🏠 Rental Levels:\n${rentalDetails.join('\n')}`;
          
          const { data: newScenario, error: scError } = await supabase
            .from('scenarios')
            .insert({
              site_id: id,
              name: `${option.name} Scenario`,
              notes,
              rental_period_years: option.years,
              is_auto_scenario: true,
              created_by: user.id,
            })
            .select()
            .single();
          
          if (!scError && newScenario) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            for (const [code, info] of Object.entries(unitTypeCounts)) {
              const adjustedRent = Math.round(info.monthlyRent * option.rentMultiplier);
              await supabase
                .from('scenario_housing_types')
                .update({ default_rent_monthly: adjustedRent })
                .eq('scenario_id', newScenario.id)
                .eq('code', code);
            }
            addThought(`   ✅ ${option.name}: ${option.years} yrs, +${surplus.toFixed(0)}% surplus`);
          }
        }
        
        addThought('\n✅ Created fallback scenarios with optimized rentals');
        await Promise.all([
          loadScenarios(),
          loadScenarioHousingTypes(),
          loadScenarioConstructionCosts(),
          loadScenarioEquipmentUtilityTypes(),
        ]);
        setGenerationComplete(true);
        setGeneratingScenarios(false);
        return;
      }
      
      addThought(`❌ Error: ${errorMessage}`);
      setGenerationComplete(true);
      setGeneratingScenarios(false);
      
      setTimeout(() => {
        Alert.alert(
          'Error',
          errorMessage || 'Failed to generate scenarios. Please try again.',
          [{ text: 'OK' }]
        );
      }, 100);
    }
  }, [id, user, site, projects, getBlocksBySiteId, getHalfBlocksByBlockId, getUnitsByHalfBlockId, loadScenarios, loadScenarioHousingTypes, loadScenarioConstructionCosts, loadScenarioEquipmentUtilityTypes]);

  const selectedHalfBlock = useMemo(() => {
    if (!selectedHalfBlockId) return null;
    const allHalfBlocks = siteBlocks.flatMap(block => getHalfBlocksByBlockId(block.id));
    return allHalfBlocks.find(hb => hb.id === selectedHalfBlockId) || null;
  }, [selectedHalfBlockId, siteBlocks, getHalfBlocksByBlockId]);

  const villaUnitsForCurrentLayout = useMemo(() => {
    if (!selectedHalfBlock || !villaTypeModalVisible) return [];
    return getUnitsByHalfBlockId(selectedHalfBlock.id);
  }, [selectedHalfBlock, villaTypeModalVisible, getUnitsByHalfBlockId]);

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
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setBulkEditMode(!bulkEditMode)}
              testID="bulk-edit-toggle"
            >
              <Settings size={22} color={bulkEditMode ? '#007AFF' : '#000'} />
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
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Area</Text>
            <Text style={styles.statValue}>{site.area_ha.toFixed(2)} ha</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>6ha Blocks</Text>
            <Text style={styles.statValue}>{numBlocks}</Text>
          </View>
        </View>

        {bulkEditMode && selectedHalfBlocks.size > 0 && (
          <View style={styles.bulkActionBar}>
            <Text style={styles.bulkActionText}>
              {selectedHalfBlocks.size} selected
            </Text>
            <View style={styles.bulkActionButtons}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => applyBulkType('villas', '200_300_mix')}
              >
                <Text style={styles.bulkActionButtonText}>Villas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => applyBulkType('apartments')}
              >
                <Text style={styles.bulkActionButtonText}>Apartments</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Block Configuration</Text>
            <TouchableOpacity
              style={[
                styles.generateButton,
                generatingScenarios && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerateAutoScenarios}
              disabled={generatingScenarios}
              testID="generate-auto-scenarios"
            >
              {generatingScenarios ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Smart Scenarios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
                  <View style={styles.blockHeader}>
                    <Text style={styles.blockTitle}>Block {block.block_number}</Text>
                  </View>

                  {northHB && (
                    <TouchableOpacity
                      style={[
                        styles.halfBlockRow,
                        bulkEditMode && selectedHalfBlocks.has(northHB.id) && styles.halfBlockRowSelected,
                      ]}
                      onPress={() => {
                        if (bulkEditMode) {
                          toggleBulkSelect(northHB.id);
                        } else {
                          openHalfBlockConfig(northHB, block);
                        }
                      }}
                      onLongPress={() => {
                        setBulkEditMode(true);
                        toggleBulkSelect(northHB.id);
                      }}
                      testID={`north-half-block-${block.block_number}`}
                    >
                      <View style={styles.halfBlockContent}>
                        <View style={styles.halfBlockHeader}>
                          <View style={[styles.positionBadge, styles.northBadge]}>
                            <Text style={styles.positionBadgeText}>N</Text>
                          </View>
                          <View style={styles.halfBlockInfo}>
                            {northHB.type ? (
                              <>
                                <Text style={styles.halfBlockType}>
                                  {northHB.type === 'villas' ? 'Villas' : 'Apartments'}
                                </Text>
                                {northHB.villa_layout && (
                                  <>
                                    <Text style={styles.halfBlockSubtype}>
                                      {VILLA_LAYOUTS.find(l => l.id === northHB.villa_layout)?.name}
                                    </Text>
                                    {VILLA_LAYOUTS.find(l => l.id === northHB.villa_layout)?.imageUrl && (
                                      <Image
                                        source={{ uri: VILLA_LAYOUTS.find(l => l.id === northHB.villa_layout)?.imageUrl }}
                                        style={styles.layoutPreview}
                                        contentFit="contain"
                                      />
                                    )}
                                    <TouchableOpacity
                                      style={styles.editBuildingsButton}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedHalfBlockId(northHB.id);
                                        setSelectedBlock(block);
                                        setVillaTypeModalVisible(true);
                                      }}
                                    >
                                      <Text style={styles.editBuildingsButtonText}>Edit Villa Types</Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                                {northHB.apartment_layout && (
                                  <>
                                    <Text style={styles.halfBlockSubtype}>
                                      {APARTMENT_LAYOUTS.find(l => l.id === northHB.apartment_layout)?.name}
                                    </Text>
                                    <TouchableOpacity
                                      style={styles.editBuildingsButton}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedHalfBlockId(northHB.id);
                                        setSelectedBlock(block);
                                        setBuildingAssignModalVisible(true);
                                      }}
                                    >
                                      <Text style={styles.editBuildingsButtonText}>Edit Buildings</Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                              </>
                            ) : (
                              <Text style={styles.halfBlockPlaceholder}>Tap to configure</Text>
                            )}
                          </View>
                        </View>
                        {bulkEditMode && (
                          <View
                            style={[
                              styles.checkbox,
                              selectedHalfBlocks.has(northHB.id) && styles.checkboxSelected,
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}

                  {southHB && (
                    <TouchableOpacity
                      style={[
                        styles.halfBlockRow,
                        bulkEditMode && selectedHalfBlocks.has(southHB.id) && styles.halfBlockRowSelected,
                      ]}
                      onPress={() => {
                        if (bulkEditMode) {
                          toggleBulkSelect(southHB.id);
                        } else {
                          openHalfBlockConfig(southHB, block);
                        }
                      }}
                      onLongPress={() => {
                        setBulkEditMode(true);
                        toggleBulkSelect(southHB.id);
                      }}
                      testID={`south-half-block-${block.block_number}`}
                    >
                      <View style={styles.halfBlockContent}>
                        <View style={styles.halfBlockHeader}>
                          <View style={[styles.positionBadge, styles.southBadge]}>
                            <Text style={styles.positionBadgeText}>S</Text>
                          </View>
                          <View style={styles.halfBlockInfo}>
                            {southHB.type ? (
                              <>
                                <Text style={styles.halfBlockType}>
                                  {southHB.type === 'villas' ? 'Villas' : 'Apartments'}
                                </Text>
                                {southHB.villa_layout && (
                                  <>
                                    <Text style={styles.halfBlockSubtype}>
                                      {VILLA_LAYOUTS.find(l => l.id === southHB.villa_layout)?.name}
                                    </Text>
                                    {VILLA_LAYOUTS.find(l => l.id === southHB.villa_layout)?.imageUrl && (
                                      <Image
                                        source={{ uri: VILLA_LAYOUTS.find(l => l.id === southHB.villa_layout)?.imageUrl }}
                                        style={[styles.layoutPreview, styles.layoutPreviewRotated]}
                                        contentFit="contain"
                                      />
                                    )}
                                    <TouchableOpacity
                                      style={styles.editBuildingsButton}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedHalfBlockId(southHB.id);
                                        setSelectedBlock(block);
                                        setVillaTypeModalVisible(true);
                                      }}
                                    >
                                      <Text style={styles.editBuildingsButtonText}>Edit Villa Types</Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                                {southHB.apartment_layout && (
                                  <>
                                    <Text style={styles.halfBlockSubtype}>
                                      {APARTMENT_LAYOUTS.find(l => l.id === southHB.apartment_layout)?.name}
                                    </Text>
                                    <TouchableOpacity
                                      style={styles.editBuildingsButton}
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        setSelectedHalfBlockId(southHB.id);
                                        setSelectedBlock(block);
                                        setBuildingAssignModalVisible(true);
                                      }}
                                    >
                                      <Text style={styles.editBuildingsButtonText}>Edit Buildings</Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                              </>
                            ) : (
                              <Text style={styles.halfBlockPlaceholder}>Tap to configure</Text>
                            )}
                          </View>
                        </View>
                        {bulkEditMode && (
                          <View
                            style={[
                              styles.checkbox,
                              selectedHalfBlocks.has(southHB.id) && styles.checkboxSelected,
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={configModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Configure {selectedBlock && `Block ${selectedBlock.block_number}`}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedHalfBlock?.position === 'north' ? 'North' : 'South'} Half
            </Text>

            {!selectedHalfBlock?.type ? (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.typeOption}
                  onPress={() => handleSelectType('villas')}
                  testID="select-villas"
                >
                  <Text style={styles.typeOptionTitle}>Villas</Text>
                  <Text style={styles.typeOptionDesc}>Residential villas with plot layouts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.typeOption}
                  onPress={() => handleSelectType('apartments')}
                  testID="select-apartments"
                >
                  <Text style={styles.typeOptionTitle}>Apartment Buildings</Text>
                  <Text style={styles.typeOptionDesc}>Multi-unit apartment complexes</Text>
                </TouchableOpacity>
              </View>
            ) : selectedHalfBlock.type === 'villas' ? (
              <View style={styles.optionsContainer}>
                {VILLA_LAYOUTS.map(layout => (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      styles.layoutOption,
                      selectedHalfBlock.villa_layout === layout.id && styles.layoutOptionSelected,
                    ]}
                    onPress={() => handleSelectVillaLayout(layout.id)}
                    testID={`villa-layout-${layout.id}`}
                  >
                    <Text style={styles.layoutOptionTitle}>{layout.name}</Text>
                    <Text style={styles.layoutOptionDesc}>{layout.description}</Text>
                    <Text style={styles.layoutOptionUnits}>{layout.totalUnits} units</Text>
                    {layout.imageUrl && (
                      <Image
                        source={{ uri: layout.imageUrl }}
                        style={[
                          styles.optionImage,
                          selectedHalfBlock?.position === 'south' && styles.layoutPreviewRotated
                        ]}
                        contentFit="contain"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : selectedHalfBlock.type === 'apartments' ? (
              <View style={styles.optionsContainer}>
                {APARTMENT_LAYOUTS.map(layout => (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      styles.layoutOption,
                      selectedHalfBlock.apartment_layout === layout.id && styles.layoutOptionSelected,
                    ]}
                    onPress={() => handleSelectApartmentLayout(layout.id)}
                    testID={`apartment-layout-${layout.id}`}
                  >
                    {layout.imageUrl && (
                      <Image
                        source={{ uri: layout.imageUrl }}
                        style={styles.layoutOptionImage}
                        contentFit="contain"
                      />
                    )}
                    <Text style={styles.layoutOptionTitle}>{layout.name}</Text>
                    <Text style={styles.layoutOptionDesc}>{layout.description}</Text>
                    <Text style={styles.layoutOptionUnits}>{layout.totalBuildings} buildings</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setConfigModalVisible(false);
                setSelectedHalfBlockId(null);
                setSelectedBlock(null);
              }}
              testID="close-config"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={buildingAssignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBuildingAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.buildingModalContent]}>
            <Text style={styles.modalTitle}>
              Assign Building Types
            </Text>
            <Text style={styles.modalSubtitle}>
              Block {selectedBlock?.block_number} - {selectedHalfBlock?.position === 'north' ? 'North' : 'South'}
            </Text>

            <ScrollView style={styles.buildingList} showsVerticalScrollIndicator={false}>
              {selectedHalfBlock && getUnitsByHalfBlockId(selectedHalfBlock.id).map((unit, index) => {
                const isApartment = unit.unit_type === 'apartment';
                const isEquipment = unit.unit_type === 'equipment';
                const isUtility = unit.unit_type === 'utility';

                return (
                  <View key={unit.id} style={styles.buildingItem}>
                    <Text style={styles.buildingNumber}>Building {index + 1}</Text>
                    {isApartment && (
                      <View style={styles.buildingTypeSelector}>
                        {BUILDING_TYPES.filter(bt => bt.category === 'apartment').map(bt => (
                          <TouchableOpacity
                            key={bt.id}
                            style={[
                              styles.buildingTypeButton,
                              unit.building_type === bt.id && styles.buildingTypeButtonSelected,
                            ]}
                            onPress={() => handleUpdateBuildingType(unit.id, bt.id)}
                            testID={`building-type-${bt.id}-unit-${index}`}
                          >
                            <Text
                              style={[
                                styles.buildingTypeButtonText,
                                unit.building_type === bt.id && styles.buildingTypeButtonTextSelected,
                              ]}
                            >
                              {bt.id}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {isEquipment && (
                      <View style={styles.equipmentSelector}>
                        {EQUIPMENT_OPTIONS.map(eq => (
                          <TouchableOpacity
                            key={eq.id}
                            style={[
                              styles.equipmentButton,
                              unit.equipment_name === eq.id && styles.equipmentButtonSelected,
                            ]}
                            onPress={() => handleUpdateEquipmentName(unit.id, eq.id)}
                          >
                            <Text
                              style={[
                                styles.equipmentButtonText,
                                unit.equipment_name === eq.id && styles.equipmentButtonTextSelected,
                              ]}
                            >
                              {eq.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {isUtility && (
                      <View style={styles.equipmentSelector}>
                        {UTILITY_OPTIONS.map(util => (
                          <TouchableOpacity
                            key={util.id}
                            style={[
                              styles.equipmentButton,
                              unit.utility_name === util.id && styles.equipmentButtonSelected,
                            ]}
                            onPress={() => handleUpdateUtilityName(unit.id, util.id)}
                          >
                            <Text
                              style={[
                                styles.equipmentButtonText,
                                unit.utility_name === util.id && styles.equipmentButtonTextSelected,
                              ]}
                            >
                              {util.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setBuildingAssignModalVisible(false);
                setSelectedHalfBlockId(null);
                setSelectedBlock(null);
              }}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={villaTypeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVillaTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.buildingModalContent]}>
            <Text style={styles.modalTitle}>
              Assign Villa Types
            </Text>
            <Text style={styles.modalSubtitle}>
              Block {selectedBlock?.block_number} - {selectedHalfBlock?.position === 'north' ? 'North' : 'South'}
            </Text>

            <ScrollView style={styles.buildingList} showsVerticalScrollIndicator={false}>
              {selectedHalfBlock && (() => {
                const villaLayout = VILLA_LAYOUTS.find(l => l.id === selectedHalfBlock.villa_layout);
                
                if (!villaLayout) return null;

                const groupedUnits: { [key: number]: typeof villaUnitsForCurrentLayout } = {};
                villaUnitsForCurrentLayout.forEach((unit) => {
                  const plotSize = unit.size_m2 || 0;
                  if (!groupedUnits[plotSize]) {
                    groupedUnits[plotSize] = [];
                  }
                  groupedUnits[plotSize].push(unit);
                });

                return Object.entries(groupedUnits).map(([plotSize, units]) => {
                  const size = parseInt(plotSize);
                  const availableTypes = VILLA_TYPE_OPTIONS[size] || [];
                  const firstUnit = units[0];
                  const selectedType = firstUnit?.building_type;

                  return (
                    <View key={plotSize} style={styles.villaTypeGroupItem}>
                      <Text style={styles.villaGroupTitle}>
                        {size}m² Villas ({units.length} units)
                      </Text>
                      <View style={styles.villaTypeSelector}>
                        {availableTypes.map(vt => (
                          <TouchableOpacity
                            key={vt.id}
                            style={[
                              styles.villaTypeButton,
                              selectedType === vt.id && styles.villaTypeButtonSelected,
                            ]}
                            onPress={() => {
                              units.forEach(unit => {
                                handleUpdateVillaType(unit.id, vt.id);
                              });
                            }}
                          >
                            <Text
                              style={[
                                styles.villaTypeButtonText,
                                selectedType === vt.id && styles.villaTypeButtonTextSelected,
                              ]}
                            >
                              {vt.id}
                            </Text>
                            <Text
                              style={[
                                styles.villaTypeButtonSubtext,
                                selectedType === vt.id && styles.villaTypeButtonSubtextSelected,
                              ]}
                            >
                              {vt.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setVillaTypeModalVisible(false);
                setSelectedHalfBlockId(null);
                setSelectedBlock(null);
              }}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAiOverlay}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (generationComplete) {
            setShowAiOverlay(false);
          }
        }}
      >
        <View style={styles.aiOverlay}>
          <View style={styles.aiOverlayContent}>
            <View style={styles.aiHeader}>
              <View style={styles.aiHeaderIcon}>
                <Sparkles size={24} color="#007AFF" />
              </View>
              <Text style={styles.aiTitle}>AI Financial Advisor</Text>
            </View>
            
            <ScrollView 
              style={styles.aiThinkingContainer}
              showsVerticalScrollIndicator={false}
            >
              {aiThinking.map((thought, index) => (
                <View key={index} style={styles.aiThoughtItem}>
                  <View style={styles.aiThoughtDot} />
                  <Text style={styles.aiThoughtText}>{thought}</Text>
                </View>
              ))}
              
              {!generationComplete && (
                <View style={styles.aiThinkingIndicator}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.aiThinkingText}>Thinking...</Text>
                </View>
              )}
            </ScrollView>
            
            {generationComplete && (
              <TouchableOpacity
                style={styles.aiDismissButton}
                onPress={() => {
                  setShowAiOverlay(false);
                  setAiThinking([]);
                }}
              >
                <Text style={styles.aiDismissButtonText}>View Scenarios</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  statsCard: {
    flexDirection: 'row',
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#212529',
  },
  bulkActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  bulkActionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bulkActionButtonText: {
    fontSize: 14,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 12,
  },
  blockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  blockHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#212529',
  },
  halfBlockRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  halfBlockRowSelected: {
    backgroundColor: '#E3F2FD',
  },
  halfBlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  halfBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  northBadge: {
    backgroundColor: '#E3F2FD',
  },
  southBadge: {
    backgroundColor: '#FFF3E0',
  },
  positionBadgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  halfBlockInfo: {
    flex: 1,
  },
  halfBlockType: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 2,
  },
  halfBlockSubtype: {
    fontSize: 13,
    color: '#6C757D',
  },
  halfBlockPlaceholder: {
    fontSize: 15,
    color: '#ADB5BD',
    fontStyle: 'italic' as const,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ADB5BD',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  buildingModalContent: {
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  typeOption: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  typeOptionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 6,
  },
  typeOptionDesc: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
  },
  layoutOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  layoutOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  layoutOptionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 4,
  },
  layoutOptionDesc: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 6,
  },
  layoutOptionUnits: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  layoutOptionImage: {
    width: '100%',
    height: 120,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  buildingList: {
    maxHeight: 400,
  },
  buildingItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  buildingNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 12,
  },
  buildingTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  buildingTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  buildingTypeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buildingTypeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  buildingTypeButtonTextSelected: {
    color: '#FFFFFF',
  },
  equipmentSelector: {
    gap: 8,
  },
  equipmentButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  equipmentButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  equipmentButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6C757D',
    textAlign: 'center',
  },
  equipmentButtonTextSelected: {
    color: '#FFFFFF',
  },
  editBuildingsButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  editBuildingsButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  villaTypeGroupItem: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  villaGroupTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 12,
  },
  villaTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  villaTypeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#F8F9FA',
    minWidth: 100,
  },
  villaTypeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  villaTypeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#212529',
    textAlign: 'center',
    marginBottom: 2,
  },
  villaTypeButtonTextSelected: {
    color: '#FFFFFF',
  },
  villaTypeButtonSubtext: {
    fontSize: 11,
    color: '#6C757D',
    textAlign: 'center',
  },
  villaTypeButtonSubtextSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  aiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  aiOverlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aiHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
  },
  aiThinkingContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxHeight: 400,
  },
  aiThoughtItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aiThoughtDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginTop: 6,
    marginRight: 12,
  },
  aiThoughtText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#212529',
  },
  aiThinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  aiThinkingText: {
    fontSize: 14,
    color: '#6C757D',
    fontStyle: 'italic' as const,
  },
  aiDismissButton: {
    marginHorizontal: 24,
    marginVertical: 20,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiDismissButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  layoutPreview: {
    width: '100%',
    height: 80,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  layoutPreviewRotated: {
    transform: [{ rotate: '180deg' }],
  },
  optionImage: {
    width: '100%',
    height: 100,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
});
