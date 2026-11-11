import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos, lancamentos, inscricoes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import { contaDeLancamento, quemEOque } from "@/lib/cobranca";
import { obterContexto, pixDaEmpresa } from "@/lib/contexto";
import { InicioView, type ContaInicio, type ServicoHoje } from "./inicio-view";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const ctx = await obterContexto();
  const hoje = todaySP();
  const mesPrefix = hoje.slice(0, 7);

  const allServicos = await db
    .select({
      id: servicos.id,
      dataHora: servicos.dataHora,
      valor: servicos.valor,
      status: servicos.status,
      observacoes: servicos.observacoes,
      clienteNome: clientes.nome,
      endereco: clientes.endereco,
      whatsapp: clientes.whatsapp,
      tipoNome: tiposServico.nome,
      tecnicoNome: tecnicos.nome,
    })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id));

  const servicosHoje = allServicos.filter((s) => s.dataHora.startsWith(hoje) && s.status !== "cancelado").sort((a, b) => a.dataHora.localeCompare(b.dataHora));

  const lancRows = await db
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

  const allLancamentos = lancRows.map((r) => r.lancamento);
  const lancMes = allLancamentos.filter((l) => l.vencimento.startsWith(mesPrefix));
  const receberMesTotal = lancMes.filter((l) => l.tipo === "receber").reduce((acc, l) => acc + l.valor, 0);
  const pagarMesTotal = lancMes.filter((l) => l.tipo === "pagar").reduce((acc, l) => acc + l.valor, 0);
  const contasHoje = allLancamentos.filter((l) => l.vencimento === hoje && l.status === "aberto");
  const contasVencidas = allLancamentos.filter((l) => l.vencimento < hoje && l.status === "aberto");
  const totalVencido = contasVencidas.reduce((acc, l) => acc + l.valor, 0);

  // Painel de serviços: o texto de pagamento vem da conta ligada ao serviço, se existir.
  const contaDoServico = new Map(allLancamentos.filter((l) => l.servicoId).map((l) => [l.servicoId as number, l]));
  const servicosView: ServicoHoje[] = servicosHoje.map((s) => {
    const c = contaDoServico.get(s.id);
    const pagamento = c
      ? c.status === "pago"
        ? `Pago${c.pagoEm ? ` em ${formatDateBR(c.pagoEm)}` : ""}`
        : `Conta em aberto · vence ${formatDateBR(c.vencimento)}`
      : "A conta a receber é criada ao concluir o serviço";
    return {
      id: s.id,
      hora: s.dataHora.slice(11, 16),
      clienteNome: s.clienteNome,
      tipoNome: s.tipoNome,
      tecnicoNome: s.tecnicoNome,
      status: s.status,
      valor: s.valor,
      endereco: s.endereco ?? "",
      whatsapp: s.whatsapp,
      observacoes: s.observacoes ?? "",
      pagamento,
    };
  });

  // Painel de contas: vencidas (da mais antiga para a mais recente) e depois as de hoje.
  const idsPainel = new Set([...contasVencidas, ...contasHoje].map((l) => l.id));
  const contasView: ContaInicio[] = lancRows
    .filter((r) => idsPainel.has(r.lancamento.id))
    .sort((a, b) => a.lancamento.vencimento.localeCompare(b.lancamento.vencimento) || a.lancamento.id - b.lancamento.id)
    .map((r) => {
      const l = r.lancamento;
      const ctx = { clienteNome: r.clienteNome, clienteTipo: r.clienteTipo, clienteWhatsapp: r.clienteWhatsapp, inscMorador: r.inscMorador, inscTelefone: r.inscTelefone };
      const receber = l.tipo === "receber";
      const cobranca = receber ? contaDeLancamento(l, ctx) : null;
      const { who, what } = quemEOque(l, ctx);
      return {
        id: l.id,
        tipo: l.tipo,
        quem: who,
        oQue: what,
        vencimento: l.vencimento,
        valor: l.valor,
        contato: cobranca ? [cobranca.quem, cobranca.telefone].filter(Boolean).join(" · ") : "",
        cobranca,
      };
    });

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

      <InicioView hoje={hoje} pix={pixDaEmpresa(ctx?.empresa ?? null)} servicos={servicosView} contas={contasView} />
    </div>
  );
}
