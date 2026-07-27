/**
 * Cloudflare R2 — SPEC 2 e 9.1.
 *
 * "Upload direto do browser, nunca pelo servidor": o servidor só assina a URL.
 * Isso mantém o request curto e não passa 20 fotos de 5MB por dentro da função
 * (SPEC 8.4 e anti-padrão 8).
 *
 * Sem credencial configurada, o app cai num modo de desenvolvimento que grava
 * em `.drafts/media/` — dá para montar a página inteira sem conta na Cloudflare.
 * Em produção isso não acontece: `assertR2Configured` derruba o deploy.
 */

export const R2_CONFIGURED = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET,
);

/**
 * O armazenamento local de mídia pode ser usado?
 *
 * Não dá para decidir isso por `NODE_ENV`: `pnpm start` na sua máquina roda em
 * `production` e é indistinguível de um deploy. O que separa de verdade é onde
 * o processo está — na Vercel, o disco é efêmero e gravar nele significaria
 * perder as fotos no próximo deploy, então lá o modo local nunca liga.
 */
export const LOCAL_MEDIA_ENABLED = !R2_CONFIGURED && !process.env.VERCEL;

/** Tipos aceitos no upload (SPEC 9.1: valida mime, tamanho e cota). */
export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * Teto do que chega ao servidor. O browser comprime para ~300KB antes de subir
 * (SPEC 8.4); 4MB é folga para foto que comprime mal, não licença para original.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function isAcceptedMime(mime: string): boolean {
  return (ACCEPTED_MIME as readonly string[]).includes(mime);
}

/**
 * Chave no bucket. Prefixada pelo rascunho, para apagar tudo de uma vez quando
 * a pessoa exercer o direito de exclusão (SPEC 9.4).
 *
 * **Sem extensão de propósito.** O `SiteContent` guarda só o `mediaId`, e a URL
 * precisa ser derivável dele sem consultar o banco nem adivinhar formato — o
 * tipo do arquivo viaja no `content-type`, que é onde ele deveria estar.
 */
export function mediaKey(draftId: string, mediaId: string): string {
  return `sites/${draftId}/${mediaId}`;
}

/**
 * URL assinada de PUT. Só monta o cliente S3 quando há credencial — assim o
 * `@aws-sdk` nem é carregado em desenvolvimento.
 */
export async function signUploadUrl(
  key: string,
  mime: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: mime,
    }),
    { expiresIn: expiresInSeconds },
  );
}

/** URL pública de leitura da mídia. */
export function publicUrlFor(key: string): string {
  if (!R2_CONFIGURED) return `/api/media/${key}`;

  const host = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;
  return host ? `https://${host}/${key}` : `/api/media/${key}`;
}

export function assertR2Configured(): void {
  if (!R2_CONFIGURED && process.env.VERCEL) {
    throw new Error(
      "R2 não configurado em produção. Preencha R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET.",
    );
  }
}
