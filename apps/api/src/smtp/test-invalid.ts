
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
    to: "does-not-exist@inboxd.dev",
    subject: "Invalid recipient test",
    text: "This email should be rejected.",
  });

  console.log("Unexpected: email was accepted.");
} catch (error) {
  console.log("Expected rejection:", (error as Error).message);
} finally {
  transporter.close();
}
