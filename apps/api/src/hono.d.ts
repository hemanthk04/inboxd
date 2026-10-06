import type { AuthenticatedAccount } from "./types.js";

declare module "hono" {
  interface ContextVariableMap {
    account: AuthenticatedAccount;
  }
}