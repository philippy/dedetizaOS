"use client";

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
              <button key={t} onClick={() => setTipoFilter(t)} className={`min-h-[48px] rounded-full px-5 text-xs font-bold ${tipoFilter === t ? "bg-[#0F1720] text-white" : "border bg-[#F4F7FB]"}`}>{t}</button>
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
                      <Link href={`/clientes/${c.id}`} className="min-h-[40px] inline-flex items-center px-4 rounded-full border border-[#0F1720] text-xs font-bold">Ficha</Link>
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
                <button key={k} type="button" onClick={() => setTipo(k)} className={`flex-1 min-h-[44px] rounded-full text-xs font-bold ${tipo === k ? "bg-[#0F1720] text-white" : "border"}`}>{k === "PJ" ? "Empresa (PJ)" : "Residencial (PF)"}</button>
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
