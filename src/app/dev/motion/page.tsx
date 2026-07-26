import type { Metadata } from "next";

import { MotionLab } from "@/components/dev/motion-lab";

export const metadata: Metadata = {
  title: "Laboratório de motion",
  robots: { index: false, follow: false },
};

/**
 * Aceite da Fase 1 (SPEC 13): demonstra cada hook e cada componente da camada
 * de motion, e prova que existe um único listener de scroll e um único de
 * pointer no documento inteiro.
 *
 * Página de desenvolvimento — não entra no funil e não é indexada.
 */
export default function MotionLabPage() {
  return <MotionLab />;
}
