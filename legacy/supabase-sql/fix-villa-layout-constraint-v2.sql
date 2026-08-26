-- Update villa_layout constraint to include all layout options including 1000
-- Values: 200_300_mix, 480, 1000, 1200

-- Drop the existing constraint
ALTER TABLE half_blocks DROP CONSTRAINT IF EXISTS half_blocks_villa_layout_check;

-- Add new constraint with updated values
ALTER TABLE half_blocks ADD CONSTRAINT half_blocks_villa_layout_check 
  CHECK (villa_layout IN ('200_300_mix', '480', '1000', '1200'));
