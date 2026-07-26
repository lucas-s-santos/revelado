"use client";

import { useEffect } from "react";

import { track, type AnalyticsEvent, type EventProps } from "@/lib/analytics";

/**
 * Dispara um evento do funil ao montar — SPEC 14.
 *
 * Componente-folha sem children: quem usa continua Server Component
 * (SPEC 12 regra 4). Sem chave do PostHog, é no-op.
 */
export function TrackView({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: EventProps;
}) {
  useEffect(() => {
    void track(event, props);
    // Uma vez por montagem: o funil conta visita, não re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
