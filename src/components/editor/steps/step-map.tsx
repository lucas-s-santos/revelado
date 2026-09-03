"use client";

import { LocateFixed, MapPinPlus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/editor/field";
import { Pular } from "@/components/editor/pular";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo do mapa — Fase 7 / SPEC 7.2.
 *
 * Sem geocodificação de endereço: pedir "digite o endereço" e traduzir para
 * coordenadas puxaria um serviço de terceiro (com chave, com limite, com
 * custo) só para um pino. O jeito mais curto até um número certo é o que a
 * pessoa já tem no bolso: `navigator.geolocation`, de graça, sem conta em
 * lugar nenhum — parada onde o lugar é (a igreja, o restaurante do primeiro
 * encontro), um toque preenche sozinho.
 *
 * Quem prefere digitar direto também pode: os dois campos de número aceitam
 * a coordenada copiada do Google Maps (toque e segure num ponto → aparece
 * embaixo, toca para copiar).
 */
export function StepMap({ aninhado = false }: { aninhado?: boolean } = {}) {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const map = findBlock(content, "map");

  if (!map) {
    return (
      <div className="step">
        {aninhado ? null : (
          <header className="step__head">
            <h2 className="step__title">Um lugar no mapa?</h2>
            <p className="step__lede">
              Onde vocês se conheceram, onde vai ser o grande dia — um pino
              conta mais do que parece.
            </p>
          </header>
        )}

        <button
          type="button"
          onClick={() => addBlock("map")}
          className="btn-primary"
        >
          <MapPinPlus size={16} aria-hidden />
          Adicionar mapa
        </button>

        {aninhado ? null : <Pular texto="continuar sem o mapa" />}
      </div>
    );
  }

  function usarLocalizacaoAtual() {
    if (!map) return;
    if (!("geolocation" in navigator)) {
      setLocateError("Este navegador não sabe onde você está.");
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        patch(map.id, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocateError("Não deu para pegar sua localização. Digite as coordenadas.");
        setLocating(false);
      },
      { timeout: 10_000 },
    );
  }

  return (
    <div className="step">
      {aninhado ? null : (
        <header className="step__head">
          <h2 className="step__title">O lugar</h2>
          <p className="step__lede">
            Toque em &quot;usar minha localização&quot; parado onde é, ou
            digite a coordenada copiada do Google Maps.
          </p>
        </header>
      )}

      <Field label="Legenda do pino" value={map.props.label} maxLength={60}>
        {(fieldProps) => (
          <input
            {...fieldProps}
            type="text"
            value={map.props.label}
            maxLength={60}
            placeholder="onde nos conhecemos"
            onChange={(event) => patch(map.id, { label: event.target.value })}
            className="input"
          />
        )}
      </Field>

      <button
        type="button"
        onClick={usarLocalizacaoAtual}
        disabled={locating}
        className="btn-quiet"
      >
        <LocateFixed size={14} aria-hidden />
        {locating ? "Localizando…" : "Usar minha localização"}
      </button>

      {locateError ? (
        <p role="alert" className="field__error">
          {locateError}
        </p>
      ) : null}

      <div className="mapa-coords">
        <div className="field">
          <label htmlFor="map-lat" className="field__label">
            Latitude
          </label>
          <input
            id="map-lat"
            type="number"
            step="any"
            value={map.props.lat}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isNaN(value)) patch(map.id, { lat: value });
            }}
            className="input"
          />
        </div>

        <div className="field">
          <label htmlFor="map-lng" className="field__label">
            Longitude
          </label>
          <input
            id="map-lng"
            type="number"
            step="any"
            value={map.props.lng}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isNaN(value)) patch(map.id, { lng: value });
            }}
            className="input"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeBlock(map.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar o mapa da página
      </button>
    </div>
  );
}
