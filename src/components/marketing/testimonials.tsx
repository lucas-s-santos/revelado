import { SpotlightCard } from "@/components/motion/spotlight-card";
import { copy } from "@/lib/copy";

/** Prova social — SPEC 8.1 seção 9: três depoimentos em SpotlightCard. */
export function Testimonials() {
  return (
    <section className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.testimonials.eyebrow}</p>
        <h2 className="section__title">{copy.testimonials.title}</h2>
      </header>

      <ul className="grid gap-4 md:grid-cols-3">
        {copy.testimonials.items.map((item) => (
          <li key={item.author}>
            <SpotlightCard className="h-full p-6">
              <figure className="flex h-full flex-col gap-4">
                <blockquote className="text-[1.05rem] leading-relaxed">
                  “{item.quote}”
                </blockquote>

                <figcaption className="mt-auto">
                  <span className="block font-medium">{item.author}</span>
                  <span className="eyebrow">{item.detail}</span>
                </figcaption>
              </figure>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
