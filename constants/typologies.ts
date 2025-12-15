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
    name: 'Mixed Layout (200/300m²)',
    description: 'High density mix: 26 plots of 200sqm + 24 plots of 300sqm',
    plots: [
      { size: 200, count: 26 },
      { size: 300, count: 24 },
    ],
    totalUnits: 50,
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fqhyroefq5r6z7jo1mjig',
  },
  {
    id: '480',
    name: 'Standard Layout (480m²)',
    description: 'Medium density: 30 plots of 480sqm each',
    plots: [
      { size: 480, count: 30 },
    ],
    totalUnits: 30,
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fz3jxoxbawqkyccpujq5n',
  },
  {
    id: '1200',
    name: 'Luxury Layout (1200m²)',
    description: 'Low density: 14 plots of 1200sqm each',
    plots: [
      { size: 1200, count: 14 },
    ],
    totalUnits: 14,
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pgf1s0m4yy8ggb42mexox',
  },
];

export const APARTMENT_LAYOUTS: ApartmentLayoutConfig[] = [
  {
    id: 'AB1',
    name: 'Apartment Building Type AB1',
    description: '10x AB1 buildings (18 AMS + 4 AML + 6 XM each) + 2 equipment + 1 utility',
    totalBuildings: 13,
    apartmentBuildings: 10,
    equipmentSpots: 2,
    utilitySpots: 1,
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/avb0us848hxe680th6c8c',
  },
  {
    id: 'AB2',
    name: 'Apartment Building Type AB2',
    description: '10x AB2 buildings (16 AML + 6 XM each) + 2 equipment + 1 utility',
    totalBuildings: 13,
    apartmentBuildings: 10,
    equipmentSpots: 2,
    utilitySpots: 1,
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/avb0us848hxe680th6c8c',
  },
  {
    id: 'ABH',
    name: 'Apartment Building Type ABH',
    description: '10x ABH buildings (12 AH + 6 XH each) + 2 equipment + 1 utility',
    totalBuildings: 13,
    apartmentBuildings: 10,
    equipmentSpots: 2,
    utilitySpots: 1,
    imageUrl: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/avb0us848hxe680th6c8c',
  },
];

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
  {
    id: 'BMS',
    name: 'Villa MidEnd Small',
    category: 'villa',
  },
  {
    id: 'BML',
    name: 'Villa MidEnd Large',
    category: 'villa',
  },
  {
    id: 'BH',
    name: 'Villa Highend',
    category: 'villa',
  },
  {
    id: 'CH',
    name: 'Mansion HighEnd',
    category: 'villa',
  },
  {
    id: 'CO',
    name: 'Mansion OutStanding',
    category: 'villa',
  },
  {
    id: 'EQS',
    name: 'Equipment Small',
    category: 'equipment',
    landArea: 1800,
    buildingOccupation: 0.3,
  },
  {
    id: 'EQL',
    name: 'Equipment Large',
    category: 'equipment',
    landArea: 2400,
    buildingOccupation: 0.3,
  },
  {
    id: 'UTL',
    name: 'Utility',
    category: 'utility',
    landArea: 1800,
    buildingOccupation: 0.3,
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

export const CONSTRUCTION_COSTS: { [key: string]: { name: string; goldGramsPerM2: number } } = {
  ZME: { name: 'Zenoàh Mid End', goldGramsPerM2: 14.91 },
  ZHE: { name: 'Zenoàh High End', goldGramsPerM2: 20.9 },
  ZOS: { name: 'Zenoàh Out-Standing', goldGramsPerM2: 26.9 },
  ZMER: { name: 'Zenoàh Mid End Reduced (ZME -15%)', goldGramsPerM2: 12.6735 },
  ZHER: { name: 'Zenoàh High End Reduced (ZHE -15%)', goldGramsPerM2: 17.765 },
};

export const HOUSING_TYPES: { [key: string]: { name: string; defaultArea: number; defaultCostType: string; defaultRent: number; category: string } } = {
  AMS: { name: 'Apartment MidEnd Small', defaultArea: 100, defaultCostType: 'ZME', defaultRent: 250000, category: 'apartment' },
  AML: { name: 'Apartment MidEnd Large', defaultArea: 150, defaultCostType: 'ZME', defaultRent: 300000, category: 'apartment' },
  AH: { name: 'Apartment High-end', defaultArea: 200, defaultCostType: 'ZHE', defaultRent: 650000, category: 'apartment' },
  BMS: { name: 'Villa MidEnd Small', defaultArea: 150, defaultCostType: 'ZME', defaultRent: 400000, category: 'villa' },
  BML: { name: 'Villa MidEnd Large', defaultArea: 250, defaultCostType: 'ZME', defaultRent: 550000, category: 'villa' },
  BH: { name: 'Villa Highend', defaultArea: 300, defaultCostType: 'ZHE', defaultRent: 750000, category: 'villa' },
  CH: { name: 'Mansion HighEnd', defaultArea: 450, defaultCostType: 'ZHE', defaultRent: 1300000, category: 'villa' },
  CO: { name: 'Mansion OutStanding', defaultArea: 450, defaultCostType: 'ZOS', defaultRent: 2500000, category: 'villa' },
  XM: { name: 'Commercial MidEnd', defaultArea: 75, defaultCostType: 'ZMER', defaultRent: 200000, category: 'commercial' },
  XH: { name: 'Commercial HighEnd', defaultArea: 75, defaultCostType: 'ZHER', defaultRent: 300000, category: 'commercial' },
};

export const UNIT_BUILD_AREAS: { [key: string]: number } = {
  XM: 75,
  XH: 75,
  AMS: 100,
  AML: 150,
  AH: 200,
  BMS: 150,
  BML: 250,
  BH: 300,
  CH: 450,
  CO: 450,
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
  XM: 0,
  XH: 0,
  AMS: 0,
  AML: 0,
  AH: 0,
  BMS: 0,
  BML: 0,
  BH: 0,
  CH: 0,
  CO: 0,
  villa_200: 0,
  villa_300: 0,
  villa_500: 0,
  villa_1000: 0,
  ZME: 0,
  ZHE: 0,
  ZOS: 0,
  ZMER: 0,
  ZHER: 0,
};

export const UNIT_RENTS_MONTHLY: { [key: string]: number } = {
  XM: 200000,
  XH: 300000,
  AMS: 250000,
  AML: 300000,
  AH: 650000,
  BMS: 400000,
  BML: 550000,
  BH: 750000,
  CH: 1300000,
  CO: 2500000,
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

export const VILLA_TYPE_OPTIONS: { [plotSize: number]: BuildingTypeConfig[] } = {
  200: BUILDING_TYPES.filter(bt => ['BMS', 'BML'].includes(bt.id)),
  300: BUILDING_TYPES.filter(bt => ['BML', 'BH'].includes(bt.id)),
  480: BUILDING_TYPES.filter(bt => ['BH', 'CH'].includes(bt.id)),
  1200: BUILDING_TYPES.filter(bt => ['CH', 'CO'].includes(bt.id)),
  1000: BUILDING_TYPES.filter(bt => ['BH', 'CH'].includes(bt.id)),
};

export const DEFAULT_LEASE_YEARS = 20;
