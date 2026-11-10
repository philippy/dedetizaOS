// parte2.mjs — Clientes, Financeiro, Campanhas + Build Local + Push para Vercel
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const files = {
  "src/app/(app)/clientes/page.tsx": `import { db } from "@/db";
import { clientes, servicos, lancamentos } from "@/db/schema";
import { ClientesView } from "./clientes-view";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [allClientes, allServicos, allLancamentos] = await Promise.all([
    db.select().from(clientes),
    db.select().from(servicos),
    db.select().from(lancamentos),
  ]);

  const rows = allClientes.map((c) => {
    const svcsCliente = allServicos.filter((s) => s.clienteId === c.id && s.status !== "cancelado").sort((a, b) => b.dataHora.localeCompare(a.dataHora));
    const pagoTotal = allLancamentos.filter((l) => l.clienteId === c.id && l.tipo === "receber" && l.status === "pago").reduce((acc, l) => acc + l.valor, 0);
    return { ...c, ultimoServico: svcsCliente[0]?.dataHora.slice(0, 10) || null, totalPago: pagoTotal };
  });

  return <ClientesView clientesList={rows} />;
}
`,

  "src/app/(app)/clientes/clientes-view.tsx": `"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarClienteAction, excluirClienteAction } from "@/actions";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { X } from "lucide-react";

export function ClientesView({ clientesList }: { clientesList: any[] }) {
  const [q, setQ] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"Todos" | "PJ" | "PF">("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [tipo, setTipo] = useState<"PJ" | "PF">("PJ");
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState("");

  const filtered = clientesList.filter((c) => {
    const matchTipo = tipoFilter === "Todos" || c.tipo === tipoFilter;
    const matchQ = !q.trim() || c.nome.toLowerCase().includes(q.trim().toLowerCase()) || c.whatsapp.includes(q.trim());
    return matchTipo && matchQ;
  });

  async function handleSave() {
    setError("");
    const res = await salvarClienteAction({ tipo, nome, documento, whatsapp, email, endereco, observacoes });
    if (res.error) { setError(res.error); return; }
    setNome(""); setDocumento(""); setWhatsapp(""); setEmail(""); setEndereco(""); setObservacoes("");
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold">Clientes</h1>
        <button onClick={() => setModalOpen(true)} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Cadastrar cliente</button>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou WhatsApp..." className="flex-1 min-w-[220px] h-12 border rounded-[14px] px-3.5 text-sm" />
          <div className="flex gap-2">
            {(["Todos", "PJ", "PF"] as const).map((t) => (
              <button key={t} onClick={() => setTipoFilter(t)} className={\`min-h-[48px] rounded-full px-5 text-xs font-bold \${tipoFilter === t ? "bg-[#0F1720] text-white" : "border bg-[#F4F7FB]"}\`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2.5">Cliente</th><th className="p-2.5">WhatsApp</th><th className="p-2.5">Endereço</th><th className="p-2.5">Último serviço</th><th className="p-2.5">Total pago</th><th className="p-2.5 text-right">Ação</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3"><div className="font-extrabold">{c.nome}</div><span className="text-xs font-bold text-[#1B47B5]">{c.tipo}</span></td>
                  <td className="p-3 font-semibold">{c.whatsapp}</td>
                  <td className="p-3 text-xs text-[#3A4658]">{c.endereco || "—"}</td>
                  <td className="p-3">{c.ultimoServico ? formatDateBR(c.ultimoServico) : "Sem serviço"}</td>
                  <td className="p-3 font-extrabold text-[#14653A]">{formatBRL(c.totalPago)}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link href={\`/clientes/\${c.id}\`} className="min-h-[40px] inline-flex items-center px-4 rounded-full border border-[#0F1720] text-xs font-bold">Ficha</Link>
                      <button onClick={() => excluirClienteAction(c.id)} className="min-h-[40px] px-3 rounded-full text-xs font-bold text-[#8E1B10]">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12">
          <div className="w-full max-w-[520px] bg-white rounded-[28px] p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Cadastrar cliente</h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2">
              {(["PJ", "PF"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setTipo(k)} className={\`flex-1 min-h-[44px] rounded-full text-xs font-bold \${tipo === k ? "bg-[#0F1720] text-white" : "border"}\`}>{k === "PJ" ? "Empresa (PJ)" : "Residencial (PF)"}</button>
              ))}
            </div>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome ou razão social" className="h-12 border rounded-xl px-3.5 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="CPF ou CNPJ" className="h-12 border rounded-xl px-3.5 text-sm" />
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (11) 90000-0000" className="h-12 border rounded-xl px-3.5 text-sm" />
            </div>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço completo" className="h-12 border rounded-xl px-3.5 text-sm" />
            <textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações / Serviços contratados" className="border rounded-xl p-3 text-sm" />
            {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="min-h-[44px] border rounded-full px-5 text-sm font-bold">Cancelar</button>
              <button onClick={handleSave} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`,

  "src/app/(app)/clientes/[id]/page.tsx": `import { notFound } from "next/navigation";
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
`,

  "src/app/(app)/clientes/[id]/cliente-ficha-form.tsx": `"use client";

import { useState } from "react";
import { salvarClienteAction } from "@/actions";

export function ClienteFichaForm({ cliente }: { cliente: any }) {
  const [tipo, setTipo] = useState<"PF" | "PJ">(cliente.tipo);
  const [nome, setNome] = useState(cliente.nome);
  const [documento, setDocumento] = useState(cliente.documento || "");
  const [whatsapp, setWhatsapp] = useState(cliente.whatsapp);
  const [email, setEmail] = useState(cliente.email || "");
  const [endereco, setEndereco] = useState(cliente.endereco || "");
  const [observacoes, setObservacoes] = useState(cliente.observacoes || "");
  const [msg, setMsg] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await salvarClienteAction({ id: cliente.id, tipo, nome, documento, whatsapp, email, endereco, observacoes });
    if (!res.error) setMsg("Dados salvos com sucesso!");
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
      <h2 className="text-[17px] font-extrabold">Dados do cliente</h2>
      {msg && <div className="bg-[#DDF3E4] text-[#14653A] rounded-xl p-2.5 text-xs font-bold">{msg}</div>}
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="h-11 border rounded-xl px-3 text-sm" />
      <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="CPF/CNPJ" className="h-11 border rounded-xl px-3 text-sm" />
      <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp" className="h-11 border rounded-xl px-3 text-sm" />
      <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Endereço" className="h-11 border rounded-xl px-3 text-sm" />
      <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="border rounded-xl p-3 text-sm" />
      <button type="submit" className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Salvar alterações</button>
    </form>
  );
}
`,

  "src/app/(app)/financeiro/page.tsx": `import { db } from "@/db";
import { lancamentos } from "@/db/schema";
import { todaySP } from "@/lib/utils";
import { FinanceiroView } from "./financeiro-view";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const list = await db.select().from(lancamentos);
  return <FinanceiroView today={todaySP()} lancamentosList={list} />;
}
`,

  "src/app/(app)/financeiro/financeiro-view.tsx": `"use client";

import { useState } from "react";
import { criarLancamentoPagarAction, darBaixaLancamentoAction, excluirLancamentoAction } from "@/actions";
import { addDaysISO, formatBRL, formatDateBR } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, X } from "lucide-react";

export function FinanceiroView({ today, lancamentosList }: { today: string; lancamentosList: any[] }) {
  const monthStart = \`\${today.slice(0, 7)}-01\`;
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
`,

  "src/app/(app)/campanhas/page.tsx": `import { db } from "@/db";
import { campanhas, inscricoes } from "@/db/schema";
import { CampanhasView } from "./campanhas-view";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const [allCamps, allInsc] = await Promise.all([db.select().from(campanhas), db.select().from(inscricoes)]);
  const rows = allCamps.map((c) => {
    const insc = allInsc.filter((i) => i.campanhaId === c.id);
    const receitaPaga = insc.filter((i) => i.pago).reduce((acc, i) => acc + i.valor, 0);
    return { ...c, inscritosCount: insc.length, receitaPaga };
  });
  return <CampanhasView campanhasList={rows} />;
}
`,

  "src/app/(app)/campanhas/campanhas-view.tsx": `"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarCampanhaAction } from "@/actions";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import { X } from "lucide-react";

export function CampanhasView({ campanhasList }: { campanhasList: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [dataInicio, setDataInicio] = useState(todaySP());
  const [dataFim, setDataFim] = useState(todaySP());
  const [descontoPct, setDescontoPct] = useState("20");
  const [unidades, setUnidades] = useState("30");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold">Campanhas</h1>
        <button onClick={() => setModalOpen(true)} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Nova campanha</button>
      </div>
      <section className="bg-white rounded-[24px] p-5 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2.5">Campanha</th><th className="p-2.5">Período</th><th className="p-2.5">Inscritos</th><th className="p-2.5">Desconto</th><th className="p-2.5">Receita paga</th><th className="p-2.5 text-right">Ação</th></tr></thead>
          <tbody>
            {campanhasList.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3"><div className="font-extrabold">{c.nome}</div><div className="text-xs text-[#3A4658]">{c.local}</div></td>
                <td className="p-3">{formatDateBR(c.dataInicio)} a {formatDateBR(c.dataFim)}</td>
                <td className="p-3 font-bold">{c.inscritosCount} de {c.unidades}</td>
                <td className="p-3 font-bold">{c.descontoPct}%</td>
                <td className="p-3 font-extrabold text-[#14653A]">{formatBRL(c.receitaPaga)}</td>
                <td className="p-3 text-right"><Link href={\`/campanhas/\${c.id}\`} className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-[#0F1720] text-white text-xs font-bold">Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-14">
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3">
            <div className="flex justify-between items-center"><h2 className="text-xl font-extrabold">Nova campanha</h2><button onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button></div>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do condomínio" className="h-11 border rounded-xl px-3 text-sm" />
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Endereço / Local" className="h-11 border rounded-xl px-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={descontoPct} onChange={(e) => setDescontoPct(e.target.value)} placeholder="Desconto %" className="h-11 border rounded-xl px-3 text-sm" />
              <input type="number" value={unidades} onChange={(e) => setUnidades(e.target.value)} placeholder="Nº unidades" className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            <button onClick={async () => { await salvarCampanhaAction({ nome, local, dataInicio, dataFim, descontoPct: Number(descontoPct), unidades: Number(unidades) }); setModalOpen(false); }} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Criar campanha</button>
          </div>
        </div>
      )}
    </div>
  );
}
`,

  "src/app/(app)/campanhas/[id]/page.tsx": `import { notFound } from "next/navigation";
import { db } from "@/db";
import { campanhas, inscricoes, tiposServico } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CampanhaDetalheView } from "./campanha-detalhe-view";

export const dynamic = "force-dynamic";

export default async function CampanhaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campId = Number(id);
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, campId));
  if (!camp) notFound();

  const [inscritos, tipos] = await Promise.all([
    db.select().from(inscricoes).where(eq(inscricoes.campanhaId, campId)),
    db.select().from(tiposServico),
  ]);
  const precoBase = tipos[0]?.preco || 24000;
  const valorComDesconto = Math.round((precoBase / 100) * (1 - camp.descontoPct / 100));

  return <CampanhaDetalheView campanha={camp} inscritos={inscritos} valorSugeridoReais={String(valorComDesconto)} />;
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}
console.log("✅ Parte 2 concluída! Agora rode: node parte3.mjs");
