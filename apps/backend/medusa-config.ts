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
