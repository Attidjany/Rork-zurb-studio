import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC Error] ${path}:`, error);
    },
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "ZURB API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "ZURB API is running" });
});

app.onError((err, c) => {
  console.error('[Hono Error]', err);
  return c.json({ error: err.message }, 500);
});

export default app;
