"use client";

import { useState } from "react";
import { criarLancamentoPagarAction, darBaixaLancamentoAction, excluirLancamentoAction } from "@/actions";
import { addDaysISO, formatBRL, formatDateBR } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, X } from "lucide-react";

export function FinanceiroView({ today, lancamentosList }: { today: string; lancamentosList: any[] }) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(addDaysISO(monthStart, 35));
  const [statusFilter, setStatusFilter] = useState("Todas");

  const [newOpen, setNewOpen] = useState(false);
  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [vencimento, setVencimento] = useState(today);
  const [valorReais, setValorReais] = useState("");

  const [baixaItem, setBaixaItem] = useState<any | null>(null);
  const [pagoEm, setPagoEm] = useState(today);
  const [valorPagoReais, setValorPagoReais] = useState("");

  const filterFn = (l: any) => {
    const inPer = l.vencimento >= from && l.vencimento <= to;
    if (!inPer) return false;
    if (statusFilter === "Pagas") return l.status === "pago";
    if (statusFilter === "Vencidas") return l.status === "aberto" && l.vencimento < today;
    if (statusFilter === "Em aberto") return l.status === "aberto";
    return true;
  };

  const recList = lancamentosList.filter((l) => l.tipo === "receber" && filterFn(l));
  const payList = lancamentosList.filter((l) => l.tipo === "pagar" && filterFn(l));

  const sum = (arr: any[]) => arr.reduce((a, b) => a + b.valor, 0);
  const recTotal = sum(recList);
  const recDone = sum(recList.filter((x) => x.status === "pago"));
  const payTotal = sum(payList);
  const payDone = sum(payList.filter((x) => x.status === "pago"));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold">Financeiro</h1>
        <button onClick={() => setNewOpen(true)} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">+ Novo lançamento a pagar</button>
      </div>

      <section className="bg-white rounded-[24px] p-4 shadow-sm flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold">De<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold">Até<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 border rounded-xl px-3 text-sm bg-white">
            <option value="Todas">Todas</option><option value="Em aberto">Em aberto</option><option value="Vencidas">Vencidas</option><option value="Pagas">Pagas</option>
          </select>
        </label>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#DDF3E4] text-[#14653A] font-extrabold">
            <span>A receber</span><span className="inline-flex items-center gap-1 text-xs"><ArrowDownLeft className="w-4 h-4" /> Entrada</span>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-2">
            {recList.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b">
                <div>
                  <div className="text-sm font-extrabold">{r.descricao}</div>
                  <div className="text-xs text-[#3A4658]">Vence {formatDateBR(r.vencimento)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#14653A]">{formatBRL(r.valor)}</span>
                  {r.status === "aberto" ? (
                    <button onClick={() => { setBaixaItem(r); setPagoEm(today); setValorPagoReais(String(r.valor / 100)); }} className="min-h-[38px] rounded-full border border-[#0F1720] px-3 text-xs font-bold">Dar baixa</button>
                  ) : <span className="text-xs font-bold text-[#14653A] bg-[#DDF3E4] px-2.5 py-1 rounded-full">Pago</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mx-5 border-t-2 border-[#0F1720] py-3 text-xs font-bold flex justify-between">
            <span>Total: {formatBRL(recTotal)}</span><span>Recebido: {formatBRL(recDone)}</span>
          </div>
        </section>

        <section className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#FDE4E1] text-[#8E1B10] font-extrabold">
            <span>A pagar</span><span className="inline-flex items-center gap-1 text-xs"><ArrowUpRight className="w-4 h-4" /> Saída</span>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-2">
            {payList.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b">
                <div>
                  <div className="text-sm font-extrabold">{p.fornecedor} · {p.descricao}</div>
                  <div className="text-xs text-[#3A4658]">Vence {formatDateBR(p.vencimento)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#8E1B10]">{formatBRL(p.valor)}</span>
                  {p.status === "aberto" ? (
                    <>
                      <button onClick={() => { setBaixaItem(p); setPagoEm(today); setValorPagoReais(String(p.valor / 100)); }} className="min-h-[38px] rounded-full border border-[#0F1720] px-3 text-xs font-bold">Dar baixa</button>
                      <button onClick={() => excluirLancamentoAction(p.id)} className="text-[#8E1B10] font-bold px-2">×</button>
                    </>
                  ) : <span className="text-xs font-bold text-[#14653A] bg-[#DDF3E4] px-2.5 py-1 rounded-full">Pago</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mx-5 border-t-2 border-[#0F1720] py-3 text-xs font-bold flex justify-between">
            <span>Total: {formatBRL(payTotal)}</span><span>Pago: {formatBRL(payDone)}</span>
          </div>
        </section>
      </div>

      <section className="bg-[#0F1720] text-white rounded-[24px] p-5 flex flex-wrap justify-between gap-4">
        <div><div className="text-xs text-[#C9D3E0]">Saldo previsto</div><div className="text-2xl font-extrabold">{formatBRL(recTotal - payTotal)}</div></div>
        <div><div className="text-xs text-[#C9D3E0]">Saldo realizado</div><div className="text-2xl font-extrabold">{formatBRL(recDone - payDone)}</div></div>
      </section>

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16">
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3">
            <div className="flex justify-between items-center"><h2 className="text-xl font-extrabold">Nova conta a pagar</h2><button onClick={() => setNewOpen(false)}><X className="w-5 h-5" /></button></div>
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Fornecedor" className="h-11 border rounded-xl px-3 text-sm" />
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" className="h-11 border rounded-xl px-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
              <input value={valorReais} onChange={(e) => setValorReais(e.target.value)} placeholder="Valor (R$)" className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            <button onClick={async () => { await criarLancamentoPagarAction({ fornecedor, descricao, vencimento, valorReais }); setNewOpen(false); }} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Salvar</button>
          </div>
        </div>
      )}

      {baixaItem && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16">
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3">
            <h2 className="text-xl font-extrabold">Confirmar baixa</h2>
            <div className="text-xs font-bold bg-[#F4F7FB] p-3 rounded-xl">{baixaItem.descricao}</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
              <input value={valorPagoReais} onChange={(e) => setValorPagoReais(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBaixaItem(null)} className="min-h-[44px] border rounded-full px-4 text-xs font-bold">Cancelar</button>
              <button onClick={async () => { await darBaixaLancamentoAction({ lancamentoId: baixaItem.id, pagoEm, valorPagoReais }); setBaixaItem(null); }} className="min-h-[44px] rounded-full bg-[#14653A] text-white px-5 text-xs font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
