import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Mapa — SPEC 7.2 e Fase 7. Onde vocês se conheceram, onde vai ser o grande
 * dia — um pino, não uma aula de geografia.
 *
 * Sem `"use client"`: é um iframe estático, nada aqui reage a nada — mesmo
 * raciocínio do bloco de motivos.
 *
 * OpenStreetMap, não Google Maps: sem chave de API, sem conta, sem cobrança
 * por carregamento — e a licença do embed é aberta (ODbL). O produto já evita
 * dependência paga em tudo o resto; um pino no mapa não merece virar exceção.
 */
export function MapBlock({ props }: { props: PropsOf<"map"> }) {
  // ~1,1km de caixa ao redor do pino — perto o bastante para reconhecer a
  // rua, longe o bastante para não parecer um zoom quebrado.
  const delta = 0.01;
  const bbox = [
    props.lng - delta,
    props.lat - delta,
    props.lng + delta,
    props.lat + delta,
  ].join("%2C");
  const marker = `${props.lat}%2C${props.lng}`;

  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  const openUrl = `https://www.openstreetmap.org/?mlat=${props.lat}&mlon=${props.lng}#map=16/${props.lat}/${props.lng}`;

  return (
    <section className="block-map">
      <h2 className="block-map__label">{props.label}</h2>

      <iframe
        src={embedSrc}
        title={props.label}
        loading="lazy"
        className="block-map__frame"
      />

      <a
        href={openUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block-map__link"
      >
        Abrir no mapa
      </a>
    </section>
  );
}
