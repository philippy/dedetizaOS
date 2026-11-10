import { db } from "@/db";
import { clientes, lancamentos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todaySP } from "@/lib/utils";
import { FinanceiroView, type LancamentoRow } from "./financeiro-view";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const rows = await db
    .select({ lancamento: lancamentos, clienteNome: clientes.nome })
    .from(lancamentos)
    .leftJoin(clientes, eq(lancamentos.clienteId, clientes.id));

  const list: LancamentoRow[] = rows.map((r) => ({ ...r.lancamento, clienteNome: r.clienteNome }));
  return <FinanceiroView today={todaySP()} lancamentosList={list} />;
}
