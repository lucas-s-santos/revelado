import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";

/**
 * Pasta própria do backend de arquivo para uma suíte de teste.
 *
 * Não se chama `useDevStore` porque o prefixo `use` faz o ESLint tratar a
 * função como React Hook e reprovar a chamada no topo do arquivo.
 *
 * ```ts
 * const store = testDevStore();
 * beforeEach(store.arm);
 * afterAll(store.clean);
 * ```
 *
 * Existe porque os testes que exercitam o backend de arquivo compartilhavam o
 * mesmo `.drafts/` e o vitest roda arquivos em paralelo: o `afterAll` de uma
 * suíte apagava os dados de outra no meio da execução, e o teste do `site.purge`
 * — que varre tudo que expirou — apagava as páginas de quem estivesse rodando ao
 * lado. Passavam sozinhos e falhavam juntos.
 *
 * O caminho é **relativo**: `devDir()` faz `join(process.cwd(), …)`, e um
 * caminho absoluto ali vira concatenação sem sentido. Fica dentro de
 * `.drafts-test/`, que já é ignorado pelo git.
 */
export function testDevStore() {
  const dir = `.drafts-test/${randomUUID()}`;

  return {
    dir,
    /** Aponta o backend de arquivo para cá e garante que não há banco. */
    arm() {
      delete process.env.DATABASE_URL;
      process.env.REVELADO_DEV_DIR = dir;
    },
    async clean() {
      // Volta para a pasta da suíte, e não apaga a variável: sem ela, qualquer
      // escrita tardia cairia no `.drafts` de desenvolvimento de verdade.
      process.env.REVELADO_DEV_DIR = ".drafts-test";
      await rm(dir, { recursive: true, force: true });
    },
  };
}
