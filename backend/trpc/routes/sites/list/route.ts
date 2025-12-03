import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
  }))
  .query(async ({ ctx, input }) => {
    console.log('[tRPC] Fetching sites for project:', input.projectId);
    
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
