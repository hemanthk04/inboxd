import { Hono } from "hono";
import { db } from "../db/index.js";
import { accounts, apiKeys } from "../db/schema.js";
import { generateApiKey } from "../lib/api-key.js";

const accountsRouter = new Hono();

accountsRouter.post("/", async (c) => {
  const body = await c.req.json<{
    email?: string;
  }>();

  if (!body.email) {
    return c.json(
      {
        error: "Email is required",
      },
      400,
    );
  }

  const { key, hash, prefix } = generateApiKey();

  const [account] = await db
    .insert(accounts)
    .values({
      email: body.email,
    })
    .returning({
      id: accounts.id,
      email: accounts.email,
    });

  await db.insert(apiKeys).values({
    accountId: account.id,
    keyHash: hash,
    keyPrefix: prefix,
  });

  return c.json(
    {
      account: {
        id: account.id,
        email: account.email,
      },
      apiKey: key,
    },
    201,
  );
});

export default accountsRouter;