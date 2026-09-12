import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
 * Vai para o `tmpdir` do sistema em vez do diretório do projeto: nada a limpar
 * se um processo morrer no meio.
 */
export function testDevStore() {
  const dir = join(tmpdir(), `revelado-teste-${randomUUID()}`);

  return {
    dir,
    /** Aponta o backend de arquivo para cá e garante que não há banco. */
    arm() {
      delete process.env.DATABASE_URL;
      process.env.REVELADO_DEV_DIR = dir;
    },
    async clean() {
      delete process.env.REVELADO_DEV_DIR;
      await rm(dir, { recursive: true, force: true });
    },
  };
}
