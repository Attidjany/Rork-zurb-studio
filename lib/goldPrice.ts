export const DEFAULT_GOLD_PRICE_PER_GRAM = 65;
export const DEFAULT_GOLD_PRICE_PER_OZ = 2020;
export const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/USD';
export const TROY_OZ_TO_GRAMS = 31.1035;
export const USD_TO_XOF = 620;

export interface GoldPriceData {
  pricePerGram: number;
  pricePerOz: number;
  timestamp: number;
  currency: string;
}

let cachedGoldPrice: GoldPriceData | null = null;
const CACHE_DURATION = 1000 * 60 * 60 * 24;

export async function fetchLiveGoldPrice(): Promise<GoldPriceData> {
  if (cachedGoldPrice && Date.now() - cachedGoldPrice.timestamp < CACHE_DURATION) {
    console.log('[Gold] Using cached price (per oz):', cachedGoldPrice.pricePerOz);
    return cachedGoldPrice;
  }

  try {
    const response = await fetch('https://api.gold-api.com/price/XAU');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const pricePerOz = data.price || 0;
    const pricePerGram = pricePerOz / TROY_OZ_TO_GRAMS;
    
    cachedGoldPrice = {
      pricePerGram,
      pricePerOz,
      timestamp: Date.now(),
      currency: 'USD',
    };
    
    console.log('[Gold] Fetched live price - per oz:', pricePerOz, '| per gram:', pricePerGram);
    return cachedGoldPrice;
  } catch (error) {
    console.error('[Gold] Error fetching gold price:', error);
    
    try {
      const fallbackResponse = await fetch('https://www.goldapi.io/api/XAU/USD');
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        const pricePerOz = fallbackData.price || 0;
        const pricePerGram = pricePerOz / TROY_OZ_TO_GRAMS;
        
        cachedGoldPrice = {
          pricePerGram,
          pricePerOz,
          timestamp: Date.now(),
          currency: 'USD',
        };
        
        console.log('[Gold] Fallback API succeeded - per oz:', pricePerOz);
        return cachedGoldPrice;
      }
    } catch (fallbackError) {
      console.error('[Gold] Fallback API also failed:', fallbackError);
    }
    
    console.log('[Gold] Using default prices');
    return {
      pricePerGram: DEFAULT_GOLD_PRICE_PER_GRAM,
      pricePerOz: DEFAULT_GOLD_PRICE_PER_OZ,
      timestamp: Date.now(),
      currency: 'USD',
    };
  }
}

export function getCachedGoldPrice(): GoldPriceData | null {
  if (cachedGoldPrice && Date.now() - cachedGoldPrice.timestamp < CACHE_DURATION) {
    return cachedGoldPrice;
  }
  return null;
}

export function getDefaultGoldPrice(): GoldPriceData {
  return {
    pricePerGram: DEFAULT_GOLD_PRICE_PER_GRAM,
    pricePerOz: DEFAULT_GOLD_PRICE_PER_OZ,
    timestamp: Date.now(),
    currency: 'USD',
  };
}

export function calculateCostPerM2(goldGramsPerM2: number, goldPricePerGram: number): number {
  return goldGramsPerM2 * goldPricePerGram;
}
