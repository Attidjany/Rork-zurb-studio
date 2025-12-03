import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Creating project:', input.name);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    
    const { data: sessionData } = await createClient(supabaseUrl, supabaseAnonKey)
      .auth.getUser(ctx.req.headers.get('authorization')?.replace('Bearer ', '') || '');
    
    if (!sessionData?.user) {
      throw new Error('Unauthorized');
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: ctx.req.headers.get('authorization') || '',
        },
      },
    });
    
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
