/**
 * Extrai provedor e id de faixa de uma URL colada.
 *
 * A pessoa cola o que o botão "compartilhar" do app deu — e o que ele dá varia
 * bastante: link com `?si=`, link internacionalizado (`/intl-pt/`), encurtado,
 * URI nativa (`spotify:track:`), embed já pronto. Todos apontam para a mesma
 * faixa, então todos precisam funcionar: mandar a pessoa "limpar o link" é
 * empurrar para ela um trabalho que é nosso.
 *
 * Nada de API (anti-padrão 10 e SPEC 8.8): só o embed oficial, e o id sai do
 * texto por regex. O que sai daqui alimenta `music-block.tsx` direto, então o
 * formato do id tem que ser exatamente o que o iframe espera.
 */

export type MusicProvider = "spotify" | "youtube";

export interface MusicRef {
  provider: MusicProvider;
  trackId: string;
}

/** Id de faixa do Spotify: 22 caracteres base62. */
const SPOTIFY_ID = /([A-Za-z0-9]{22})/;

/** Id de vídeo do YouTube: 11 caracteres, com `-` e `_`. */
const YOUTUBE_ID = /([A-Za-z0-9_-]{11})/;

const SPOTIFY_PATTERNS = [
  // https://open.spotify.com/track/ID   e   /intl-pt/track/ID
  new RegExp(String.raw`open\.spotify\.com/(?:intl-[a-z-]+/)?track/` + SPOTIFY_ID.source),
  // https://open.spotify.com/embed/track/ID
  new RegExp(String.raw`open\.spotify\.com/embed/track/` + SPOTIFY_ID.source),
  // spotify:track:ID
  new RegExp(String.raw`spotify:track:` + SPOTIFY_ID.source),
];

const YOUTUBE_PATTERNS = [
  // youtube.com/watch?v=ID  ·  music.youtube.com/watch?v=ID
  new RegExp(String.raw`youtube\.com/watch\?(?:[^&]*&)*v=` + YOUTUBE_ID.source),
  // youtu.be/ID
  new RegExp(String.raw`youtu\.be/` + YOUTUBE_ID.source),
  // youtube.com/embed/ID  ·  /shorts/ID  ·  /live/ID
  new RegExp(String.raw`youtube\.com/(?:embed|shorts|live)/` + YOUTUBE_ID.source),
];

/**
 * Devolve `null` quando não reconhece — quem chama decide o que dizer. Não
 * lança: entrada torta é o caso comum aqui, não excepcional.
 */
export function parseMusicUrl(input: string): MusicRef | null {
  const text = input.trim();
  if (!text) return null;

  // O grupo capturado é `string | undefined` no modo strict: testar o id em si
  // resolve o tipo e a intenção ao mesmo tempo — casar sem capturar não serve.
  for (const pattern of SPOTIFY_PATTERNS) {
    const id = pattern.exec(text)?.[1];
    if (id) return { provider: "spotify", trackId: id };
  }

  for (const pattern of YOUTUBE_PATTERNS) {
    const id = pattern.exec(text)?.[1];
    if (id) return { provider: "youtube", trackId: id };
  }

  return null;
}

/** A URL pública da faixa — para mostrar de volta o que foi reconhecido. */
export function musicUrl({ provider, trackId }: MusicRef): string {
  return provider === "spotify"
    ? `https://open.spotify.com/track/${trackId}`
    : `https://www.youtube.com/watch?v=${trackId}`;
}

export const MUSIC_PROVIDER_NAMES: Record<MusicProvider, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
};
