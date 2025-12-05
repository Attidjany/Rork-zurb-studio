import { Stack, useLocalSearchParams } from 'expo-router';
import { TrendingUp, Building2, Home, ShoppingBag, Factory, Plus, Trash2, Settings, Edit2 } from 'lucide-react-native';
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
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import { fetchLiveGoldPrice, getCachedGoldPrice, getDefaultGoldPrice, GoldPriceData, USD_TO_XOF } from '@/lib/goldPrice';

export default function ProjectParametersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    projects,
    getProjectConstructionCostsByProjectId,
    getProjectHousingTypesByProjectId,
    getProjectEquipmentUtilityTypesByProjectId,
    createProjectConstructionCost,
    updateProjectConstructionCost,
    deleteProjectConstructionCost,
    createProjectHousingType,
    updateProjectHousingType,
    deleteProjectHousingType,
    createProjectEquipmentUtilityType,
    updateProjectEquipmentUtilityType,
    deleteProjectEquipmentUtilityType,
    updateProject,
  } = useZURB();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [goldPrice, setGoldPrice] = useState<GoldPriceData>(getCachedGoldPrice() || getDefaultGoldPrice());
  const [loadingGoldPrice, setLoadingGoldPrice] = useState<boolean>(false);
  
  const [addCostModalVisible, setAddCostModalVisible] = useState<boolean>(false);
  const [addHousingModalVisible, setAddHousingModalVisible] = useState<boolean>(false);
  const [addEquipmentModalVisible, setAddEquipmentModalVisible] = useState<boolean>(false);
  
  const [editCostModalVisible, setEditCostModalVisible] = useState<boolean>(false);
  const [editHousingModalVisible, setEditHousingModalVisible] = useState<boolean>(false);
  const [editEquipmentModalVisible, setEditEquipmentModalVisible] = useState<boolean>(false);
  
  const [editingCost, setEditingCost] = useState<any>(null);
  const [editingHousing, setEditingHousing] = useState<any>(null);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  
  const [newCostCode, setNewCostCode] = useState<string>('');
  const [newCostName, setNewCostName] = useState<string>('');
  const [newCostGoldGrams, setNewCostGoldGrams] = useState<string>('');
  
  const [newHousingCode, setNewHousingCode] = useState<string>('');
  const [newHousingName, setNewHousingName] = useState<string>('');
  const [newHousingCategory, setNewHousingCategory] = useState<'apartment' | 'villa' | 'commercial'>('apartment');
  const [newHousingArea, setNewHousingArea] = useState<string>('');
  const [newHousingCostType, setNewHousingCostType] = useState<string>('');
  const [newHousingRent, setNewHousingRent] = useState<string>('');
  
  const [newEquipmentCode, setNewEquipmentCode] = useState<string>('');
  const [newEquipmentName, setNewEquipmentName] = useState<string>('');
  const [newEquipmentCategory, setNewEquipmentCategory] = useState<'equipment' | 'utility'>('equipment');
  const [newEquipmentLandArea, setNewEquipmentLandArea] = useState<string>('1800');
  const [newEquipmentOccupation, setNewEquipmentOccupation] = useState<string>('0.3');
  const [newEquipmentCostType, setNewEquipmentCostType] = useState<string>('ZMER');
  
  const [projectEditModalVisible, setProjectEditModalVisible] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');
  const [newMaxRentalPeriod, setNewMaxRentalPeriod] = useState<string>('20');

  const project = useMemo(() => {
    return projects.find(p => p.id === id) || null;
  }, [projects, id]);

  const constructionCosts = useMemo(() => {
    return getProjectConstructionCostsByProjectId(id || '');
  }, [getProjectConstructionCostsByProjectId, id]);

  const housingTypes = useMemo(() => {
    return getProjectHousingTypesByProjectId(id || '');
  }, [getProjectHousingTypesByProjectId, id]);

  const equipmentUtilityTypes = useMemo(() => {
    return getProjectEquipmentUtilityTypesByProjectId(id || '');
  }, [getProjectEquipmentUtilityTypesByProjectId, id]);

  const apartmentTypes = useMemo(() => housingTypes.filter(h => h.category === 'apartment'), [housingTypes]);
  const villaTypes = useMemo(() => housingTypes.filter(h => h.category === 'villa'), [housingTypes]);
  const commercialTypes = useMemo(() => housingTypes.filter(h => h.category === 'commercial'), [housingTypes]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const price = await fetchLiveGoldPrice();
    setGoldPrice(price);
    setRefreshing(false);
  }, []);

  const fetchGoldPrice = useCallback(async () => {
    setLoadingGoldPrice(true);
    const price = await fetchLiveGoldPrice();
    setGoldPrice(price);
    setLoadingGoldPrice(false);
  }, []);

  useEffect(() => {
    fetchGoldPrice();
  }, [fetchGoldPrice]);

  const handleDeleteCost = useCallback(async (costId: string, code: string) => {
    Alert.alert(
      'Delete Construction Cost',
      `Are you sure you want to delete "${code}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProjectConstructionCost(costId);
          },
        },
      ]
    );
  }, [deleteProjectConstructionCost]);

  const handleDeleteHousing = useCallback(async (housingId: string, code: string) => {
    Alert.alert(
      'Delete Housing Type',
      `Are you sure you want to delete "${code}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProjectHousingType(housingId);
          },
        },
      ]
    );
  }, [deleteProjectHousingType]);

  const handleDeleteEquipment = useCallback(async (equipmentId: string, code: string) => {
    Alert.alert(
      'Delete Equipment/Utility Type',
      `Are you sure you want to delete "${code}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProjectEquipmentUtilityType(equipmentId);
          },
        },
      ]
    );
  }, [deleteProjectEquipmentUtilityType]);

  const handleAddCost = useCallback(async () => {
    if (!id || !newCostCode || !newCostName || !newCostGoldGrams) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const goldGrams = parseFloat(newCostGoldGrams);
    if (isNaN(goldGrams) || goldGrams <= 0) {
      Alert.alert('Error', 'Please enter a valid gold content value');
      return;
    }

    await createProjectConstructionCost(id, newCostCode.toUpperCase(), newCostName, goldGrams);
    setAddCostModalVisible(false);
    setNewCostCode('');
    setNewCostName('');
    setNewCostGoldGrams('');
  }, [id, newCostCode, newCostName, newCostGoldGrams, createProjectConstructionCost]);

  const handleAddHousing = useCallback(async () => {
    if (!id || !newHousingCode || !newHousingName || !newHousingArea || !newHousingCostType || !newHousingRent) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const area = parseFloat(newHousingArea);
    const rent = parseFloat(newHousingRent);
    if (isNaN(area) || area <= 0 || isNaN(rent) || rent <= 0) {
      Alert.alert('Error', 'Please enter valid numeric values');
      return;
    }

    await createProjectHousingType(id, newHousingCode.toUpperCase(), newHousingName, newHousingCategory, area, newHousingCostType, rent);
    setAddHousingModalVisible(false);
    setNewHousingCode('');
    setNewHousingName('');
    setNewHousingArea('');
    setNewHousingRent('');
  }, [id, newHousingCode, newHousingName, newHousingCategory, newHousingArea, newHousingCostType, newHousingRent, createProjectHousingType]);

  const handleAddEquipment = useCallback(async () => {
    if (!id || !newEquipmentCode || !newEquipmentName || !newEquipmentLandArea || !newEquipmentOccupation) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const landArea = parseFloat(newEquipmentLandArea);
    const occupation = parseFloat(newEquipmentOccupation);
    if (isNaN(landArea) || landArea <= 0 || isNaN(occupation) || occupation <= 0 || occupation > 1) {
      Alert.alert('Error', 'Please enter valid values (occupation must be between 0 and 1)');
      return;
    }

    await createProjectEquipmentUtilityType(id, newEquipmentCode.toUpperCase(), newEquipmentName, newEquipmentCategory, landArea, occupation, newEquipmentCostType);
    setAddEquipmentModalVisible(false);
    setNewEquipmentCode('');
    setNewEquipmentName('');
    setNewEquipmentLandArea('1800');
    setNewEquipmentOccupation('0.3');
  }, [id, newEquipmentCode, newEquipmentName, newEquipmentCategory, newEquipmentLandArea, newEquipmentOccupation, newEquipmentCostType, createProjectEquipmentUtilityType]);

  const handleEditCost = useCallback((cost: any) => {
    setEditingCost(cost);
    setNewCostCode(cost.code);
    setNewCostName(cost.name);
    setNewCostGoldGrams(cost.gold_grams_per_m2.toString());
    setEditCostModalVisible(true);
  }, []);

  const handleSaveEditCost = useCallback(async () => {
    if (!editingCost || !newCostCode || !newCostName || !newCostGoldGrams) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const goldGrams = parseFloat(newCostGoldGrams);
    if (isNaN(goldGrams) || goldGrams <= 0) {
      Alert.alert('Error', 'Please enter a valid gold content value');
      return;
    }

    await updateProjectConstructionCost(editingCost.id, {
      code: newCostCode.toUpperCase(),
      name: newCostName,
      gold_grams_per_m2: goldGrams,
    });
    setEditCostModalVisible(false);
    setEditingCost(null);
    setNewCostCode('');
    setNewCostName('');
    setNewCostGoldGrams('');
  }, [editingCost, newCostCode, newCostName, newCostGoldGrams, updateProjectConstructionCost]);

  const handleEditHousing = useCallback((housing: any) => {
    setEditingHousing(housing);
    setNewHousingCode(housing.code);
    setNewHousingName(housing.name);
    setNewHousingCategory(housing.category);
    setNewHousingArea(housing.default_area_m2.toString());
    setNewHousingCostType(housing.default_cost_type);
    setNewHousingRent(housing.default_rent_monthly.toString());
    setEditHousingModalVisible(true);
  }, []);

  const handleSaveEditHousing = useCallback(async () => {
    if (!editingHousing || !newHousingCode || !newHousingName || !newHousingArea || !newHousingCostType || !newHousingRent) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const area = parseFloat(newHousingArea);
    const rent = parseFloat(newHousingRent);
    if (isNaN(area) || area <= 0 || isNaN(rent) || rent <= 0) {
      Alert.alert('Error', 'Please enter valid numeric values');
      return;
    }

    await updateProjectHousingType(editingHousing.id, {
      code: newHousingCode.toUpperCase(),
      name: newHousingName,
      default_area_m2: area,
      default_cost_type: newHousingCostType,
      default_rent_monthly: rent,
    });
    setEditHousingModalVisible(false);
    setEditingHousing(null);
    setNewHousingCode('');
    setNewHousingName('');
    setNewHousingArea('');
    setNewHousingRent('');
  }, [editingHousing, newHousingCode, newHousingName, newHousingArea, newHousingCostType, newHousingRent, updateProjectHousingType]);

  const handleEditEquipment = useCallback((equipment: any) => {
    setEditingEquipment(equipment);
    setNewEquipmentCode(equipment.code);
    setNewEquipmentName(equipment.name);
    setNewEquipmentCategory(equipment.category);
    setNewEquipmentLandArea(equipment.land_area_m2.toString());
    setNewEquipmentOccupation(equipment.building_occupation_pct.toString());
    setNewEquipmentCostType(equipment.cost_type);
    setEditEquipmentModalVisible(true);
  }, []);

  const handleSaveProjectName = useCallback(async () => {
    if (!id || !newProjectName.trim()) {
      Alert.alert('Error', 'Please enter a valid project name');
      return;
    }

    const maxRental = parseInt(newMaxRentalPeriod);
    if (isNaN(maxRental) || maxRental <= 0) {
      Alert.alert('Error', 'Please enter a valid max rental period');
      return;
    }

    await updateProject(id, {
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      max_rental_period_years: maxRental,
    });
    setProjectEditModalVisible(false);
  }, [id, newProjectName, newProjectDesc, newMaxRentalPeriod, updateProject]);

  const handleSaveEditEquipment = useCallback(async () => {
    if (!editingEquipment || !newEquipmentCode || !newEquipmentName || !newEquipmentLandArea || !newEquipmentOccupation) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const landArea = parseFloat(newEquipmentLandArea);
    const occupation = parseFloat(newEquipmentOccupation);
    if (isNaN(landArea) || landArea <= 0 || isNaN(occupation) || occupation <= 0 || occupation > 1) {
      Alert.alert('Error', 'Please enter valid values (occupation must be between 0 and 1)');
      return;
    }

    await updateProjectEquipmentUtilityType(editingEquipment.id, {
      code: newEquipmentCode.toUpperCase(),
      name: newEquipmentName,
      land_area_m2: landArea,
      building_occupation_pct: occupation,
      cost_type: newEquipmentCostType,
    });
    setEditEquipmentModalVisible(false);
    setEditingEquipment(null);
    setNewEquipmentCode('');
    setNewEquipmentName('');
    setNewEquipmentLandArea('1800');
    setNewEquipmentOccupation('0.3');
  }, [editingEquipment, newEquipmentCode, newEquipmentName, newEquipmentLandArea, newEquipmentOccupation, newEquipmentCostType, updateProjectEquipmentUtilityType]);

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
          title: 'Project Settings',
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
          <View style={styles.projectHeader}>
            <View style={styles.projectTitleSection}>
              <Text style={styles.projectName}>{project.name}</Text>
              {project.description && (
                <Text style={styles.projectDesc}>{project.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.projectEditButton}
              onPress={() => {
                setNewProjectName(project.name);
                setNewProjectDesc(project.description || '');
                setNewMaxRentalPeriod((project.max_rental_period_years || 20).toString());
                setProjectEditModalVisible(true);
              }}
            >
              <Edit2 size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.goldPriceCard}>
          <View style={styles.goldPriceMainHeader}>
            <View style={styles.goldPriceIcon}>
              <TrendingUp size={24} color="#FFB700" />
            </View>
            <View style={styles.goldPriceTitleSection}>
              <Text style={styles.goldPriceLabel}>Live Gold Price</Text>
              <Text style={styles.goldPriceTimestamp}>
                Updates daily • Last: {new Date(goldPrice.timestamp).toLocaleDateString()}
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
          
          <View style={styles.goldPriceGrid}>
            <View style={styles.goldPriceItem}>
              <Text style={styles.goldPriceItemLabel}>$/g</Text>
              <Text style={styles.goldPriceItemValue}>
                ${goldPrice.pricePerGram.toFixed(2)}
              </Text>
            </View>
            <View style={styles.goldPriceItem}>
              <Text style={styles.goldPriceItemLabel}>$/oz</Text>
              <Text style={styles.goldPriceItemValue}>
                ${goldPrice.pricePerOz.toFixed(2)}
              </Text>
            </View>
            <View style={styles.goldPriceItem}>
              <Text style={styles.goldPriceItemLabel}>XOF/g</Text>
              <Text style={styles.goldPriceItemValue}>
                {(goldPrice.pricePerGram * USD_TO_XOF).toLocaleString(undefined, {maximumFractionDigits: 0})}
              </Text>
            </View>
            <View style={styles.goldPriceItem}>
              <Text style={styles.goldPriceItemLabel}>XOF/oz</Text>
              <Text style={styles.goldPriceItemValue}>
                {(goldPrice.pricePerOz * USD_TO_XOF).toLocaleString(undefined, {maximumFractionDigits: 0})}
              </Text>
            </View>
          </View>
          
          <View style={styles.exchangeRateInfo}>
            <Text style={styles.exchangeRateText}>Exchange Rate: 1 USD = {USD_TO_XOF} XOF</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Settings size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Construction Cost Types</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddCostModalVisible(true)}
            >
              <Plus size={18} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDesc}>
            Define construction costs based on gold content per m²
          </Text>

          {constructionCosts.map((cost) => {
            const costPerM2XOF = cost.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF;
            return (
              <View key={cost.id} style={styles.costCard}>
                <View style={styles.costCardHeader}>
                  <View>
                    <Text style={styles.costCode}>{cost.code}</Text>
                    <Text style={styles.costName}>{cost.name}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditCost(cost)}
                    >
                      <Edit2 size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCost(cost.id, cost.code)}
                    >
                      <Trash2 size={18} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.costDetails}>
                  <View style={styles.costDetailRow}>
                    <Text style={styles.costDetailLabel}>Gold Content:</Text>
                    <Text style={styles.costDetailValue}>{cost.gold_grams_per_m2.toFixed(2)} g Au/m²</Text>
                  </View>
                  <View style={styles.costDetailRow}>
                    <Text style={styles.costDetailLabel}>Cost per m²:</Text>
                    <Text style={styles.costDetailValue}>{costPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Building2 size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Apartment Housing Types</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewHousingCategory('apartment');
                setNewHousingCostType(constructionCosts[0]?.code || '');
                setAddHousingModalVisible(true);
              }}
            >
              <Plus size={18} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {apartmentTypes.map((type) => {
            const costType = constructionCosts.find(c => c.code === type.default_cost_type);
            const costPerM2XOF = costType ? costType.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF : 0;
            return (
              <View key={type.id} style={styles.housingCard}>
                <View style={styles.housingCardHeader}>
                  <View>
                    <Text style={styles.housingCode}>{type.code}</Text>
                    <Text style={styles.housingName}>{type.name}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditHousing(type)}
                    >
                      <Edit2 size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteHousing(type.id, type.code)}
                    >
                      <Trash2 size={18} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.housingDetails}>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Area:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_area_m2} m²</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Cost Type:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_cost_type} ({costPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²)</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Monthly Rent:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_rent_monthly.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Total Build Cost:</Text>
                    <Text style={styles.housingDetailValueHighlight}>
                      {(type.default_area_m2 * costPerM2XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Home size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Villa Housing Types</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewHousingCategory('villa');
                setNewHousingCostType(constructionCosts[0]?.code || '');
                setAddHousingModalVisible(true);
              }}
            >
              <Plus size={18} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {villaTypes.map((type) => {
            const costType = constructionCosts.find(c => c.code === type.default_cost_type);
            const costPerM2XOF = costType ? costType.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF : 0;
            return (
              <View key={type.id} style={styles.housingCard}>
                <View style={styles.housingCardHeader}>
                  <View>
                    <Text style={styles.housingCode}>{type.code}</Text>
                    <Text style={styles.housingName}>{type.name}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditHousing(type)}
                    >
                      <Edit2 size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteHousing(type.id, type.code)}
                    >
                      <Trash2 size={18} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.housingDetails}>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Area:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_area_m2} m²</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Cost Type:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_cost_type} ({costPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²)</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Monthly Rent:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_rent_monthly.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Total Build Cost:</Text>
                    <Text style={styles.housingDetailValueHighlight}>
                      {(type.default_area_m2 * costPerM2XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <ShoppingBag size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Commercial Housing Types</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewHousingCategory('commercial');
                setNewHousingCostType(constructionCosts[0]?.code || '');
                setAddHousingModalVisible(true);
              }}
            >
              <Plus size={18} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {commercialTypes.map((type) => {
            const costType = constructionCosts.find(c => c.code === type.default_cost_type);
            const costPerM2XOF = costType ? costType.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF : 0;
            return (
              <View key={type.id} style={styles.housingCard}>
                <View style={styles.housingCardHeader}>
                  <View>
                    <Text style={styles.housingCode}>{type.code}</Text>
                    <Text style={styles.housingName}>{type.name}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditHousing(type)}
                    >
                      <Edit2 size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteHousing(type.id, type.code)}
                    >
                      <Trash2 size={18} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.housingDetails}>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Area:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_area_m2} m²</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Cost Type:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_cost_type} ({costPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²)</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Monthly Rent:</Text>
                    <Text style={styles.housingDetailValue}>{type.default_rent_monthly.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF</Text>
                  </View>
                  <View style={styles.housingDetailRow}>
                    <Text style={styles.housingDetailLabel}>Total Build Cost:</Text>
                    <Text style={styles.housingDetailValueHighlight}>
                      {(type.default_area_m2 * costPerM2XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Factory size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Equipment & Utility Types</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewEquipmentCategory('equipment');
                setNewEquipmentCostType(constructionCosts[0]?.code || 'ZMER');
                setAddEquipmentModalVisible(true);
              }}
            >
              <Plus size={18} color="#007AFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {equipmentUtilityTypes.map((type) => {
            const costType = constructionCosts.find(c => c.code === type.cost_type);
            const costPerM2XOF = costType ? costType.gold_grams_per_m2 * goldPrice.pricePerGram * USD_TO_XOF : 0;
            const buildAreaM2 = type.land_area_m2 * type.building_occupation_pct;
            return (
              <View key={type.id} style={styles.equipmentCard}>
                <View style={styles.equipmentCardHeader}>
                  <View>
                    <Text style={styles.equipmentCode}>{type.code}</Text>
                    <Text style={styles.equipmentName}>{type.name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{type.category.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditEquipment(type)}
                    >
                      <Edit2 size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEquipment(type.id, type.code)}
                    >
                      <Trash2 size={18} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.equipmentDetails}>
                  <View style={styles.equipmentDetailRow}>
                    <Text style={styles.equipmentDetailLabel}>Land Area:</Text>
                    <Text style={styles.equipmentDetailValue}>{type.land_area_m2} m²</Text>
                  </View>
                  <View style={styles.equipmentDetailRow}>
                    <Text style={styles.equipmentDetailLabel}>Building Occupation:</Text>
                    <Text style={styles.equipmentDetailValue}>{(type.building_occupation_pct * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.equipmentDetailRow}>
                    <Text style={styles.equipmentDetailLabel}>Build Area:</Text>
                    <Text style={styles.equipmentDetailValue}>{buildAreaM2.toFixed(0)} m²</Text>
                  </View>
                  <View style={styles.equipmentDetailRow}>
                    <Text style={styles.equipmentDetailLabel}>Cost Type:</Text>
                    <Text style={styles.equipmentDetailValue}>{type.cost_type} ({costPerM2XOF.toLocaleString(undefined, {maximumFractionDigits: 0})} XOF/m²)</Text>
                  </View>
                  <View style={styles.equipmentDetailRow}>
                    <Text style={styles.equipmentDetailLabel}>Total Build Cost:</Text>
                    <Text style={styles.equipmentDetailValueHighlight}>
                      {(buildAreaM2 * costPerM2XOF).toLocaleString(undefined, {maximumFractionDigits: 0})} XOF
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={projectEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setProjectEditModalVisible(false);
          setNewProjectName('');
          setNewProjectDesc('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Project Details</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project Name"
              value={newProjectName}
              onChangeText={setNewProjectName}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description (optional)"
              value={newProjectDesc}
              onChangeText={setNewProjectDesc}
              multiline
              numberOfLines={3}
            />
            <View style={styles.rentalPeriodInputWrapper}>
              <Text style={styles.rentalPeriodLabel}>Max Rental Period (years):</Text>
              <TextInput
                style={styles.rentalPeriodInput}
                placeholder="20"
                value={newMaxRentalPeriod}
                onChangeText={setNewMaxRentalPeriod}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setProjectEditModalVisible(false);
                  setNewProjectName('');
                  setNewProjectDesc('');
                  setNewMaxRentalPeriod('20');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveProjectName}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editCostModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setEditCostModalVisible(false);
          setEditingCost(null);
          setNewCostCode('');
          setNewCostName('');
          setNewCostGoldGrams('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Construction Cost Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code (e.g., ZME)"
              value={newCostCode}
              onChangeText={setNewCostCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newCostName}
              onChangeText={setNewCostName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Gold Content (g Au/m²)"
              value={newCostGoldGrams}
              onChangeText={setNewCostGoldGrams}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setEditCostModalVisible(false);
                  setEditingCost(null);
                  setNewCostCode('');
                  setNewCostName('');
                  setNewCostGoldGrams('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveEditCost}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editHousingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setEditHousingModalVisible(false);
          setEditingHousing(null);
          setNewHousingCode('');
          setNewHousingName('');
          setNewHousingArea('');
          setNewHousingRent('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Housing Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code (e.g., AMS)"
              value={newHousingCode}
              onChangeText={setNewHousingCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newHousingName}
              onChangeText={setNewHousingName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Default Area (m²)"
              value={newHousingArea}
              onChangeText={setNewHousingArea}
              keyboardType="decimal-pad"
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Cost Type:</Text>
              <View style={styles.pickerOptions}>
                {constructionCosts.map((cost) => (
                  <TouchableOpacity
                    key={cost.code}
                    style={[
                      styles.pickerOption,
                      newHousingCostType === cost.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setNewHousingCostType(cost.code)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        newHousingCostType === cost.code && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cost.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Default Monthly Rent (XOF)"
              value={newHousingRent}
              onChangeText={setNewHousingRent}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setEditHousingModalVisible(false);
                  setEditingHousing(null);
                  setNewHousingCode('');
                  setNewHousingName('');
                  setNewHousingArea('');
                  setNewHousingRent('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveEditHousing}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editEquipmentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setEditEquipmentModalVisible(false);
          setEditingEquipment(null);
          setNewEquipmentCode('');
          setNewEquipmentName('');
          setNewEquipmentLandArea('1800');
          setNewEquipmentOccupation('0.3');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Equipment/Utility Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code (e.g., EQS)"
              value={newEquipmentCode}
              onChangeText={setNewEquipmentCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newEquipmentName}
              onChangeText={setNewEquipmentName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Land Area (m²)"
              value={newEquipmentLandArea}
              onChangeText={setNewEquipmentLandArea}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Building Occupation (0-1, e.g., 0.3 for 30%)"
              value={newEquipmentOccupation}
              onChangeText={setNewEquipmentOccupation}
              keyboardType="decimal-pad"
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Cost Type:</Text>
              <View style={styles.pickerOptions}>
                {constructionCosts.map((cost) => (
                  <TouchableOpacity
                    key={cost.code}
                    style={[
                      styles.pickerOption,
                      newEquipmentCostType === cost.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setNewEquipmentCostType(cost.code)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        newEquipmentCostType === cost.code && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cost.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setEditEquipmentModalVisible(false);
                  setEditingEquipment(null);
                  setNewEquipmentCode('');
                  setNewEquipmentName('');
                  setNewEquipmentLandArea('1800');
                  setNewEquipmentOccupation('0.3');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveEditEquipment}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addCostModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddCostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Construction Cost Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code (e.g., ZME)"
              value={newCostCode}
              onChangeText={setNewCostCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newCostName}
              onChangeText={setNewCostName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Gold Content (g Au/m²)"
              value={newCostGoldGrams}
              onChangeText={setNewCostGoldGrams}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setAddCostModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleAddCost}
              >
                <Text style={styles.modalSaveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addHousingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddHousingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Housing Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code (e.g., AMS)"
              value={newHousingCode}
              onChangeText={setNewHousingCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newHousingName}
              onChangeText={setNewHousingName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Default Area (m²)"
              value={newHousingArea}
              onChangeText={setNewHousingArea}
              keyboardType="decimal-pad"
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Cost Type:</Text>
              <View style={styles.pickerOptions}>
                {constructionCosts.map((cost) => (
                  <TouchableOpacity
                    key={cost.code}
                    style={[
                      styles.pickerOption,
                      newHousingCostType === cost.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setNewHousingCostType(cost.code)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        newHousingCostType === cost.code && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cost.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Default Monthly Rent (XOF)"
              value={newHousingRent}
              onChangeText={setNewHousingRent}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setAddHousingModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleAddHousing}
              >
                <Text style={styles.modalSaveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addEquipmentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddEquipmentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Equipment/Utility Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Code (e.g., EQS)"
              value={newEquipmentCode}
              onChangeText={setNewEquipmentCode}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description"
              value={newEquipmentName}
              onChangeText={setNewEquipmentName}
            />
            <View style={styles.categorySelector}>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  newEquipmentCategory === 'equipment' && styles.categoryOptionSelected,
                ]}
                onPress={() => setNewEquipmentCategory('equipment')}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    newEquipmentCategory === 'equipment' && styles.categoryOptionTextSelected,
                  ]}
                >
                  Equipment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  newEquipmentCategory === 'utility' && styles.categoryOptionSelected,
                ]}
                onPress={() => setNewEquipmentCategory('utility')}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    newEquipmentCategory === 'utility' && styles.categoryOptionTextSelected,
                  ]}
                >
                  Utility
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Land Area (m²)"
              value={newEquipmentLandArea}
              onChangeText={setNewEquipmentLandArea}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Building Occupation (0-1, e.g., 0.3 for 30%)"
              value={newEquipmentOccupation}
              onChangeText={setNewEquipmentOccupation}
              keyboardType="decimal-pad"
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Cost Type:</Text>
              <View style={styles.pickerOptions}>
                {constructionCosts.map((cost) => (
                  <TouchableOpacity
                    key={cost.code}
                    style={[
                      styles.pickerOption,
                      newEquipmentCostType === cost.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setNewEquipmentCostType(cost.code)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        newEquipmentCostType === cost.code && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cost.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setAddEquipmentModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleAddEquipment}
              >
                <Text style={styles.modalSaveButtonText}>Add</Text>
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
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  projectTitleSection: {
    flex: 1,
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
  projectEditButton: {
    padding: 8,
    marginLeft: 12,
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
  goldPriceMainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  goldPriceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 183, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goldPriceTitleSection: {
    flex: 1,
  },
  goldPriceLabel: {
    fontSize: 16,
    color: '#8D6E00',
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  goldPriceTimestamp: {
    fontSize: 11,
    color: '#A67C00',
  },
  goldPriceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  goldPriceItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 183, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  goldPriceItemLabel: {
    fontSize: 12,
    color: '#A67C00',
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  goldPriceItemValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#8D6E00',
  },
  exchangeRateInfo: {
    backgroundColor: 'rgba(255, 183, 0, 0.08)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  exchangeRateText: {
    fontSize: 13,
    color: '#8D6E00',
    fontWeight: '600' as const,
    textAlign: 'center',
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
    paddingBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
  costCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
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
  housingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  housingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  housingCode: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 4,
  },
  housingName: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
  },
  housingDetails: {
    gap: 8,
  },
  housingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  housingDetailLabel: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '500' as const,
  },
  housingDetailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
  },
  housingDetailValueHighlight: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  equipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  equipmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  equipmentCode: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 4,
  },
  equipmentName: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  equipmentDetails: {
    gap: 8,
  },
  equipmentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipmentDetailLabel: {
    fontSize: 13,
    color: '#6C757D',
    fontWeight: '500' as const,
  },
  equipmentDetailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
  },
  equipmentDetailValueHighlight: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#212529',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 12,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 8,
  },
  pickerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  pickerOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  categoryOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  categoryOptionTextSelected: {
    color: '#007AFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
  },
  rentalPeriodInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rentalPeriodLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
  },
  rentalPeriodInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#212529',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flex: 1,
    marginLeft: 12,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
