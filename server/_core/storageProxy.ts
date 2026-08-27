import path from "node:path";
import { stat } from "node:fs/promises";
import type { Express } from "express";
import { ENV } from "./env.js";

export function resolveLocalStorageAssetPath(localAssetsDir: string | undefined, key: string): string | null {
  if (!localAssetsDir || !key) return null;

  const assetRoot = path.resolve(localAssetsDir);
  const assetPath = path.resolve(assetRoot, key);
  const relativePath = path.relative(assetRoot, assetPath);

  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }

  return assetPath;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const localAssetPath = resolveLocalStorageAssetPath(process.env.ANIMA_LOCAL_ASSETS_DIR, key);
    if (localAssetPath) {
      try {
        const localAsset = await stat(localAssetPath);
        if (localAsset.isFile()) {
          res.set("Cache-Control", "public, max-age=3600");
          res.sendFile(localAssetPath);
          return;
        }
      } catch {
        // The bundled local directory may not include every requested key; fall back to managed storage when configured.
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured. Set ANIMA_LOCAL_ASSETS_DIR to a folder containing the requested asset files.");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
