"use client";

import { useEffect } from "react";

/**
 * Registro de visita — SPEC 8.8: "de forma agregada e **assíncrona, sem
 * bloquear o render**".
 *
 * Por isso é `sendBeacon` dentro de um efeito, e não uma escrita no Server
 * Component: a página publicada é estática com ISR e precisa de LCP abaixo de
 * 1,5s em 4G (SPEC 10). Contar visita no render custaria uma ida ao banco em
 * cada abertura e mataria o cache de rota — o oposto do que a página mais
 * importante do sistema precisa.
 *
 * `sendBeacon` também é o único jeito de a contagem sobreviver a quem abre e
 * fecha na mesma respiração: o navegador entrega o pedido mesmo com a aba já
 * fechando, coisa que um `fetch` comum perde.
 *
 * Um registro por aba (`sessionStorage`): recarregar não infla o número, mas
 * voltar dias depois conta de novo, que é o comportamento esperado de "quantas
 * vezes abriram minha página".
 */
export function ViewBeacon({ siteId }: { siteId: string }) {
  useEffect(() => {
    const key = `revelado_visto_${siteId}`;

    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Navegador em modo restrito: conta mesmo assim, é melhor que não contar.
    }

    const url = `/api/sites/${encodeURIComponent(siteId)}/view`;

    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url);
      return;
    }

    void fetch(url, { method: "POST", keepalive: true }).catch(() => {
      // Visita não contada não é erro que a pessoa que recebeu o presente
      // precise ver. O dado é agregado; perder um ponto não muda nada.
    });
  }, [siteId]);

  return null;
}
