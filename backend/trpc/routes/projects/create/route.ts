import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';
import { getDefaultGoldPrice, calculateCostPerM2 } from '@/lib/goldPrice';
import { CONSTRUCTION_COSTS, HOUSING_TYPES } from '@/constants/typologies';

export default protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Creating project for user:', ctx.user.id, 'name:', input.name);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[tRPC] Missing Supabase environment variables');
      throw new Error('Server configuration error: Missing database credentials');
    }
    
    const authHeader = ctx.req.headers.get('authorization') || '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    
    console.log('[tRPC] Checking if profile exists for user:', ctx.user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', ctx.user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('[tRPC] Profile not found:', profileError);
      console.log('[tRPC] Creating profile for user:', ctx.user.id);
      
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: ctx.user.id,
          email: ctx.user.email || '',
          role: 'designer',
        });
      
      if (createProfileError) {
        console.error('[tRPC] Failed to create profile:', createProfileError);
      }
    }
    
    console.log('[tRPC] Inserting project into database');
    const { data, error } = await supabase
      .from('projects')
      .insert({
        owner_id: ctx.user.id,
        name: input.name,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error creating project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    console.log('[tRPC] Project created successfully:', data.id);
    
    const goldPrice = getDefaultGoldPrice();
    console.log('[tRPC] Creating default cost parameters with gold price:', goldPrice.pricePerGram, '$/g');
    
    const defaultParams = [];
    
    for (const [costType, costConfig] of Object.entries(CONSTRUCTION_COSTS)) {
      const costPerM2 = calculateCostPerM2(costConfig.goldGramsPerM2, goldPrice.pricePerGram);
      defaultParams.push({
        project_id: data.id,
        unit_type: costType,
        build_area_m2: 0,
        cost_per_m2: costPerM2,
        rent_monthly: 0,
      });
    }
    
    for (const [housingType, housingConfig] of Object.entries(HOUSING_TYPES)) {
      const costTypeConfig = CONSTRUCTION_COSTS[housingConfig.defaultCostType];
      if (!costTypeConfig) {
        console.error('[tRPC] Cost type not found:', housingConfig.defaultCostType);
        continue;
      }
      const costPerM2 = calculateCostPerM2(costTypeConfig.goldGramsPerM2, goldPrice.pricePerGram);
      defaultParams.push({
        project_id: data.id,
        unit_type: housingType,
        build_area_m2: housingConfig.defaultArea,
        cost_per_m2: costPerM2,
        rent_monthly: housingConfig.defaultRent,
      });
    }
    
    const { error: paramsError } = await supabase
      .from('project_cost_params')
      .insert(defaultParams);
    
    if (paramsError) {
      console.error('[tRPC] Error creating default cost params:', paramsError);
    } else {
      console.log('[tRPC] Created', defaultParams.length, 'default cost parameters');
    }
    
    return data;
  });
