"use client";

import { Field } from "@/components/editor/field";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo 2 — Quando. A data do contador ao vivo (SPEC 8.4).
 *
 * O banco guarda UTC e a tela mostra America/São_Paulo (SPEC 12). O `<input
 * type="date">` fala no fuso local, então a conversão acontece nas duas pontas.
 */
export function StepWhen() {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);

  const counter = findBlock(content, "counter");

  if (!counter) {
    return (
      <div className="step">
        <header className="step__head">
          <h2 className="step__title">Esta página não tem contador</h2>
          <p className="step__lede">
            Tudo bem — nem toda ocasião precisa de um. Siga para as fotos.
          </p>
        </header>
      </div>
    );
  }

  const isSince = counter.props.mode === "since";

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">
          {isSince ? "Desde quando?" : "Para quando?"}
        </h2>
        <p className="step__lede">
          {isSince
            ? "O contador corre sozinho na página, segundo a segundo."
            : "A contagem regressiva aparece ao vivo para quem abrir."}
        </p>
      </header>

      <Field
        label="Data"
        hint={isSince ? "O dia em que tudo começou." : "O grande dia."}
      >
        {(props) => (
          <input
            {...props}
            type="date"
            value={toDateInput(counter.props.date)}
            onChange={(event) => {
              const iso = fromDateInput(event.target.value);
              if (iso) patch(counter.id, { date: iso });
            }}
            className="input"
          />
        )}
      </Field>

      <Field
        label="Como chamar isso"
        hint="Aparece pequenininho acima dos números."
        value={counter.props.label}
        maxLength={40}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={counter.props.label}
            maxLength={40}
            placeholder={isSince ? "juntos há" : "faltam"}
            onChange={(event) =>
              patch(counter.id, { label: event.target.value })
            }
            className="input"
          />
        )}
      </Field>
    </div>
  );
}

/** ISO → "AAAA-MM-DD" no fuso de São Paulo. */
function toDateInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return parts;
}

/** "AAAA-MM-DD" no fuso de São Paulo → ISO em UTC (meia-noite local = 03:00Z). */
function fromDateInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 3, 0, 0),
  );

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
