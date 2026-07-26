# Referências de motion

Complemento da seção 6.5 do `docs/SPEC.md`. **Slot aberto** — preencher antes de
iniciar a Fase 1.

Para cada link de referência, registrar as quatro colunas. Sem as quatro
preenchidas o Claude Code improvisa o efeito, que é exatamente o que este
documento existe para evitar.

| Link | Efeito observado | Onde aplicar | Componente equivalente (inventário §5.2 / §5.3) |
| ---- | ---------------- | ------------ | ----------------------------------------------- |
|      |                  |              |                                                 |

## Como preencher

- **Link** — URL da referência (site, dribbble, tweet, codepen).
- **Efeito observado** — descrição mecânica, não estética. "As fotos saem de
  desfocadas e dessaturadas para nítidas conforme o scroll, com 80ms de atraso
  entre elas" é útil; "revelação bonita" não é.
- **Onde aplicar** — tela e dobra exatas (`/` seção 7, `/editor` grid de fotos…).
- **Componente equivalente** — o item do inventário da seção 5 que chega mais
  perto. Se nada chegar perto, marcar `NOVO` e o efeito entra em `components/motion/`
  com contrato escrito na seção 5.3 antes de ser implementado.

## Restrições que valem para toda referência

Da seção 6 do SPEC, repetidas aqui porque são o filtro de aceite:

1. Só `transform`, `opacity`, `filter` e `clip-path` animam. Nada de cor de fundo,
   largura ou altura.
2. Spring para o que responde ao usuário, easing (`--ease-out`) para revelação por
   scroll.
3. Nada passa de 800ms.
4. No máximo dois efeitos ambientais por dobra.
5. Scroll e pointer só através dos drivers singleton (`use-scroll-driver`,
   `use-pointer`). Nenhum listener em componente.
6. `prefers-reduced-motion` desliga tudo — não é opcional.
7. Nada de motion ambiental no painel ou no admin.
