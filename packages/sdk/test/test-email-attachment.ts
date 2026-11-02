
import { Inboxd, attachmentToBuffer } from "../src/index.js";

const client = new Inboxd({
  apiKey: process.env.INBOXD_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const inbox = client.inbox(
  "69a53455-e22e-411d-b012-9bc72cd526f7",
);

async function main() {
  console.log("Waiting for attachment email...");

  try {
    const email = await inbox.waitForEmail({
      subject: "Inboxd attachment test",
      timeout: 30_000,
    });

    console.log("\nEmail received!");

    if (email.attachments.length === 0) {
      throw new Error("No attachments found");
    }

    for (const attachment of email.attachments) {
      const fileBuffer = attachmentToBuffer(attachment);

      console.log("\nAttachment details:");
      console.log("Filename:", attachment.filename);
      console.log("MIME type:", attachment.mimeType);
      console.log("File size:", fileBuffer.length, "bytes");

      console.log("Content:", fileBuffer.toString("utf8"));
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();
