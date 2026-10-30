
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 2525,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

try {
  await transporter.sendMail({
    from: "sender@example.com",
    to: "test_d0307d7080bf@inboxd.dev",
    subject: "Oversized email test",
    text: "A".repeat(11 * 1024 * 1024),
  });

  console.log("Unexpected: oversized email was accepted.");
} catch (error) {
  console.log("Expected rejection:", (error as Error).message);
} finally {
  transporter.close();
}
