"use client";

import { useEffect, useState } from "react";

import { Field } from "@/components/editor/field";
import { useEditorStore } from "@/stores/editor-store";

/**
 * O passo do link — o último antes da revisão.
 *
 * Existe porque o link **é** a entrega. Ele vai colado numa conversa de
 * WhatsApp, impresso num cartão, lido em voz alta. Até aqui ele nascia
 * `nosso-k3f9x2wq` e ninguém nunca escolhia nada; dá para mandar, mas não dá
 * para se orgulhar de mandar.
 *
 * **Só o começo é editável, e isso é de propósito.** O sufixo aleatório é o
 * que impede varrer as páginas dos outros (SPEC 9.4) — e estas páginas têm
 * foto íntima de casal. Um `/p/marina-e-teo` seria adivinhável, e adivinhável
 * aqui quer dizer que dá para achar a página de gente que você não conhece.
 * Então a pessoa escolhe a parte que ela mostra, e a parte que protege
 * continua sendo sorteada.
 *
 * Efeito colateral bom: sem escolher o link inteiro, não há colisão possível,
 * e some a verificação de disponibilidade em tempo real — ninguém fica
 * tentando nome atrás de nome como quem escolhe @ de rede social.
 */
export function StepLink() {
  const draftId = useEditorStore((state) => state.draftId);
  const slug = useEditorStore((state) => state.slug);
  const setSlug = useEditorStore((state) => state.setSlug);

  // O que a pessoa digita, separado do que está salvo: o campo tem de aceitar
  // espaço e maiúscula enquanto ela escreve, e só virar link ao gravar.
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"parado" | "salvando" | "erro">("parado");
  const [erro, setErro] = useState<string | null>(null);

  const sufixo = slug ? slug.slice(-9) : "";
  const apelido = slug ? slug.slice(0, Math.max(slug.length - 9, 0)) : "";

  useEffect(() => {
    setTexto(apelido);
  }, [apelido]);

  const previa = `${limpar(texto) || apelido}${sufixo}`;

  async function gravar() {
    const proposto = limpar(texto);
    if (!draftId || !proposto || proposto === apelido) return;

    setEstado("salvando");
    setErro(null);

    try {
      const resposta = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apelido: proposto }),
      });
      const corpo = (await resposta.json()) as { slug?: string; error?: string };

      if (!resposta.ok || !corpo.slug) {
        setEstado("erro");
        setErro(corpo.error ?? "Não deu para trocar o link.");
        return;
      }

      setSlug(corpo.slug);
      setEstado("parado");
    } catch {
      setEstado("erro");
      setErro("A conexão falhou. Tente de novo.");
    }
  }

  return (
    <div className="step">
      <h2 className="step__title">O endereço da página</h2>
      <p className="step__lede">
        É o que você vai mandar na conversa. Escolha o começo — as letras do
        fim são sorteadas e ficam.
      </p>

      <Field
        label="O começo do link"
        hint="Letras, números e hífen. Sai do jeito que você escrever."
        value={texto}
        maxLength={40}
        {...(erro ? { error: erro } : {})}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            onBlur={() => void gravar()}
            maxLength={40}
            className="field__input"
            placeholder="marina-e-teo"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Field>

      <p className="step-link__previa">
        <span className="eyebrow">vai ficar assim</span>
        <span data-numeric className="step-link__url">
          /p/<strong>{limpar(texto) || apelido}</strong>
          <em>{sufixo}</em>
        </span>
      </p>

      {estado === "salvando" ? (
        <p className="step-link__estado">salvando…</p>
      ) : null}

      <p className="step-link__nota">
        As letras do fim não saem. São elas que impedem alguém de adivinhar o
        endereço da página de outro casal.
      </p>

      {/* `previa` alimenta o aria-live para quem usa leitor de tela ouvir o
          endereço montado sem precisar caçar o texto na tela. */}
      <span className="sr-only" aria-live="polite">
        {previa}
      </span>
    </div>
  );
}

/** Mesma normalização do servidor — aqui só para a prévia não mentir. */
function limpar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 40);
}
