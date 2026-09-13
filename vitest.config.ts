import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // React 19 usa o runtime automático — sem isso, JSX em teste pede `React` no
  // escopo e quebra com "React is not defined".
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    /**
     * O backend de arquivo dos rascunhos vive em `.drafts/` (ver lib/drafts.ts),
     * e o teste do fluxo de pagamento limpa esse diretório com `rm -rf`. Sem
     * isolar, rodar `pnpm test` apagava os rascunhos locais de quem estava
     * desenvolvendo — o teste destruía trabalho de verdade.
     */
    env: { REVELADO_DEV_DIR: ".drafts-test" },
  },
});
