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
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

// ── Admin-only route protection ─────────────────────────────────────────────
// Blanket protect /api/admin/*, /api/stats/*, and image upload/delete.
// Exempt /api/admin/check-status so it can execute and report status.
app.use("/api/admin", (req, res, next) => {
  if (req.path === "/check-status" || req.path === "/check-status/") {
    next();
    return;
  }
  requireAuth(req, res, next);
});
app.use("/api/stats", requireAuth);
app.use("/api/upload", requireAuth);

// Protect read-only admin views on mixed routes
app.use("/api/leads", (req, res, next) => {
  if (req.method === "GET") {
    requireAuth(req, res, next);
    return;
  }
  next();
});
app.use("/api/feedback", (req, res, next) => {
  if (req.method === "GET") {
    requireAuth(req, res, next);
    return;
  }
  next();
});
// Protect menu and specials write operations
app.use(["/api/menu/items", "/api/menu-items"], (req, res, next) => {
  if (req.method !== "GET") {
    requireAuth(req, res, next);
    return;
  }
  next();
});
app.use("/api/specials", (req, res, next) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") {
    requireAuth(req, res, next);
    return;
  }
  next();
});

app.use("/api", router);

export default app;
