import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import accountsRouter from "./routes/accounts.js";
import meRouter from "./routes/me.js";
import inboxesRouter from "./routes/inboxes.js";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    name: "inboxd-api",
    status: "ok",
  });
});

app.route("/v1/accounts", accountsRouter);
app.route("/v1/me", meRouter);
app.route("/v1/inboxes", inboxesRouter);

serve({
  fetch: app.fetch,
  port: 3000,
});

console.log("inboxd API running on http://localhost:3000"); 