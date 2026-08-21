import { Footer } from "@/components/chrome/footer";
import { Nav } from "@/components/chrome/nav";
import { PromoBar } from "@/components/chrome/promo-bar";
import { ScrollProgress } from "@/components/chrome/scroll-progress";
import { BlocksGrid } from "@/components/marketing/blocks-grid";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PhoneShowcase } from "@/components/marketing/phone-showcase";
import { Pricing } from "@/components/marketing/pricing";
import { Reaction } from "@/components/marketing/reaction";
import { Revelation } from "@/components/marketing/revelation";
import { Testimonials } from "@/components/marketing/testimonials";
import { Safelight } from "@/components/motion/safelight";
import { TrackView } from "@/components/track-view";
import { formatCelebrationDate, nextCelebration } from "@/lib/promo";

/**
 * Landing — SPEC 8.1, as 12 seções na ordem.
 *
 * Server Component. As datas são resolvidas aqui e descem como props: o
 * servidor e o cliente calculam o mesmo primeiro valor, sem número piscando na
 * hidratação (SPEC 8.1: sem CLS).
 *
 * Efeitos ambientais: a safelight vale para a página, e a foto revelada fica só
 * no hero — teto de dois por dobra (SPEC 6.1).
 */

// ISR de 1 hora: a contagem regressiva é do cliente, o HTML pode ser cacheado.
export const revalidate = 3600;

export default function Home() {
  const now = Date.now();
  const celebration = nextCelebration(new Date(now));

  // Contador de demonstração do mockup: uma data redonda e verossímil.
  const counterSince = new Date(
    Date.UTC(new Date(now).getUTCFullYear() - 4, 5, 12, 24 - 3),
  ).toISOString();

  return (
    <>
      <TrackView event="landing_view" />
      <ScrollProgress />
      <Safelight />

      <PromoBar
        deadline={celebration.date.toISOString()}
        label={celebration.label}
        dateLabel={formatCelebrationDate(celebration.date)}
        now={now}
      />
      <Nav />

      <main id="conteudo">
        <Hero pagesCreated={1482} />
        <PhoneShowcase since={counterSince} now={now} />
        <Revelation />
        <Reaction />
        <BlocksGrid />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta
          deadline={celebration.date.toISOString()}
          label={celebration.label}
          dateLabel={formatCelebrationDate(celebration.date)}
          now={now}
        />
      </main>

      <Footer />
    </>
  );
}
