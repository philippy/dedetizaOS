"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Janela modal: fecha com Esc e ao clicar fora, leva o foco para dentro e devolve ao fechar.
export function Modal({ titleId, onClose, children, maxWidth = "max-w-[580px]" }: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Mantém o Tab dentro da janela.
      if (e.key === "Tab" && ref.current) {
        const itens = Array.from(ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null);
        if (itens.length === 0) {
          e.preventDefault();
          return;
        }
        const primeiro = itens[0];
        const ultimo = itens[itens.length - 1];
        const ativo = document.activeElement;
        if (e.shiftKey && (ativo === primeiro || ativo === ref.current)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && ativo === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      anterior?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        data-modal-proprio=""
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidth} bg-white rounded-[28px] shadow-[0_24px_60px_rgba(15,23,32,0.35)] p-6 flex flex-col gap-3.5 text-[#0F1720] outline-none`}
      >
        {children}
      </div>
    </div>
  );
}
