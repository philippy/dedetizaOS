import Link from "next/link";
import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos, lancamentos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import ImpactoAnimation from "@/components/impacto/ImpactoAnimation";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const hoje = todaySP();
  const mesPrefix = hoje.slice(0, 7);

  const allServicos = await db
    .select({ id: servicos.id, dataHora: servicos.dataHora, valor: servicos.valor, status: servicos.status, clienteNome: clientes.nome, tipoNome: tiposServico.nome, tecnicoNome: tecnicos.nome, tecnicoCor: tecnicos.cor })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id));

  const servicosHoje = allServicos.filter((s) => s.dataHora.startsWith(hoje) && s.status !== "cancelado").sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const allLancamentos = await db.select().from(lancamentos);
  const lancMes = allLancamentos.filter((l) => l.vencimento.startsWith(mesPrefix));
  const receberMesTotal = lancMes.filter((l) => l.tipo === "receber").reduce((acc, l) => acc + l.valor, 0);
  const pagarMesTotal = lancMes.filter((l) => l.tipo === "pagar").reduce((acc, l) => acc + l.valor, 0);
  const contasHoje = allLancamentos.filter((l) => l.vencimento === hoje && l.status === "aberto");
  const contasVencidas = allLancamentos.filter((l) => l.vencimento < hoje && l.status === "aberto");
  const totalVencido = contasVencidas.reduce((acc, l) => acc + l.valor, 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">A receber no mês</div>
          <div className="text-[26px] font-extrabold text-[#14653A] mt-1">{formatBRL(receberMesTotal)}</div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">A pagar no mês</div>
          <div className="text-[26px] font-extrabold text-[#8E1B10] mt-1">{formatBRL(pagarMesTotal)}</div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">Vencem hoje</div>
          <div className="text-[26px] font-extrabold text-[#0F1720] mt-1">{contasHoje.length}</div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">Contas vencidas</div>
          <div className="text-[26px] font-extrabold text-[#B42318] mt-1">{formatBRL(totalVencido)}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Trabalhos de hoje ({formatDateBR(hoje)})</h2>
            <Link href="/agenda" className="text-xs font-bold text-[#1B47B5]">Abrir agenda →</Link>
          </div>
          <div className="rounded-[16px] overflow-hidden border border-[#E3E8EF]"><ImpactoAnimation type="street" /></div>
          {servicosHoje.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#3A4658]">Nenhum serviço agendado para hoje.</div>
          ) : (
            servicosHoje.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 py-3 border-t border-slate-200">
                <div className="w-14 text-sm font-extrabold">{job.dataHora.slice(11, 16)}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{job.clienteNome}</div>
                  <div className="text-xs text-[#3A4658]">{job.tipoNome} · {job.tecnicoNome}</div>
                </div>
                <span className={`text-xs font-bold rounded-full px-3 py-1 ${job.status === "concluido" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#E8ECF2] text-[#2F3A4A]"}`}>
                  {job.status === "concluido" ? "Concluído" : "Agendado"}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Contas de hoje e vencidas</h2>
            <Link href="/financeiro" className="text-xs font-bold text-[#1B47B5]">Financeiro →</Link>
          </div>
          <div className="rounded-[16px] overflow-hidden border border-[#E3E8EF]"><ImpactoAnimation type="payment" /></div>
          {[...contasVencidas, ...contasHoje].map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 border-t border-slate-200">
              <div>
                <div className="text-sm font-bold">{c.fornecedor ? `${c.fornecedor} · ${c.descricao}` : c.descricao}</div>
                <div className="text-xs text-[#3A4658]">Vence {formatDateBR(c.vencimento)}</div>
              </div>
              <div className={`text-sm font-extrabold ${c.tipo === "receber" ? "text-[#14653A]" : "text-[#8E1B10]"}`}>{formatBRL(c.valor)}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
