/**
 * Onde este processo está rodando.
 *
 * Existe porque `NODE_ENV` **não** responde essa pergunta: `pnpm start` na sua
 * máquina roda como `production` e é indistinguível de um deploy. Decidir
 * segurança por `NODE_ENV` quebra o teste local do funil sem proteger nada a
 * mais — e testar o funil localmente é o que mantém o webhook honesto.
 *
 * O que separa de verdade é o host se anunciar por variável de ambiente. A
 * lista cobre os alvos plausíveis; a Vercel é o deploy atual (SPEC 2).
 */
export const HOSTED = Boolean(
  process.env.VERCEL ||
  process.env.RENDER ||
  process.env.FLY_APP_NAME ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.K_SERVICE ||
  process.env.AWS_EXECUTION_ENV,
);
