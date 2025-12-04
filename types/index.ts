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
export type BuildingType = 'AM1' | 'AM2' | 'AH' | 'equipment' | 'utility';

export interface DbHalfBlock {
  id: string;
  block_id: string;
  position: HalfBlockPosition;
  type: HalfBlockType | null;
  villa_layout: VillaLayout | null;
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
  created_by: string;
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
  totalBuildings: number;
  apartmentBuildings: number;
  equipmentSpots: number;
  utilitySpots: number;
}

export interface BuildingTypeConfig {
  id: BuildingType;
  name: string;
  category: 'apartment' | 'equipment' | 'utility';
  units?: {
    XM?: number;
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
