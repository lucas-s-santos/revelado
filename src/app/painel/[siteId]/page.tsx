import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { CopyLink } from "@/components/painel/copy-link";
import { Logo } from "@/components/chrome/logo";
import { isDraftOwner } from "@/lib/anon";
import { revalidateSite } from "@/lib/cache";
import { deleteSite, getDraft, updateSitePrivacy } from "@/lib/drafts";
import { logDenied } from "@/lib/security-log";
import { hashPassword } from "@/lib/site-password";
import { formatDate } from "@/lib/utils";
import { viewsFor } from "@/lib/views";

export const metadata: Metadata = {
  title: "Minha página",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * `/painel/[siteId]` — SPEC 8.7.
 *
 * "Interface **sóbria** — sem aurora, sem beam, sem partícula." Nada de motion
 * ambiental aqui (regra inviolável 11): quem abre esta tela veio resolver uma
 * coisa específica, não se encantar.
 *
 * O que a Fase 6 exige que exista: as visitas (com o marco da primeira
 * abertura), a senha e o `noindex`. Renovar, trocar plano e excluir dependem de
 * telas de cobrança e do login por magic link — estão anotados no README.
 */
export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { siteId } = await params;
  const { erro } = await searchParams;

  const draft = await getDraft(siteId);
  if (!draft || !(await isDraftOwner(draft))) notFound();

  const published = draft.status === "PUBLISHED";
  const views = published ? await viewsFor(draft.id) : 0;

  const hero = draft.content.blocks.find((block) => block.type === "hero");
  const title =
    hero?.type === "hero" && hero.props.title.trim()
      ? hero.props.title
      : "Sem título ainda";

  /**
   * Toda ação é reconferida do zero.
   *
   * Server Action é um endpoint público como qualquer outro: quem descobrir o
   * id não pode trocar a senha da página de outra pessoa só porque a tela
   * renderizou para o dono uma vez.
   */
  async function savePassword(formData: FormData) {
    "use server";

    const owned = await getDraft(siteId);
    if (!owned || !(await isDraftOwner(owned))) {
      await logDenied("owner-mismatch", {
        rota: "painel.savePassword",
        siteId,
      });
      notFound();
    }

    const password = String(formData.get("senha") ?? "").trim();

    await updateSitePrivacy(siteId, {
      passwordHash: password ? await hashPassword(password) : null,
    });

    // A senha muda quem pode ver a página: o cache dela cai junto (SPEC 8.8).
    revalidateSite(owned.slug);
    revalidatePath(`/painel/${siteId}`);
  }

  async function toggleIndexable() {
    "use server";

    const owned = await getDraft(siteId);
    if (!owned || !(await isDraftOwner(owned))) notFound();

    await updateSitePrivacy(siteId, { indexable: !owned.indexable });

    revalidateSite(owned.slug);
    revalidatePath(`/painel/${siteId}`);
  }

  /**
   * Exclusão — SPEC 8.7 e 9.4 (direito de exclusão).
   *
   * A confirmação é digitada, não um `confirm()`: apagar é irreversível e o QR
   * Code impresso deixa de funcionar junto. Quem chegou aqui por engano não
   * consegue apagar sem ler o que está fazendo.
   */
  async function removeSite(formData: FormData) {
    "use server";

    const owned = await getDraft(siteId);
    if (!owned || !(await isDraftOwner(owned))) {
      await logDenied("owner-mismatch", { rota: "painel.removeSite", siteId });
      notFound();
    }

    if (
      String(formData.get("confirmacao") ?? "")
        .trim()
        .toUpperCase() !== "APAGAR"
    ) {
      redirect(`/painel/${siteId}?erro=confirmacao`);
    }

    await deleteSite(siteId);

    revalidatePath("/painel");
    redirect("/painel");
  }

  return (
    <main className="panel">
      <header className="panel__bar">
        <Logo />
        <Link href="/painel" className="btn-quiet">
          Todas as páginas
        </Link>
      </header>

      <p className="eyebrow">{published ? "no ar" : "ainda não publicada"}</p>
      <h1 className="panel__title">{title}</h1>

      {published ? (
        <>
          <CopyLink slug={draft.slug} />

          <section className="detail__stats">
            <div className="detail__stat">
              <strong>{views}</strong>
              <span>{views === 1 ? "visita" : "visitas"}</span>
            </div>
            <div className="detail__stat">
              <strong>
                {draft.expiresAt ? formatDate(draft.expiresAt) : "sem prazo"}
              </strong>
              <span>{draft.expiresAt ? "no ar até" : "vitalícia"}</span>
            </div>
          </section>

          {views === 0 ? (
            <p className="detail__hint">
              Ninguém abriu ainda. Assim que a primeira pessoa entrar, você
              recebe um e-mail avisando.
            </p>
          ) : null}
        </>
      ) : (
        <p className="detail__hint">
          Esta página ainda é um rascunho. Depois de publicar, o link, o QR Code
          e as visitas aparecem aqui.
        </p>
      )}

      <section className="detail__card">
        <h2 className="detail__card-title">Quem pode ver</h2>

        <form action={savePassword} className="detail__form">
          <label htmlFor="senha" className="field__label">
            Senha da página
          </label>
          <p className="field__hint">
            {draft.passwordHash
              ? "Já existe uma senha. Digite uma nova para trocar, ou salve em branco para tirar a senha."
              : "Deixe em branco para a página abrir direto pelo link."}
          </p>

          <div className="detail__form-row">
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              className="input"
              placeholder={draft.passwordHash ? "nova senha" : "sem senha"}
            />
            <button type="submit" className="btn-quiet">
              Salvar
            </button>
          </div>
        </form>

        <form action={toggleIndexable} className="detail__form">
          <p className="field__label">Aparecer em buscas</p>
          <p className="field__hint">
            {draft.indexable
              ? "O Google pode encontrar esta página."
              : "A página só é encontrada por quem tem o link. É o padrão."}
          </p>

          <button type="submit" className="btn-quiet">
            {draft.indexable ? "Tirar do Google" : "Permitir no Google"}
          </button>
        </form>
      </section>

      {published ? (
        <section className="detail__card">
          <h2 className="detail__card-title">QR Code</h2>
          <p className="field__hint">
            O mesmo código de sempre: o slug não muda, então o cartão já
            impresso continua valendo.
          </p>

          <div className="detail__form-row">
            <a href={`/api/qr/${draft.slug}?formato=pdf`} className="btn-quiet">
              Cartão A6 (PDF)
            </a>
            <a href={`/api/qr/${draft.slug}?formato=png`} className="btn-quiet">
              PNG
            </a>
            <a href={`/api/qr/${draft.slug}?formato=svg`} className="btn-quiet">
              SVG
            </a>
          </div>
        </section>
      ) : null}

      <section className="detail__card detail__card--danger">
        <h2 className="detail__card-title">Apagar esta página</h2>
        <p className="field__hint">
          Some o conteúdo, somem as fotos e o QR Code impresso para de abrir.
          Não tem como desfazer. O registro da compra continua guardado.
        </p>

        <form action={removeSite} className="detail__form">
          <label htmlFor="confirmacao" className="field__label">
            Para confirmar, digite <strong>APAGAR</strong>
          </label>

          <div className="detail__form-row">
            <input
              id="confirmacao"
              name="confirmacao"
              type="text"
              autoComplete="off"
              className="input"
              placeholder="APAGAR"
              aria-describedby={
                erro === "confirmacao" ? "erro-confirmacao" : undefined
              }
            />
            <button type="submit" className="btn-danger">
              Apagar para sempre
            </button>
          </div>

          {erro === "confirmacao" ? (
            <p id="erro-confirmacao" role="alert" className="field__error">
              A página continua no ar. Digite APAGAR para confirmar.
            </p>
          ) : null}
        </form>
      </section>

      <div className="detail__foot">
        <Link
          href={published ? `/p/${draft.slug}` : `/editor/${draft.id}`}
          className="btn-primary"
        >
          {published ? "Ver a página" : "Continuar editando"}
        </Link>
      </div>
    </main>
  );
}
