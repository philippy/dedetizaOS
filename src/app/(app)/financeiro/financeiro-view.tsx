"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { criarLancamentoPagarAction, darBaixaLancamentoAction, excluirLancamentoAction } from "@/actions";
import { CobrancaModal } from "@/components/cobranca-modal";
import type { lancamentos } from "@/db/schema";
import { contaDeLancamento, quemEOque as quemEOqueBase, type ContaCobranca, type PixConfig } from "@/lib/cobranca";
import { addDaysISO, centsToInput, formatBRL, formatDateBR, formatDiaExtenso, monthRangeISO } from "@/lib/utils";

export type LancamentoRow = typeof lancamentos.$inferSelect & {
  clienteNome: string | null;
  // Contato para a cobrança por WhatsApp: do cliente ou, nas contas de campanha, do morador inscrito.
  clienteTipo: "PF" | "PJ" | null;
  clienteWhatsapp: string | null;
  inscMorador: string | null;
  inscTelefone: string | null;
};

type Situacao = "Recebido" | "Pago" | "Vencido" | "Vence hoje" | "Em aberto";
type Filtro = "Todas" | "Em aberto" | "Vencidas" | "Pagas";
type Periodo = "Hoje" | "Esta semana" | "Este mês" | "Mês anterior" | "Próx. 30 dias" | "Personalizado";

const CHIP: Record<Situacao, string> = {
  Recebido: "bg-[#DDF3E4] text-[#14653A]",
  Pago: "bg-[#DDF3E4] text-[#14653A]",
  Vencido: "bg-[#FDE4E1] text-[#8E1B10]",
  "Vence hoje": "bg-[#FFF0D1] text-[#7A4B00]",
  "Em aberto": "bg-[#DCE7FF] text-[#1B47B5]",
};

const inputCls = "h-12 w-full box-border border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white";
const labelCls = "flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]";

function situacao(l: LancamentoRow, today: string): Situacao {
  if (l.status === "pago") return l.tipo === "receber" ? "Recebido" : "Pago";
  if (l.vencimento < today) return "Vencido";
  if (l.vencimento === today) return "Vence hoje";
  return "Em aberto";
}

// Quem e o quê, como no protótipo (regra compartilhada com o Início em lib/cobranca).
function quemEOque(l: LancamentoRow) {
  return quemEOqueBase(l, { clienteNome: l.clienteNome });
}

function contaCobranca(l: LancamentoRow): ContaCobranca {
  return contaDeLancamento(l, {
    clienteNome: l.clienteNome,
    clienteTipo: l.clienteTipo,
    clienteWhatsapp: l.clienteWhatsapp,
    inscMorador: l.inscMorador,
    inscTelefone: l.inscTelefone,
  });
}

const soma = (arr: LancamentoRow[]) => arr.reduce((t, x) => t + x.valor, 0);

function totais(arr: LancamentoRow[]) {
  const pagos = arr.filter((x) => x.status === "pago");
  return { total: soma(arr), feito: soma(pagos), aberto: soma(arr) - soma(pagos) };
}

export function FinanceiroView({ today, lancamentosList, pix }: { today: string; lancamentosList: LancamentoRow[]; pix: PixConfig | null }) {
  const [mesIni, mesFim] = monthRangeISO(today);
  const [from, setFrom] = useState(mesIni);
  const [to, setTo] = useState(mesFim);
  const [periodo, setPeriodo] = useState<Periodo>("Este mês");
  const [filtro, setFiltro] = useState<Filtro>("Todas");
  const [diaAberto, setDiaAberto] = useState(true);
  const [aviso, setAviso] = useState("");

  const [novoAberto, setNovoAberto] = useState(false);
  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [vencimento, setVencimento] = useState(today);
  const [valorReais, setValorReais] = useState("");
  const [novoErro, setNovoErro] = useState("");

  const [baixaItem, setBaixaItem] = useState<LancamentoRow | null>(null);
  const [pagoEm, setPagoEm] = useState(today);
  const [valorPagoReais, setValorPagoReais] = useState("");
  const [baixaErro, setBaixaErro] = useState("");

  const [excluirId, setExcluirId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Cobrança por WhatsApp. A hora do último link aberto só vale enquanto a tela está aberta.
  const [cobrar, setCobrar] = useState<ContaCobranca | null>(null);
  const [cobradas, setCobradas] = useState<Record<number, string>>({});

  const atalhos: { label: Periodo; de: string; ate: string }[] = [
    { label: "Hoje", de: today, ate: today },
    { label: "Esta semana", de: today, ate: addDaysISO(today, 6) },
    { label: "Este mês", de: mesIni, ate: mesFim },
    { label: "Mês anterior", ...(([de, ate]) => ({ de, ate }))(monthRangeISO(today, -1)) },
    { label: "Próx. 30 dias", de: today, ate: addDaysISO(today, 30) },
  ];

  function trocarMes(delta: number) {
    const [de, ate] = monthRangeISO(from, delta);
    setFrom(de);
    setTo(ate);
    setPeriodo("Personalizado");
  }

  const passaFiltro = (l: LancamentoRow) => {
    if (filtro === "Pagas") return l.status === "pago";
    if (filtro === "Vencidas") return l.status === "aberto" && l.vencimento < today;
    if (filtro === "Em aberto") return l.status === "aberto" && l.vencimento >= today;
    return true;
  };

  const { rec, pay, diaR, diaP, vencidasTotal } = useMemo(() => {
    const porVenc = (a: LancamentoRow, b: LancamentoRow) => a.vencimento.localeCompare(b.vencimento) || a.id - b.id;
    const noPeriodo = lancamentosList.filter((l) => l.vencimento >= from && l.vencimento <= to && passaFiltro(l)).sort(porVenc);
    const doDia = lancamentosList.filter((l) => l.vencimento === today).sort(porVenc);
    return {
      rec: noPeriodo.filter((l) => l.tipo === "receber"),
      pay: noPeriodo.filter((l) => l.tipo === "pagar"),
      diaR: doDia.filter((l) => l.tipo === "receber"),
      diaP: doDia.filter((l) => l.tipo === "pagar"),
      vencidasTotal: lancamentosList.filter((l) => l.status === "aberto" && l.vencimento < today).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancamentosList, from, to, filtro, today]);

  const recT = totais(rec);
  const payT = totais(pay);
  const saldo = (a: number, b: number) => (a - b < 0 ? "−" : "") + formatBRL(Math.abs(a - b));

  function abrirBaixa(l: LancamentoRow) {
    setBaixaItem(l);
    setPagoEm(today);
    setValorPagoReais(centsToInput(l.valor));
    setBaixaErro("");
  }

  async function salvarNovo() {
    setSalvando(true);
    setNovoErro("");
    const res = await criarLancamentoPagarAction({ fornecedor, descricao, vencimento, valorReais });
    setSalvando(false);
    if (res && "error" in res && res.error) {
      setNovoErro(res.error);
      return;
    }
    setAviso(`Conta a pagar lançada: ${fornecedor.trim()} · ${descricao.trim()}.`);
    setNovoAberto(false);
    setFornecedor("");
    setDescricao("");
    setValorReais("");
    setVencimento(today);
  }

  async function confirmarBaixa() {
    if (!baixaItem) return;
    if (!pagoEm) {
      setBaixaErro("Informe a data do pagamento.");
      return;
    }
    setSalvando(true);
    setBaixaErro("");
    const res = await darBaixaLancamentoAction({ lancamentoId: baixaItem.id, pagoEm, valorPagoReais });
    setSalvando(false);
    if (res && "error" in res && res.error) {
      setBaixaErro(res.error);
      return;
    }
    const { who, what } = quemEOque(baixaItem);
    setAviso(`Baixa feita: ${who}${what ? ` · ${what}` : ""} · ${valorPagoReais.startsWith("R$") ? valorPagoReais : `R$ ${valorPagoReais}`} em ${formatDateBR(pagoEm).slice(0, 5)}.`);
    setBaixaItem(null);
  }

  async function excluir(id: number) {
    const res = await excluirLancamentoAction(id);
    setExcluirId(null);
    if (res && "error" in res && res.error) {
      setAviso(res.error);
      return;
    }
    setAviso("Conta excluída.");
  }

  function Linha({ l, cor }: { l: LancamentoRow; cor: string }) {
    const st = situacao(l, today);
    const { who, what } = quemEOque(l);
    const aberto = l.status === "aberto";
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 border-t border-[#E3E8EF]">
        <div className="min-w-0 flex-1 basis-48">
          <div className="text-sm font-extrabold leading-tight">{who}</div>
          <div className="text-xs font-medium text-[#3A4658] mt-0.5">
            {what ? `${what} · ` : ""}vence {formatDateBR(l.vencimento).slice(0, 5)}
          </div>
          {cobradas[l.id] && <div className="text-[11px] font-bold text-[#14653A] mt-0.5">WhatsApp aberto hoje às {cobradas[l.id]}</div>}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-right">
            <div className={`text-[15px] font-extrabold ${cor}`}>{formatBRL(l.valor)}</div>
            <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${CHIP[st]}`}>{st}</span>
          </div>
          {aberto && l.tipo === "receber" && excluirId !== l.id && (
            <button onClick={() => setCobrar(contaCobranca(l))} aria-label={`Cobrar ${who} por WhatsApp`} className="min-h-[44px] rounded-full border-[1.5px] border-[#0F1720] px-3.5 text-xs font-bold">
              Cobrar
            </button>
          )}
          {aberto && excluirId !== l.id && (
            <button onClick={() => abrirBaixa(l)} className="min-h-[44px] rounded-full border-[1.5px] border-[#0F1720] px-3.5 text-xs font-bold">
              Dar baixa
            </button>
          )}
          {aberto && l.tipo === "pagar" && excluirId !== l.id && (
            <button onClick={() => setExcluirId(l.id)} aria-label={`Excluir conta ${who}`} className="w-11 h-11 rounded-full text-[#8E1B10] flex items-center justify-center hover:bg-[#FDE4E1]">
              <X className="w-4 h-4" />
            </button>
          )}
          {excluirId === l.id && (
            <div className="flex items-center gap-1.5" role="group" aria-label="Confirmar exclusão">
              <span className="text-xs font-bold text-[#8E1B10]">Excluir?</span>
              <button onClick={() => excluir(l.id)} className="min-h-[44px] rounded-full bg-[#8E1B10] text-white px-3.5 text-xs font-bold">Sim</button>
              <button onClick={() => setExcluirId(null)} className="min-h-[44px] rounded-full border-[1.5px] border-[#0F1720] px-3.5 text-xs font-bold">Não</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function LinhaDia({ l, cor }: { l: LancamentoRow; cor: string }) {
    const st = situacao(l, today);
    const { who, what } = quemEOque(l);
    return (
      <div className="flex items-center justify-between gap-3 py-2.5 px-1 border-b border-[#E3E8EF]">
        <div className="min-w-0">
          <div className="text-sm font-extrabold">{who}</div>
          {what && <div className="text-xs font-medium text-[#3A4658]">{what}</div>}
          {cobradas[l.id] && <div className="text-[11px] font-bold text-[#14653A] mt-0.5">WhatsApp aberto hoje às {cobradas[l.id]}</div>}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {l.status === "aberto" && l.tipo === "receber" && (
            <button onClick={() => setCobrar(contaCobranca(l))} aria-label={`Cobrar ${who} por WhatsApp`} className="min-h-[44px] rounded-full border-[1.5px] border-[#0F1720] px-3.5 text-xs font-bold">
              Cobrar
            </button>
          )}
          <div className="text-right">
            <div className={`text-sm font-extrabold ${cor}`}>{formatBRL(l.valor)}</div>
            <span className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CHIP[st]}`}>{st}</span>
          </div>
        </div>
      </div>
    );
  }

  function Coluna({ titulo, rotulo, Icone, cabecalho, cor, itens, t, feitoLabel }: {
    titulo: string; rotulo: string; Icone: typeof ArrowDownLeft; cabecalho: string; cor: string;
    itens: LancamentoRow[]; t: ReturnType<typeof totais>; feitoLabel: string;
  }) {
    return (
      <section className="flex-1 basis-[440px] min-w-0 bg-white rounded-[24px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] overflow-hidden flex flex-col">
        <div className={`flex items-center justify-between gap-2 px-5 py-3.5 ${cabecalho}`}>
          <h2 className="m-0 text-[17px] font-extrabold">{titulo}</h2>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold"><Icone className="w-4 h-4" aria-hidden="true" /> {rotulo}</span>
        </div>
        <div className="px-5 pt-1.5 flex-1">
          {itens.map((l) => <Linha key={l.id} l={l} cor={cor} />)}
          {itens.length === 0 && <div className="py-6 text-center text-[13px] font-semibold text-[#3A4658]">Nenhuma conta neste período e filtro.</div>}
        </div>
        <div className="mx-5 mt-2 border-t-2 border-[#0F1720] pt-3 pb-4 flex flex-col gap-1">
          <div className="flex justify-between text-[15px] font-extrabold"><span>Total do período</span><span>{formatBRL(t.total)}</span></div>
          <div className="flex justify-between text-[13px] font-semibold text-[#3A4658]"><span>{feitoLabel}</span><span>{formatBRL(t.feito)}</span></div>
          <div className="flex justify-between text-[13px] font-semibold text-[#3A4658]"><span>Em aberto (inclui vencidas)</span><span>{formatBRL(t.aberto)}</span></div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold m-0">Financeiro</h1>
          <div className="text-sm font-semibold text-[#3A4658] mt-1">Contas a receber e a pagar da Dedetizadora Impacto.</div>
        </div>
        <button onClick={() => { setNovoAberto(true); setNovoErro(""); }} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">
          + Nova conta a pagar
        </button>
      </div>

      {aviso && (
        <div role="status" className="flex items-center justify-between gap-2 bg-[#DDF3E4] text-[#14653A] rounded-2xl pl-4 pr-2 py-1.5 text-sm font-bold">
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} aria-label="Fechar aviso" className="w-11 h-11 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Contas do dia */}
      <section className="bg-white rounded-[24px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] overflow-hidden">
        <button
          onClick={() => setDiaAberto(!diaAberto)}
          aria-expanded={diaAberto}
          aria-controls="contas-do-dia"
          className="w-full flex flex-wrap items-center justify-between gap-3 px-[22px] py-[18px] bg-white text-left"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-extrabold">Contas do dia · {formatDiaExtenso(today)}</span>
            <span className="text-[13px] font-semibold text-[#3A4658]">
              Entram {formatBRL(soma(diaR))} ({diaR.length}) · saem {formatBRL(soma(diaP))} ({diaP.length}) · {vencidasTotal} conta(s) vencida(s) no total
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#1B47B5]">
            {diaAberto ? "Recolher" : "Expandir"}
            <ChevronDown className={`w-[18px] h-[18px] transition-transform ${diaAberto ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </button>
        {diaAberto && (
          <div id="contas-do-dia" className="flex flex-wrap gap-4 px-[22px] pb-[22px] pt-1">
            <div className="flex-1 basis-[340px] min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#14653A] bg-[#DDF3E4] rounded-xl px-3 py-2">
                <ArrowDownLeft className="w-4 h-4" aria-hidden="true" /> Entradas de hoje · {formatBRL(soma(diaR))}
              </div>
              {diaR.map((l) => <LinhaDia key={l.id} l={l} cor="text-[#14653A]" />)}
              {diaR.length === 0 && <div className="py-3.5 px-1 text-[13px] font-semibold text-[#3A4658]">Nada a receber hoje.</div>}
            </div>
            <div className="flex-1 basis-[340px] min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#8E1B10] bg-[#FDE4E1] rounded-xl px-3 py-2">
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" /> Saídas de hoje · {formatBRL(soma(diaP))}
              </div>
              {diaP.map((l) => <LinhaDia key={l.id} l={l} cor="text-[#8E1B10]" />)}
              {diaP.length === 0 && <div className="py-3.5 px-1 text-[13px] font-semibold text-[#3A4658]">Nada a pagar hoje.</div>}
            </div>
          </div>
        )}
      </section>

      {/* Filtros */}
      <section className="bg-white rounded-[24px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] p-[22px] flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold text-[#3A4658]">Período</div>
            <div role="group" aria-label="Atalhos de período" className="flex flex-wrap gap-2">
              {atalhos.map((a) => {
                const on = periodo === a.label;
                return (
                  <button
                    key={a.label}
                    aria-pressed={on}
                    onClick={() => { setPeriodo(a.label); setFrom(a.de); setTo(a.ate); }}
                    className={`min-h-[44px] rounded-full px-4 text-[13px] font-bold ${on ? "bg-[#0F1720] text-white" : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"}`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div role="group" aria-label="Trocar de mês" className="flex items-center gap-1">
            <button onClick={() => trocarMes(-1)} aria-label="Mês anterior" className="w-11 h-11 rounded-full border-[1.5px] border-[#C9D3E0] bg-white flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => trocarMes(1)} aria-label="Próximo mês" className="w-11 h-11 rounded-full border-[1.5px] border-[#C9D3E0] bg-white flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <label className={`${labelCls} basis-40 min-w-0`}>
            De
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPeriodo("Personalizado"); }} className={inputCls} />
          </label>
          <label className={`${labelCls} basis-40 min-w-0`}>
            Até
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPeriodo("Personalizado"); }} className={inputCls} />
          </label>
          <label className={`${labelCls} basis-44 min-w-0`}>
            Situação
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className={inputCls}>
              {(["Todas", "Em aberto", "Vencidas", "Pagas"] as Filtro[]).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
        <div className="text-[13px] font-semibold text-[#3A4658]">
          Mostrando {formatDateBR(from)} a {formatDateBR(to)} · {rec.length} a receber, {pay.length} a pagar
        </div>
      </section>

      <div className="flex flex-wrap gap-5 items-stretch">
        <Coluna titulo="A receber" rotulo="Entrada" Icone={ArrowDownLeft} cabecalho="bg-[#DDF3E4] text-[#14653A]" cor="text-[#14653A]" itens={rec} t={recT} feitoLabel="Recebido" />
        <Coluna titulo="A pagar" rotulo="Saída" Icone={ArrowUpRight} cabecalho="bg-[#FDE4E1] text-[#8E1B10]" cor="text-[#8E1B10]" itens={pay} t={payT} feitoLabel="Pago" />
      </div>

      <section className="bg-[#0F1720] text-white rounded-[24px] px-6 py-5 flex flex-wrap gap-5 justify-between items-center">
        <div>
          <div className="text-[13px] font-semibold text-[#C9D3E0]">Saldo previsto do período (a receber − a pagar)</div>
          <div className="text-[30px] font-extrabold leading-tight">{saldo(recT.total, payT.total)}</div>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#C9D3E0]">Saldo realizado (recebido − pago)</div>
          <div className="text-[30px] font-extrabold leading-tight">{saldo(recT.feito, payT.feito)}</div>
        </div>
      </section>

      {novoAberto && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="novo-titulo" className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3.5 text-[#0F1720]">
            <div className="flex justify-between items-center">
              <h2 id="novo-titulo" className="text-[22px] font-extrabold m-0">Nova conta a pagar</h2>
              <button onClick={() => setNovoAberto(false)} aria-label="Fechar" className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <label className={labelCls}>Fornecedor<input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Aliança Químicos" className={inputCls} /></label>
            <label className={labelCls}>Descrição<input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Reposição de produtos químicos" className={inputCls} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>Vencimento<input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className={inputCls} /></label>
              <label className={labelCls}>Valor (R$)<input value={valorReais} onChange={(e) => setValorReais(e.target.value)} placeholder="1.280,00" inputMode="decimal" className={inputCls} /></label>
            </div>
            {novoErro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold">{novoErro}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setNovoAberto(false)} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Cancelar</button>
              <button type="button" disabled={salvando} onClick={salvarNovo} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 font-bold text-sm disabled:opacity-60">{salvando ? "Salvando..." : "Salvar conta"}</button>
            </div>
          </div>
        </div>
      )}

      {cobrar && (
        <CobrancaModal
          key={cobrar.id}
          conta={cobrar}
          hoje={today}
          pix={pix}
          onClose={() => setCobrar(null)}
          onAberto={(id, hora) => setCobradas((p) => ({ ...p, [id]: hora }))}
        />
      )}

      {baixaItem && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="baixa-titulo" className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3.5 text-[#0F1720]">
            <div className="flex justify-between items-center">
              <h2 id="baixa-titulo" className="text-[22px] font-extrabold m-0">Dar baixa</h2>
              <button onClick={() => setBaixaItem(null)} aria-label="Fechar" className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="text-[13px] font-bold bg-[#F4F7FB] px-3.5 py-2.5 rounded-[14px]">
              {(() => { const q = quemEOque(baixaItem); return `${q.who}${q.what ? ` · ${q.what}` : ""}`; })()}
              <div className="text-xs font-semibold text-[#3A4658] mt-0.5">Vence {formatDateBR(baixaItem.vencimento)} · {formatBRL(baixaItem.valor)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>Data do pagamento<input type="date" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} className={inputCls} /></label>
              <label className={labelCls}>Valor pago (R$)<input value={valorPagoReais} onChange={(e) => setValorPagoReais(e.target.value)} inputMode="decimal" className={inputCls} /></label>
            </div>
            {baixaErro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold">{baixaErro}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setBaixaItem(null)} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Cancelar</button>
              <button type="button" disabled={salvando} onClick={confirmarBaixa} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold disabled:opacity-60">{salvando ? "Salvando..." : "Confirmar baixa"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
