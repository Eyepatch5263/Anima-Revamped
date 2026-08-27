import express, { Request, Response, NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { registerStorageProxy } from "../server/_core/storageProxy.js";
import { appRouter } from "../server/routers.js";
import { proxyMangaDexPage, proxyMangaDexCover } from "../server/mangadex.js";
import { createContext } from "../server/_core/context.js";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.get(["/api/mangadex/page/:chapterId/:pageIndex", "/mangadex/page/:chapterId/:pageIndex"], proxyMangaDexPage);
app.get(["/api/mangadex/cover/:mangaId/:filename", "/mangadex/cover/:mangaId/:filename"], proxyMangaDexCover);

const trpcHandler = createExpressMiddleware({
  router: appRouter,
  createContext,
});

app.use("/api/trpc", trpcHandler);
app.use("/trpc", trpcHandler);

// Fallback for tRPC queries if Vercel strips prefix
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.includes("mangaDex") || req.url.includes("trpc") || req.query.batch || req.query.input) {
    return trpcHandler(req, res, next);
  }
  next();
});

// Always return valid JSON errors so TRPCClient never fails with non-JSON syntax error
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Vercel Serverless Error]:", err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

export default app;
