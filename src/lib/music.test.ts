import { describe, expect, it } from "vitest";

import { musicUrl, parseMusicUrl } from "@/lib/music";

/**
 * Cada caso aqui é uma forma que o botão "compartilhar" produz de verdade.
 * Se um deles quebrar, a pessoa cola um link legítimo e ouve que ele é
 * inválido — que é o pior erro possível neste passo.
 */
describe("Spotify", () => {
  it("aceita o link normal", () => {
    expect(parseMusicUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toEqual({
      provider: "spotify",
      trackId: "4cOdK2wGLETKBW3PvgPWqT",
    });
  });

  it("aceita o link com ?si= que o app cola", () => {
    expect(
      parseMusicUrl("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123def456"),
    ).toEqual({ provider: "spotify", trackId: "4cOdK2wGLETKBW3PvgPWqT" });
  });

  it("aceita o link internacionalizado", () => {
    expect(
      parseMusicUrl("https://open.spotify.com/intl-pt/track/4cOdK2wGLETKBW3PvgPWqT"),
    ).toEqual({ provider: "spotify", trackId: "4cOdK2wGLETKBW3PvgPWqT" });
  });

  it("aceita a URI nativa do app", () => {
    expect(parseMusicUrl("spotify:track:4cOdK2wGLETKBW3PvgPWqT")).toEqual({
      provider: "spotify",
      trackId: "4cOdK2wGLETKBW3PvgPWqT",
    });
  });
});

describe("YouTube", () => {
  it("aceita o watch?v=", () => {
    expect(parseMusicUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      trackId: "dQw4w9WgXcQ",
    });
  });

  it("aceita o encurtado", () => {
    expect(parseMusicUrl("https://youtu.be/dQw4w9WgXcQ?t=42")).toEqual({
      provider: "youtube",
      trackId: "dQw4w9WgXcQ",
    });
  });

  it("aceita o v= depois de outro parâmetro", () => {
    expect(parseMusicUrl("https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      trackId: "dQw4w9WgXcQ",
    });
  });

  it("aceita music.youtube.com", () => {
    expect(parseMusicUrl("https://music.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      trackId: "dQw4w9WgXcQ",
    });
  });
});

describe("entrada que não serve", () => {
  it.each(["", "   ", "oi", "https://example.com/musica", "https://open.spotify.com/album/4cOdK2wGLETKBW3PvgPWqT"])(
    "devolve null para %j",
    (entrada) => {
      expect(parseMusicUrl(entrada)).toBeNull();
    },
  );

  it("não confunde álbum com faixa", () => {
    // Mesmo formato de id, caminho diferente: álbum não toca no bloco de faixa.
    expect(parseMusicUrl("https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3")).toBeNull();
  });
});

describe("volta para URL", () => {
  it("reconstrói o link do Spotify", () => {
    expect(musicUrl({ provider: "spotify", trackId: "4cOdK2wGLETKBW3PvgPWqT" })).toBe(
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    );
  });

  it("fecha o ciclo: o que sai volta a entrar", () => {
    const ref = { provider: "youtube", trackId: "dQw4w9WgXcQ" } as const;
    expect(parseMusicUrl(musicUrl(ref))).toEqual(ref);
  });
});
