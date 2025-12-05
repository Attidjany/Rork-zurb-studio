export interface DbProject {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSite {
  id: string;
  project_id: string;
  name: string;
  area_ha: number;
  created_at: string;
  updated_at: string;
}

export interface DbBlock {
  id: string;
  site_id: string;
  block_number: number;
  created_at: string;
}

export type HalfBlockPosition = 'north' | 'south';
export type HalfBlockType = 'villas' | 'apartments';
export type VillaLayout = '200_300_mix' | '500' | '1000';
export type ApartmentLayout = 'AB1' | 'AB2' | 'ABH';
export type BuildingType = 'AB1' | 'AB2' | 'ABH' | 'BMS' | 'BML' | 'BH' | 'CH' | 'CO' | 'EQS' | 'EQL' | 'UTL';

export interface DbHalfBlock {
  id: string;
  block_id: string;
  position: HalfBlockPosition;
  type: HalfBlockType | null;
  villa_layout: VillaLayout | null;
  apartment_layout: ApartmentLayout | null;
  created_at: string;
}

export interface DbUnit {
  id: string;
  half_block_id: string;
  unit_number: number;
  unit_type: string;
  size_m2: number | null;
  building_type: BuildingType | null;
  equipment_name: string | null;
  utility_name: string | null;
  created_at: string;
}

export interface DbScenario {
  id: string;
  site_id: string;
  name: string;
  notes: string | null;
  rental_period_years: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbProjectCostParam {
  id: string;
  project_id: string;
  unit_type: string;
  build_area_m2: number;
  cost_per_m2: number;
  rent_monthly: number;
  created_at: string;
  updated_at: string;
}

export interface DbScenarioCostParam {
  id: string;
  scenario_id: string;
  unit_type: string;
  build_area_m2: number;
  cost_per_m2: number;
  rent_monthly: number;
  created_at: string;
  updated_at: string;
}

export interface VillaLayoutConfig {
  id: VillaLayout;
  name: string;
  description: string;
  plots: {
    size: number;
    count: number;
  }[];
  totalUnits: number;
}

export interface ApartmentLayoutConfig {
  id: ApartmentLayout;
  name: string;
  description: string;
  totalBuildings: number;
  apartmentBuildings: number;
  equipmentSpots: number;
  utilitySpots: number;
}

export interface BuildingTypeConfig {
  id: BuildingType;
  name: string;
  category: 'apartment' | 'villa' | 'equipment' | 'utility';
  landArea?: number;
  buildingOccupation?: number;
  units?: {
    XM?: number;
    XH?: number;
    AMS?: number;
    AML?: number;
    AH?: number;
  };
}

export interface EquipmentOption {
  id: string;
  name: string;
}

export interface UtilityOption {
  id: string;
  name: string;
}

export interface ScenarioSummary {
  totalResidentialUnits: number;
  unitsByType: {
    [key: string]: number;
  };
  totalBuildArea: number;
  totalCosts: number;
  expectedRevenue: number;
  rentalPeriod: number;
}

export interface DbProjectConstructionCost {
  id: string;
  project_id: string;
  code: string;
  name: string;
  gold_grams_per_m2: number;
  created_at: string;
  updated_at: string;
}

export interface DbProjectHousingType {
  id: string;
  project_id: string;
  code: string;
  name: string;
  category: 'apartment' | 'villa' | 'commercial';
  default_area_m2: number;
  default_cost_type: string;
  default_rent_monthly: number;
  created_at: string;
  updated_at: string;
}

export interface DbProjectEquipmentUtilityType {
  id: string;
  project_id: string;
  code: string;
  name: string;
  category: 'equipment' | 'utility';
  land_area_m2: number;
  building_occupation_pct: number;
  cost_type: string;
  created_at: string;
  updated_at: string;
}

export interface DbScenarioConstructionCost {
  id: string;
  scenario_id: string;
  code: string;
  name: string;
  gold_grams_per_m2: number;
  created_at: string;
  updated_at: string;
}

export interface DbScenarioHousingType {
  id: string;
  scenario_id: string;
  code: string;
  name: string;
  category: 'apartment' | 'villa' | 'commercial';
  default_area_m2: number;
  default_cost_type: string;
  default_rent_monthly: number;
  created_at: string;
  updated_at: string;
}

export interface DbScenarioEquipmentUtilityType {
  id: string;
  scenario_id: string;
  code: string;
  name: string;
  category: 'equipment' | 'utility';
  land_area_m2: number;
  building_occupation_pct: number;
  cost_type: string;
  created_at: string;
  updated_at: string;
}
