"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { aplicarDedupe, simularDedupe } from "@/lib/dedupe-demo";

// Manutenção pontual: tirar as cópias repetidas dos dados de demonstração.
// Remover esta ação e a página /manutencao depois de usar.

export async function simularDedupeAction() {
  await requireSession();
  try {
    return { ok: true as const, ...(await simularDedupe()) };
  } catch (e) {
    console.error("simularDedupe", e);
    return { ok: false as const, error: "Não foi possível simular. Veja os logs." };
  }
}

export async function aplicarDedupeAction(confirmacao: string) {
  await requireSession();
  if (confirmacao !== "REMOVER") return { ok: false as const, error: "Digite REMOVER para confirmar." };
  try {
    const r = await aplicarDedupe();
    for (const p of ["/", "/agenda", "/clientes", "/servicos", "/financeiro", "/campanhas"]) revalidatePath(p);
    return { ok: true as const, ...r };
  } catch (e) {
    console.error("aplicarDedupe", e);
    return { ok: false as const, error: "A remoção falhou e nada foi alterado. Veja os logs." };
  }
}
