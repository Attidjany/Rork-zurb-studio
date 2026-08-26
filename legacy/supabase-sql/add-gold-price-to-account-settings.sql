-- Add gold_price_per_oz column to account_settings table

ALTER TABLE account_settings 
ADD COLUMN IF NOT EXISTS gold_price_per_oz NUMERIC DEFAULT 3000;

-- Update existing records to have the default value
UPDATE account_settings 
SET gold_price_per_oz = 3000 
WHERE gold_price_per_oz IS NULL;

-- Add comment
COMMENT ON COLUMN account_settings.gold_price_per_oz IS 
  'Current gold price per troy ounce in USD, used for cost calculations. Defaults to 3000.';
