/**
 * Seed — SPEC Fase 0: ocasiões, templates e planos.
 * Idempotente: roda quantas vezes quiser (upsert por id).
 *
 * Ocasiões, planos e templates vêm todos de `src/lib/`: o app precisa deles sem
 * banco configurado, então o código é a fonte de verdade e o banco é a cópia.
 * Este arquivo não inventa nenhum dos três.
 *
 * `defaultBlocks` ainda monta o JSON à mão porque o `Occasion.defaultBlocks` do
 * banco é o que o admin vai editar sem deploy (SPEC 8.9) — é uma cópia que pode
 * divergir de propósito, ao contrário dos templates.
 */
import { type Prisma, PrismaClient } from "@prisma/client";

import { OCCASIONS, type OccasionId } from "../src/lib/occasions";
import { PLANS } from "../src/lib/plans";
import { templatesFor } from "../src/lib/templates";

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
      // O preset é só o tema: os blocos vêm da ocasião (ver lib/templates.ts).
      const preset: Prisma.InputJsonObject = {
        theme: {
          template: template.id,
          palette: occasion.id,
          font: template.font,
          effect: template.effect,
        },
      };

      // `previewUrl` fica vazio de propósito: a SPEC 8.3 pede preview real, e
      // ele é o próprio BlockRenderer dentro do PhoneFrame. A coluna existe no
      // schema e some quando a Fase 7 revisar o model.
      const data = {
        occasionId: occasion.id,
        name: template.name,
        previewUrl: "",
        preset,
        planRequired: template.planRequired,
      };

      await prisma.template.upsert({
        where: { id: template.id },
        update: data,
        create: { id: template.id, ...data },
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
