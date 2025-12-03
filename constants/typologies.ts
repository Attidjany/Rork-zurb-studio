import { Typology } from '@/types';

export const DEFAULT_TYPOLOGIES: Typology[] = [
  {
    code: 'A',
    name: 'Multifamily (5 storeys)',
    category: 'residential',
    defaultGfaM2: 3000,
    floors: 5,
    unitsPerBlock: 20,
    description: 'Multifamily buildings, ~3,000 m² per building, 20 buildings per 6 ha block',
  },
  {
    code: 'B',
    name: 'Small Villas',
    category: 'residential',
    defaultGfaM2: 300,
    floors: 2,
    unitsPerBlock: 80,
    description: 'Small villa plots ≥300 m², 50% footprint, up to 300 m² on 2 floors',
  },
  {
    code: 'C',
    name: 'High-End Villas',
    category: 'residential',
    defaultGfaM2: 450,
    floors: 2,
    unitsPerBlock: 24,
    description: 'High-end villa plots ≥1,000 m², ~450 m² total built area',
  },
  {
    code: 'XM',
    name: 'Commercial Mid-End',
    category: 'commercial',
    defaultGfaM2: 100,
    floors: 1,
    unitsPerBlock: 40,
    description: 'Commercial units, ground floor, MidEnd finish',
  },
  {
    code: 'XH',
    name: 'Commercial High-End',
    category: 'commercial',
    defaultGfaM2: 120,
    floors: 1,
    unitsPerBlock: 40,
    description: 'Commercial units, ground floor, HighEnd finish',
  },
];
