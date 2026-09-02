import { MoodCard } from "@/components/marketing/mood-card";
import { copy } from "@/lib/copy";

/**
 * Três cenas de clima — geradas em vídeo, nunca autoplay.
 *
 * Não é depoimento nem prova social: são planos-detalhe de objetos (a tela do
 * celular, uma pilha de foto, o cartão do QR), sem rosto e sem gente nenhuma.
 * O rótulo "cena ilustrativa" segue a mesma palavra que a seção `Testimonials`
 * já usa — é a expressão que este site reserva para "isto é ilustração, não
 * retrato de alguém real" (CLAUDE.md, e o comentário de `testimonials.tsx`
 * explica o porquê da distinção importar).
 *
 * Cada cartão nasce como pôster estático; o `<video>` só entra no DOM depois
 * do toque (ver `MoodCard`). Três vídeos de ~2,5-3,5 MB cada não podem pesar
 * no carregamento de quem só está lendo a página — e um vídeo tocando sem
 * pedido é o tipo de motion ambiental que a regra 14 do CLAUDE.md proíbe.
 *
 * Server Component: a interação de tocar/pausar mora inteira em `MoodCard`.
 */
export function MoodReel() {
  return (
    <section className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.mood.eyebrow}</p>
        <h2 className="section__title">{copy.mood.title}</h2>
        <p className="section__lede">{copy.mood.lede}</p>
      </header>

      <ul className="mood-grid">
        {copy.mood.items.map((item) => (
          <li key={item.id}>
            <MoodCard id={item.id} tag={item.tag} demoLabel={copy.mood.demoLabel} />
          </li>
        ))}
      </ul>
    </section>
  );
}
