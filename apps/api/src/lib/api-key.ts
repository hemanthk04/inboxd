import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "inboxd_live_";

export function generateApiKey() {
  const secret = randomBytes(32).toString("hex");

  const key = `${API_KEY_PREFIX}${secret}`;

  const hash = createHash("sha256")
    .update(key)
    .digest("hex");

  return {
    key,
    hash,
    prefix: key.slice(0, 16),
  };
}