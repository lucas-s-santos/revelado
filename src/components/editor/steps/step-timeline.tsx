"use client";

import { CalendarClock, Plus, Trash2 } from "lucide-react";

import { Field } from "@/components/editor/field";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo da linha do tempo — SPEC 7.2 (`timeline`).
 *
 * Como o de música, tapa um buraco: o bloco existia e renderizava, mas não
 * havia onde preenchê-lo.
 *
 * A data é **texto livre**, não um seletor de calendário, e é de propósito.
 * O que entra aqui é "o inverno de 2019", "num sábado de manhã", "a viagem" —
 * memória não vem com dia exato, e um date picker obrigaria a pessoa a
 * inventar precisão que ela não tem.
 */

const MAX = 24;

export function StepTimeline() {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const timeline = findBlock(content, "timeline");

  // Opcional, como a música: entra por escolha, aqui.
  if (!timeline) {
    return (
      <div className="step">
        <header className="step__head">
          <h2 className="step__title">Os momentos de vocês</h2>
          <p className="step__lede">
            A história em datas, do primeiro encontro até hoje. Opcional — a
            página funciona sem.
          </p>
        </header>

        <button
          type="button"
          onClick={() => addBlock("timeline")}
          className="btn-primary"
        >
          <CalendarClock size={16} aria-hidden />
          Adicionar linha do tempo
        </button>
      </div>
    );
  }

  const items = timeline.props.items;

  const escreve = (proximos: typeof items) =>
    patch(timeline.id, { items: proximos });

  const alterar = (index: number, campo: "date" | "title" | "text", valor: string) =>
    escreve(items.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));

  const remover = (index: number) =>
    escreve(items.filter((_, i) => i !== index));

  const adicionar = () =>
    escreve([...items, { date: "", title: "" }]);

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">Os momentos de vocês</h2>
        <p className="step__lede">
          Do primeiro encontro até hoje. Três já contam uma história; não
          precisa lembrar de tudo.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="step__empty">
          Nenhum momento ainda. Comece pelo dia em que tudo começou.
        </p>
      ) : null}

      <ol className="moments">
        {items.map((item, index) => (
          <li key={index} className="moment">
            <div className="moment__grid">
              <Field label="Quando" value={item.date} maxLength={40}>
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    value={item.date}
                    maxLength={40}
                    placeholder="março de 2019"
                    onChange={(e) => alterar(index, "date", e.target.value)}
                    className="input"
                  />
                )}
              </Field>

              <Field label="O que foi" value={item.title} maxLength={60}>
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    value={item.title}
                    maxLength={60}
                    placeholder="o primeiro encontro"
                    onChange={(e) => alterar(index, "title", e.target.value)}
                    className="input"
                  />
                )}
              </Field>
            </div>

            <Field
              label="Detalhe (opcional)"
              value={item.text ?? ""}
              maxLength={400}
            >
              {(props) => (
                <textarea
                  {...props}
                  value={item.text ?? ""}
                  maxLength={400}
                  rows={2}
                  placeholder="Choveu e a gente não tinha guarda-chuva."
                  onChange={(e) => alterar(index, "text", e.target.value)}
                  className="input input--area"
                />
              )}
            </Field>

            <button
              type="button"
              onClick={() => remover(index)}
              className="moment__remove"
            >
              <Trash2 size={14} aria-hidden />
              Remover este momento
            </button>
          </li>
        ))}
      </ol>

      {items.length < MAX ? (
        <button type="button" onClick={adicionar} className="btn-quiet">
          <Plus size={16} aria-hidden />
          Adicionar momento
        </button>
      ) : (
        <p className="step__ok">
          Cheguei no limite de {MAX} momentos. Já é uma bela história.
        </p>
      )}

      {/* Uma linha do tempo vazia impede a publicação, então tem que dar para
          tirar — senão a pessoa fica presa num bloco que ela nem quis. */}
      <button
        type="button"
        onClick={() => removeBlock(timeline.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar a linha do tempo da página
      </button>
    </div>
  );
}
