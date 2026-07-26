import { StickyActs } from "@/components/motion/sticky-acts";
import { copy } from "@/lib/copy";

/** "Como funciona" em três atos sticky — SPEC 8.1 seção 5. */
export function HowItWorks() {
  return (
    <section id="como-funciona" className="section">
      <header className="section__head">
        <p className="eyebrow">{copy.how.eyebrow}</p>
        <h2 className="section__title">{copy.how.title}</h2>
        <p className="section__lede">{copy.how.lede}</p>
      </header>

      <StickyActs acts={[...copy.how.acts]} />
    </section>
  );
}
