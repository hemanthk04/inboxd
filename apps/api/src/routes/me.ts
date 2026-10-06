import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";

const meRouter = new Hono();

meRouter.use("*", authMiddleware);

meRouter.get("/", (c) => {
  const account = c.get("account");

  return c.json({
    account,
  });
});

export default meRouter;