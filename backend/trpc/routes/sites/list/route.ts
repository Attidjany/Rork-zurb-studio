import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
  }))
  .query(async ({ ctx, input }) => {
    console.log('[tRPC] Fetching sites for project:', input.projectId);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: ctx.req.headers.get('authorization') || '',
        },
      },
    });
    
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('project_id', input.projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[tRPC] Error fetching sites:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Found sites:', data?.length || 0);
    return data || [];
  });
