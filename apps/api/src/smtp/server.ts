import { SMTPServer } from "smtp-server";
import PostalMime from "postal-mime";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { inboxes, messages } from "../db/schema.js";

const smtpServer = new SMTPServer({
  authOptional: true,

  onRcptTo(address, session, callback) {
    console.log("📨 Recipient:", address.address);

    callback();
  },

  onData(stream, session, callback) {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    stream.on("end", async () => {
      try {
        const rawEmail = Buffer.concat(chunks);

        const parser = new PostalMime();
        const email = await parser.parse(rawEmail);

        const recipient = email.to?.[0]?.address;

        if (!recipient) {
          throw new Error("Email has no recipient");
        }

        const [inbox] = await db
          .select({
            id: inboxes.id,
          })
          .from(inboxes)
          .where(eq(inboxes.address, recipient))
          .limit(1);

        if (!inbox) {
          throw new Error(`Inbox not found: ${recipient}`);
        }

        await db.insert(messages).values({
          inboxId: inbox.id,
          messageId: email.messageId ?? null,
          from: email.from ?? null,
          to: email.to ?? [],
          subject: email.subject ?? null,
          text: email.text ?? null,
          html: email.html ?? null,
          date: email.date ? new Date(email.date) : null,
          headers: email.headers ?? null,
          attachments: email.attachments ?? [],
        });

        console.log("💾 Email stored:", {
          inboxId: inbox.id,
          subject: email.subject,
        });

        callback();
      } catch (error) {
        console.error("Failed to process email:", error);
        callback(error as Error);
      }
    });
  },
});

smtpServer.listen(2525, () => {
  console.log("inboxd SMTP server running on port 2525");
});