"use client";

import { Music, Trash2 } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/editor/field";
import { MUSIC_PROVIDER_NAMES, musicUrl, parseMusicUrl } from "@/lib/music";
import { Pular } from "@/components/editor/pular";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo de música — SPEC 8.4 e 8.8.
 *
 * O bloco de música existia e renderizava desde a fase 3, mas não havia passo
 * nenhum para preenchê-lo: quem montava a página não tinha como escolher a
 * faixa. Este passo fecha esse buraco.
 *
 * A pessoa cola o link do jeito que o botão "compartilhar" deu — com `?si=`,
 * internacionalizado, encurtado — e `lib/music.ts` extrai o id. Mandar
 * "limpar o link" seria empurrar para ela um trabalho que é nosso.
 *
 * Nada de API: só embed oficial (anti-padrão 10). E nada de autoplay — o
 * bloco só carrega o iframe depois do clique, por política do navegador, então
 * um controle de "tocar sozinho" aqui seria promessa falsa.
 */
export function StepMusic() {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const music = findBlock(content, "music");

  // Começa com o que já está salvo, reconstruído em URL: a pessoa vê o que
  // escolheu antes em vez de um campo vazio que parece perda de trabalho.
  const [raw, setRaw] = useState(() =>
    music?.props.trackId
      ? musicUrl({
          provider: music.props.provider,
          trackId: music.props.trackId,
        })
      : "",
  );

  // Texto do campo separado do número salvo: enquanto a pessoa digita "1:" o
  // valor ainda não é um tempo válido, e reescrever o campo a cada tecla
  // arrancaria o cursor do lugar.
  const [tempo, setTempo] = useState(() =>
    paraTexto(music?.props.startSec ?? 0),
  );

  // O bloco não vem no rascunho novo: é opcional, e este é o lugar de ligá-lo.
  // Antes daqui a tela era um beco sem saída — dizia que a página não tinha
  // música e não oferecia jeito nenhum de ter.
  if (!music) {
    return (
      <div className="step">
        <header className="step__head">
          <h2 className="step__title">Qual é a música de vocês?</h2>
          <p className="step__lede">
            Toda página fica melhor com a faixa certa. Mas é opcional — dá para
            pular sem perder nada.
          </p>
        </header>

        <button
          type="button"
          onClick={() => addBlock("music")}
          className="btn-primary"
        >
          <Music size={16} aria-hidden />
          Adicionar música
        </button>

        <Pular texto="continuar sem música" />
      </div>
    );
  }

  const parsed = parseMusicUrl(raw);

  const sujo = raw.trim().length > 0;
  const erro =
    sujo && !parsed
      ? "Não reconheci esse link. Cole o endereço de uma faixa do Spotify ou de um vídeo do YouTube."
      : undefined;

  function aoTrocarTempo(valor: string) {
    setTempo(valor);
    if (!music) return;
    patch(music.id, { startSec: paraSegundos(valor) });
  }

  function aoDigitar(valor: string) {
    setRaw(valor);

    const ref = parseMusicUrl(valor);
    if (!ref || !music) return;

    patch(music.id, { provider: ref.provider, trackId: ref.trackId });
  }

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">Qual é a música de vocês?</h2>
        <p className="step__lede">
          Ela não toca sozinha: quem abrir aperta o play. É assim que todo
          navegador funciona hoje.
        </p>
      </header>

      <Field
        label="Link da música"
        hint="Cole do jeito que veio do Spotify ou do YouTube. Eu acho o resto."
        error={erro}
      >
        {(props) => (
          <input
            {...props}
            type="url"
            inputMode="url"
            value={raw}
            placeholder="https://open.spotify.com/track/…"
            onChange={(event) => aoDigitar(event.target.value)}
            className="input"
          />
        )}
      </Field>

      {parsed ? (
        <p className="step__ok">
          Achei uma faixa do {MUSIC_PROVIDER_NAMES[parsed.provider]}. Ouça no
          celular ao lado.
        </p>
      ) : null}

      {/*
        "Começar em" só no YouTube, e não por preguiça.
        O embed do YouTube aceita `start` na própria URL. O do Spotify não tem
        parâmetro equivalente: a IFrame API deles até expõe `startAt`, mas
        exige carregar o SDK de terceiro, que este projeto não faz. Mostrar o
        campo para o Spotify seria oferecer um controle que não controla nada.
      */}
      {parsed?.provider === "youtube" ? (
        <Field
          label="Começar em"
          hint="Minutos e segundos, como 1:12. O refrão certo muda tudo."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="numeric"
              value={tempo}
              placeholder="0:00"
              onChange={(event) => aoTrocarTempo(event.target.value)}
              className="input"
            />
          )}
        </Field>
      ) : null}

      {parsed?.provider === "spotify" ? (
        <p className="step__hint">
          O player do Spotify sempre começa do início — não dá para escolher o
          trecho. Se o refrão importa, use o link do YouTube.
        </p>
      ) : null}

      {!sujo ? (
        <p className="step__empty">
          Nenhuma música ainda. Escolha a que tocava quando vocês se conheceram.
        </p>
      ) : null}

      {/* Sai pelo mesmo lugar por onde entrou. Sem isto, um bloco de música
          vazio impediria a publicação e não haveria como desfazer. */}
      <button
        type="button"
        onClick={() => removeBlock(music.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar a música da página
      </button>
    </div>
  );
}

/** "1:12" e "72" viram 72. Entrada torta vira 0 — não é erro, é campo vazio. */
function paraSegundos(texto: string): number {
  const partes = texto.split(":").map((parte) => parte.trim());
  const numeros = partes.map((parte) => Number(parte.replace(/[^0-9]/g, "")));
  if (numeros.some((n) => Number.isNaN(n))) return 0;

  const total =
    numeros.length === 2
      ? (numeros[0] ?? 0) * 60 + (numeros[1] ?? 0)
      : (numeros[0] ?? 0);

  // Mesmo teto do schema: passar disso seria rejeitado no autosave.
  return Math.min(Math.max(total, 0), 3600);
}

/** 72 vira "1:12". Zero vira campo vazio, e não "0:00" pedindo para ser apagado. */
function paraTexto(segundos: number): string {
  if (segundos <= 0) return "";
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(segundos % 60).padStart(2, "0")}`;
}
