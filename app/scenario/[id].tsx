import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZURB } from '@/contexts/ZURBContext';
import {
  UNIT_COSTS_PER_M2,
  UNIT_RENTS_MONTHLY,
  DEFAULT_LEASE_YEARS,
} from '@/constants/typologies';
import { DbBlock, DbHalfBlock, DbUnit } from '@/types';

export default function ScenarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    scenarios,
    sites,
    getBlocksBySiteId,
    getHalfBlocksByBlockId,
    getUnitsByHalfBlockId,
  } = useZURB();

  const scenario = useMemo(() => {
    return scenarios.find(s => s.id === id) || null;
  }, [scenarios, id]);

  const site = useMemo(() => {
    if (!scenario) return null;
    return sites.find(s => s.id === scenario.site_id) || null;
  }, [sites, scenario]);

  const siteBlocks = useMemo(() => {
    if (!scenario) return [];
    return getBlocksBySiteId(scenario.site_id);
  }, [getBlocksBySiteId, scenario]);

  const summary = useMemo(() => {
    let totalResidentialUnits = 0;
    let totalBuildArea = 0;
    let totalCosts = 0;
    let totalRevenue = 0;
    const unitsByType: { [key: string]: number } = {};

    siteBlocks.forEach((block: DbBlock) => {
      const halfBlocks = getHalfBlocksByBlockId(block.id);

      halfBlocks.forEach((hb: DbHalfBlock) => {
        const units = getUnitsByHalfBlockId(hb.id);

        units.forEach((unit: DbUnit) => {
          if (unit.unit_type === 'villa') {
            totalResidentialUnits += 1;
            const sizeKey = `villa_${unit.size_m2}` as string;
            unitsByType[sizeKey] = (unitsByType[sizeKey] || 0) + 1;

            const costPerM2 = UNIT_COSTS_PER_M2[sizeKey] || 1000;
            const rentMonthly = UNIT_RENTS_MONTHLY[sizeKey] || 500;

            totalBuildArea += unit.size_m2 || 0;
            totalCosts += (unit.size_m2 || 0) * costPerM2;
            totalRevenue += rentMonthly * 12 * DEFAULT_LEASE_YEARS;
          } else if (unit.building_type && ['AM1', 'AM2', 'AH'].includes(unit.building_type)) {
            const buildingUnits: { [key: string]: number } = {
              AM1: 30,
              AM2: 30,
              AH: 25,
            };
            const unitsCount = buildingUnits[unit.building_type] || 0;
            totalResidentialUnits += unitsCount;

            unitsByType[unit.building_type] = (unitsByType[unit.building_type] || 0) + unitsCount;
          }
        });
      });
    });

    const rentalPeriodYears = DEFAULT_LEASE_YEARS;

    return {
      totalResidentialUnits,
      totalBuildArea,
      totalCosts,
      totalRevenue,
      unitsByType,
      rentalPeriodYears,
    };
  }, [siteBlocks, getHalfBlocksByBlockId, getUnitsByHalfBlockId]);

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Scenario Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Residential Units</Text>
            <Text style={styles.summaryValue}>{summary.totalResidentialUnits}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Build Area</Text>
            <Text style={styles.summaryValue}>{summary.totalBuildArea.toFixed(0)} m²</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Costs</Text>
            <Text style={styles.summaryValue}>
              ${summary.totalCosts.toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expected Revenue</Text>
            <Text style={styles.summaryValue}>
              ${summary.totalRevenue.toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rental Period</Text>
            <Text style={styles.summaryValue}>{summary.rentalPeriodYears} years</Text>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Units Breakdown</Text>
          {Object.entries(summary.unitsByType).map(([type, count]) => (
            <View key={type} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{type}</Text>
              <Text style={styles.breakdownValue}>{count} units</Text>
            </View>
          ))}
        </View>

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
    color: '#666666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#007AFF',
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
