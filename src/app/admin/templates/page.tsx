import { toggleTemplateAction } from "@/app/admin/actions";
import { TemplateForm } from "@/components/admin/template-form";
import { listAllTemplates } from "@/lib/templates-db";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  const templates = await listAllTemplates();

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Templates do editor</h1>
      <p className="admin-page__lede">
        Entram no seletor de formato do editor assim que criados — sem
        deploy. Desativar não apaga: páginas antigas continuam com o formato
        que escolheram.
      </p>

      <div className="admin-page__grid">
        <TemplateForm />

        <section className="admin-card">
          <h2 className="admin-card__title">Todos os templates</h2>

          {templates.length === 0 ? (
            <p className="field__hint">Nenhum template criado ainda.</p>
          ) : (
            <ul className="panel__list">
              {templates.map((template) => (
                <li key={template.id} className="panel__item">
                  <div className="panel__item-main">
                    <p className="panel__item-title">{template.name}</p>
                    <p className="panel__item-meta">
                      <span>{template.id}</span>
                      <span aria-hidden>·</span>
                      <span>{template.preset.blocks.join(" → ")}</span>
                      {!template.active ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>desativado</span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <form action={toggleTemplateAction}>
                    <input type="hidden" name="id" value={template.id} />
                    <input
                      type="hidden"
                      name="nextActive"
                      value={template.active ? "false" : "true"}
                    />
                    <button type="submit" className="btn-quiet">
                      {template.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
