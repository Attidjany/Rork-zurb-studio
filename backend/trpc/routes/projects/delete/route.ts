import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    id: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Deleting project:', input.id);
    
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
      .from('projects')
      .delete()
      .eq('id', input.id)
      .eq('owner_id', ctx.user.id);

    if (error) {
      console.error('[tRPC] Error deleting project:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Project deleted successfully');
    return { success: true };
  });
