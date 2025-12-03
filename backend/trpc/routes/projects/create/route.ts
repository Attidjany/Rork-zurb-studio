import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Creating project:', input.name);
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        owner_id: ctx.user.id,
        name: input.name,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error creating project:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Project created:', data.id);
    return data;
  });
