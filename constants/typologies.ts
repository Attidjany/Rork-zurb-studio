import { 
  VillaLayoutConfig, 
  ApartmentLayoutConfig, 
  BuildingTypeConfig, 
  EquipmentOption, 
  UtilityOption 
} from '@/types';

export const VILLA_LAYOUTS: VillaLayoutConfig[] = [
  {
    id: '200_300_mix',
    name: '200/300 sqm Mix',
    description: '26 plots of 200sqm + 24 plots of 300sqm',
    plots: [
      { size: 200, count: 26 },
      { size: 300, count: 24 },
    ],
    totalUnits: 50,
  },
  {
    id: '500',
    name: '500 sqm Layout',
    description: '30 plots of 500sqm each',
    plots: [
      { size: 500, count: 30 },
    ],
    totalUnits: 30,
  },
  {
    id: '1000',
    name: '1000 sqm Layout',
    description: '20 plots of 1000sqm each',
    plots: [
      { size: 1000, count: 20 },
    ],
    totalUnits: 20,
  },
];

export const APARTMENT_LAYOUT: ApartmentLayoutConfig = {
  totalBuildings: 13,
  apartmentBuildings: 10,
  equipmentSpots: 2,
  utilitySpots: 1,
};

export const BUILDING_TYPES: BuildingTypeConfig[] = [
  {
    id: 'AB1',
    name: 'Apartment Building Type AB1',
    category: 'apartment',
    units: {
      AMS: 18,
      AML: 4,
      XM: 6,
    },
  },
  {
    id: 'AB2',
    name: 'Apartment Building Type AB2',
    category: 'apartment',
    units: {
      AML: 16,
      XM: 6,
    },
  },
  {
    id: 'ABH',
    name: 'Apartment Building Type ABH',
    category: 'apartment',
    units: {
      AH: 12,
      XH: 6,
    },
  },
];

export const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { id: 'school', name: 'School' },
  { id: 'clinic', name: 'Health Clinic' },
  { id: 'community_center', name: 'Community Center' },
  { id: 'sports_complex', name: 'Sports Complex' },
  { id: 'market', name: 'Market' },
];

export const UTILITY_OPTIONS: UtilityOption[] = [
  { id: 'water_treatment', name: 'Water Treatment Plant' },
  { id: 'power_station', name: 'Power Station' },
  { id: 'waste_management', name: 'Waste Management Facility' },
  { id: 'maintenance', name: 'Maintenance Depot' },
];

export const CONSTRUCTION_COSTS: { [key: string]: { name: string; defaultCostPerM2: number } } = {
  ZME: { name: 'Zone Moyenne Entièrement équipée', defaultCostPerM2: 1000 },
  ZHE: { name: 'Zone Haut standing Entièrement équipée', defaultCostPerM2: 1200 },
  ZOS: { name: 'Zone Ordinaire Semi-équipée', defaultCostPerM2: 900 },
  ZMER: { name: 'Zone Moyenne Équipée Renforcée', defaultCostPerM2: 1100 },
  ZHER: { name: 'Zone Haut standing Équipée Renforcée', defaultCostPerM2: 1300 },
};

export const HOUSING_TYPES: { [key: string]: { name: string; defaultArea: number; defaultCostType: string; defaultRent: number; category: string } } = {
  AMS: { name: 'Apartment Small', defaultArea: 75, defaultCostType: 'ZME', defaultRent: 500, category: 'apartment' },
  AML: { name: 'Apartment Medium/Large', defaultArea: 100, defaultCostType: 'ZME', defaultRent: 600, category: 'apartment' },
  AH: { name: 'Apartment High-end', defaultArea: 120, defaultCostType: 'ZHE', defaultRent: 850, category: 'apartment' },
  BMS: { name: 'Villa Small', defaultArea: 130, defaultCostType: 'ZME', defaultRent: 750, category: 'villa' },
  BML: { name: 'Villa Medium/Large', defaultArea: 180, defaultCostType: 'ZME', defaultRent: 950, category: 'villa' },
  BH: { name: 'Villa High-end', defaultArea: 220, defaultCostType: 'ZHE', defaultRent: 1200, category: 'villa' },
  CH: { name: 'Chalet High-end', defaultArea: 250, defaultCostType: 'ZHE', defaultRent: 1400, category: 'villa' },
  CO: { name: 'Chalet Ordinary', defaultArea: 160, defaultCostType: 'ZOS', defaultRent: 900, category: 'villa' },
  XM: { name: 'Commercial Medium', defaultArea: 50, defaultCostType: 'ZME', defaultRent: 300, category: 'commercial' },
  XH: { name: 'Commercial High-end', defaultArea: 80, defaultCostType: 'ZHE', defaultRent: 450, category: 'commercial' },
};

export const UNIT_BUILD_AREAS: { [key: string]: number } = {
  XM: 50,
  XH: 80,
  AMS: 75,
  AML: 100,
  AH: 120,
  BMS: 130,
  BML: 180,
  BH: 220,
  CH: 250,
  CO: 160,
  villa_200: 150,
  villa_300: 200,
  villa_500: 300,
  villa_1000: 500,
  ZME: 0,
  ZHE: 0,
  ZOS: 0,
  ZMER: 0,
  ZHER: 0,
};

export const UNIT_COSTS_PER_M2: { [key: string]: number } = {
  XM: 800,
  XH: 1000,
  AMS: 900,
  AML: 1000,
  AH: 1200,
  BMS: 1100,
  BML: 1200,
  BH: 1400,
  CH: 1500,
  CO: 1150,
  villa_200: 1100,
  villa_300: 1200,
  villa_500: 1300,
  villa_1000: 1500,
  ZME: 1000,
  ZHE: 1200,
  ZOS: 900,
  ZMER: 1100,
  ZHER: 1300,
};

export const UNIT_RENTS_MONTHLY: { [key: string]: number } = {
  XM: 300,
  XH: 450,
  AMS: 500,
  AML: 600,
  AH: 850,
  BMS: 750,
  BML: 950,
  BH: 1200,
  CH: 1400,
  CO: 900,
  villa_200: 800,
  villa_300: 1000,
  villa_500: 1200,
  villa_1000: 2000,
  ZME: 0,
  ZHE: 0,
  ZOS: 0,
  ZMER: 0,
  ZHER: 0,
};

export const DEFAULT_LEASE_YEARS = 20;
