import { createTRPCRouter } from "./create-context";
import { scenariosRouter } from "./routes/scenarios";

export const appRouter = createTRPCRouter({
  scenarios: scenariosRouter,
});

export type AppRouter = typeof appRouter;
