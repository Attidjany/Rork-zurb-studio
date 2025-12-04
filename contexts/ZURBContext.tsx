import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import {
  CostParams,
  MixRule,
  RentConfig,
  OverheadConfig,
  Scenario,
  ScenarioItem,
} from '@/types';
import {
  DEFAULT_COST_PARAMS,
  DEFAULT_MIX_RULES,
  DEFAULT_RENTS,
  DEFAULT_OVERHEADS,
} from '@/constants/costs';

type DbProject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
};

type DbSite = {
  id: string;
  project_id: string;
  name: string;
  area_ha: number | null;
  created_at: string;
  updated_at: string;
};

export const [ZURBContext, useZURB] = createContextHook(() => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [sites, setSites] = useState<DbSite[]>([]);
  const [costParams, setCostParams] = useState<CostParams>(DEFAULT_COST_PARAMS);
  const [mixRules, setMixRules] = useState<MixRule[]>(DEFAULT_MIX_RULES);
  const [rents, setRents] = useState<RentConfig[]>(DEFAULT_RENTS);
  const [overheads, setOverheads] = useState<OverheadConfig>(DEFAULT_OVERHEADS);
  const [scenarios, setScenarios] = useState<{ [siteId: string]: Scenario[] }>({});
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadProjects(), loadSites()]);
    setIsLoading(false);
  }, [loadProjects, loadSites]);

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

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(sitesChannel);
    };
  }, [user, loadData, loadProjects, loadSites]);



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

  const updateCostParams = useCallback(async (newParams: CostParams) => {
    setCostParams(newParams);
  }, []);

  const updateMixRules = useCallback(async (newRules: MixRule[]) => {
    setMixRules(newRules);
  }, []);

  const updateRents = useCallback(async (newRents: RentConfig[]) => {
    setRents(newRents);
  }, []);

  const updateOverheads = useCallback(async (newOverheads: OverheadConfig) => {
    setOverheads(newOverheads);
  }, []);

  const createScenario = useCallback((siteId: string, name: string, notes: string) => {
    const newScenario: Scenario = {
      id: Date.now().toString(),
      siteId,
      name,
      notes,
      createdAt: new Date(),
      items: [],
    };
    setScenarios(prev => ({
      ...prev,
      [siteId]: [...(prev[siteId] || []), newScenario],
    }));
    return newScenario;
  }, []);

  const updateScenario = useCallback(
    (scenarioId: string, updates: { name?: string; notes?: string; items?: ScenarioItem[] }) => {
      setScenarios(prev => {
        const newScenarios = { ...prev };
        for (const siteId in newScenarios) {
          newScenarios[siteId] = newScenarios[siteId].map(scenario =>
            scenario.id === scenarioId ? { ...scenario, ...updates } : scenario
          );
        }
        return newScenarios;
      });
    },
    []
  );

  const deleteScenario = useCallback(
    (scenarioId: string) => {
      setScenarios(prev => {
        const newScenarios = { ...prev };
        for (const siteId in newScenarios) {
          newScenarios[siteId] = newScenarios[siteId].filter(scenario => scenario.id !== scenarioId);
        }
        return newScenarios;
      });
      return true;
    },
    []
  );

  const duplicateScenario = useCallback(
    (scenarioId: string) => {
      let duplicated: Scenario | null = null;
      setScenarios(prev => {
        const newScenarios = { ...prev };
        for (const siteId in newScenarios) {
          const original = newScenarios[siteId].find(s => s.id === scenarioId);
          if (original) {
            duplicated = {
              ...original,
              id: Date.now().toString(),
              name: `${original.name} (Copy)`,
              createdAt: new Date(),
            };
            newScenarios[siteId] = [...newScenarios[siteId], duplicated];
            break;
          }
        }
        return newScenarios;
      });
      return duplicated;
    },
    []
  );

  const getSitesByProjectId = useCallback(
    (projectId: string) => {
      return sites.filter(s => s.project_id === projectId);
    },
    [sites]
  );

  const getRentsMap = useCallback((): { [code: string]: number } => {
    return rents.reduce((acc, rent) => {
      acc[rent.code] = rent.monthlyUsd;
      return acc;
    }, {} as { [code: string]: number });
  }, [rents]);

  return {
    projects,
    sites,
    costParams,
    mixRules,
    rents,
    overheads,
    scenarios,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    createSite,
    deleteSite,
    duplicateSite,
    getSitesByProjectId,
    updateCostParams,
    updateMixRules,
    updateRents,
    updateOverheads,
    getRentsMap,
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    loadProjects,
    loadSites,
  };
});
