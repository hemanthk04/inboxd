import nodemailer from "nodemailer";

const recipients = [
  {
    host: "localhost",
    port: 2525,
    to: "test_d0307d7080bf@inboxd.dev",
    subject: "Concurrent test - Inbox 1",
  },
  {
    host: "localhost",
    port: 2525,
    to: "test_98cc0e47ab5a@inboxd.dev",
    subject: "Concurrent test - Inbox 2",
  },
];

async function sendTestEmail(
  to: string,
  subject: string,
) {
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

// Both emails are sent concurrently.
await Promise.all(
  recipients.map((recipient) =>
    sendTestEmail(recipient.to, recipient.subject),
  ),
);

console.log("Both concurrent emails processed.");