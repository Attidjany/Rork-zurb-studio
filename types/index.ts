export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  sites: Site[];
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
  areaHa: number;
  location: {
    latitude: number;
    longitude: number;
  };
  polygon?: { latitude: number; longitude: number }[];
  blocks: Block[];
}

export interface Block {
  id: string;
  siteId: string;
  name: string;
  areaM2: number;
  typologyCode: string | null;
  unitCount: number;
}

export interface Typology {
  code: string;
  name: string;
  category: 'residential' | 'commercial';
  defaultGfaM2: number;
  floors: number;
  unitsPerBlock: number;
  description: string;
}

export interface CostParams {
  goldUsdPerOz: number;
  gramsMidEnd: number;
  gramsHighEnd: number;
  gramsOutstanding: number;
}

export interface MixRule {
  category: string;
  midEndPct: number;
  highEndPct: number;
  outstandingPct: number;
}

export interface RentConfig {
  code: string;
  monthlyUsd: number;
}

export interface OverheadConfig {
  devMonthlyUsd: number;
  maintMonthlyUsd: number;
  leaseYears: number;
  infraSubsidyPct: number;
}

export interface Scenario {
  id: string;
  siteId: string;
  name: string;
  notes: string;
  createdAt: Date;
  items: ScenarioItem[];
}

export interface ScenarioItem {
  id: string;
  blockId: string;
  typologyCode: string;
  units: number;
  gfaM2: number;
}

export interface CalculationResult {
  totalGfa: number;
  totalUnits: number;
  constructionCost: number;
  expectedRevenue: number;
  margin: number;
  breakdownByCategory: {
    [category: string]: {
      units: number;
      gfa: number;
      cost: number;
      revenue: number;
    };
  };
}
