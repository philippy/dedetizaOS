"use client";

import { useEffect } from "react";

// Acessibilidade dos modais do sistema em um ponto só: ao abrir, leva o foco para dentro; Esc fecha (aciona o
// botão "Fechar" ou "Cancelar" da própria janela); Tab e Shift+Tab ficam dentro dela. Vale para qualquer
// janela `role="dialog" aria-modal="true"`. As que usam o componente Modal já fazem isso sozinhas
// (marcadas com data-modal-proprio) e são ignoradas aqui.
const SELETOR = '[role="dialog"][aria-modal="true"]:not([data-modal-proprio])';
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ultimaJanela(): HTMLElement | null {
  const todas = document.querySelectorAll<HTMLElement>(SELETOR);
  return todas.length ? todas[todas.length - 1] : null;
}

export function ModalAcessivel() {
  useEffect(() => {
    const vistas = new WeakSet<Element>();
    const anteriores = new WeakMap<Element, HTMLElement | null>();

    const olhar = () => {
      document.querySelectorAll<HTMLElement>(SELETOR).forEach((j) => {
        if (vistas.has(j)) return;
        vistas.add(j);
        anteriores.set(j, document.activeElement as HTMLElement | null);
        j.setAttribute("tabindex", "-1");
        j.style.outline = "none";
        j.focus();
      });
    };
    const obs = new MutationObserver(olhar);
    obs.observe(document.body, { childList: true, subtree: true });
    olhar();

    const onKey = (e: KeyboardEvent) => {
      const j = ultimaJanela();
      if (!j) return;
      if (e.key === "Escape") {
        const fechar = j.querySelector<HTMLElement>('button[aria-label="Fechar"]') ?? Array.from(j.querySelectorAll<HTMLElement>("button")).find((b) => /^cancelar$/i.test(b.textContent?.trim() ?? ""));
        if (fechar) {
          e.preventDefault();
          const volta = anteriores.get(j);
          fechar.click();
          volta?.focus?.();
        }
        return;
      }
      if (e.key === "Tab") {
        const itens = Array.from(j.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => el.offsetParent !== null);
        if (itens.length === 0) {
          e.preventDefault();
          return;
        }
        const primeiro = itens[0];
        const ultimo = itens[itens.length - 1];
        const ativo = document.activeElement;
        if (e.shiftKey && (ativo === primeiro || ativo === j)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && ativo === ultimo) {
          e.preventDefault();
          primeiro.focus();
        } else if (!j.contains(ativo)) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      obs.disconnect();
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
