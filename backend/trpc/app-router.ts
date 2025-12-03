import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import projectsList from "./routes/projects/list/route";
import projectsCreate from "./routes/projects/create/route";
import projectsGet from "./routes/projects/get/route";
import sitesList from "./routes/sites/list/route";
import sitesCreate from "./routes/sites/create/route";

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
});

export type AppRouter = typeof appRouter;
