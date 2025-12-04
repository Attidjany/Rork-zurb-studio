export const DEFAULT_GOLD_PRICE_PER_GRAM = 65;
export const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/USD';

export interface GoldPriceData {
  price: number;
  timestamp: number;
  currency: string;
}

let cachedGoldPrice: GoldPriceData | null = null;
const CACHE_DURATION = 1000 * 60 * 30;

export async function fetchLiveGoldPrice(): Promise<number> {
  if (cachedGoldPrice && Date.now() - cachedGoldPrice.timestamp < CACHE_DURATION) {
    console.log('[Gold] Using cached price:', cachedGoldPrice.price);
    return cachedGoldPrice.price;
  }

  try {
    const response = await fetch('https://api.metals.live/v1/spot/gold');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const pricePerOunce = data[0]?.price || 0;
    const pricePerGram = pricePerOunce / 31.1035;
    
    cachedGoldPrice = {
      price: pricePerGram,
      timestamp: Date.now(),
      currency: 'USD',
    };
    
    console.log('[Gold] Fetched live price:', pricePerGram, 'USD/gram');
    return pricePerGram;
  } catch (error) {
    console.error('[Gold] Error fetching gold price:', error);
    console.log('[Gold] Using default price:', DEFAULT_GOLD_PRICE_PER_GRAM);
    return DEFAULT_GOLD_PRICE_PER_GRAM;
  }
}

export function getCachedGoldPrice(): number | null {
  if (cachedGoldPrice && Date.now() - cachedGoldPrice.timestamp < CACHE_DURATION) {
    return cachedGoldPrice.price;
  }
  return null;
}
