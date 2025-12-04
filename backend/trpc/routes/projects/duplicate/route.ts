import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Duplicating project:', input.id);
    
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
      .from('projects')
      .select('*')
      .eq('id', input.id)
      .eq('owner_id', ctx.user.id)
      .single();

    if (fetchError || !original) {
      console.error('[tRPC] Error fetching project:', fetchError);
      throw new Error(fetchError?.message || 'Project not found');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: `${original.name} (Copy)`,
        description: original.description,
        owner_id: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error duplicating project:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Project duplicated successfully');
    return data;
  });
