import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { clientes, servicos, tiposServico, tecnicos, lancamentos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import { ClienteFichaForm } from "./cliente-ficha-form";

export const dynamic = "force-dynamic";

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clienteId = Number(id);
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId));
  if (!cliente) notFound();

  const historico = await db
    .select({ id: servicos.id, dataHora: servicos.dataHora, valor: servicos.valor, status: servicos.status, tipoNome: tiposServico.nome, tecnicoNome: tecnicos.nome })
    .from(servicos).innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id)).leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id)).where(eq(servicos.clienteId, clienteId));

  const lancCliente = await db.select().from(lancamentos).where(eq(lancamentos.clienteId, clienteId));
  const totalPago = lancCliente.filter((l) => l.tipo === "receber" && l.status === "pago").reduce((a, b) => a + b.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/clientes" className="text-xs font-bold text-[#1B47B5]">← Todos os clientes</Link>
        <h1 className="text-[28px] font-extrabold mt-1">{cliente.nome}</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
        <ClienteFichaForm cliente={cliente} />
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-baseline">
            <h2 className="text-[17px] font-extrabold">Histórico de serviços</h2>
            <div className="text-sm font-bold">Total pago: <span className="text-[#14653A]">{formatBRL(totalPago)}</span></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2">Data</th><th className="p-2">Serviço</th><th className="p-2">Técnico</th><th className="p-2">Valor</th><th className="p-2">Status</th></tr></thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-t"><td className="p-2.5">{formatDateTimeBR(h.dataHora)}</td><td className="p-2.5 font-bold">{h.tipoNome}</td><td className="p-2.5">{h.tecnicoNome || "—"}</td><td className="p-2.5 font-extrabold">{formatBRL(h.valor)}</td><td className="p-2.5">{h.status}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
