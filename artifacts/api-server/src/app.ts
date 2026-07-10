import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { requireAuth } from "./middlewares/requireAuth";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk proxy must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// ── Admin-only route protection ─────────────────────────────────────────────
// Blanket protect /api/admin/* and /api/stats/*
app.use("/api/admin", requireAuth);
app.use("/api/stats", requireAuth);

// Protect read-only admin views on mixed routes
app.use("/api/leads", (req, res, next) => {
  if (req.method === "GET") return requireAuth(req, res, next);
  next();
});
app.use("/api/feedback", (req, res, next) => {
  if (req.method === "GET") return requireAuth(req, res, next);
  next();
});
app.use("/api/orders", (req, res, next) => {
  if (req.method === "GET" || req.method === "PATCH") return requireAuth(req, res, next);
  next();
});
// Protect menu and specials write operations
app.use("/api/menu/items", (req, res, next) => {
  if (req.method !== "GET") return requireAuth(req, res, next);
  next();
});
app.use("/api/specials", (req, res, next) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE")
    return requireAuth(req, res, next);
  next();
});

app.use("/api", router);

export default app;
