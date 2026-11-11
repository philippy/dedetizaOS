import { db } from "@/db";
import { clientes, servicos, lancamentos } from "@/db/schema";
import { ClientesView } from "./clientes-view";
import { obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const ctx = await obterContexto();
  const verFinanceiro = !!ctx && pode(ctx.papel, "financeiro.acessar");
  const [allClientes, allServicos, allLancamentos] = await Promise.all([
    db.select().from(clientes),
    db.select().from(servicos),
    verFinanceiro ? db.select().from(lancamentos) : Promise.resolve([] as (typeof lancamentos.$inferSelect)[]),
  ]);

  const rows = allClientes.map((c) => {
    const svcsCliente = allServicos.filter((s) => s.clienteId === c.id && s.status !== "cancelado").sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    const pagoTotal = allLancamentos.filter((l) => l.clienteId === c.id && l.tipo === "receber" && l.status === "pago").reduce((acc, l) => acc + l.valor, 0);
    return { ...c, ultimoServico: svcsCliente[0]?.dataHora.slice(0, 10) || null, totalPago: verFinanceiro ? pagoTotal : null };
  });

  return <ClientesView clientesList={rows} verFinanceiro={verFinanceiro} />;
}
