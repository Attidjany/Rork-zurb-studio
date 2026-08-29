/** Mirror of expo/constants/typologies.ts — the parts the server needs to price a site. */

/** One conversion rate for the whole server (matches the rate shown in the app UI). */
export const USD_TO_XOF = 570;
export const APARTMENT_BUILDING_UNITS: Record<string, Record<string, number>> = {
  AB1: { AMS: 18, AML: 4, XM: 6 },
  AB2: { AML: 16, XM: 6 },
  ABH: { AH: 12, XH: 6 },
};

export const CONSTRUCTION_COST_DEFAULTS: Record<string, number> = {
  ZME: 14.91, ZHE: 20.9, ZOS: 26.9, ZMER: 12.6735, ZHER: 17.765,
};

export const HOUSING_TYPE_DEFAULTS: Record<string, { area: number; costType: string; rent: number }> = {
  AMS: { area: 100, costType: 'ZME', rent: 250000 },
  AML: { area: 150, costType: 'ZME', rent: 300000 },
  AH: { area: 200, costType: 'ZHE', rent: 650000 },
  BMS: { area: 150, costType: 'ZME', rent: 400000 },
  BML: { area: 250, costType: 'ZME', rent: 550000 },
  BH: { area: 300, costType: 'ZHE', rent: 750000 },
  CH: { area: 450, costType: 'ZHE', rent: 1300000 },
  CO: { area: 450, costType: 'ZOS', rent: 2500000 },
  XM: { area: 75, costType: 'ZMER', rent: 200000 },
  XH: { area: 75, costType: 'ZHER', rent: 300000 },
};
