import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({ status: "ok", message: "ZURB API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "ZURB API is running" });
});

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/api/health", (c) => {
  return c.json({ 
    status: "ok", 
    message: "ZURB API is healthy",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }
  });
});

app.onError((err, c) => {
  console.error('[Hono Error]', err);
  return c.json({ error: err.message }, 500);
});

export default app;
