import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZUDS } from '@/contexts/ZUDSContext';
import { CostParams, OverheadConfig } from '@/types';

export default function SettingsScreen() {
  const {
    costParams,
    mixRules,
    rents,
    overheads,
    updateCostParams,
    updateOverheads,
  } = useZUDS();

  const [goldPrice, setGoldPrice] = useState<string>(costParams.goldUsdPerOz.toString());
  const [gramsMid, setGramsMid] = useState<string>(costParams.gramsMidEnd.toString());
  const [gramsHigh, setGramsHigh] = useState<string>(costParams.gramsHighEnd.toString());
  const [gramsOut, setGramsOut] = useState<string>(costParams.gramsOutstanding.toString());

  const [devMonthly, setDevMonthly] = useState<string>(overheads.devMonthlyUsd.toString());
  const [maintMonthly, setMaintMonthly] = useState<string>(
    overheads.maintMonthlyUsd.toString()
  );
  const [leaseYears, setLeaseYears] = useState<string>(overheads.leaseYears.toString());
  const [infraSubsidy, setInfraSubsidy] = useState<string>(
    overheads.infraSubsidyPct.toString()
  );

  const handleSaveCostParams = () => {
    const newParams: CostParams = {
      goldUsdPerOz: parseFloat(goldPrice) || 3000,
      gramsMidEnd: parseFloat(gramsMid) || 14.91,
      gramsHighEnd: parseFloat(gramsHigh) || 20.9,
      gramsOutstanding: parseFloat(gramsOut) || 26.9,
    };
    updateCostParams(newParams);
    Alert.alert('Success', 'Cost parameters updated');
  };

  const handleSaveOverheads = () => {
    const newOverheads: OverheadConfig = {
      devMonthlyUsd: parseFloat(devMonthly) || 90,
      maintMonthlyUsd: parseFloat(maintMonthly) || 10,
      leaseYears: parseInt(leaseYears) || 20,
      infraSubsidyPct: parseFloat(infraSubsidy) || 100,
    };
    updateOverheads(newOverheads);
    Alert.alert('Success', 'Overhead parameters updated');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Settings & Catalog',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gold-Indexed Costs</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gold Price ($/oz)</Text>
              <TextInput
                style={styles.input}
                value={goldPrice}
                onChangeText={setGoldPrice}
                keyboardType="decimal-pad"
                testID="gold-price-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MidEnd® (grams/m²)</Text>
              <TextInput
                style={styles.input}
                value={gramsMid}
                onChangeText={setGramsMid}
                keyboardType="decimal-pad"
                testID="grams-mid-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HighEnd® (grams/m²)</Text>
              <TextInput
                style={styles.input}
                value={gramsHigh}
                onChangeText={setGramsHigh}
                keyboardType="decimal-pad"
                testID="grams-high-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OutStanding® (grams/m²)</Text>
              <TextInput
                style={styles.input}
                value={gramsOut}
                onChangeText={setGramsOut}
                keyboardType="decimal-pad"
                testID="grams-out-input"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveCostParams}
              testID="save-cost-params-button"
            >
              <Text style={styles.saveButtonText}>Save Cost Parameters</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mix Rules</Text>
          <View style={styles.card}>
            {mixRules.map(rule => (
              <View key={rule.category} style={styles.mixRuleCard}>
                <Text style={styles.mixRuleTitle}>Category {rule.category}</Text>
                <Text style={styles.mixRuleText}>
                  MidEnd: {rule.midEndPct}% • HighEnd: {rule.highEndPct}% • Outstanding:{' '}
                  {rule.outstandingPct}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent Targets</Text>
          <View style={styles.card}>
            {rents.map(rent => (
              <View key={rent.code} style={styles.rentRow}>
                <Text style={styles.rentCode}>{rent.code}</Text>
                <Text style={styles.rentAmount}>${rent.monthlyUsd}/month</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overhead Configuration</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Dev Cost Recoup ($/month/unit)</Text>
              <TextInput
                style={styles.input}
                value={devMonthly}
                onChangeText={setDevMonthly}
                keyboardType="decimal-pad"
                testID="dev-monthly-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Maintenance ($/month/unit)</Text>
              <TextInput
                style={styles.input}
                value={maintMonthly}
                onChangeText={setMaintMonthly}
                keyboardType="decimal-pad"
                testID="maint-monthly-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lease Duration (years)</Text>
              <TextInput
                style={styles.input}
                value={leaseYears}
                onChangeText={setLeaseYears}
                keyboardType="number-pad"
                testID="lease-years-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Infrastructure Subsidy (%)</Text>
              <TextInput
                style={styles.input}
                value={infraSubsidy}
                onChangeText={setInfraSubsidy}
                keyboardType="decimal-pad"
                testID="infra-subsidy-input"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveOverheads}
              testID="save-overheads-button"
            >
              <Text style={styles.saveButtonText}>Save Overhead Parameters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  mixRuleCard: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mixRuleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 4,
  },
  mixRuleText: {
    fontSize: 14,
    color: '#666666',
  },
  rentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  rentCode: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  rentAmount: {
    fontSize: 16,
    color: '#007AFF',
  },
});
