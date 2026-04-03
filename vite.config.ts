import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;
const isWebsite = process.env.VITE_BUILD_TARGET === "website";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, "./src"),
      // When building the website, swap Tauri native APIs for browser-compatible mocks
      ...(isWebsite
        ? {
            "@tauri-apps/api/core": path.resolve(__dirname, "website/mock/tauri-core.ts"),
            "@tauri-apps/api/event": path.resolve(__dirname, "website/mock/tauri-event.ts"),
            "@tauri-apps/plugin-store": path.resolve(__dirname, "website/mock/tauri-store.ts"),
            "@tauri-apps/plugin-log": path.resolve(__dirname, "website/mock/tauri-log.ts"),
            "@tauri-apps/plugin-updater": path.resolve(__dirname, "website/mock/tauri-plugin-updater.ts"),
            "@tauri-apps/plugin-process": path.resolve(__dirname, "website/mock/tauri-plugin-process.ts"),
            "@tauri-apps/plugin-dialog": path.resolve(__dirname, "website/mock/tauri-plugin-dialog.ts"),
          }
        : {}),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  ...(isWebsite
    ? {
        root: path.resolve(__dirname, "website"),
        base: "/0ma/",
        publicDir: path.resolve(__dirname, "public"),
        build: {
          outDir: path.resolve(__dirname, "dist-website"),
          emptyOutDir: true,
          rollupOptions: {
            input: {
              main: path.resolve(__dirname, "website/index.html"),
              "demo-frame": path.resolve(__dirname, "website/demo-frame.html"),
            },
          },
        },
      }
    : {
        server: {
          hmr: host
            ? {
                host,
                port: 1421,
                protocol: "ws",
              }
            : undefined,
          host: host || false,
          port: 1420,
          strictPort: true,
          watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
          },
        },
      }),
}));
