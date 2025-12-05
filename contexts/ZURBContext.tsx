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
  DbProjectConstructionCost,
  DbProjectHousingType,
  DbProjectEquipmentUtilityType,
  DbScenarioConstructionCost,
  DbScenarioHousingType,
  DbScenarioEquipmentUtilityType,
  VillaLayout,
  ApartmentLayout,
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

  const [projectConstructionCosts, setProjectConstructionCosts] = useState<DbProjectConstructionCost[]>([]);
  const [projectHousingTypes, setProjectHousingTypes] = useState<DbProjectHousingType[]>([]);
  const [projectEquipmentUtilityTypes, setProjectEquipmentUtilityTypes] = useState<DbProjectEquipmentUtilityType[]>([]);
  const [scenarioConstructionCosts, setScenarioConstructionCosts] = useState<DbScenarioConstructionCost[]>([]);
  const [scenarioHousingTypes, setScenarioHousingTypes] = useState<DbScenarioHousingType[]>([]);
  const [scenarioEquipmentUtilityTypes, setScenarioEquipmentUtilityTypes] = useState<DbScenarioEquipmentUtilityType[]>([]);
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



  const loadProjectConstructionCosts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_construction_costs')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading project construction costs:', JSON.stringify(error));
        return;
      }

      console.log('[ZURB] Loaded project construction costs:', data?.length);
      setProjectConstructionCosts(data || []);
    } catch (error: any) {
      console.error('[ZURB] Exception loading project construction costs:', error?.message || JSON.stringify(error));
    }
  }, [user]);

  const loadProjectHousingTypes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_housing_types')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading project housing types:', JSON.stringify(error));
        return;
      }

      console.log('[ZURB] Loaded project housing types:', data?.length);
      setProjectHousingTypes(data || []);
    } catch (error: any) {
      console.error('[ZURB] Exception loading project housing types:', error?.message || JSON.stringify(error));
    }
  }, [user]);

  const loadProjectEquipmentUtilityTypes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_equipment_utility_types')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading project equipment utility types:', JSON.stringify(error));
        return;
      }

      console.log('[ZURB] Loaded project equipment utility types:', data?.length);
      setProjectEquipmentUtilityTypes(data || []);
    } catch (error: any) {
      console.error('[ZURB] Exception loading project equipment utility types:', error?.message || JSON.stringify(error));
    }
  }, [user]);

  const loadScenarioConstructionCosts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scenario_construction_costs')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading scenario construction costs:', JSON.stringify(error));
        return;
      }

      console.log('[ZURB] Loaded scenario construction costs:', data?.length);
      setScenarioConstructionCosts(data || []);
    } catch (error: any) {
      console.error('[ZURB] Exception loading scenario construction costs:', error?.message || JSON.stringify(error));
    }
  }, [user]);

  const loadScenarioHousingTypes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scenario_housing_types')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading scenario housing types:', JSON.stringify(error));
        return;
      }

      console.log('[ZURB] Loaded scenario housing types:', data?.length);
      setScenarioHousingTypes(data || []);
    } catch (error: any) {
      console.error('[ZURB] Exception loading scenario housing types:', error?.message || JSON.stringify(error));
    }
  }, [user]);

  const loadScenarioEquipmentUtilityTypes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scenario_equipment_utility_types')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('[ZURB] Error loading scenario equipment utility types:', JSON.stringify(error));
        return;
      }

      console.log('[ZURB] Loaded scenario equipment utility types:', data?.length);
      setScenarioEquipmentUtilityTypes(data || []);
    } catch (error: any) {
      console.error('[ZURB] Exception loading scenario equipment utility types:', error?.message || JSON.stringify(error));
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
      loadProjectConstructionCosts(),
      loadProjectHousingTypes(),
      loadProjectEquipmentUtilityTypes(),
      loadScenarioConstructionCosts(),
      loadScenarioHousingTypes(),
      loadScenarioEquipmentUtilityTypes(),
    ]);
    setIsLoading(false);
  }, [loadProjects, loadSites, loadBlocks, loadHalfBlocks, loadUnits, loadScenarios, loadProjectConstructionCosts, loadProjectHousingTypes, loadProjectEquipmentUtilityTypes, loadScenarioConstructionCosts, loadScenarioHousingTypes, loadScenarioEquipmentUtilityTypes]);

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
          loadScenarioConstructionCosts();
          loadScenarioHousingTypes();
          loadScenarioEquipmentUtilityTypes();
        }
      )
      .subscribe();

    const projectConstructionCostsChannel = supabase
      .channel('project_construction_costs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_construction_costs',
        },
        () => {
          console.log('[ZURB] Project construction costs changed, reloading');
          loadProjectConstructionCosts();
        }
      )
      .subscribe();

    const projectHousingTypesChannel = supabase
      .channel('project_housing_types-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_housing_types',
        },
        () => {
          console.log('[ZURB] Project housing types changed, reloading');
          loadProjectHousingTypes();
        }
      )
      .subscribe();

    const projectEquipmentUtilityTypesChannel = supabase
      .channel('project_equipment_utility_types-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_equipment_utility_types',
        },
        () => {
          console.log('[ZURB] Project equipment utility types changed, reloading');
          loadProjectEquipmentUtilityTypes();
        }
      )
      .subscribe();

    const scenarioConstructionCostsChannel = supabase
      .channel('scenario_construction_costs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenario_construction_costs',
        },
        () => {
          console.log('[ZURB] Scenario construction costs changed, reloading');
          loadScenarioConstructionCosts();
        }
      )
      .subscribe();

    const scenarioHousingTypesChannel = supabase
      .channel('scenario_housing_types-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenario_housing_types',
        },
        () => {
          console.log('[ZURB] Scenario housing types changed, reloading');
          loadScenarioHousingTypes();
        }
      )
      .subscribe();

    const scenarioEquipmentUtilityTypesChannel = supabase
      .channel('scenario_equipment_utility_types-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenario_equipment_utility_types',
        },
        () => {
          console.log('[ZURB] Scenario equipment utility types changed, reloading');
          loadScenarioEquipmentUtilityTypes();
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
      supabase.removeChannel(projectConstructionCostsChannel);
      supabase.removeChannel(scenarioConstructionCostsChannel);
      supabase.removeChannel(scenarioHousingTypesChannel);
      supabase.removeChannel(scenarioEquipmentUtilityTypesChannel);
      supabase.removeChannel(projectHousingTypesChannel);
      supabase.removeChannel(projectEquipmentUtilityTypesChannel);
    };
  }, [user, loadData, loadProjects, loadSites, loadBlocks, loadHalfBlocks, loadUnits, loadScenarios, loadProjectConstructionCosts, loadProjectHousingTypes, loadProjectEquipmentUtilityTypes, loadScenarioConstructionCosts, loadScenarioHousingTypes, loadScenarioEquipmentUtilityTypes]);

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
        setProjects(prev => [data, ...prev]);
        await Promise.all([
          loadProjectConstructionCosts(),
          loadProjectHousingTypes(),
          loadProjectEquipmentUtilityTypes(),
        ]);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating project:', error);
        Alert.alert('Error', error.message || 'Failed to create project');
        return null;
      }
    },
    [user, loadProjectConstructionCosts, loadProjectHousingTypes, loadProjectEquipmentUtilityTypes]
  );

  const updateProject = useCallback(
    async (projectId: string, updates: { name?: string; description?: string }) => {
      setProjects(prev => 
        prev.map(project => project.id === projectId ? { ...project, ...updates } : project)
      );
      
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
        await loadProjects();
      }
    },
    [loadProjects]
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
        setSites(prev => [data, ...prev]);
        await Promise.all([
          loadBlocks(),
          loadHalfBlocks(),
        ]);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating site:', error);
        Alert.alert('Error', error.message || 'Failed to create site');
        return null;
      }
    },
    [user, loadBlocks, loadHalfBlocks]
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
      villaLayout?: VillaLayout,
      apartmentLayout?: ApartmentLayout
    ) => {
      const updates = {
        type,
        villa_layout: villaLayout || null,
        apartment_layout: apartmentLayout || null,
      };

      setHalfBlocks(prev => 
        prev.map(hb => hb.id === halfBlockId ? { ...hb, ...updates } : hb)
      );
      
      try {
        const { error } = await supabase
          .from('half_blocks')
          .update(updates)
          .eq('id', halfBlockId);

        if (error) throw error;

        console.log('[ZURB] Half block updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating half block:', error);
        Alert.alert('Error', error.message || 'Failed to update half block');
        await loadHalfBlocks();
      }
    },
    [loadHalfBlocks]
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
      setUnits(prev => 
        prev.map(unit => unit.id === unitId ? { ...unit, ...updates } : unit)
      );
      
      try {
        const { error } = await supabase
          .from('units')
          .update(updates)
          .eq('id', unitId);

        if (error) throw error;

        console.log('[ZURB] Unit updated successfully:', unitId, updates);
      } catch (error: any) {
        console.error('[ZURB] Error updating unit:', error);
        Alert.alert('Error', error.message || 'Failed to update unit');
        await loadUnits();
      }
    },
    [loadUnits]
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
        setScenarios(prev => [data, ...prev]);
        await Promise.all([
          loadScenarioConstructionCosts(),
          loadScenarioHousingTypes(),
          loadScenarioEquipmentUtilityTypes(),
        ]);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating scenario:', error);
        Alert.alert('Error', error.message || 'Failed to create scenario');
        return null;
      }
    },
    [user, loadScenarioConstructionCosts, loadScenarioHousingTypes, loadScenarioEquipmentUtilityTypes]
  );

  const updateScenario = useCallback(
    async (scenarioId: string, updates: { name?: string; notes?: string; rental_period_years?: number }) => {
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



  const getProjectConstructionCostsByProjectId = useCallback(
    (projectId: string) => {
      return projectConstructionCosts.filter(c => c.project_id === projectId);
    },
    [projectConstructionCosts]
  );

  const getProjectHousingTypesByProjectId = useCallback(
    (projectId: string) => {
      return projectHousingTypes.filter(h => h.project_id === projectId);
    },
    [projectHousingTypes]
  );

  const getProjectEquipmentUtilityTypesByProjectId = useCallback(
    (projectId: string) => {
      return projectEquipmentUtilityTypes.filter(e => e.project_id === projectId);
    },
    [projectEquipmentUtilityTypes]
  );

  const getScenarioConstructionCostsByScenarioId = useCallback(
    (scenarioId: string) => {
      return scenarioConstructionCosts.filter(c => c.scenario_id === scenarioId);
    },
    [scenarioConstructionCosts]
  );

  const getScenarioHousingTypesByScenarioId = useCallback(
    (scenarioId: string) => {
      return scenarioHousingTypes.filter(h => h.scenario_id === scenarioId);
    },
    [scenarioHousingTypes]
  );

  const getScenarioEquipmentUtilityTypesByScenarioId = useCallback(
    (scenarioId: string) => {
      return scenarioEquipmentUtilityTypes.filter(e => e.scenario_id === scenarioId);
    },
    [scenarioEquipmentUtilityTypes]
  );

  const createProjectConstructionCost = useCallback(
    async (projectId: string, code: string, name: string, goldGramsPerM2: number) => {
      try {
        const { data, error } = await supabase
          .from('project_construction_costs')
          .insert({
            project_id: projectId,
            code,
            name,
            gold_grams_per_m2: goldGramsPerM2,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Project construction cost created:', data);
        setProjectConstructionCosts(prev => [...prev, data]);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating project construction cost:', error);
        Alert.alert('Error', error.message || 'Failed to create construction cost type');
        return null;
      }
    },
    []
  );

  const updateProjectConstructionCost = useCallback(
    async (costId: string, updates: { code?: string; name?: string; gold_grams_per_m2?: number }) => {
      setProjectConstructionCosts(prev => 
        prev.map(cost => cost.id === costId ? { ...cost, ...updates } : cost)
      );
      
      try {
        const { error } = await supabase
          .from('project_construction_costs')
          .update(updates)
          .eq('id', costId);

        if (error) throw error;

        console.log('[ZURB] Project construction cost updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating project construction cost:', error);
        Alert.alert('Error', error.message || 'Failed to update construction cost type');
        await loadProjectConstructionCosts();
      }
    },
    [loadProjectConstructionCosts]
  );

  const deleteProjectConstructionCost = useCallback(
    async (costId: string) => {
      setProjectConstructionCosts(prev => prev.filter(cost => cost.id !== costId));
      
      try {
        const { error } = await supabase
          .from('project_construction_costs')
          .delete()
          .eq('id', costId);

        if (error) throw error;

        console.log('[ZURB] Project construction cost deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting project construction cost:', error);
        Alert.alert('Error', error.message || 'Failed to delete construction cost type');
        await loadProjectConstructionCosts();
        return false;
      }
    },
    [loadProjectConstructionCosts]
  );

  const createProjectHousingType = useCallback(
    async (
      projectId: string,
      code: string,
      name: string,
      category: 'apartment' | 'villa' | 'commercial',
      defaultAreaM2: number,
      defaultCostType: string,
      defaultRentMonthly: number
    ) => {
      try {
        const { data, error } = await supabase
          .from('project_housing_types')
          .insert({
            project_id: projectId,
            code,
            name,
            category,
            default_area_m2: defaultAreaM2,
            default_cost_type: defaultCostType,
            default_rent_monthly: defaultRentMonthly,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Project housing type created:', data);
        setProjectHousingTypes(prev => [...prev, data]);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating project housing type:', error);
        Alert.alert('Error', error.message || 'Failed to create housing type');
        return null;
      }
    },
    []
  );

  const updateProjectHousingType = useCallback(
    async (typeId: string, updates: {
      code?: string;
      name?: string;
      default_area_m2?: number;
      default_cost_type?: string;
      default_rent_monthly?: number;
    }) => {
      setProjectHousingTypes(prev => 
        prev.map(type => type.id === typeId ? { ...type, ...updates } : type)
      );
      
      try {
        const { error } = await supabase
          .from('project_housing_types')
          .update(updates)
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Project housing type updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating project housing type:', error);
        Alert.alert('Error', error.message || 'Failed to update housing type');
        await loadProjectHousingTypes();
      }
    },
    [loadProjectHousingTypes]
  );

  const deleteProjectHousingType = useCallback(
    async (typeId: string) => {
      setProjectHousingTypes(prev => prev.filter(type => type.id !== typeId));
      
      try {
        const { error } = await supabase
          .from('project_housing_types')
          .delete()
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Project housing type deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting project housing type:', error);
        Alert.alert('Error', error.message || 'Failed to delete housing type');
        await loadProjectHousingTypes();
        return false;
      }
    },
    [loadProjectHousingTypes]
  );

  const createProjectEquipmentUtilityType = useCallback(
    async (
      projectId: string,
      code: string,
      name: string,
      category: 'equipment' | 'utility',
      landAreaM2: number,
      buildingOccupationPct: number,
      costType: string
    ) => {
      try {
        const { data, error } = await supabase
          .from('project_equipment_utility_types')
          .insert({
            project_id: projectId,
            code,
            name,
            category,
            land_area_m2: landAreaM2,
            building_occupation_pct: buildingOccupationPct,
            cost_type: costType,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('[ZURB] Project equipment utility type created:', data);
        setProjectEquipmentUtilityTypes(prev => [...prev, data]);
        return data;
      } catch (error: any) {
        console.error('[ZURB] Error creating project equipment utility type:', error);
        Alert.alert('Error', error.message || 'Failed to create equipment/utility type');
        return null;
      }
    },
    []
  );

  const updateProjectEquipmentUtilityType = useCallback(
    async (typeId: string, updates: {
      code?: string;
      name?: string;
      land_area_m2?: number;
      building_occupation_pct?: number;
      cost_type?: string;
    }) => {
      setProjectEquipmentUtilityTypes(prev => 
        prev.map(type => type.id === typeId ? { ...type, ...updates } : type)
      );
      
      try {
        const { error } = await supabase
          .from('project_equipment_utility_types')
          .update(updates)
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Project equipment utility type updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating project equipment utility type:', error);
        Alert.alert('Error', error.message || 'Failed to update equipment/utility type');
        await loadProjectEquipmentUtilityTypes();
      }
    },
    [loadProjectEquipmentUtilityTypes]
  );

  const deleteProjectEquipmentUtilityType = useCallback(
    async (typeId: string) => {
      setProjectEquipmentUtilityTypes(prev => prev.filter(type => type.id !== typeId));
      
      try {
        const { error } = await supabase
          .from('project_equipment_utility_types')
          .delete()
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Project equipment utility type deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting project equipment utility type:', error);
        Alert.alert('Error', error.message || 'Failed to delete equipment/utility type');
        await loadProjectEquipmentUtilityTypes();
        return false;
      }
    },
    [loadProjectEquipmentUtilityTypes]
  );

  const updateScenarioConstructionCost = useCallback(
    async (costId: string, updates: { code?: string; name?: string; gold_grams_per_m2?: number }) => {
      setScenarioConstructionCosts(prev => 
        prev.map(cost => cost.id === costId ? { ...cost, ...updates } : cost)
      );
      
      try {
        const { error } = await supabase
          .from('scenario_construction_costs')
          .update(updates)
          .eq('id', costId);

        if (error) throw error;

        console.log('[ZURB] Scenario construction cost updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating scenario construction cost:', error);
        Alert.alert('Error', error.message || 'Failed to update construction cost');
        await loadScenarioConstructionCosts();
      }
    },
    [loadScenarioConstructionCosts]
  );

  const updateScenarioHousingType = useCallback(
    async (typeId: string, updates: {
      code?: string;
      name?: string;
      default_area_m2?: number;
      default_cost_type?: string;
      default_rent_monthly?: number;
    }) => {
      setScenarioHousingTypes(prev => 
        prev.map(type => type.id === typeId ? { ...type, ...updates } : type)
      );
      
      try {
        const { error } = await supabase
          .from('scenario_housing_types')
          .update(updates)
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Scenario housing type updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating scenario housing type:', error);
        Alert.alert('Error', error.message || 'Failed to update housing type');
        await loadScenarioHousingTypes();
      }
    },
    [loadScenarioHousingTypes]
  );

  const updateScenarioEquipmentUtilityType = useCallback(
    async (typeId: string, updates: {
      code?: string;
      name?: string;
      land_area_m2?: number;
      building_occupation_pct?: number;
      cost_type?: string;
    }) => {
      setScenarioEquipmentUtilityTypes(prev => 
        prev.map(type => type.id === typeId ? { ...type, ...updates } : type)
      );
      
      try {
        const { error } = await supabase
          .from('scenario_equipment_utility_types')
          .update(updates)
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Scenario equipment utility type updated');
      } catch (error: any) {
        console.error('[ZURB] Error updating scenario equipment utility type:', error);
        Alert.alert('Error', error.message || 'Failed to update equipment/utility type');
        await loadScenarioEquipmentUtilityTypes();
      }
    },
    [loadScenarioEquipmentUtilityTypes]
  );

  const deleteScenarioConstructionCost = useCallback(
    async (costId: string) => {
      setScenarioConstructionCosts(prev => prev.filter(cost => cost.id !== costId));
      
      try {
        const { error } = await supabase
          .from('scenario_construction_costs')
          .delete()
          .eq('id', costId);

        if (error) throw error;

        console.log('[ZURB] Scenario construction cost deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting scenario construction cost:', error);
        Alert.alert('Error', error.message || 'Failed to delete construction cost');
        await loadScenarioConstructionCosts();
        return false;
      }
    },
    [loadScenarioConstructionCosts]
  );

  const deleteScenarioHousingType = useCallback(
    async (typeId: string) => {
      setScenarioHousingTypes(prev => prev.filter(type => type.id !== typeId));
      
      try {
        const { error } = await supabase
          .from('scenario_housing_types')
          .delete()
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Scenario housing type deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting scenario housing type:', error);
        Alert.alert('Error', error.message || 'Failed to delete housing type');
        await loadScenarioHousingTypes();
        return false;
      }
    },
    [loadScenarioHousingTypes]
  );

  const deleteScenarioEquipmentUtilityType = useCallback(
    async (typeId: string) => {
      setScenarioEquipmentUtilityTypes(prev => prev.filter(type => type.id !== typeId));
      
      try {
        const { error } = await supabase
          .from('scenario_equipment_utility_types')
          .delete()
          .eq('id', typeId);

        if (error) throw error;

        console.log('[ZURB] Scenario equipment utility type deleted');
        return true;
      } catch (error: any) {
        console.error('[ZURB] Error deleting scenario equipment utility type:', error);
        Alert.alert('Error', error.message || 'Failed to delete equipment/utility type');
        await loadScenarioEquipmentUtilityTypes();
        return false;
      }
    },
    [loadScenarioEquipmentUtilityTypes]
  );

  return {
    projects,
    sites,
    blocks,
    halfBlocks,
    units,
    scenarios,
    projectConstructionCosts,
    projectHousingTypes,
    projectEquipmentUtilityTypes,
    scenarioConstructionCosts,
    scenarioHousingTypes,
    scenarioEquipmentUtilityTypes,
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
    getProjectConstructionCostsByProjectId,
    getProjectHousingTypesByProjectId,
    getProjectEquipmentUtilityTypesByProjectId,
    getScenarioConstructionCostsByScenarioId,
    getScenarioHousingTypesByScenarioId,
    getScenarioEquipmentUtilityTypesByScenarioId,
    createProjectConstructionCost,
    updateProjectConstructionCost,
    deleteProjectConstructionCost,
    createProjectHousingType,
    updateProjectHousingType,
    deleteProjectHousingType,
    createProjectEquipmentUtilityType,
    updateProjectEquipmentUtilityType,
    deleteProjectEquipmentUtilityType,
    updateScenarioConstructionCost,
    updateScenarioHousingType,
    updateScenarioEquipmentUtilityType,
    deleteScenarioConstructionCost,
    deleteScenarioHousingType,
    deleteScenarioEquipmentUtilityType,
    loadProjects,
    loadSites,
    loadBlocks,
    loadHalfBlocks,
    loadUnits,
    loadScenarios,
    loadProjectConstructionCosts,
    loadProjectHousingTypes,
    loadProjectEquipmentUtilityTypes,
    loadScenarioConstructionCosts,
    loadScenarioHousingTypes,
    loadScenarioEquipmentUtilityTypes,
  };
});
