import { Hono } from "hono";
import { db } from "../db/index.js";
import { inboxes } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateInboxAddress } from "../lib/inbox.js";

const inboxesRouter = new Hono();

inboxesRouter.use("*", authMiddleware);

inboxesRouter.post("/", async (c) => {
  const account = c.get("account");

  const address = generateInboxAddress();

  const [inbox] = await db
    .insert(inboxes)
    .values({
      accountId: account.accountId,
      address,
    })
    .returning({
      id: inboxes.id,
      address: inboxes.address,
      createdAt: inboxes.createdAt,
    });

  return c.json(
    {
      inbox,
    },
    201,
  );
});

export default inboxesRouter;