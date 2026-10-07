import { SMTPServer } from "smtp-server";
import PostalMime from "postal-mime";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { inboxes, messages } from "../db/schema.js";

/**
 * Stores the recipient from the SMTP envelope.
 *
 * This is the address supplied through:
 *
 * RCPT TO: test_xxxxx@inboxd.dev
 *
 * We use this instead of relying on the email's `To:` header because
 * the SMTP envelope recipient is the actual destination of the message.
 *
 * NOTE:
 * This global variable is acceptable for our current local development
 * setup. Before exposing the SMTP server publicly, this should be moved
 * to connection/session-specific state so concurrent emails cannot
 * interfere with each other.
 */
let envelopeRecipient: string | undefined;

const smtpServer = new SMTPServer({
  /**
   * Authentication is disabled for now.
   *
   * Our local SMTP server is only being used for development/testing.
   *
   * When we expose this publicly, we'll need to handle SMTP security,
   * abuse prevention, connection limits, etc.
   */
  authOptional: true,

  /**
   * Called when the SMTP client specifies the recipient.
   *
   * Example:
   *
   * RCPT TO: <test_abc123@inboxd.dev>
   */
  onRcptTo(address, session, callback) {
    envelopeRecipient = address.address;

    console.log("📨 Recipient:", envelopeRecipient);

    callback();
  },

  /**
   * Called when the SMTP client starts sending the actual email data.
   */
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];

    /**
     * Collect the raw SMTP message.
     *
     * We don't parse individual chunks because MIME messages can be
     * split across multiple stream events.
     */
    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    /**
     * The complete email has been received.
     */
    stream.on("end", async () => {
      try {
        /**
         * Combine all stream chunks into one Buffer.
         */
        const rawEmail = Buffer.concat(chunks);

        /**
         * Parse the raw MIME email using PostalMime.
         *
         * This gives us structured data such as:
         *
         * - from
         * - to
         * - subject
         * - text
         * - html
         * - date
         * - messageId
         * - attachments
         * - headers
         */
        const parser = new PostalMime();
        const email = await parser.parse(rawEmail);

        /**
         * The SMTP envelope recipient is the actual destination.
         *
         * We deliberately do NOT use email.to here because the
         * `To:` header inside an email is not necessarily the same
         * as the SMTP envelope recipient.
         */
        const recipient = envelopeRecipient;

        if (!recipient) {
          throw new Error("SMTP envelope recipient is missing");
        }

        /**
         * Find the inbox that owns this email address.
         */
        const [inbox] = await db
          .select({
            id: inboxes.id,
          })
          .from(inboxes)
          .where(eq(inboxes.address, recipient))
          .limit(1);

        /**
         * If the recipient doesn't belong to an existing inbox,
         * we cannot store the email.
         */
        if (!inbox) {
          throw new Error(`Inbox not found: ${recipient}`);
        }

        /**
         * Store the parsed email in PostgreSQL.
         *
         * The inboxId establishes ownership of the message.
         */
        await db.insert(messages).values({
          inboxId: inbox.id,

          // Original Message-ID header.
          messageId: email.messageId ?? null,

          // Sender information.
          from: email.from ?? null,

          // Recipients from the email headers.
          to: email.to ?? [],

          // Email content.
          subject: email.subject ?? null,
          text: email.text ?? null,
          html: email.html ?? null,

          // Original email date.
          date: email.date ? new Date(email.date) : null,

          // Preserve headers for future functionality/debugging.
          headers: email.headers ?? null,

          // Preserve attachment metadata/content returned by PostalMime.
          attachments: email.attachments ?? [],
        });

        /**
         * Useful development log so we know the email made it
         * all the way from SMTP → parser → database.
         */
        console.log("💾 Email stored:", {
          inboxId: inbox.id,
          subject: email.subject,
        });

        /**
         * Clear the envelope recipient after processing the message.
         */
        envelopeRecipient = undefined;

        /**
         * Tell smtp-server that processing completed successfully.
         */
        callback();
      } catch (error) {
        console.error("Failed to process email:", error);

        /**
         * Tell smtp-server that processing failed.
         */
        callback(error as Error);
      }
    });
  },
});

/**
 * Port 2525 is used for development so we don't need privileged
 * port 25 access.
 */
smtpServer.listen(2525, () => {
  console.log("inboxd SMTP server running on port 2525");
});