"use client";

import { useState } from "react";

/**
 * Copiar o link da página — SPEC 8.7.
 *
 * A URL é montada no cliente para funcionar igual em localhost, preview e
 * produção sem depender de variável de ambiente configurada certo.
 */
export function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const shown = `/p/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${shown}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="detail__link">
      <code>{shown}</code>
      <button type="button" onClick={() => void copy()} className="btn-quiet">
        {copied ? "copiado" : "copiar"}
      </button>
    </div>
  );
}
