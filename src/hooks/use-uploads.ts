"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Upload de fotos — SPEC 8.4.
 *
 * "Comprimir no browser (alvo 1600px / 300KB) → URL assinada → R2 direto. Barra
 * de progresso por arquivo, retry automático."
 *
 * O arquivo nunca passa pelo servidor da aplicação (anti-padrão 8). O progresso
 * usa XHR porque `fetch` ainda não reporta progresso de upload de forma
 * confiável nos navegadores que a gente atende.
 */

export interface UploadItem {
  /** id local, estável durante a vida do item na fila */
  localId: string;
  name: string;
  /** 0..100 */
  progress: number;
  status: "compressing" | "uploading" | "done" | "error";
  /** mediaId definitivo, quando termina */
  mediaId?: string;
  url?: string;
  error?: string;
  /** quantas vezes já tentou */
  attempts: number;
}

const MAX_ATTEMPTS = 3;
const TARGET_MAX_WIDTH = 1600;
const TARGET_MAX_MB = 0.3;

interface SignResponse {
  mediaId: string;
  uploadUrl: string;
  publicUrl: string;
  dev: boolean;
}

export function useUploads(draftId: string, onDone: (mediaId: string) => void) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const counter = useRef(0);
  // O arquivo original fica aqui para o "tentar de novo" funcionar sem pedir
  // que a pessoa escolha a foto outra vez.
  const sourceFiles = useRef(new Map<string, File>());

  const update = useCallback((localId: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }, []);

  const clearDone = useCallback(() => {
    setItems((current) => current.filter((item) => item.status !== "done"));
  }, []);

  const upload = useCallback(
    async (localId: string, file: File) => {
      update(localId, { status: "compressing", progress: 0 });

      let payload: File | Blob = file;
      try {
        const { default: compress } = await import("browser-image-compression");
        payload = await compress(file, {
          maxSizeMB: TARGET_MAX_MB,
          maxWidthOrHeight: TARGET_MAX_WIDTH,
          useWebWorker: true,
          fileType: "image/webp",
        });
      } catch {
        // Compressão falhou (formato exótico, worker bloqueado): sobe o original
        // e deixa a validação de tamanho do servidor decidir.
      }

      const mime = payload.type || file.type || "image/jpeg";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        update(localId, { status: "uploading", attempts: attempt });

        try {
          const signResponse = await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              draftId,
              mime,
              bytes: payload.size,
            }),
          });

          if (!signResponse.ok) {
            const body = (await signResponse.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(body?.error ?? "Não deu para enviar esta foto.");
          }

          const signed = (await signResponse.json()) as SignResponse;

          await putWithProgress(signed.uploadUrl, payload, mime, (progress) =>
            update(localId, { progress }),
          );

          update(localId, {
            status: "done",
            progress: 100,
            mediaId: signed.mediaId,
            url: signed.publicUrl,
          });

          onDone(signed.mediaId);
          return;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Não deu para enviar esta foto.";

          // Erro de validação não melhora tentando de novo.
          const permanent =
            message.includes("Formato") ||
            message.includes("grande demais") ||
            message.includes("limite");

          if (permanent || attempt === MAX_ATTEMPTS) {
            update(localId, { status: "error", error: message });
            return;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** (attempt - 1)),
          );
        }
      }
    },
    [draftId, onDone, update],
  );

  const add = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);

      const created = list.map((file) => {
        counter.current += 1;
        const localId = `up-${counter.current}`;
        sourceFiles.current.set(localId, file);

        return {
          localId,
          name: file.name,
          progress: 0,
          status: "compressing" as const,
          attempts: 0,
        };
      });

      setItems((current) => [...current, ...created]);

      // Um de cada vez: 20 uploads paralelos em 4G derrubam todos.
      void (async () => {
        for (const [index, file] of list.entries()) {
          const item = created[index];
          if (item) await upload(item.localId, file);
        }
      })();
    },
    [upload],
  );

  /** Tenta de novo o mesmo arquivo, sem pedir para escolher outra vez. */
  const retry = useCallback(
    (localId: string) => {
      const file = sourceFiles.current.get(localId);
      if (file) void upload(localId, file);
    },
    [upload],
  );

  return { items, add, retry, clearDone };
}

function putWithProgress(
  url: string,
  body: Blob,
  mime: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", mime);

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("O envio falhou. Vamos tentar de novo."));
    });

    request.addEventListener("error", () =>
      reject(new Error("A conexão caiu no meio do envio.")),
    );
    request.addEventListener("timeout", () =>
      reject(new Error("O envio demorou demais.")),
    );

    request.timeout = 60_000;
    request.send(body);
  });
}
