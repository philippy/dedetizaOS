import { db } from "@/db";
import { clientes, inscricoes, lancamentos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { obterContexto, pixDaEmpresa } from "@/lib/contexto";
import { todaySP } from "@/lib/utils";
import { FinanceiroView, type LancamentoRow } from "./financeiro-view";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const ctx = await obterContexto();
  const rows = await db
    .select({
      lancamento: lancamentos,
      clienteNome: clientes.nome,
      clienteTipo: clientes.tipo,
      clienteWhatsapp: clientes.whatsapp,
      inscMorador: inscricoes.morador,
      inscTelefone: inscricoes.telefone,
    })
    .from(lancamentos)
    .leftJoin(clientes, eq(lancamentos.clienteId, clientes.id))
    .leftJoin(inscricoes, eq(lancamentos.inscricaoId, inscricoes.id));

  const list: LancamentoRow[] = rows.map((r) => ({
    ...r.lancamento,
    clienteNome: r.clienteNome,
    clienteTipo: r.clienteTipo,
    clienteWhatsapp: r.clienteWhatsapp,
    inscMorador: r.inscMorador,
    inscTelefone: r.inscTelefone,
  }));
  return <FinanceiroView today={todaySP()} lancamentosList={list} pix={pixDaEmpresa(ctx?.empresa ?? null)} />;
}
