"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { requireSession } from "@/lib/session";
import { sqlRecriarDemo } from "@/lib/demo-data";
import { todaySP } from "@/lib/utils";

// Manutenção pontual: apagar os dados de negócio e carregar o conjunto de
// demonstração. Usuários e sessões não são tocados.
// Remover esta ação e a página /manutencao depois de usar.

const TABELAS = ["tecnicos", "tipos_servico", "clientes", "servicos", "campanhas", "inscricoes", "lancamentos"] as const;

async function contar(): Promise<Record<string, number>> {
  const r = await db.execute(sql.raw(`SELECT ${TABELAS.map((t) => `(SELECT count(*) FROM ${t})::int AS ${t}`).join(", ")}`));
  const rows = (r as unknown as { rows?: Record<string, number>[] }).rows ?? (r as unknown as Record<string, number>[]);
  return rows[0];
}

export async function contarDadosAction() {
  await requireSession();
  return contar();
}

export async function recriarDemoAction(confirmacao: string) {
  await requireSession();
  if (confirmacao !== "RECRIAR") return { ok: false as const, error: "Digite RECRIAR para confirmar." };
  try {
    const antes = await contar();
    await db.execute(sql.raw(sqlRecriarDemo(todaySP())));
    const depois = await contar();
    for (const p of ["/", "/agenda", "/clientes", "/servicos", "/financeiro", "/campanhas"]) revalidatePath(p, "layout");
    return { ok: true as const, antes, depois };
  } catch (e) {
    console.error("recriarDemo", e);
    return { ok: false as const, error: "Falhou e nada foi alterado. Veja os logs." };
  }
}
