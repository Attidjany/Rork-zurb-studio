import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";

export default protectedProcedure.query(async ({ ctx }) => {
  console.log('[tRPC] Fetching projects for user:', ctx.user.id);
  
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
