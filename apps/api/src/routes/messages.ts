import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { inboxes, messages } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const messagesRouter = new Hono();

/**
 * All message routes require a valid inboxd API key.
 */
messagesRouter.use("*", authMiddleware);

/**
 * GET /v1/inboxes/:inboxId/messages
 *
 * Returns messages belonging to the requested inbox.
 *
 * We verify that the inbox belongs to the authenticated account
 * before returning anything.
 */
messagesRouter.get("/:inboxId/messages", async (c) => {
  const account = c.get("account");
  const inboxId = c.req.param("inboxId");

  const inbox = await db
    .select({
      id: inboxes.id,
    })
    .from(inboxes)
    .where(
      and(
        eq(inboxes.id, inboxId),
        eq(inboxes.accountId, account.accountId),
      ),
    )
    .limit(1);

  if (!inbox[0]) {
    return c.json(
      {
        error: "Inbox not found",
      },
      404,
    );
  }

  const result = await db
    .select({
      id: messages.id,
      messageId: messages.messageId,
      from: messages.from,
      to: messages.to,
      subject: messages.subject,
      text: messages.text,
      html: messages.html,
      date: messages.date,
      attachments: messages.attachments,
      receivedAt: messages.receivedAt,
    })
    .from(messages)
    .where(eq(messages.inboxId, inboxId))
    .orderBy(desc(messages.receivedAt));

  return c.json({
    messages: result,
  });
});

export default messagesRouter;