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
 * o processo está — num servidor hospedado o disco é efêmero, e gravar nele
 * significaria perder as fotos no próximo deploy.
 *
 * A lista cobre os hosts que marcam presença por variável de ambiente. Antes
 * olhava só para a Vercel, o que deixava a rota de gravação em disco aberta em
 * qualquer outro lugar (Railway, Fly, Render, Cloud Run, um VPS em container).
 */
const HOSTED = Boolean(
  process.env.VERCEL ||
  process.env.RENDER ||
  process.env.FLY_APP_NAME ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.K_SERVICE ||
  process.env.AWS_EXECUTION_ENV,
);

export const LOCAL_MEDIA_ENABLED = !R2_CONFIGURED && !HOSTED;

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
  if (!R2_CONFIGURED && HOSTED) {
    throw new Error(
      "R2 não configurado em produção. Preencha R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET.",
    );
  }
}

/**
 * Cliente S3 do R2. Só é montado quando há credencial, e cada chamada monta o
 * seu — o `@aws-sdk` não entra no bundle de quem nunca assina nada.
 */
async function r2Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");

  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

/**
 * URL assinada de **leitura** — SPEC 9.4 ("storage privado com URL assinada").
 *
 * Existe para quando o bucket for fechado. Hoje a leitura passa pelo host
 * público (`publicUrlFor`), o que exige o bucket aberto: as chaves não são
 * adivinháveis, mas uma URL que vaze vale para sempre, inclusive depois da
 * página expirar.
 *
 * O prazo tem que ser **maior** que o `revalidate` da página publicada (1h),
 * senão o HTML em cache serve links já vencidos. Por isso o padrão é 2h.
 */
export async function signReadUrl(
  key: string,
  expiresInSeconds = 7200,
): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  return getSignedUrl(
    await r2Client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

/**
 * Apaga todas as mídias de um site — SPEC 9.4: "direito de exclusão apagando
 * também o R2".
 *
 * Sem isto, apagar a página deixava as fotos no bucket para sempre: o banco
 * usava soft delete e nada tocava no storage. As chaves são prefixadas pelo id
 * do site (ver `mediaKey`) exatamente para esta varredura ser possível.
 *
 * Devolve quantos objetos saíram, para o log de exclusão ter número.
 */
export async function deleteSiteMedia(siteId: string): Promise<number> {
  if (!R2_CONFIGURED) return 0;

  const { ListObjectsV2Command, DeleteObjectsCommand } =
    await import("@aws-sdk/client-s3");

  const client = await r2Client();
  const prefix = `sites/${siteId}/`;
  let removed = 0;
  let token: string | undefined;

  // Lista em páginas: um site do plano maior tem 60 fotos, mas o contrato do S3
  // é de 1000 por página e depender disso é como deixar a conta pela metade.
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        Prefix: prefix,
        ...(token ? { ContinuationToken: token } : {}),
      }),
    );

    const keys = (listed.Contents ?? []).flatMap((object) =>
      object.Key ? [{ Key: object.Key }] : [],
    );

    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET,
          Delete: { Objects: keys },
        }),
      );
      removed += keys.length;
    }

    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);

  return removed;
}
