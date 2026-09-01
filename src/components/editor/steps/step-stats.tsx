"use client";

import { Hash, Plus, Trash2 } from "lucide-react";

import { Field } from "@/components/editor/field";
import { Pular } from "@/components/editor/pular";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/** Mesmos tetos do schema. Passar disso faria o autosave recusar em silêncio. */
const MAX_ITENS = 6;
const MAX_VALOR = 12;
const MAX_ROTULO = 40;

/**
 * Passo dos números.
 *
 * O bloco existia no schema e nunca teve como ser preenchido — ficava
 * `ready: false` no registry, ou seja, invisível na página. Este passo e o
 * `stats-block.tsx` fecham o par.
 *
 * **O rótulo é onde mora a graça, não o número.** "3 — países" é um dado;
 * "3 — países onde a gente se perdeu" é a página inteira em cinco palavras. Os
 * placeholders puxam para esse lado de propósito: quem lê "vezes que vimos o
 * mesmo filme" entende na hora que aqui não é currículo.
 */
export function StepStats({ aninhado = false }: { aninhado?: boolean } = {}) {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const stats = findBlock(content, "stats");

  if (!stats) {
    return (
      <div className="step">
        {aninhado ? null : (
          <header className="step__head">
            <h2 className="step__title">Alguns números de vocês?</h2>
            <p className="step__lede">
              Países, apartamentos, brigas por causa do ar-condicionado. O
              contador mede um dia só; aqui cabe todo o resto.
            </p>
          </header>
        )}

        <button
          type="button"
          onClick={() => addBlock("stats")}
          className="btn-primary"
        >
          <Hash size={16} aria-hidden />
          Adicionar números
        </button>

        {aninhado ? null : <Pular texto="continuar sem os números" />}
      </div>
    );
  }

  const itens = stats.props.items;
  const escreve = (proximos: typeof itens) =>
    patch(stats.id, { items: proximos });

  const trocar = (i: number, campo: "value" | "label", valor: string) =>
    escreve(itens.map((item, k) => (k === i ? { ...item, [campo]: valor } : item)));

  return (
    <div className="step">
      {aninhado ? null : (
        <header className="step__head">
          <h2 className="step__title">Os números</h2>
          <p className="step__lede">
            O rótulo vale mais que o número: &quot;países onde a gente se
            perdeu&quot; ganha de &quot;países&quot;.
          </p>
        </header>
      )}

      <ul className="numeros">
        {itens.map((item, i) => (
          <li key={i} className="numeros__item">
            <Field label={`Número ${i + 1}`} value={item.value} maxLength={MAX_VALOR}>
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={item.value}
                  maxLength={MAX_VALOR}
                  placeholder="3"
                  inputMode="text"
                  onChange={(event) => trocar(i, "value", event.target.value)}
                  className="input numeros__valor"
                />
              )}
            </Field>

            <Field label="Do quê" value={item.label} maxLength={MAX_ROTULO}>
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={item.label}
                  maxLength={MAX_ROTULO}
                  placeholder="países onde a gente se perdeu"
                  onChange={(event) => trocar(i, "label", event.target.value)}
                  className="input"
                />
              )}
            </Field>

            <button
              type="button"
              onClick={() => escreve(itens.filter((_, k) => k !== i))}
              className="numeros__remover"
              aria-label={`Remover o número ${i + 1}`}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {itens.length >= MAX_ITENS ? (
        <p className="step__hint">
          Seis é o máximo — é o que fecha a grade certinho na página.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => escreve([...itens, { value: "", label: "" }])}
          className="btn-quiet"
        >
          <Plus size={14} aria-hidden />
          Mais um número
        </button>
      )}

      <button
        type="button"
        onClick={() => removeBlock(stats.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar os números da página
      </button>
    </div>
  );
}
