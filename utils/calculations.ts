import { CostParams, MixRule, OverheadConfig, ScenarioItem, CalculationResult } from '@/types';

const GRAMS_PER_OZ = 31.1034768;

export function calculateCostPerGram(goldUsdPerOz: number): number {
  return goldUsdPerOz / GRAMS_PER_OZ;
}

export function calculateCategoryUsdPerM2(
  costParams: CostParams,
  mixRule: MixRule
): number {
  const usdPerGram = calculateCostPerGram(costParams.goldUsdPerOz);
  
  const midEndCost = (mixRule.midEndPct / 100) * costParams.gramsMidEnd * usdPerGram;
  const highEndCost = (mixRule.highEndPct / 100) * costParams.gramsHighEnd * usdPerGram;
  const outstandingCost = (mixRule.outstandingPct / 100) * costParams.gramsOutstanding * usdPerGram;
  
  return midEndCost + highEndCost + outstandingCost;
}

export function calculateMaxCapex(
  monthlyRent: number,
  leaseYears: number,
  devMonthly: number,
  maintMonthly: number,
  nonConstructionCapex: number = 0
): number {
  const totalRevenue = monthlyRent * 12 * leaseYears;
  const totalOverheads = (devMonthly + maintMonthly) * 12 * leaseYears;
  return totalRevenue - totalOverheads - nonConstructionCapex;
}

export function calculateUnitMargin(
  constructionCostPerM2: number,
  gfaM2: number,
  monthlyRent: number,
  overheads: OverheadConfig
): number {
  const totalConstructionCost = constructionCostPerM2 * gfaM2;
  const maxCapex = calculateMaxCapex(
    monthlyRent,
    overheads.leaseYears,
    overheads.devMonthlyUsd,
    overheads.maintMonthlyUsd,
    0
  );
  return maxCapex - totalConstructionCost;
}

export function calculateScenarioResults(
  items: ScenarioItem[],
  costParams: CostParams,
  mixRules: MixRule[],
  rents: { [code: string]: number },
  overheads: OverheadConfig
): CalculationResult {
  const result: CalculationResult = {
    totalGfa: 0,
    totalUnits: 0,
    constructionCost: 0,
    expectedRevenue: 0,
    margin: 0,
    breakdownByCategory: {},
  };

  items.forEach(item => {
    const mixRule = mixRules.find(r => r.category === item.typologyCode);
    
    if (!mixRule) {
      console.warn(`No mix rule found for ${item.typologyCode}`);
      return;
    }

    const costPerM2 = calculateCategoryUsdPerM2(costParams, mixRule);
    const itemCost = costPerM2 * item.gfaM2;
    
    const rentKey = item.typologyCode === 'XM' || item.typologyCode === 'XH' 
      ? 'CO' 
      : item.typologyCode + 'MS';
    const monthlyRent = rents[rentKey] || rents['AMS'] || 500;
    
    const itemRevenue = item.units * calculateMaxCapex(
      monthlyRent,
      overheads.leaseYears,
      overheads.devMonthlyUsd,
      overheads.maintMonthlyUsd,
      0
    );

    result.totalGfa += item.gfaM2;
    result.totalUnits += item.units;
    result.constructionCost += itemCost;
    result.expectedRevenue += itemRevenue;

    if (!result.breakdownByCategory[item.typologyCode]) {
      result.breakdownByCategory[item.typologyCode] = {
        units: 0,
        gfa: 0,
        cost: 0,
        revenue: 0,
      };
    }

    result.breakdownByCategory[item.typologyCode].units += item.units;
    result.breakdownByCategory[item.typologyCode].gfa += item.gfaM2;
    result.breakdownByCategory[item.typologyCode].cost += itemCost;
    result.breakdownByCategory[item.typologyCode].revenue += itemRevenue;
  });

  result.margin = result.expectedRevenue - result.constructionCost;

  return result;
}
