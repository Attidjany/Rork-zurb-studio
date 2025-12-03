import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
  }))
  .query(async ({ ctx, input }) => {
    console.log('[tRPC] Fetching project:', input.projectId);
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', input.projectId)
      .eq('owner_id', ctx.user.id)
      .single();

    if (error) {
      console.error('[tRPC] Error fetching project:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Project found:', data.name);
    return data;
  });
