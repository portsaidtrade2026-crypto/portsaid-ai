import { QUOTE_MODULE } from "./src/modules/quote";
import { APPROVAL_MODULE } from "./src/modules/approval";
import { COMPANY_MODULE } from "./src/modules/company";
import { TOKEN_REVOCATION_MODULE } from "./src/modules/token-revocation";
import {
  ContainerRegistrationKeys,
  Modules,
  loadEnv,
  defineConfig,
} from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: {
    backendUrl: "/",
    vite: (config) => {
      return {
        ...config,
        server: {
          ...config.server,
          allowedHosts: true,
          // Replit's public dev domain proxies HTTP fine but does not
          // forward Vite's HMR websocket for this (intentionally private)
          // port, which was surfacing as "Failed to load module script:
          // ... MIME type text/html" and a WebSocket connection timeout in
          // the browser console - the browser falls back to the dev
          // server's catch-all HTML response for every asset request once
          // the HMR handshake can't complete. Disabling HMR removes the
          // websocket dependency entirely; the admin still loads and
          // functions normally, just without live-reload-on-edit.
          hmr: false,
        },
      };
    },
  },
  modules: {
    [Modules.AUTH]: {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        mfa: {
          encryption_key: process.env.AUTH_MFA_ENCRYPTION_KEY,
        },
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },
    [Modules.FILE]: {
      resolve: "@medusajs/medusa/file",
      options: {
        // Replit Autoscale's local disk is wiped on every republish, so the
        // Replit deployment needs the Object Storage-backed provider. A
        // persistent server (e.g. our own VPS) just needs a normal local
        // disk, so FILE_PROVIDER=local switches to Medusa's built-in
        // provider there - no env var needed to keep Replit's behavior.
        providers:
          process.env.FILE_PROVIDER === "local"
            ? [
                {
                  resolve: "@medusajs/file-local",
                  id: "local",
                  options: {
                    // Absolute path on a mounted volume so uploads survive
                    // container rebuilds/redeploys (unlike the default,
                    // which resolves relative to the built .medusa/server
                    // output that gets replaced on every build).
                    upload_dir: process.env.LOCAL_UPLOAD_DIR || "/uploads",
                  },
                },
              ]
            : [
                {
                  resolve: "./src/modules/replit-storage",
                  id: "replit-storage",
                },
              ],
      },
    },
    [TOKEN_REVOCATION_MODULE]: {
      resolve: "./modules/token-revocation",
    },
    [COMPANY_MODULE]: {
      resolve: "./modules/company",
    },
    [QUOTE_MODULE]: {
      resolve: "./modules/quote",
    },
    [APPROVAL_MODULE]: {
      resolve: "./modules/approval",
    },
  },
});
