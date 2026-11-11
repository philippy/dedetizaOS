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
      if (e.key === "Escape") onClose();
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
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidth} bg-white rounded-[28px] shadow-[0_24px_60px_rgba(15,23,32,0.35)] p-6 flex flex-col gap-3.5 text-[#0F1720] outline-none`}
      >
        {children}
      </div>
    </div>
  );
}
