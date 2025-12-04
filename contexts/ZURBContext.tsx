import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import {
  DbProject,
  DbSite,
  DbBlock,
  DbHalfBlock,
  DbUnit,
  DbScenario,
  VillaLayout,
  HalfBlockType,
  BuildingType,
} from '@/types';

export const [ZURBContext, useZURB] = createContextHook(() => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [blocks, setBlocks] = useState<DbBlock[]>([]);
  const [halfBlocks, setHalfBlocks] = useState<DbHalfBlock[]>([]);
  const [units, setUnits] = useState<DbUnit[]>([]);
  const [scenarios, setScenarios] = useState<DbScenario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProjects = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ZURB] Error loading projects:', error);
        return;
      }

      console.log('[ZURB] Loaded projects:', data?.length);
      setProjects(data || []);
    } catch (error) {
      console.error('[ZURB] Exception loading projects:', error);
    }
  }, [user]);

  const loadSites = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ZURB] Error loading sites:', error);
        return;
      }

      console.log('[ZURB] Loaded sites:', data?.length);
      setSites(data || []);
    } catch (error) {
      console.error('[ZURB] Exception loading sites:', error);
    }
  }, [user]);

  const loadBlocks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .order('block_number', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading blocks:', error);
        return;
      }

      console.log('[ZURB] Loaded blocks:', data?.length);
      setBlocks(data || []);
    } catch (error) {
      console.error('[ZURB] Exception loading blocks:', error);
    }
  }, [user]);

  const loadHalfBlocks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('half_blocks')
        .select('*');

      if (error) {
        console.error('[ZURB] Error loading half blocks:', error);
        return;
      }

      console.log('[ZURB] Loaded half blocks:', data?.length);
      setHalfBlocks(data || []);
    } catch (error) {
      console.error('[ZURB] Exception loading half blocks:', error);
    }
  }, [user]);

  const loadUnits = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('unit_number', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading units:', error);
        return;
      }

      console.log('[ZURB] Loaded units:', data?.length);
      setUnits(data || []);
    } catch (error) {
      console.error('[ZURB] Exception loading units:', error);
    }
  }, [user]);

  const loadScenarios = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ZURB] Error loading scenarios:', error);
        return;
      }

      console.log('[ZURB] Loaded scenarios:', data?.length);
      setScenarios(data || []);
    } catch (error) {
      console.error('[ZURB] Exception loading scenarios:', error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      loadProjects(),
      loadSites(),
      loadBlocks(),
      loadHalfBlocks(),
      loadUnits(),
      loadScenarios(),
    ]);
    setIsLoading(false);
  }, [loadProjects, loadSites, loadBlocks, loadHalfBlocks, loadUnits, loadScenarios]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    loadData();

    const projectsChannel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          console.log('[ZURB] Projects changed, reloading');
          loadProjects();
        }
      )
      .subscribe();

    const sitesChannel = supabase
      .channel('sites-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites',
        },
        () => {
          console.log('[ZURB] Sites changed, reloading');
          loadSites();
        }
      )
      .subscribe();

    const blocksChannel = supabase
      .channel('blocks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocks',
        },
        () => {
          console.log('[ZURB] Blocks changed, reloading');
          loadBlocks();
        }
      )
      .subscribe();

    const halfBlocksChannel = supabase
      .channel('half_blocks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'half_blocks',
        },
        () => {
          console.log('[ZURB] Half blocks changed, reloading');
          loadHalfBlocks();
        }
      )
      .subscribe();

    const unitsChannel = supabase
      .channel('units-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'units',
        },
        () => {
          console.log('[ZURB] Units changed, reloading');
          loadUnits();
        }
      )
      .subscribe();

    const scenariosChannel = supabase
      .channel('scenarios-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenarios',
        },
        () => {
          console.log('[ZURB] Scenarios changed, reloading');
          loadScenarios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(sitesChannel);
      supabase.removeChannel(blocksChannel);
      supabase.removeChannel(halfBlocksChannel);
      supabase.removeChannel(unitsChannel);
      supabase.removeChannel(scenariosChannel);
    };
  }, [user, loadData, loadProjects, loadSites, loadBlocks, loadHalfBlocks, loadUnits, loadScenarios]);

  const createProject = useCallback(
    async (name: string, description?: string) => {
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            name,
            description: description || null,
            owner_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Project created:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating project:', error);
        Alert.alert('Error', error.message || 'Failed to create project');
        return null;
      }
    },
    [user]
  );

  const updateProject = useCallback(
    async (projectId: string, updates: { name?: string; description?: string }) => {
      try {
        const { error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId);

        if (error) throw error;

        console.log('[ZURB] Project updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating project:', error);
        Alert.alert('Error', error.message || 'Failed to update project');
      }
    },
    []
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) throw error;

        console.log('[ZURB] Project deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting project:', error);
        Alert.alert('Error', error.message || 'Failed to delete project');
        return false;
      }
    },
    []
  );

  const duplicateProject = useCallback(
    async (projectId: string) => {
      try {
        const original = projects.find(p => p.id === projectId);
        if (!original) throw new Error('Project not found');

        const { data, error } = await supabase
          .from('projects')
          .insert({
            name: `${original.name} (Copy)`,
            description: original.description,
            owner_id: user!.id,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Project duplicated:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error duplicating project:', error);
        Alert.alert('Error', error.message || 'Failed to duplicate project');
        return null;
      }
    },
    [projects, user]
  );

  const createSite = useCallback(
    async (projectId: string, name: string, areaHa: number) => {
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('sites')
          .insert({
            project_id: projectId,
            name,
            area_ha: areaHa,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Site created:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating site:', error);
        Alert.alert('Error', error.message || 'Failed to create site');
        return null;
      }
    },
    [user]
  );

  const deleteSite = useCallback(
    async (siteId: string) => {
      try {
        const { error } = await supabase
          .from('sites')
          .delete()
          .eq('id', siteId);

        if (error) throw error;

        console.log('[ZURB] Site deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting site:', error);
        Alert.alert('Error', error.message || 'Failed to delete site');
        return false;
      }
    },
    []
  );

  const duplicateSite = useCallback(
    async (siteId: string) => {
      try {
        const original = sites.find(s => s.id === siteId);
        if (!original) throw new Error('Site not found');

        const { data, error } = await supabase
          .from('sites')
          .insert({
            project_id: original.project_id,
            name: `${original.name} (Copy)`,
            area_ha: original.area_ha,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Site duplicated:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error duplicating site:', error);
        Alert.alert('Error', error.message || 'Failed to duplicate site');
        return null;
      }
    },
    [sites]
  );

  const updateHalfBlock = useCallback(
    async (
      halfBlockId: string,
      type: HalfBlockType,
      villaLayout?: VillaLayout
    ) => {
      try {
        const { error } = await supabase
          .from('half_blocks')
          .update({
            type,
            villa_layout: villaLayout || null,
          })
          .eq('id', halfBlockId);

        if (error) throw error;

        console.log('[ZURB] Half block updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating half block:', error);
        Alert.alert('Error', error.message || 'Failed to update half block');
      }
    },
    []
  );

  const createUnit = useCallback(
    async (
      halfBlockId: string,
      unitNumber: number,
      unitType: string,
      sizeM2?: number,
      buildingType?: BuildingType,
      equipmentName?: string,
      utilityName?: string
    ) => {
      try {
        const { data, error } = await supabase
          .from('units')
          .insert({
            half_block_id: halfBlockId,
            unit_number: unitNumber,
            unit_type: unitType,
            size_m2: sizeM2 || null,
            building_type: buildingType || null,
            equipment_name: equipmentName || null,
            utility_name: utilityName || null,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Unit created:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating unit:', error);
        Alert.alert('Error', error.message || 'Failed to create unit');
        return null;
      }
    },
    []
  );

  const updateUnit = useCallback(
    async (
      unitId: string,
      updates: {
        building_type?: BuildingType;
        equipment_name?: string;
        utility_name?: string;
      }
    ) => {
      try {
        const { error } = await supabase
          .from('units')
          .update(updates)
          .eq('id', unitId);

        if (error) throw error;

        console.log('[ZURB] Unit updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating unit:', error);
        Alert.alert('Error', error.message || 'Failed to update unit');
      }
    },
    []
  );

  const createScenario = useCallback(
    async (siteId: string, name: string, notes?: string) => {
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('scenarios')
          .insert({
            site_id: siteId,
            name,
            notes: notes || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Scenario created:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating scenario:', error);
        Alert.alert('Error', error.message || 'Failed to create scenario');
        return null;
      }
    },
    [user]
  );

  const updateScenario = useCallback(
    async (scenarioId: string, updates: { name?: string; notes?: string }) => {
      try {
        const { error } = await supabase
          .from('scenarios')
          .update(updates)
          .eq('id', scenarioId);

        if (error) throw error;

        console.log('[ZURB] Scenario updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating scenario:', error);
        Alert.alert('Error', error.message || 'Failed to update scenario');
      }
    },
    []
  );

  const deleteScenario = useCallback(
    async (scenarioId: string) => {
      try {
        const { error } = await supabase
          .from('scenarios')
          .delete()
          .eq('id', scenarioId);

        if (error) throw error;

        console.log('[ZURB] Scenario deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting scenario:', error);
        Alert.alert('Error', error.message || 'Failed to delete scenario');
        return false;
      }
    },
    []
  );

  const duplicateScenario = useCallback(
    async (scenarioId: string) => {
      try {
        const original = scenarios.find(s => s.id === scenarioId);
        if (!original || !user) throw new Error('Scenario not found');

        const { data, error } = await supabase
          .from('scenarios')
          .insert({
            site_id: original.site_id,
            name: `${original.name} (Copy)`,
            notes: original.notes,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Scenario duplicated:', data);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error duplicating scenario:', error);
        Alert.alert('Error', error.message || 'Failed to duplicate scenario');
        return null;
      }
    },
    [scenarios, user]
  );

  const getSitesByProjectId = useCallback(
    (projectId: string) => {
      return sites.filter(s => s.project_id === projectId);
    },
    [sites]
  );

  const getBlocksBySiteId = useCallback(
    (siteId: string) => {
      return blocks.filter(b => b.site_id === siteId);
    },
    [blocks]
  );

  const getHalfBlocksByBlockId = useCallback(
    (blockId: string) => {
      return halfBlocks.filter(hb => hb.block_id === blockId);
    },
    [halfBlocks]
  );

  const getUnitsByHalfBlockId = useCallback(
    (halfBlockId: string) => {
      return units.filter(u => u.half_block_id === halfBlockId);
    },
    [units]
  );

  const getScenariosBySiteId = useCallback(
    (siteId: string) => {
      return scenarios.filter(s => s.site_id === siteId);
    },
    [scenarios]
  );

  return {
    projects,
    sites,
    blocks,
    halfBlocks,
    units,
    scenarios,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    createSite,
    deleteSite,
    duplicateSite,
    updateHalfBlock,
    createUnit,
    updateUnit,
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    getSitesByProjectId,
    getBlocksBySiteId,
    getHalfBlocksByBlockId,
    getUnitsByHalfBlockId,
    getScenariosBySiteId,
    loadProjects,
    loadSites,
    loadBlocks,
    loadHalfBlocks,
    loadUnits,
    loadScenarios,
  };
});
