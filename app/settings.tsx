import { Stack, router } from 'expo-router';
import { LogOut, Edit2, DollarSign } from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { calculateCostPerM2 } from '@/lib/goldPrice';

type EditMode = 'construction' | 'housing' | 'equipment' | null;
type EditItem = any;

type ConstructionCost = {
  id: string;
  code: string;
  name: string;
  gold_grams_per_m2: number;
};

type HousingType = {
  id: string;
  code: string;
  name: string;
  category: string;
  default_area_m2: number;
  default_cost_type: string;
  default_rent_monthly: number;
};

type EquipmentUtilityType = {
  id: string;
  code: string;
  name: string;
  category: string;
  land_area_m2: number;
  building_occupation_pct: number;
  cost_type: string;
};

type Settings = {
  constructionCosts: ConstructionCost[];
  housingTypes: HousingType[];
  equipmentTypes: EquipmentUtilityType[];
};

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const currentGoldPrice = 65;
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editItem, setEditItem] = useState<EditItem>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: accountSettings, error: settingsError } = await supabase
        .from('account_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      const accountSettingsId = accountSettings.id;

      const [costsResult, housingResult, equipmentResult] = await Promise.all([
        supabase
          .from('account_construction_costs')
          .select('*')
          .eq('account_settings_id', accountSettingsId)
          .order('code', { ascending: true }),
        supabase
          .from('account_housing_types')
          .select('*')
          .eq('account_settings_id', accountSettingsId)
          .order('code', { ascending: true }),
        supabase
          .from('account_equipment_utility_types')
          .select('*')
          .eq('account_settings_id', accountSettingsId)
          .order('code', { ascending: true }),
      ]);

      if (costsResult.error) throw costsResult.error;
      if (housingResult.error) throw housingResult.error;
      if (equipmentResult.error) throw equipmentResult.error;

      setSettings({
        constructionCosts: costsResult.data || [],
        housingTypes: housingResult.data || [],
        equipmentTypes: equipmentResult.data || [],
      });
    } catch (error: any) {
      console.error('[Settings] Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  const openEditConstructionCost = (item: any) => {
    setEditMode('construction');
    setEditItem(item);
    setEditValues({
      gold_grams_per_m2: item.gold_grams_per_m2.toString(),
    });
  };

  const openEditHousingType = (item: any) => {
    setEditMode('housing');
    setEditItem(item);
    setEditValues({
      default_area_m2: item.default_area_m2.toString(),
      default_cost_type: item.default_cost_type,
      default_rent_monthly: item.default_rent_monthly.toString(),
    });
  };

  const openEditEquipmentType = (item: any) => {
    setEditMode('equipment');
    setEditItem(item);
    setEditValues({
      land_area_m2: item.land_area_m2.toString(),
      building_occupation_pct: (item.building_occupation_pct * 100).toString(),
      cost_type: item.cost_type,
    });
  };

  const handleSave = async () => {
    if (!editItem) return;
    
    setIsSaving(true);
    
    try {
      if (editMode === 'construction') {
        const goldGrams = parseFloat(editValues.gold_grams_per_m2);
        if (isNaN(goldGrams) || goldGrams <= 0) {
          Alert.alert('Error', 'Please enter a valid value');
          return;
        }
        
        const { error } = await supabase
          .from('account_construction_costs')
          .update({ gold_grams_per_m2: goldGrams })
          .eq('id', editItem.id);
          
        if (error) throw error;
        
      } else if (editMode === 'housing') {
        const area = parseFloat(editValues.default_area_m2);
        const rent = parseFloat(editValues.default_rent_monthly);
        if (isNaN(area) || area <= 0 || isNaN(rent) || rent < 0) {
          Alert.alert('Error', 'Please enter valid values');
          return;
        }
        
        const { error } = await supabase
          .from('account_housing_types')
          .update({
            default_area_m2: area,
            default_cost_type: editValues.default_cost_type,
            default_rent_monthly: rent,
          })
          .eq('id', editItem.id);
          
        if (error) throw error;
        
      } else if (editMode === 'equipment') {
        const land = parseFloat(editValues.land_area_m2);
        const pct = parseFloat(editValues.building_occupation_pct) / 100;
        if (isNaN(land) || land <= 0 || isNaN(pct) || pct < 0 || pct > 1) {
          Alert.alert('Error', 'Please enter valid values');
          return;
        }
        
        const { error } = await supabase
          .from('account_equipment_utility_types')
          .update({
            land_area_m2: land,
            building_occupation_pct: pct,
            cost_type: editValues.cost_type,
          })
          .eq('id', editItem.id);
          
        if (error) throw error;
      }
      
      await loadSettings();
      setEditMode(null);
      setEditItem(null);
      Alert.alert('Success', 'Settings updated successfully');
      
    } catch (error: any) {
      console.error('[Settings] Error saving:', error);
      Alert.alert('Error', error.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Settings',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.accountInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountEmail}>{user?.email || 'No email'}</Text>
                <Text style={styles.accountMeta}>ZURB Studio Account</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Construction Costs</Text>
            <View style={styles.goldPriceBadge}>
              <DollarSign size={14} color="#F59E0B" />
              <Text style={styles.goldPriceText}>
                ${currentGoldPrice.toFixed(2)}/g
              </Text>
            </View>
          </View>
          <View style={styles.card}>
            {settings?.constructionCosts.map((cost: any, index: number) => (
              <View key={cost.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.paramItem}
                  onPress={() => openEditConstructionCost(cost)}
                >
                  <View style={styles.paramItemContent}>
                    <Text style={styles.paramItemCode}>{cost.code}</Text>
                    <Text style={styles.paramItemName}>{cost.name}</Text>
                  </View>
                  <View style={styles.paramItemValues}>
                    <Text style={styles.paramItemValue}>
                      {cost.gold_grams_per_m2.toFixed(2)} g/m²
                    </Text>
                    <Text style={styles.paramItemValueSecondary}>
                      ${calculateCostPerM2(cost.gold_grams_per_m2, currentGoldPrice).toFixed(0)}/m²
                    </Text>
                    <Edit2 size={16} color="#C7C7CC" style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Housing Types</Text>
          <View style={styles.card}>
            {settings?.housingTypes.map((type: any, index: number) => (
              <View key={type.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.paramItem}
                  onPress={() => openEditHousingType(type)}
                >
                  <View style={styles.paramItemContent}>
                    <Text style={styles.paramItemCode}>{type.code}</Text>
                    <Text style={styles.paramItemName}>{type.name}</Text>
                    <Text style={styles.paramItemCategory}>{type.category}</Text>
                  </View>
                  <View style={styles.paramItemValues}>
                    <Text style={styles.paramItemValue}>
                      {type.default_area_m2}m² • {type.default_cost_type}
                    </Text>
                    <Text style={styles.paramItemValueSecondary}>
                      {(type.default_rent_monthly / 1000).toFixed(0)}K XOF/mo
                    </Text>
                    <Edit2 size={16} color="#C7C7CC" style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment & Utility Types</Text>
          <View style={styles.card}>
            {settings?.equipmentTypes.map((type: any, index: number) => (
              <View key={type.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.paramItem}
                  onPress={() => openEditEquipmentType(type)}
                >
                  <View style={styles.paramItemContent}>
                    <Text style={styles.paramItemCode}>{type.code}</Text>
                    <Text style={styles.paramItemName}>{type.name}</Text>
                    <Text style={styles.paramItemCategory}>{type.category}</Text>
                  </View>
                  <View style={styles.paramItemValues}>
                    <Text style={styles.paramItemValue}>
                      {type.land_area_m2}m² • {(type.building_occupation_pct * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.paramItemValueSecondary}>
                      {type.cost_type}
                    </Text>
                    <Edit2 size={16} color="#C7C7CC" style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.sectionHint}>
            These default parameters will be applied to all newly created projects. 
            You can still customize parameters for individual projects.
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#FF3B30" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={editMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditMode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editItem?.name || 'Parameter'}
            </Text>

            {editMode === 'construction' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gold Grams per m²</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.gold_grams_per_m2}
                    onChangeText={(text) => setEditValues({ ...editValues, gold_grams_per_m2: text })}
                    keyboardType="decimal-pad"
                    placeholder="14.91"
                  />
                  <Text style={styles.inputHint}>
                    Cost per m²: ${calculateCostPerM2(parseFloat(editValues.gold_grams_per_m2) || 0, currentGoldPrice).toFixed(0)}
                  </Text>
                </View>
              </>
            )}

            {editMode === 'housing' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Default Area (m²)</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.default_area_m2}
                    onChangeText={(text) => setEditValues({ ...editValues, default_area_m2: text })}
                    keyboardType="decimal-pad"
                    placeholder="100"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cost Type</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.default_cost_type}
                    onChangeText={(text) => setEditValues({ ...editValues, default_cost_type: text })}
                    placeholder="ZME"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monthly Rent (XOF)</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.default_rent_monthly}
                    onChangeText={(text) => setEditValues({ ...editValues, default_rent_monthly: text })}
                    keyboardType="numeric"
                    placeholder="250000"
                  />
                </View>
              </>
            )}

            {editMode === 'equipment' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Land Area (m²)</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.land_area_m2}
                    onChangeText={(text) => setEditValues({ ...editValues, land_area_m2: text })}
                    keyboardType="decimal-pad"
                    placeholder="1800"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Building Occupation (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.building_occupation_pct}
                    onChangeText={(text) => setEditValues({ ...editValues, building_occupation_pct: text })}
                    keyboardType="decimal-pad"
                    placeholder="30"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cost Type</Text>
                  <TextInput
                    style={styles.input}
                    value={editValues.cost_type}
                    onChangeText={(text) => setEditValues({ ...editValues, cost_type: text })}
                    placeholder="ZMER"
                  />
                </View>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setEditMode(null)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                )}
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goldPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  goldPriceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#F59E0B',
  },
  sectionHint: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  accountDetails: {
    flex: 1,
  },
  accountEmail: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 4,
  },
  accountMeta: {
    fontSize: 14,
    color: '#6C757D',
  },
  paramItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  paramItemContent: {
    flex: 1,
  },
  paramItemCode: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#007AFF',
    marginBottom: 2,
  },
  paramItemName: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 2,
  },
  paramItemCategory: {
    fontSize: 12,
    color: '#6C757D',
    textTransform: 'capitalize',
  },
  paramItemValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paramItemValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
  },
  paramItemValueSecondary: {
    fontSize: 13,
    color: '#6C757D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 32,
  },
  logoutButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#212529',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#212529',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  inputHint: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6C757D',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
