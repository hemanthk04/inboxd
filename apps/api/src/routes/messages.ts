
import { Hono } from "hono";
import { and, desc, eq, gt, ilike } from "drizzle-orm";

import { db } from "../db/index.js";
import { inboxes, messages } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const messagesRouter = new Hono();

// All message endpoints require authentication.
messagesRouter.use("*", authMiddleware);

/**
 * GET /v1/inboxes/:inboxId/messages
 *
 * Query parameters:
 * - subject: Case-insensitive partial subject match
 * - after: Return messages received after this ISO timestamp
 * - limit: Maximum number of messages (default 20, max 100)
 */
messagesRouter.get("/:inboxId/messages", async (c) => {
  const account = c.get("account");
  const inboxId = c.req.param("inboxId");

  // Read query parameters.
  const subject = c.req.query("subject")?.trim();
  const after = c.req.query("after");
  const limitParam = c.req.query("limit");

  // Validate the limit.
  const limit = limitParam === undefined ? 20 : Number(limitParam);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return c.json(
      { error: "Limit must be an integer between 1 and 100" },
      400,
    );
  }

  // Validate the timestamp, if supplied.
  let afterDate: Date | undefined;

  if (after !== undefined) {
    afterDate = new Date(after);

    if (Number.isNaN(afterDate.getTime())) {
      return c.json(
        { error: "Invalid after timestamp. Use ISO 8601 format." },
        400,
      );
    }
  }

  // Verify that this inbox belongs to the authenticated account.
  const [inbox] = await db
    .select({ id: inboxes.id })
    .from(inboxes)
    .where(
      and(
        eq(inboxes.id, inboxId),
        eq(inboxes.accountId, account.accountId),
      ),
    )
    .limit(1);

  if (!inbox) {
    return c.json({ error: "Inbox not found" }, 404);
  }

  // Build message filters.
  const conditions = [eq(messages.inboxId, inboxId)];

  if (subject) {
    conditions.push(ilike(messages.subject, `%${subject}%`));
  }

  if (afterDate) {
    conditions.push(gt(messages.receivedAt, afterDate));
  }

  // Fetch matching messages, newest first.
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
    .where(and(...conditions))
    .orderBy(desc(messages.receivedAt))
    .limit(limit);

  return c.json({
    messages: result,
    count: result.length,
    limit,
  });
});

export default messagesRouter;
