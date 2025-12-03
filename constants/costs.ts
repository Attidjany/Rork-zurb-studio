import { CostParams, MixRule, RentConfig, OverheadConfig } from '@/types';

export const DEFAULT_COST_PARAMS: CostParams = {
  goldUsdPerOz: 3000,
  gramsMidEnd: 14.91,
  gramsHighEnd: 20.9,
  gramsOutstanding: 26.9,
};

export const DEFAULT_MIX_RULES: MixRule[] = [
  {
    category: 'A',
    midEndPct: 80,
    highEndPct: 20,
    outstandingPct: 0,
  },
  {
    category: 'B',
    midEndPct: 60,
    highEndPct: 40,
    outstandingPct: 0,
  },
  {
    category: 'C',
    midEndPct: 0,
    highEndPct: 25,
    outstandingPct: 75,
  },
  {
    category: 'XM',
    midEndPct: 100,
    highEndPct: 0,
    outstandingPct: 0,
  },
  {
    category: 'XH',
    midEndPct: 0,
    highEndPct: 100,
    outstandingPct: 0,
  },
];

export const DEFAULT_RENTS: RentConfig[] = [
  { code: 'AMS', monthlyUsd: 500 },
  { code: 'AML', monthlyUsd: 600 },
  { code: 'AH', monthlyUsd: 850 },
  { code: 'BM', monthlyUsd: 1000 },
  { code: 'BH', monthlyUsd: 1300 },
  { code: 'CH', monthlyUsd: 3500 },
  { code: 'CO', monthlyUsd: 6000 },
];

export const DEFAULT_OVERHEADS: OverheadConfig = {
  devMonthlyUsd: 90,
  maintMonthlyUsd: 10,
  leaseYears: 20,
  infraSubsidyPct: 100,
};
