
import { SMTPServer } from "smtp-server";
import PostalMime from "postal-mime";
import { inArray, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { inboxes, messages } from "../db/schema.js";

// Maximum email size: 10 MB.
const MAX_EMAIL_SIZE = 10 * 1024 * 1024;

// Maximum recipients allowed in one SMTP transaction.


const smtpServer = new SMTPServer({
  // Development only. We'll configure SMTP authentication before
  // exposing the receiver publicly.
  authOptional: true,

  // Basic resource protection.
  size: MAX_EMAIL_SIZE,

  /**
   * Validate every SMTP recipient.
   *
   * This callback runs for each RCPT TO command.
   * We reject addresses that don't belong to an existing inbox.
   */
  async onRcptTo(address, session, callback) {
    try {
      const [inbox] = await db
        .select({ id: inboxes.id })
        .from(inboxes)
        .where(eq(inboxes.address, address.address))
        .limit(1);

      if (!inbox) {
        const error = new Error(
          `Inbox not found: ${address.address}`,
        ) as Error & { responseCode: number };

        error.responseCode = 550;
        return callback(error);
      }

      console.log("📨 Recipient accepted:", {
        address: address.address,
        sessionId: session.id,
      });

      callback();
    } catch (error) {
      console.error("Failed to validate recipient:", error);

      callback(
        error instanceof Error
          ? error
          : new Error("Recipient validation failed"),
      );
    }
  },

  /**
   * Process the incoming email.
   *
   * session.envelope.rcptTo contains all recipients accepted
   * for THIS SMTP transaction.
   *
   * This avoids the previous global-variable concurrency issue.
   */
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    stream.on("end", async () => {
      try {
        const rawEmail = Buffer.concat(chunks);

        // Parse the raw email into structured fields.
        const parser = new PostalMime();
        const email = await parser.parse(rawEmail);

        // Read recipients from this specific SMTP transaction.
        const recipientAddresses = [
          ...new Set(
            session.envelope.rcptTo.map(
              (recipient) => recipient.address,
            ),
          ),
        ];

        if (recipientAddresses.length === 0) {
          throw new Error("No SMTP recipients found");
        }

        // Find all inboxes belonging to the accepted recipients.
        const recipientInboxes = await db
          .select({
            id: inboxes.id,
            address: inboxes.address,
          })
          .from(inboxes)
          .where(inArray(inboxes.address, recipientAddresses));

        // An inbox might have been deleted between RCPT TO and DATA.
        if (recipientInboxes.length !== recipientAddresses.length) {
          throw new Error(
            "One or more recipient inboxes no longer exist",
          );
        }

        // Store a separate message record in every recipient inbox.
        await db.insert(messages).values(
          recipientInboxes.map((inbox) => ({
            inboxId: inbox.id,
            messageId: email.messageId ?? null,
            from: email.from ?? {},
            to: email.to ?? [],
            subject: email.subject ?? null,
            text: email.text ?? null,
            html: email.html ?? null,
            date: email.date ? new Date(email.date) : null,
            headers: email.headers ?? null,
            attachments: email.attachments ?? [],
          })),
        );

        console.log("💾 Email stored:", {
          sessionId: session.id,
          recipients: recipientAddresses,
          subject: email.subject,
        });

        callback();
      } catch (error) {
        console.error("Failed to process email:", error);

        callback(
          error instanceof Error
            ? error
            : new Error("Failed to process email"),
        );
      }
    });
  },
});

smtpServer.listen(2525, () => {
  console.log("inboxd SMTP server running on port 2525");
});
