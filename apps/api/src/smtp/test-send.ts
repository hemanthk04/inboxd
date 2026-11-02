import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 2525,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
});

await transporter.sendMail({
  from: "sender@example.com",
  to: "test_d0307d7080bf@inboxd.dev",
  subject: "SDK integration test",
  text: "This is an integration test",
});

console.log("Test email sent.");