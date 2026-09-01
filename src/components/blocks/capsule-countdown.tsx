"use client";

import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";

import { useCountdown } from "@/hooks/use-countdown";
import { units } from "@/lib/units";

/**
 * O contador da cápsula fechada.
 *
 * Componente separado por um motivo de segurança, não de organização: ele é a
 * **única** parte cliente da cápsula, e recebe só a data. O texto guardado
 * nunca chega até aqui, então nunca entra no payload que o Next serializa no
 * HTML para hidratar. Ver a nota em `capsule-block.tsx`.
 */
export function CapsuleCountdown({
  openAt,
  now,
  quando,
}: {
  openAt: string;
  now?: number;
  /** A data já formatada. Vem pronta do servidor para não duplicar o locale. */
  quando: string;
}) {
  const { days, hours, minutes, seconds, done } = useCountdown(openAt, now);
  const jaPediu = useRef(false);

  /*
   * Chegou a hora: busca a página de novo.
   *
   * Sem isto o contador zeraria e nada aconteceria. O texto não está aqui para
   * ser revelado no cliente, de propósito — quem revela é o servidor, que é o
   * único lado que pode conferir a data sem confiar no relógio de quem abriu.
   *
   * `location.reload` e não `router.refresh`: o segundo exige o contexto do
   * App Router montado, e um bloco tem de renderizar sozinho — é o que o teste
   * do BlockRenderer garante, e ele quebrou quando tentei o router aqui. O
   * recarregamento também é mais seguro contra o ISR da página publicada.
   *
   * O `useRef` evita laço: `done` continua verdadeiro depois da recarga, e
   * sem a trava a página recarregaria para sempre.
   */
  useEffect(() => {
    if (!done || jaPediu.current) return;
    jaPediu.current = true;
    window.location.reload();
  }, [done]);

  return (
    <section className="block-capsule">
      <span aria-hidden className="block-capsule__lacre">
        <Lock size={18} />
      </span>

      <p className="block-capsule__aviso">
        Tem uma coisa aqui que só abre em {quando}.
      </p>

      <p data-numeric className="block-capsule__contador">
        <Unidade valor={days} rotulo={units.daysShort} />
        <Unidade valor={hours} rotulo={units.hoursShort} />
        <Unidade valor={minutes} rotulo={units.minutesShort} />
        <Unidade valor={seconds} rotulo={units.secondsShort} />
      </p>
    </section>
  );
}

function Unidade({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <span className="block-capsule__unidade">
      <strong>{String(valor).padStart(2, "0")}</strong>
      <small>{rotulo}</small>
    </span>
  );
}
