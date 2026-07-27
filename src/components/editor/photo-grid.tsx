"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect } from "react";

import { publicUrlFor } from "@/lib/media";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Grade de fotos do editor — SPEC 8.4 e 5.3 (`FocusGrid`).
 *
 * Reordenar por arrastar com `dnd-kit`, e as irmãs desfocam no hover — o efeito
 * "Focus Cards" resolvido em CSS com `:has()`, sem trazer mais uma biblioteca
 * (SPEC 6.4: `Lens` e `Focus Cards` ficam desligados em ponteiro grosso, e é
 * exatamente o que a media query faz).
 *
 * O `KeyboardSensor` não é enfeite: sem ele, reordenar seria impossível no
 * teclado (SPEC 11 manda testar o funil inteiro por teclado).
 */
export function PhotoGrid({ onSettled }: { onSettled?: () => void }) {
  const content = useEditorStore((state) => state.content);
  const draftId = useEditorStore((state) => state.draftId);
  const reorder = useEditorStore((state) => state.reorderMedia);
  const remove = useEditorStore((state) => state.removeMedia);

  const gallery = findBlock(content, "gallery");
  const mediaIds = gallery?.props.mediaIds ?? [];

  const sensors = useSensors(
    // 6px antes de arrastar: no celular, tocar para remover não pode virar drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sempre que a lista muda, limpa os itens já concluídos da fila de upload.
  useEffect(() => {
    if (mediaIds.length > 0) onSettled?.();
  }, [mediaIds.length, onSettled]);

  if (!gallery) return null;

  if (mediaIds.length === 0) {
    // Tela vazia é convite, não recado triste (SPEC 11).
    return (
      <p className="photo-grid__empty">
        Nenhuma foto ainda. Comece por aquela que você já tem no celular.
      </p>
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = mediaIds.indexOf(String(active.id));
    const to = mediaIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    reorder(arrayMove(mediaIds, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={mediaIds} strategy={rectSortingStrategy}>
        <ul className="photo-grid">
          {mediaIds.map((mediaId, index) => (
            <SortablePhoto
              key={mediaId}
              mediaId={mediaId}
              src={draftId ? publicUrlFor(draftId, mediaId) : ""}
              index={index}
              onRemove={() => remove(mediaId)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortablePhoto({
  mediaId,
  src,
  index,
  onRemove,
}: {
  mediaId: string;
  src: string;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mediaId });

  return (
    <li
      ref={setNodeRef}
      className="photo-grid__item"
      data-dragging={isDragging ? "" : undefined}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        className="photo-grid__handle"
        aria-label={`Foto ${index + 1}. Segure para arrastar e reordenar.`}
        {...attributes}
        {...listeners}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- mesma decisão
            do Frame: o runtime do next/image não cabe no orçamento e as fotos
            já vêm otimizadas do R2. */}
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="photo-grid__img"
        />

        {index === 0 ? <span className="photo-grid__badge">capa</span> : null}
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="photo-grid__remove"
        aria-label={`Remover a foto ${index + 1}`}
      >
        ×
      </button>
    </li>
  );
}
