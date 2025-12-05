import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { createClient } from '@supabase/supabase-js';

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
    gold_grams_per_m2: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Updating construction cost:', input.id);
    
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
      .from('account_construction_costs')
      .update({
        gold_grams_per_m2: input.gold_grams_per_m2,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error updating construction cost:', error);
      throw new Error('Failed to update construction cost');
    }

    return data;
  });
