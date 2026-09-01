import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "prettier", // eslint-config-prettier: desliga o que conflita com o Prettier
  ),
  {
    rules: {
      // SPEC 12 — nada de any. Tipos derivados do zod com z.infer.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // Descartar props com destructuring + rest é padrão em componente.
          ignoreRestSiblings: true,
        },
      ],
      // SPEC 6.4 / anti-padrão 5 — scroll e pointermove só nos drivers singleton.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='addEventListener'][arguments.0.value=/^(scroll|pointermove|pointerdown|mousemove)$/]",
          message:
            "SPEC 6.4: proibido listener de scroll/pointer em componente. Assine use-scroll-driver ou use-pointer.",
        },
      ],
    },
  },
  {
    // Os drivers singleton são os únicos autorizados a registrar os listeners.
    files: ["src/hooks/use-scroll-driver.ts", "src/hooks/use-pointer.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      // A build de verificacao, que roda em outro diretorio para nao brigar
      // com o `next dev` (ver `distDir` em next.config.ts). Sem esta linha o
      // ESLint entra nos chunks minificados e acusa `require()` proibido.
      ".next-verify/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
