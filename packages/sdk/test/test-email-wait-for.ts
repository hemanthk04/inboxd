import { Inboxd } from "../src/index.js";

const client = new Inboxd({
  apiKey: process.env.INBOXD_API_KEY!,
  baseUrl: "http://localhost:3000",
});

const inbox = client.inbox("69a53455-e22e-411d-b012-9bc72cd526f7");

async function main() {
  console.log("Waiting for email...");

  try {
    const email = await inbox.waitForEmail({
      subject: "SDK integration test",
      from: "sender@example.com",
      text: "integration test",
      timeout: 30_000,
      interval: 1_000,
    });

    console.log("\nEmail received!");
    console.log("From:", email.from);
    console.log("Subject:", email.subject);
    console.log("Body:", email.text);
    console.log("Received at:", email.receivedAt);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();
