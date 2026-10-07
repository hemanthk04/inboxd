import { randomBytes } from "node:crypto";

const INBOX_DOMAIN = "inboxd.dev";

export function generateInboxAddress() {
  const id = randomBytes(6).toString("hex");

  return `test_${id}@${INBOX_DOMAIN}`;
}