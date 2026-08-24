"use client";

/**
 * A linha da contagem regressiva. Folha cliente do CTA final — é a única coisa
 * ali que precisa de relógio, então é a única que vira `"use client"`
 * (CLAUDE.md regra 4).
 *
 * O prazo é a data real do próximo Dia dos Namorados, resolvida no servidor e
 * passada como prop: nada de contador que reinicia sozinho, e nada de número
 * piscando na hidratação.
 */
import { useCountdown } from "@/hooks/use-countdown";

export function CountdownLine({
  deadline,
  label,
  dateLabel,
  now,
}: {
  /** ISO da data-alvo */
  deadline: string;
  label: string;
  dateLabel: string;
  /** Date.now() do servidor */
  now: number;
}) {
  const { days, hours, minutes, seconds, done } = useCountdown(deadline, now);

  if (done) return null;

  return (
    <p data-numeric className="final-cta__countdown">
      {label} em {days}d {String(hours).padStart(2, "0")}h{" "}
      {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
      {/* Herda a cor de quem a contém: esta linha vive no cartão rosa e
          também já viveu sobre creme. Fixar a tinta aqui deixaria ela
          ilegível num dos dois. */}
      <span className="block text-xs opacity-75">
        {dateLabel} — dá tempo de imprimir
      </span>
    </p>
  );
}
