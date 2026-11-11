import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { clientes, servicos, tiposServico, tecnicos, lancamentos } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { diffDaysISO, formatBRL, formatDateBR, formatDateTimeBR, todaySP } from "@/lib/utils";
import { calcularPainel, statusDaLinha, textoPrazo, MESES_RETORNO, type StatusLinha } from "@/lib/cliente-painel";
import { ClienteFichaForm } from "./cliente-ficha-form";
import { empresaIdDe, obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

const CHIP: Record<StatusLinha, string> = {
  Pago: "bg-[#DDF3E4] text-[#14653A]",
  "A receber": "bg-[#FFF0D1] text-[#7A4B00]",
  "Em atraso": "bg-[#FDE4E1] text-[#8E1B10]",
  Concluído: "bg-[#E8ECF2] text-[#3A4658]",
  Agendado: "bg-[#DCE7FF] text-[#1B47B5]",
  Cancelado: "bg-[#E8ECF2] text-[#3A4658]",
};

function Kpi({ label, value, sub, tom = "neutro", data = false }: { label: string; value: string; sub: string; tom?: "neutro" | "aviso" | "alerta"; data?: boolean }) {
  const fundo = tom === "alerta" ? "bg-[#FDE4E1]" : tom === "aviso" ? "bg-[#FFF0D1]" : "bg-white";
  const cor = tom === "alerta" ? "text-[#8E1B10]" : tom === "aviso" ? "text-[#7A4B00]" : "text-[#0F1720]";
  return (
    <div className={`${fundo} ${cor} rounded-[24px] shadow-sm px-4 py-4 sm:px-5 min-w-0`}>
      <div className="text-[13px] font-semibold opacity-80">{label}</div>
      <div className={`text-xl sm:text-[26px] font-extrabold leading-tight mt-1 ${data ? "whitespace-nowrap" : "break-words"}`}>{value}</div>
      <div className="text-xs font-semibold opacity-80 mt-1">{sub}</div>
    </div>
  );
}

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  const verFinanceiro = !!ctx && pode(ctx.papel, "financeiro.acessar");
  const clienteId = Number(id);
  const eid = empresaIdDe(ctx);
  if (!Number.isInteger(clienteId)) notFound();
  const [cliente] = await db.select().from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, eid)));
  if (!cliente) notFound();

  const historico = await db
    .select({ id: servicos.id, dataHora: servicos.dataHora, valor: servicos.valor, status: servicos.status, tipoNome: tiposServico.nome, tecnicoNome: tecnicos.nome })
    .from(servicos)
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id))
    .where(and(eq(servicos.clienteId, clienteId), eq(servicos.empresaId, eid)))
    .orderBy(desc(servicos.dataHora));

  // Sem acesso ao Financeiro, as contas do cliente nem são lidas.
  const lancCliente = verFinanceiro ? await db.select().from(lancamentos).where(and(eq(lancamentos.clienteId, clienteId), eq(lancamentos.empresaId, eid))) : [];

  const hoje = todaySP();
  const p = calcularPainel(historico, lancCliente, hoje);

  const ultimoTipo = historico.find((h) => h.status === "concluido")?.tipoNome ?? "";
  const tomSugestao = p.retorno === "vencido" ? "alerta" : p.retorno === "a_vencer" ? "aviso" : "neutro";
  let subSugestao = "Sem serviço concluído ainda";
  if (p.sugestao && p.diasParaSugestao !== null) {
    subSugestao = p.proximoAgendado
      ? `Já agendado para ${formatDateBR(p.proximoAgendado)}`
      : p.diasParaSugestao < 0
        ? `Venceu ${textoPrazo(p.diasParaSugestao)} · a cada ${MESES_RETORNO} meses`
        : `${textoPrazo(p.diasParaSugestao)[0].toUpperCase()}${textoPrazo(p.diasParaSugestao).slice(1)} · a cada ${MESES_RETORNO} meses`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/clientes" className="inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#1B47B5]">← Todos os clientes</Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[28px] font-extrabold">{cliente.nome}</h1>
          <span className="rounded-full px-3.5 py-0.5 text-[13px] font-bold bg-[#DCE7FF] text-[#1B47B5]">{cliente.tipo === "PJ" ? "Empresa" : "Residencial"}</span>
          {p.retorno === "vencido" && <span className="rounded-full px-3.5 py-0.5 text-[13px] font-bold bg-[#FDE4E1] text-[#8E1B10]">Retorno vencido</span>}
          {p.retorno === "a_vencer" && <span className="rounded-full px-3.5 py-0.5 text-[13px] font-bold bg-[#FFF0D1] text-[#7A4B00]">Retorno a vencer</span>}
          {p.qtdAtraso > 0 && <span className="rounded-full px-3.5 py-0.5 text-[13px] font-bold bg-[#FDE4E1] text-[#8E1B10]">Pagamento em atraso</span>}
        </div>
      </div>

      <div className={`grid grid-cols-2 ${verFinanceiro ? "md:grid-cols-3 xl:grid-cols-5" : ""} gap-3`}>
        {verFinanceiro && (<>
        <Kpi
          label="Total gasto (LTV)"
          value={formatBRL(p.ltv)}
          sub={p.qtdConcluidos ? `${p.qtdConcluidos} ${p.qtdConcluidos === 1 ? "serviço" : "serviços"} · ${formatBRL(p.recebido)} já pago` : "Nenhum serviço concluído"}
        />
        <Kpi
          label="Pendente"
          value={formatBRL(p.pendente)}
          sub={p.qtdPendente ? `${p.qtdPendente} ${p.qtdPendente === 1 ? "conta a vencer" : "contas a vencer"}` : "Nada a vencer"}
        />
        <Kpi
          label="Em atraso"
          value={formatBRL(p.atraso)}
          sub={p.qtdAtraso ? `${p.qtdAtraso} ${p.qtdAtraso === 1 ? "conta vencida" : "contas vencidas"} · a mais antiga há ${p.diasAtrasoMaisAntigo} ${p.diasAtrasoMaisAntigo === 1 ? "dia" : "dias"}` : "Nenhuma conta vencida"}
          tom={p.qtdAtraso ? "alerta" : "neutro"}
        />
        </>)}
        <Kpi
          label="Último serviço"
          data
          value={p.ultimoServico ? formatDateBR(p.ultimoServico) : "—"}
          sub={p.ultimoServico ? `${ultimoTipo} · ${textoPrazo(diffDaysISO(hoje, p.ultimoServico))}` : "Ainda não houve"}
        />
        <Kpi data label="Sugestão de novo serviço" value={p.sugestao ? formatDateBR(p.sugestao) : "—"} sub={subSugestao} tom={tomSugestao} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
        <ClienteFichaForm cliente={cliente} />
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3 min-w-0">
          <h2 className="text-[17px] font-extrabold">Serviços realizados</h2>
          {historico.length === 0 ? (
            <div className="text-sm font-semibold text-[#3A4658] py-6 text-center">Este cliente ainda não tem serviços.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2">Data</th><th className="p-2">Serviço</th><th className="p-2">Técnico</th><th className="p-2">Valor</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {historico.map((h) => {
                    const st = statusDaLinha(h, lancCliente, hoje);
                    return (
                      <tr key={h.id} className="border-t border-[#E3E8EF]">
                        <td className="p-2.5 font-semibold whitespace-nowrap">{formatDateTimeBR(h.dataHora)}</td>
                        <td className="p-2.5 font-bold">{h.tipoNome}</td>
                        <td className="p-2.5 font-semibold">{h.tecnicoNome || "—"}</td>
                        <td className="p-2.5 font-extrabold">{formatBRL(h.valor)}</td>
                        <td className="p-2.5"><span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold whitespace-nowrap ${CHIP[st]}`}>{st}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
