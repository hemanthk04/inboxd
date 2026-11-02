
import nodemailer from "nodemailer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 2525,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

async function main() {
  const info = await transporter.sendMail({
    from: "sender@example.com",
    to: "test_d0307d7080bf@inboxd.dev",
    subject: "Inboxd attachment test",
    text: "Please find the test attachment.",
    attachments: [
      {
        filename: "test-attachment.txt",
        path: path.join(__dirname, "test-attachment.txt"),
      },
    ],
  });

  console.log("Email sent with attachment!");
  console.log("Message ID:", info.messageId);
}

main().catch(console.error);
