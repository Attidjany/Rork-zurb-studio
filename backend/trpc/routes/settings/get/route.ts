import { protectedProcedure } from "../../../create-context";
import { createClient } from '@supabase/supabase-js';

export default protectedProcedure
  .query(async ({ ctx }) => {
    console.log('[tRPC] Fetching account settings for user:', ctx.user.id);
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Server configuration error');
    }
    
    const authHeader = ctx.req.headers.get('authorization') || '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: settings, error: settingsError } = await supabase
      .from('account_settings')
      .select('id')
      .eq('user_id', ctx.user.id)
      .single();

    if (settingsError || !settings) {
      console.error('[tRPC] Error fetching account settings:', settingsError);
      throw new Error('Account settings not found');
    }

    const { data: constructionCosts, error: ccError } = await supabase
      .from('account_construction_costs')
      .select('*')
      .eq('account_settings_id', settings.id)
      .order('code');

    if (ccError) {
      console.error('[tRPC] Error fetching construction costs:', ccError);
      throw new Error('Failed to fetch construction costs');
    }

    const { data: housingTypes, error: htError } = await supabase
      .from('account_housing_types')
      .select('*')
      .eq('account_settings_id', settings.id)
      .order('code');

    if (htError) {
      console.error('[tRPC] Error fetching housing types:', htError);
      throw new Error('Failed to fetch housing types');
    }

    const { data: equipmentTypes, error: etError } = await supabase
      .from('account_equipment_utility_types')
      .select('*')
      .eq('account_settings_id', settings.id)
      .order('code');

    if (etError) {
      console.error('[tRPC] Error fetching equipment types:', etError);
      throw new Error('Failed to fetch equipment types');
    }

    return {
      constructionCosts: constructionCosts || [],
      housingTypes: housingTypes || [],
      equipmentTypes: equipmentTypes || [],
    };
  });
