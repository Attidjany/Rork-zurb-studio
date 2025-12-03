import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';

export default protectedProcedure.query(async ({ ctx }) => {
  console.log('[tRPC] Fetching projects for user:', ctx.user.id);
  
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
    .from('projects')
    .select('*')
    .eq('owner_id', ctx.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[tRPC] Error fetching projects:', error);
    throw new Error(error.message);
  }

  console.log('[tRPC] Found projects:', data?.length || 0);
  return data || [];
});
