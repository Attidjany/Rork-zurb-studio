import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Duplicating site:', input.id);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: ctx.req.headers.get('authorization') || '',
        },
      },
    });
    
    const { data: original, error: fetchError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', input.id)
      .single();

    if (fetchError || !original) {
      console.error('[tRPC] Error fetching site:', fetchError);
      throw new Error(fetchError?.message || 'Site not found');
    }

    const { data, error } = await supabase
      .from('sites')
      .insert({
        project_id: original.project_id,
        name: `${original.name} (Copy)`,
        area_ha: original.area_ha,
      })
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error duplicating site:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Site duplicated successfully');
    return data;
  });
