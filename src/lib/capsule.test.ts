import { describe, expect, it } from "vitest";

import { lacrarCapsulas } from "@/lib/capsule";
import { SCHEMA_VERSION, type SiteContent } from "@/lib/blocks/schema";

/**
 * O texto de uma cápsula fechada não pode sair do servidor.
 *
 * Este teste existe porque a primeira versão do recurso vazava: as props dos
 * blocos são serializadas no payload RSC dentro do HTML, então bastava abrir o
 * código-fonte da página para ler a surpresa antes da data. É uma falha que
 * não aparece na tela — a página parece certa — e por isso precisa de teste.
 */

const SEGREDO = "so em fevereiro";

function conteudo(openAt: string): SiteContent {
  return {
    schemaVersion: SCHEMA_VERSION,
    theme: {
      template: "essencial",
      skin: "clara",
      palette: "magenta",
      font: "mixed",
      effect: "none",
    },
    blocks: [
      {
        id: "capsule",
        type: "capsule",
        props: { openAt, text: SEGREDO },
      },
    ],
  } as SiteContent;
}

const AGORA = Date.UTC(2026, 0, 1);
const FUTURO = new Date(Date.UTC(2026, 1, 14)).toISOString();
const PASSADO = new Date(Date.UTC(2025, 1, 14)).toISOString();

describe("cápsula do tempo", () => {
  it("não deixa o texto sair enquanto está fechada", () => {
    const saida = lacrarCapsulas(conteudo(FUTURO), AGORA);
    expect(JSON.stringify(saida)).not.toContain(SEGREDO);
  });

  it("entrega o texto depois da data", () => {
    const saida = lacrarCapsulas(conteudo(PASSADO), AGORA);
    expect(JSON.stringify(saida)).toContain(SEGREDO);
  });

  it("abre no instante exato, não um tique depois", () => {
    const abreAgora = new Date(AGORA).toISOString();
    const saida = lacrarCapsulas(conteudo(abreAgora), AGORA);
    expect(JSON.stringify(saida)).toContain(SEGREDO);
  });

  it("mantém a data, que é o que o contador precisa", () => {
    const saida = lacrarCapsulas(conteudo(FUTURO), AGORA);
    const bloco = saida.blocks[0];
    expect(bloco?.type).toBe("capsule");
    if (bloco?.type === "capsule") expect(bloco.props.openAt).toBe(FUTURO);
  });

  it("devolve o mesmo objeto quando não há nada a lacrar", () => {
    const entrada = conteudo(PASSADO);
    expect(lacrarCapsulas(entrada, AGORA)).toBe(entrada);
  });
});
