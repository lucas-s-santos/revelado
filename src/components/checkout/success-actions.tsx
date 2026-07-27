"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";

/**
 * Ações da tela de sucesso — SPEC 8.6.
 *
 * WhatsApp em primeiro lugar de propósito: é por onde o presente é entregue no
 * Brasil, e cada compartilhamento é distribuição gratuita (SPEC 8.7).
 */
export function SuccessActions({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window === "undefined"
      ? `/p/${slug}`
      : `${window.location.origin}/p/${slug}`;

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `Fiz uma coisa para você: ${url}`,
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      void track("share_clicked", { channel: "copy" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="success__actions">
      <div className="success__link">
        <code>{url}</code>
        <button type="button" onClick={() => void copy()} className="btn-quiet">
          {copied ? "copiado" : "copiar"}
        </button>
      </div>

      <div className="success__buttons">
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void track("share_clicked", { channel: "whatsapp" })}
          className="btn-primary"
        >
          Enviar no WhatsApp
        </a>

        <a href={`/p/${slug}`} className="btn-quiet">
          Ver minha página
        </a>
      </div>

      <div className="success__downloads">
        <p className="eyebrow">para imprimir</p>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/qr/${slug}?formato=pdf`}
            onClick={() => void track("qr_downloaded", { format: "pdf" })}
            className="chip"
          >
            <span>Cartão A6 em PDF</span>
            <small>pronto para imprimir em casa</small>
          </a>

          <a
            href={`/api/qr/${slug}?formato=png`}
            onClick={() => void track("qr_downloaded", { format: "png" })}
            className="chip"
          >
            <span>QR em PNG</span>
            <small>2048px</small>
          </a>

          <a
            href={`/api/qr/${slug}?formato=svg`}
            onClick={() => void track("qr_downloaded", { format: "svg" })}
            className="chip"
          >
            <span>QR em SVG</span>
            <small>vetorial, para gráfica</small>
          </a>
        </div>

        <p className="success__print-hint">
          Imprima em papel comum e teste com a câmera antes de presentear. O
          código aguenta dobra e amassado, mas não borrão de tinta.
        </p>
      </div>

      <p className="sr-only">Página criada: {title}</p>
    </div>
  );
}
