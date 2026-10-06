import { createHash } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import type { AuthenticatedAccount } from "../types.js";
import { db } from "../db/index.js";
import { accounts, apiKeys } from "../db/schema.js";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return c.json(
      {
        error: "Missing or invalid Authorization header",
      },
      401,
    );
  }

  const apiKey = authorization.slice("Bearer ".length).trim();

  if (!apiKey) {
    return c.json(
      {
        error: "API key is required",
      },
      401,
    );
  }

  const keyHash = createHash("sha256")
    .update(apiKey)
    .digest("hex");

  const result = await db
    .select({
      accountId: accounts.id,
      email: accounts.email,
      apiKeyId: apiKeys.id,
    })
    .from(apiKeys)
    .innerJoin(accounts, eq(apiKeys.accountId, accounts.id))
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  const account = result[0];

  if (!account) {
    return c.json(
      {
        error: "Invalid API key",
      },
      401,
    );
  }

  c.set("account", account);

  await next();
});