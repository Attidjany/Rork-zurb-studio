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
    id: 'AM1',
    name: 'Apartment Type AM1',
    category: 'apartment',
    units: {
      XM: 10,
      AMS: 15,
      AML: 5,
    },
  },
  {
    id: 'AM2',
    name: 'Apartment Type AM2',
    category: 'apartment',
    units: {
      XM: 8,
      AMS: 20,
      AML: 2,
    },
  },
  {
    id: 'AH',
    name: 'Apartment Type AH',
    category: 'apartment',
    units: {
      AH: 25,
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

export const UNIT_BUILD_AREAS: { [key: string]: number } = {
  XM: 50,
  AMS: 75,
  AML: 100,
  AH: 120,
  villa_200: 150,
  villa_300: 200,
  villa_500: 300,
  villa_1000: 500,
};

export const UNIT_COSTS_PER_M2: { [key: string]: number } = {
  XM: 800,
  AMS: 900,
  AML: 1000,
  AH: 1200,
  villa_200: 1100,
  villa_300: 1200,
  villa_500: 1300,
  villa_1000: 1500,
};

export const UNIT_RENTS_MONTHLY: { [key: string]: number } = {
  XM: 300,
  AMS: 500,
  AML: 600,
  AH: 850,
  villa_200: 800,
  villa_300: 1000,
  villa_500: 1200,
  villa_1000: 2000,
};

export const DEFAULT_LEASE_YEARS = 20;
