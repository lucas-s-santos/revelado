import { Link2, Music, QrCode } from "lucide-react";
import type { ComponentType } from "react";

import { copy } from "@/lib/copy";

/**
 * Como a página chega — SPEC 8.1 seção 9.
 *
 * Aqui havia três depoimentos: citação, nome e atribuição. As pessoas não
 * existiam. Depoimento inventado não é copy, é alegação falsa — e o lugar
 * dele numa landing é justamente o de convencer, o que torna a invenção pior,
 * não mais inofensiva.
 *
 * As cenas que ficaram fazem o mesmo trabalho emocional sem afirmar que
 * alguém disse algo, e ainda explicam os três modos de entrega do produto:
 * QR impresso, link e a música. O rótulo diz na cara que são ilustração.
 *
 * Quando houver depoimento real, com permissão de quem falou, ele entra com
 * nome de verdade e a seção troca de rótulo.
 *
 * Server Component: não há estado nem evento aqui.
 */

const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  qr: QrCode,
  link: Link2,
  musica: Music,
};

export function Testimonials() {
  return (
    <section className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.testimonials.eyebrow}</p>
        <h2 className="section__title">{copy.testimonials.title}</h2>
        <p className="section__lede">{copy.testimonials.lede}</p>
      </header>

      <ul className="scene-grid">
        {copy.testimonials.items.map((item) => {
          const Icon = ICONS[item.id];

          return (
            <li key={item.id} className="scene">
              <p className="scene__tag">
                <span aria-hidden className="scene__icon">
                  {Icon ? <Icon size={15} /> : null}
                </span>
                {item.tag}
              </p>

              <p className="scene__text">{item.scene}</p>

              <p className="scene__note">{copy.testimonials.demoLabel}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
