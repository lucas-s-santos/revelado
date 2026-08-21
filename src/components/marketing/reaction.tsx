import { Check } from "lucide-react";

import { copy } from "@/lib/copy";

/**
 * O que acontece do outro lado do link — SPEC 8.1.
 *
 * A conversa ao lado é **ilustração de produto**, não depoimento: mostra o
 * formato em que a página chega (um link no meio de uma conversa), com nomes
 * genéricos e um rótulo dizendo o que é. Depoimento de gente real tem seção
 * própria, com nome e atribuição — misturar os dois transformaria demonstração
 * em prova social inventada.
 *
 * Server Component: não há estado nem evento aqui.
 */
export function Reaction() {
  const { chat } = copy.reaction;

  return (
    <section className="section reaction">
      <div className="reaction__grid">
        <figure className="reaction__chat">
          <figcaption className="reaction__chat-bar">
            <span aria-hidden className="reaction__chat-avatar" />
            <span className="reaction__chat-who">
              <strong>{chat.contact}</strong>
              <small>{chat.status}</small>
            </span>
          </figcaption>

          <ol className="reaction__messages">
            {chat.messages.map((message) => (
              <li
                key={message.id}
                className={`reaction__msg reaction__msg--${message.from === "eu" ? "mine" : "theirs"}`}
              >
                <p>{message.text}</p>
                {/* Só a mensagem que carrega o link tem a chave; o `in` estreita
                    a união sem precisar tipar a copy à mão. */}
                {"link" in message ? (
                  <span className="reaction__msg-link">{message.link}</span>
                ) : null}
              </li>
            ))}
          </ol>

          <p className="reaction__chat-note">{chat.demoLabel}</p>
        </figure>

        <div className="reaction__copy">
          <p className="eyebrow">{copy.reaction.eyebrow}</p>

          <h2 className="section__title">
            {copy.reaction.titleLead}{" "}
            <span className="display-italic">{copy.reaction.titleAccent}</span>
          </h2>

          <p className="section__lede">{copy.reaction.lede}</p>

          <ul className="reaction__bullets">
            {copy.reaction.bullets.map((bullet) => (
              <li key={bullet}>
                <span aria-hidden className="reaction__tick">
                  <Check size={14} />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
