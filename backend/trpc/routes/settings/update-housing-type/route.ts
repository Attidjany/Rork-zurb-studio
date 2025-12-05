import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
    default_area_m2: z.number(),
    default_cost_type: z.string(),
    default_rent_monthly: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Updating housing type:', input.id);
    
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
      .from('account_housing_types')
      .update({
        default_area_m2: input.default_area_m2,
        default_cost_type: input.default_cost_type,
        default_rent_monthly: input.default_rent_monthly,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error updating housing type:', error);
      throw new Error('Failed to update housing type');
    }

    return data;
  });
