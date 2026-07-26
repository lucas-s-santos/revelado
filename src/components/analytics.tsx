"use client";

import { useEffect } from "react";

import { ANALYTICS_ENABLED, POSTHOG_HOST, POSTHOG_KEY } from "@/lib/analytics";

/**
 * Inicializa o PostHog. Componente-folha que não renderiza nada e não recebe
 * children — assim o layout continua Server Component (SPEC 12 / regra 4).
 * Sem NEXT_PUBLIC_POSTHOG_KEY, não carrega nada.
 */
export function Analytics() {
  useEffect(() => {
    const key = POSTHOG_KEY;
    if (!ANALYTICS_ENABLED || !key) return;
    let cancelled = false;

    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(key, {
        api_host: POSTHOG_HOST,
        // Pageview em troca de rota do App Router, sem hook de searchParams.
        defaults: "2025-05-24",
        capture_pageleave: true,
        person_profiles: "identified_only",
        persistence: "localStorage+cookie",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
