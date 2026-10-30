
import nodemailer from "nodemailer";

const recipients = [
  {
    to: "test_d0307d7080bf@inboxd.dev",
    subject: "Concurrent test - Inbox 1",
  },
  {
    to: "test_15a60866ffc1@inboxd.dev",
    subject: "Concurrent test - Inbox 3",
  },
];

async function sendTestEmail(to: string, subject: string) {
  const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 2525,
    secure: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: "sender@example.com",
      to,
      subject,
      text: `This email belongs to ${subject}`,
    });

    console.log("Email sent:", {
      subject,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } finally {
    transporter.close();
  }
}

await Promise.all(
  recipients.map(({ to, subject }) =>
    sendTestEmail(to, subject),
  ),
);

console.log("Both concurrent emails processed.");
