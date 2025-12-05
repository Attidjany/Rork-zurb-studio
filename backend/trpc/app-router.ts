import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import projectsList from "./routes/projects/list/route";
import projectsCreate from "./routes/projects/create/route";
import projectsGet from "./routes/projects/get/route";
import sitesList from "./routes/sites/list/route";
import sitesCreate from "./routes/sites/create/route";
import settingsGet from "./routes/settings/get/route";
import settingsUpdateConstructionCost from "./routes/settings/update-construction-cost/route";
import settingsUpdateHousingType from "./routes/settings/update-housing-type/route";
import settingsUpdateEquipmentType from "./routes/settings/update-equipment-type/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  projects: createTRPCRouter({
    list: projectsList,
    create: projectsCreate,
    get: projectsGet,
  }),
  sites: createTRPCRouter({
    list: sitesList,
    create: sitesCreate,
  }),
  settings: createTRPCRouter({
    get: settingsGet,
    updateConstructionCost: settingsUpdateConstructionCost,
    updateHousingType: settingsUpdateHousingType,
    updateEquipmentType: settingsUpdateEquipmentType,
  }),
});

export type AppRouter = typeof appRouter;
