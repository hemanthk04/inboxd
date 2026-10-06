import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    name: "inboxd-api",
    status: "ok",
  });
});

serve({
  fetch: app.fetch,
  port: 3000,
});

console.log("inboxd API running on http://localhost:3000");