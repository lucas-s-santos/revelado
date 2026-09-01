"use client";

import { ListPlus, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";

import { Field } from "@/components/editor/field";
import { Pular } from "@/components/editor/pular";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/** Mesmo teto do schema. Passar disso faria o autosave recusar em silêncio. */
const MAX_ITENS = 100;
const MAX_TEXTO = 140;

/**
 * Passo dos motivos.
 *
 * O bloco existia no schema e nunca teve como ser preenchido — ficava
 * `ready: false` no registry, ou seja, invisível na página. Este passo e o
 * `reasons-block.tsx` fecham o par, e destravam o formato "motivos" no
 * seletor de formato.
 *
 * **Enter adiciona o próximo.** Quem escreve trinta motivos não vai clicar em
 * "adicionar" trinta vezes: o fluxo é escrever, Enter, escrever, Enter. Sem
 * isso o formato é bonito na página e insuportável no editor.
 */
export function StepReasons({ aninhado = false }: { aninhado?: boolean } = {}) {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  // Guarda os inputs para dar foco no que acabou de nascer.
  const campos = useRef<(HTMLInputElement | null)[]>([]);

  const reasons = findBlock(content, "reasons");

  if (!reasons) {
    return (
      <div className="step">
        {aninhado ? null : (
          <header className="step__head">
            <h2 className="step__title">Uma lista de motivos?</h2>
            <p className="step__lede">
              &quot;Cem motivos por que eu te amo&quot; — ou dez, ou três. O que
              conta é serem específicos: quanto mais só de vocês, melhor.
            </p>
          </header>
        )}

        <button
          type="button"
          onClick={() => addBlock("reasons")}
          className="btn-primary"
        >
          <ListPlus size={16} aria-hidden />
          Adicionar lista de motivos
        </button>

        {aninhado ? null : <Pular texto="continuar sem a lista" />}
      </div>
    );
  }

  const itens = reasons.props.items;
  const escreve = (proximos: string[]) =>
    patch(reasons.id, { items: proximos });

  function adicionar(depoisDe = itens.length - 1) {
    if (itens.length >= MAX_ITENS) return;
    const proximos = [...itens];
    proximos.splice(depoisDe + 1, 0, "");
    escreve(proximos);
    // O input ainda não existe neste tick; o foco vai no próximo quadro.
    requestAnimationFrame(() => campos.current[depoisDe + 1]?.focus());
  }

  return (
    <div className="step">
      {aninhado ? null : (
        <header className="step__head">
          <h2 className="step__title">Os motivos</h2>
          <p className="step__lede">
            Escreva um e aperte Enter para o próximo. Específico vale mais que
            bonito: &quot;como você fala dormindo&quot; ganha de &quot;seu
            jeito&quot;.
          </p>
        </header>
      )}

      <Field label="Título da lista" value={reasons.props.title} maxLength={60}>
        {(props) => (
          <input
            {...props}
            type="text"
            value={reasons.props.title}
            maxLength={60}
            onChange={(event) =>
              patch(reasons.id, { title: event.target.value })
            }
            className="input"
          />
        )}
      </Field>

      <ol className="motivos">
        {itens.map((item, i) => (
          <li key={i} className="motivos__item">
            <span data-numeric aria-hidden className="motivos__n">
              {i + 1}
            </span>

            <input
              ref={(node) => {
                campos.current[i] = node;
              }}
              type="text"
              value={item}
              maxLength={MAX_TEXTO}
              placeholder="por que…"
              aria-label={`Motivo ${i + 1}`}
              onChange={(event) =>
                escreve(itens.map((v, k) => (k === i ? event.target.value : v)))
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                adicionar(i);
              }}
              className="input motivos__campo"
            />

            <button
              type="button"
              onClick={() => escreve(itens.filter((_, k) => k !== i))}
              className="motivos__remover"
              aria-label={`Remover o motivo ${i + 1}`}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      {itens.length === 0 ? (
        <p className="step__empty">
          Nenhum motivo ainda. Comece pelo que você lembrou agora.
        </p>
      ) : null}

      {itens.length >= MAX_ITENS ? (
        <p className="step__hint">
          Cem motivos. Já é uma declaração e tanto — não dá para colocar mais.
        </p>
      ) : (
        <button type="button" onClick={() => adicionar()} className="btn-quiet">
          <Plus size={14} aria-hidden />
          Mais um motivo
        </button>
      )}

      <button
        type="button"
        onClick={() => removeBlock(reasons.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar a lista da página
      </button>
    </div>
  );
}
