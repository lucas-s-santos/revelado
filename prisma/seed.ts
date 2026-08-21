/**
 * Seed — SPEC Fase 0: templates e planos.
 * Idempotente: roda quantas vezes quiser (upsert por id).
 *
 * As ocasiões saíram junto com o pivô para casais: o produto é um só, então o
 * que sobra de catálogo são os templates, que agora são globais.
 */
import { PrismaClient } from "@prisma/client";

import { PLANS } from "../src/lib/plans";
import { TEMPLATES } from "../src/lib/templates";

const prisma = new PrismaClient();

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

  for (const template of TEMPLATES) {
    const data = {
      name: template.name,
      previewUrl: template.previewUrl,
      preset: { theme: template.preset },
      planRequired: template.planRequired,
      order: template.order,
      active: true,
    };

    await prisma.template.upsert({
      where: { id: template.id },
      update: data,
      create: { id: template.id, ...data },
    });
  }
  console.log(`✓ ${TEMPLATES.length} templates`);
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
