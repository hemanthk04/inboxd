import { SMTPServer } from "smtp-server";
import PostalMime from "postal-mime";
import { inArray, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { inboxes, messages } from "../db/schema.js";

// Maximum email size: 10 MB.
const MAX_EMAIL_SIZE = 10 * 1024 * 1024;

const smtpServer = new SMTPServer({
  // Development only. Authentication must be configured
  // before exposing the receiver publicly.
  authOptional: true,

  // SMTP server-level message size limit.
  size: MAX_EMAIL_SIZE,

  /**
   * Validate every SMTP recipient.
   *
   * This callback runs for each RCPT TO command.
   * Only existing inbox addresses are accepted.
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
   * Each SMTP transaction has its own session and envelope.
   * We use session.envelope.rcptTo instead of a global variable.
   */
  onData(stream, session, callback) {
    const chunks: Buffer[] = [];

    let totalBytes = 0;
    let oversized = false;
    let callbackCalled = false;

    // Ensure the SMTP callback is invoked only once.
    const finish = (error?: Error) => {
      if (callbackCalled) return;

      callbackCalled = true;
      callback(error);
    };

    stream.on("data", (chunk) => {
      const buffer = Buffer.from(chunk);

      totalBytes += buffer.length;

      // Stop buffering additional data after crossing the limit.
      if (totalBytes > MAX_EMAIL_SIZE) {
        oversized = true;
        return;
      }

      chunks.push(buffer);
    });

    stream.on("error", (error) => {
      console.error("SMTP stream error:", error);
      finish(error);
    });

    stream.on("end", async () => {
      try {
        // Reject oversized messages before parsing or storing.
        if (oversized || stream.sizeExceeded) {
          const error = new Error(
            "Message exceeds the maximum allowed size of 10 MB",
          ) as Error & { responseCode: number };

          error.responseCode = 552;
          return finish(error);
        }

        const rawEmail = Buffer.concat(chunks);

        // Parse the raw MIME email.
        const parser = new PostalMime();
        const email = await parser.parse(rawEmail);

        // Get recipients from this SMTP transaction only.
        const recipientAddresses = [
          ...new Set(
            session.envelope.rcptTo.map((recipient) => recipient.address),
          ),
        ];

        if (recipientAddresses.length === 0) {
          throw new Error("No SMTP recipients found");
        }

        // Find all matching inboxes.
        const recipientInboxes = await db
          .select({
            id: inboxes.id,
            address: inboxes.address,
          })
          .from(inboxes)
          .where(inArray(inboxes.address, recipientAddresses));

        // Ensure every accepted recipient still has an inbox.
        if (recipientInboxes.length !== recipientAddresses.length) {
          throw new Error("One or more recipient inboxes no longer exist");
        }

        // Create one message record per recipient inbox.
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

            attachments: (email.attachments ?? []).map((attachment) => {
              const content = attachment.content;

              let base64Content: string;

              if (typeof content === "string") {
                base64Content = Buffer.from(content, "utf8").toString("base64");
              } else if (content instanceof ArrayBuffer) {
                base64Content = Buffer.from(new Uint8Array(content)).toString(
                  "base64",
                );
              } else {
                base64Content = Buffer.from(content).toString("base64");
              }

              return {
                filename: attachment.filename ?? null,
                mimeType: attachment.mimeType,
                disposition: attachment.disposition ?? null,
                related: attachment.related ?? false,
                contentId: attachment.contentId ?? null,
                content: base64Content,
              };
            }),
          })),
        );

        console.log("💾 Email stored:", {
          sessionId: session.id,
          recipients: recipientAddresses,
          subject: email.subject,
          size: totalBytes,
        });

        finish();
      } catch (error) {
        console.error("Failed to process email:", error);

        finish(
          error instanceof Error ? error : new Error("Failed to process email"),
        );
      }
    });
  },
});

// Start the SMTP receiver.
smtpServer.listen(2525, () => {
  console.log("inboxd SMTP server running on port 2525");
});
