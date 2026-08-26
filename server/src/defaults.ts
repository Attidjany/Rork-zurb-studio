/** Default parameter sets (ported from initialize_account_settings / auto_populate_project_types). */
export const DEFAULT_CONSTRUCTION_COSTS = [
  { code: 'ZME', name: 'Zenoàh Mid End', gold_grams_per_m2: 14.91 },
  { code: 'ZHE', name: 'Zenoàh High End', gold_grams_per_m2: 20.9 },
  { code: 'ZOS', name: 'Zenoàh Out-Standing', gold_grams_per_m2: 26.9 },
  { code: 'ZMER', name: 'Zenoàh Mid End Reduced (ZME -15%)', gold_grams_per_m2: 12.6735 },
  { code: 'ZHER', name: 'Zenoàh High End Reduced (ZHE -15%)', gold_grams_per_m2: 17.765 },
];

export const DEFAULT_HOUSING_TYPES = [
  { code: 'AMS', name: 'Apartment MidEnd Small', category: 'apartment', default_area_m2: 100, default_cost_type: 'ZME', default_rent_monthly: 250000 },
  { code: 'AML', name: 'Apartment MidEnd Large', category: 'apartment', default_area_m2: 150, default_cost_type: 'ZME', default_rent_monthly: 300000 },
  { code: 'AH', name: 'Apartment High-end', category: 'apartment', default_area_m2: 200, default_cost_type: 'ZHE', default_rent_monthly: 650000 },
  { code: 'BMS', name: 'Villa MidEnd Small', category: 'villa', default_area_m2: 150, default_cost_type: 'ZME', default_rent_monthly: 400000 },
  { code: 'BML', name: 'Villa MidEnd Large', category: 'villa', default_area_m2: 250, default_cost_type: 'ZME', default_rent_monthly: 550000 },
  { code: 'BH', name: 'Villa Highend', category: 'villa', default_area_m2: 300, default_cost_type: 'ZHE', default_rent_monthly: 750000 },
  { code: 'CH', name: 'Mansion HighEnd', category: 'villa', default_area_m2: 450, default_cost_type: 'ZHE', default_rent_monthly: 1300000 },
  { code: 'CO', name: 'Mansion OutStanding', category: 'villa', default_area_m2: 450, default_cost_type: 'ZOS', default_rent_monthly: 2500000 },
  { code: 'XM', name: 'Commercial MidEnd', category: 'commercial', default_area_m2: 75, default_cost_type: 'ZMER', default_rent_monthly: 200000 },
  { code: 'XH', name: 'Commercial HighEnd', category: 'commercial', default_area_m2: 75, default_cost_type: 'ZHER', default_rent_monthly: 300000 },
];

export const DEFAULT_EQUIPMENT_UTILITY_TYPES = [
  { code: 'EQS', name: 'Equipment Small', category: 'equipment', land_area_m2: 1800, building_occupation_pct: 0.3, cost_type: 'ZMER' },
  { code: 'EQL', name: 'Equipment Large', category: 'equipment', land_area_m2: 2400, building_occupation_pct: 0.3, cost_type: 'ZMER' },
  { code: 'UTL', name: 'Utility', category: 'utility', land_area_m2: 1800, building_occupation_pct: 0.3, cost_type: 'ZMER' },
];

export const DEFAULT_OCCUPANCY_RATES = [
  { min_area_m2: 0, max_area_m2: 80, people_per_unit: 3, category: 'apartment' },
  { min_area_m2: 81, max_area_m2: 120, people_per_unit: 4, category: 'apartment' },
  { min_area_m2: 121, max_area_m2: null, people_per_unit: 5, category: 'apartment' },
  { min_area_m2: 0, max_area_m2: 400, people_per_unit: 4, category: 'villa' },
  { min_area_m2: 401, max_area_m2: 700, people_per_unit: 5, category: 'villa' },
  { min_area_m2: 701, max_area_m2: null, people_per_unit: 6, category: 'villa' },
];
