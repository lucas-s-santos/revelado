import { join } from "node:path";

/**
 * O diretório do backend de arquivo do modo local.
 *
 * Existe para o projeto rodar sem Neon nem R2 configurados: rascunhos, pedidos,
 * mídias e contagem de views caem aqui em vez de no banco (ver `lib/drafts.ts`).
 *
 * **Por que é uma função e não uma constante espalhada:** o caminho estava
 * escrito à mão em seis arquivos. A suíte de testes limpa este diretório com
 * `rm -rf`, então bastou um deles discordar dos outros para o `publishSite`
 * gravar num lugar e o teste ler de outro — e, pior, para `pnpm test` apagar os
 * rascunhos locais de quem estivesse desenvolvendo. Um lugar só resolve os dois.
 *
 * `REVELADO_DEV_DIR` é o desvio que o `vitest.config.ts` usa para isolar a
 * suíte. Fora dos testes, ninguém define e o padrão vale.
 *
 * **Chame esta função no uso, nunca guarde o resultado numa constante de
 * módulo.** Constante é avaliada no `import`, antes de qualquer `beforeEach`, e
 * aí o desvio por teste nunca chega a valer: quatro suítes acabavam escrevendo
 * na mesma pasta e o teste do `site.purge` apagava o rascunho das outras no meio
 * da execução. O sintoma foi um `expected undefined to be null` que passava
 * local e reprovava no CI.
 */
export function devDir(...segments: string[]): string {
  return join(
    process.cwd(),
    process.env.REVELADO_DEV_DIR ?? ".drafts",
    ...segments,
  );
}
