"use client";

import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";

/**
 * O aviso de saída do editor.
 *
 * A referência usa o enquadramento de pânico — "não perca seu progresso!" —
 * sobre um editor que salva sozinho. Aqui isso seria mentira: o autosave tem
 * debounce, retry com espera crescente, `sendBeacon` ao fechar a aba e cache
 * local. O trabalho **está** salvo.
 *
 * Então o modal diz a verdade, que por acaso é a mensagem mais forte: está
 * tudo guardado, e este é o endereço para voltar. Assustar quem já ia sair
 * rende um clique e perde a confiança; entregar o link rende a volta.
 *
 * Uma vez por rascunho por sessão. Aparecer de novo a cada movimento do mouse
 * transformaria um lembrete útil em perseguição.
 *
 * Só desktop: `mouseleave` na direção do topo é o gesto de quem vai fechar a
 * aba, e ele não existe no toque. No celular o `sendBeacon` já cobre.
 */
export function LeaveGuard({ draftId }: { draftId: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);

  const chave = `revelado_leave_${draftId}`;

  const dispensar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Um dispositivo de toque não tem "sair pelo topo" — e mostrar isto lá
    // seria um modal que aparece sozinho, sem gesto que o justifique.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let jaMostrou = false;
    try {
      jaMostrou = sessionStorage.getItem(chave) === "1";
    } catch {
      // Sessão privada pode recusar storage. Sem memória, o modal simplesmente
      // não aparece — melhor calar que insistir.
      return;
    }
    if (jaMostrou) return;

    const aoSair = (event: MouseEvent) => {
      // Só conta a saída pelo topo: para os lados é troca de janela, para
      // baixo é a barra de tarefas.
      if (event.clientY > 0 || event.relatedTarget) return;

      try {
        sessionStorage.setItem(chave, "1");
      } catch {
        /* sem memória, tudo bem: ele já vai fechar abaixo */
      }

      setAberto(true);
      void track("editor_leave_intent");
      document.removeEventListener("mouseout", aoSair);
    };

    document.addEventListener("mouseout", aoSair);
    return () => document.removeEventListener("mouseout", aoSair);
  }, [chave]);

  // Escape fecha, e o foco vai para o botão de fechar ao abrir — sem isso o
  // teclado fica preso atrás do modal.
  useEffect(() => {
    if (!aberto) return;

    fechar.current?.focus();

    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispensar();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, dispensar]);

  if (!aberto) return null;

  const url = `${window.location.origin}/editor/${draftId}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência o endereço continua na tela,
      // selecionável. Não vale travar nada por isso.
    }
  }

  return (
    <div className="leave" role="presentation" onClick={dispensar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-titulo"
        className="leave__card"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={fechar}
          type="button"
          onClick={dispensar}
          aria-label="Fechar aviso"
          className="leave__close"
        >
          <X size={16} aria-hidden />
        </button>

        <p className="leave__badge">
          <Check size={14} aria-hidden />
          Já está salvo
        </p>

        <h2 id="leave-titulo" className="leave__title">
          Pode ir sem medo.
        </h2>

        <p className="leave__text">
          Sua página fica guardada do jeito que está. Volte por este endereço
          quando quiser — do mesmo navegador, ele te leva direto de onde você
          parou.
        </p>

        <p className="leave__url" data-numeric>
          {url}
        </p>

        <div className="leave__actions">
          <button type="button" onClick={copiar} className="btn-primary">
            <Copy size={15} aria-hidden />
            {copiado ? "Endereço copiado" : "Copiar o endereço"}
          </button>

          <button type="button" onClick={dispensar} className="btn-quiet">
            Continuar montando
          </button>
        </div>
      </div>
    </div>
  );
}
