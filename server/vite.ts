import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Only serve SPA for non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes
    if (url.startsWith("/api/")) {
      return next();
    }

    try {
      // Use process.cwd() to get the actual working directory
      let clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // Debug: log the resolved path
      console.log("[VITE] Resolved client template path:", clientTemplate);

      // If the main path doesn't exist, try relative from server directory
      if (!fs.existsSync(clientTemplate)) {
        const fallbackPath = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );
        console.log("[VITE] Main path not found, trying fallback:", fallbackPath);
        if (fs.existsSync(fallbackPath)) {
          clientTemplate = fallbackPath;
        }
      }

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      const error = e as Error;
      console.error("[VITE ERROR] Failed to serve client:", error.message);
      console.error("[VITE ERROR] Current working directory:", process.cwd());
      console.error("[VITE ERROR] __dirname:", __dirname);
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
}
