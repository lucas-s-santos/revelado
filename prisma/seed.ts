/**
 * Seed — SPEC Fase 0: ocasiões, templates e planos.
 * Idempotente: roda quantas vezes quiser (upsert por id).
 *
 * Os defaultBlocks/preset aqui são o mínimo viável para o motor de blocos da
 * Fase 3 ter o que ler. Quando `lib/blocks/defaults.ts` existir (Fase 3), este
 * arquivo passa a importar de lá em vez de montar o JSON à mão.
 */
import { type Prisma, PrismaClient } from "@prisma/client";

import { OCCASIONS, type OccasionId } from "../src/lib/occasions";
import { PLANS } from "../src/lib/plans";

const prisma = new PrismaClient();

/** Blocos padrão por ocasião (SiteContent.blocks — SPEC 7.2). */
function defaultBlocks(occasion: OccasionId): Prisma.InputJsonArray {
  const hero: Prisma.InputJsonObject = {
    id: "hero",
    type: "hero",
    props: { title: "Um título aqui", align: "center", overlay: 0.45 },
  };
  const gallery: Prisma.InputJsonObject = {
    id: "gallery",
    type: "gallery",
    props: { layout: "carousel", mediaIds: [] },
  };
  const letter: Prisma.InputJsonObject = {
    id: "letter",
    type: "letter",
    props: { text: "Escreva a sua mensagem aqui.", typewriter: false },
  };
  const footer: Prisma.InputJsonObject = {
    id: "footer",
    type: "footer",
    props: { text: "Feito com carinho" },
  };

  const since: Prisma.InputJsonObject = {
    id: "counter",
    type: "counter",
    props: { mode: "since", label: "juntos há" },
  };
  const until: Prisma.InputJsonObject = {
    id: "counter",
    type: "counter",
    props: { mode: "until", label: "faltam" },
  };
  const timeline: Prisma.InputJsonObject = {
    id: "timeline",
    type: "timeline",
    props: { items: [] },
  };

  switch (occasion) {
    case "namorados":
      return [hero, since, gallery, letter, footer];
    case "aniversario":
      return [hero, until, gallery, letter, footer];
    case "maes":
    case "pais":
      return [hero, gallery, letter, timeline, footer];
    case "casamento":
      return [hero, until, gallery, letter, footer];
    case "bebe":
      return [hero, until, gallery, letter, footer];
    case "natal":
      return [hero, until, gallery, letter, footer];
    case "memorial":
      return [hero, gallery, letter, timeline, footer];
  }
}

/** Um template neutro e um "clássico" por ocasião (SPEC 8.3 pede 6 a 8; o resto
 * entra com os presets de arte da Fase 3). */
function templatesFor(occasion: OccasionId): Array<{
  id: string;
  name: string;
  previewUrl: string;
  planRequired: string | null;
  preset: Prisma.InputJsonObject;
}> {
  return [
    {
      id: `${occasion}-essencial`,
      name: "Essencial",
      previewUrl: `/templates/${occasion}-essencial.webp`,
      planRequired: null,
      preset: {
        theme: {
          template: `${occasion}-essencial`,
          palette: occasion,
          font: "mixed",
          effect: "none",
        },
      },
    },
    {
      id: `${occasion}-revelacao`,
      name: "Revelação",
      previewUrl: `/templates/${occasion}-revelacao.webp`,
      planRequired: "especial",
      preset: {
        theme: {
          template: `${occasion}-revelacao`,
          palette: occasion,
          font: "serif",
          effect: occasion === "namorados" ? "hearts" : "stars",
        },
      },
    },
  ];
}

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        listCents: plan.listCents,
        durationDays: plan.durationDays,
        maxPhotos: plan.maxPhotos,
        features: plan.features,
        active: true,
      },
      create: {
        id: plan.id,
        name: plan.name,
        priceCents: plan.priceCents,
        listCents: plan.listCents,
        durationDays: plan.durationDays,
        maxPhotos: plan.maxPhotos,
        features: plan.features,
      },
    });
  }
  console.log(`✓ ${PLANS.length} planos`);

  let templateCount = 0;
  for (const occasion of OCCASIONS) {
    const data = {
      slug: occasion.slug,
      name: occasion.name,
      accent: occasion.accent,
      icon: occasion.icon,
      order: occasion.order,
      seo: occasion.seo,
      defaultBlocks: defaultBlocks(occasion.id),
      active: true,
    };

    await prisma.occasion.upsert({
      where: { id: occasion.id },
      update: data,
      create: { id: occasion.id, ...data },
    });

    for (const template of templatesFor(occasion.id)) {
      await prisma.template.upsert({
        where: { id: template.id },
        update: {
          occasionId: occasion.id,
          name: template.name,
          previewUrl: template.previewUrl,
          preset: template.preset,
          planRequired: template.planRequired,
        },
        create: { ...template, occasionId: occasion.id },
      });
      templateCount += 1;
    }
  }
  console.log(`✓ ${OCCASIONS.length} ocasiões`);
  console.log(`✓ ${templateCount} templates`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
