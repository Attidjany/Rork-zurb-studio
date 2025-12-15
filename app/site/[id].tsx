import { Stack, useLocalSearchParams } from 'expo-router';
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
} from '@/constants/typologies';
import { DbBlock, DbHalfBlock, VillaLayout, ApartmentLayout, HalfBlockType, BuildingType } from '@/types';

export default function SiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    sites,
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
    if (!id || !user) return;
    
    setGeneratingScenarios(true);
    setShowAiOverlay(true);
    setGenerationComplete(false);
    setAiThinking([]);
    
    setAiThinking(prev => [...prev, '🔍 Analyzing site configuration...']);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setAiThinking(prev => [...prev, '📊 Loading project data and market parameters...']);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    setAiThinking(prev => [...prev, '💰 Calculating construction costs and revenue potential...']);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    setAiThinking(prev => [...prev, '🤖 Consulting AI financial advisor...']);
    
    setAiThinking(prev => [...prev, '🧠 AI is analyzing market dynamics and profitability...']);
    
    setAiThinking(prev => [...prev, '📈 Optimizing rental periods and pricing strategies...']);
    
    try {
      const response = await fetch('/api/scenarios/generate-intelligent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: id,
          userId: user.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('[Site] AI Scenarios generated:', data);
      setAiThinking(prev => [...prev, '✨ Creating scenario configurations...']);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const scenariosCount = data.scenarios?.length || 0;
      setAiThinking(prev => [...prev, `✅ Generated ${scenariosCount} profitable scenarios!`]);
      
      await loadScenarios();
      setGenerationComplete(true);
      setGeneratingScenarios(false);
    } catch (error: any) {
      console.error('[Site] Error generating scenarios:', error);
      setAiThinking(prev => [...prev, `❌ Error: ${error.message || 'Failed to generate scenarios'}`]);
      setGenerationComplete(true);
      setGeneratingScenarios(false);
      
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Failed to generate scenarios. Please try again.',
          [{ text: 'OK' }]
        );
      }, 100);
    }
  }, [id, user, loadScenarios]);

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
});
