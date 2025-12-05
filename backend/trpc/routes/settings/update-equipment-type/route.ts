import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
    land_area_m2: z.number(),
    building_occupation_pct: z.number(),
    cost_type: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Updating equipment type:', input.id);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Server configuration error');
    }
    
    const authHeader = ctx.req.headers.get('authorization') || '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data, error } = await supabase
      .from('account_equipment_utility_types')
      .update({
        land_area_m2: input.land_area_m2,
        building_occupation_pct: input.building_occupation_pct,
        cost_type: input.cost_type,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error updating equipment type:', error);
      throw new Error('Failed to update equipment type');
    }

    return data;
  });
