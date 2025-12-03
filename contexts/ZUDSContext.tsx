import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import {
  Project,
  Site,
  Scenario,
  CostParams,
  MixRule,
  RentConfig,
  OverheadConfig,
} from '@/types';
import {
  DEFAULT_COST_PARAMS,
  DEFAULT_MIX_RULES,
  DEFAULT_RENTS,
  DEFAULT_OVERHEADS,
} from '@/constants/costs';

const STORAGE_KEYS = {
  PROJECTS: 'zuds_projects',
  SCENARIOS: 'zuds_scenarios',
  COST_PARAMS: 'zuds_cost_params',
  MIX_RULES: 'zuds_mix_rules',
  RENTS: 'zuds_rents',
  OVERHEADS: 'zuds_overheads',
};

export const [ZUDSContext, useZUDS] = createContextHook(() => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<{ [siteId: string]: Scenario[] }>({});
  const [costParams, setCostParams] = useState<CostParams>(DEFAULT_COST_PARAMS);
  const [mixRules, setMixRules] = useState<MixRule[]>(DEFAULT_MIX_RULES);
  const [rents, setRents] = useState<RentConfig[]>(DEFAULT_RENTS);
  const [overheads, setOverheads] = useState<OverheadConfig>(DEFAULT_OVERHEADS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveScenarios(scenarios);
    }
  }, [scenarios, isLoading]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [projectsData, scenariosData, costParamsData, mixRulesData, rentsData, overheadsData] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PROJECTS),
          AsyncStorage.getItem(STORAGE_KEYS.SCENARIOS),
          AsyncStorage.getItem(STORAGE_KEYS.COST_PARAMS),
          AsyncStorage.getItem(STORAGE_KEYS.MIX_RULES),
          AsyncStorage.getItem(STORAGE_KEYS.RENTS),
          AsyncStorage.getItem(STORAGE_KEYS.OVERHEADS),
        ]);

      if (projectsData) {
        const parsedProjects = JSON.parse(projectsData);
        setProjects(
          parsedProjects.map((p: Project) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          }))
        );
      }
      if (scenariosData) {
        const parsedScenarios = JSON.parse(scenariosData);
        const scenariosWithDates: { [siteId: string]: Scenario[] } = {};
        Object.keys(parsedScenarios).forEach(siteId => {
          scenariosWithDates[siteId] = parsedScenarios[siteId].map((s: Scenario) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          }));
        });
        setScenarios(scenariosWithDates);
      }
      if (costParamsData) setCostParams(JSON.parse(costParamsData));
      if (mixRulesData) setMixRules(JSON.parse(mixRulesData));
      if (rentsData) setRents(JSON.parse(rentsData));
      if (overheadsData) setOverheads(JSON.parse(overheadsData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProjects = async (newProjects: Project[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(newProjects));
      setProjects(newProjects);
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  };

  const createProject = useCallback(
    (name: string, description: string) => {
      const newProject: Project = {
        id: Date.now().toString(),
        name,
        description,
        createdAt: new Date(),
        sites: [],
      };
      const updated = [...projects, newProject];
      saveProjects(updated);
      return newProject;
    },
    [projects]
  );

  const updateProject = useCallback(
    (projectId: string, updates: Partial<Project>) => {
      const updated = projects.map(p =>
        p.id === projectId ? { ...p, ...updates } : p
      );
      saveProjects(updated);
    },
    [projects]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      const updated = projects.filter(p => p.id !== projectId);
      saveProjects(updated);
    },
    [projects]
  );

  const createSite = useCallback(
    (projectId: string, name: string, areaHa: number, latitude: number, longitude: number, polygon?: { latitude: number; longitude: number }[]) => {
      const newSite: Site = {
        id: Date.now().toString(),
        projectId,
        name,
        areaHa,
        location: { latitude, longitude },
        polygon,
        blocks: [],
      };
      const updated = projects.map(p =>
        p.id === projectId ? { ...p, sites: [...p.sites, newSite] } : p
      );
      saveProjects(updated);
      return newSite;
    },
    [projects]
  );

  const saveScenarios = async (scenariosToSave: { [siteId: string]: Scenario[] }) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenariosToSave));
    } catch (error) {
      console.error('Error saving scenarios:', error);
    }
  };

  const createScenario = useCallback(
    (siteId: string, name: string, notes: string = '') => {
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
    },
    []
  );

  const updateScenario = useCallback(
    (scenarioId: string, updates: Partial<Scenario>) => {
      setScenarios(prev => {
        const newScenarios = { ...prev };
        Object.keys(newScenarios).forEach(siteId => {
          newScenarios[siteId] = newScenarios[siteId].map(s =>
            s.id === scenarioId ? { ...s, ...updates } : s
          );
        });
        return newScenarios;
      });
    },
    []
  );

  const deleteScenario = useCallback(
    (scenarioId: string) => {
      setScenarios(prev => {
        const newScenarios = { ...prev };
        Object.keys(newScenarios).forEach(siteId => {
          newScenarios[siteId] = newScenarios[siteId].filter(s => s.id !== scenarioId);
        });
        return newScenarios;
      });
    },
    []
  );

  const updateCostParams = useCallback(async (newParams: CostParams) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.COST_PARAMS, JSON.stringify(newParams));
      setCostParams(newParams);
    } catch (error) {
      console.error('Error updating cost params:', error);
    }
  }, []);

  const updateMixRules = useCallback(async (newRules: MixRule[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MIX_RULES, JSON.stringify(newRules));
      setMixRules(newRules);
    } catch (error) {
      console.error('Error updating mix rules:', error);
    }
  }, []);

  const updateRents = useCallback(async (newRents: RentConfig[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RENTS, JSON.stringify(newRents));
      setRents(newRents);
    } catch (error) {
      console.error('Error updating rents:', error);
    }
  }, []);

  const updateOverheads = useCallback(async (newOverheads: OverheadConfig) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OVERHEADS, JSON.stringify(newOverheads));
      setOverheads(newOverheads);
    } catch (error) {
      console.error('Error updating overheads:', error);
    }
  }, []);

  const getRentsMap = useCallback((): { [code: string]: number } => {
    return rents.reduce((acc, rent) => {
      acc[rent.code] = rent.monthlyUsd;
      return acc;
    }, {} as { [code: string]: number });
  }, [rents]);

  return {
    projects,
    scenarios,
    costParams,
    mixRules,
    rents,
    overheads,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    createSite,
    createScenario,
    updateScenario,
    deleteScenario,
    updateCostParams,
    updateMixRules,
    updateRents,
    updateOverheads,
    getRentsMap,
  };
});
