import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Deleting site:', input.id);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: ctx.req.headers.get('authorization') || '',
        },
      },
    });
    
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', input.id);

    if (error) {
      console.error('[tRPC] Error deleting site:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Site deleted successfully');
    return { success: true };
  });
