import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Config minimal de tests. Alias `@/` ressincronizado com vite.config.ts.
 * Por padrão, vitest descobre arquivos `*.test.ts` em todo o src/.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",         // pure functions — sem DOM
    globals: false,              // describe/it/expect via import explícito
    include: ["src/**/*.test.ts"],
  },
});
