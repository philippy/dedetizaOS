"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { salvarClienteAction, salvarServicoAction } from "@/actions";
import { centsToInput, formatBRL, todaySP } from "@/lib/utils";
import { HORARIOS } from "@/lib/agenda";

export function NovoServicoModal({ clientes, tipos, tecnicos, triggerLabel = "Novo serviço" }: { clientes: any[]; tipos: any[]; tecnicos: any[]; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "newClient">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [clienteId, setClienteId] = useState<number>(clientes[0]?.id || 0);
  const [tipoId, setTipoId] = useState<number>(tipos[0]?.id || 0);
  const [tecnicoId, setTecnicoId] = useState<number>(tecnicos[0]?.id || 0);
  const [data, setData] = useState<string>(todaySP());
  const [hora, setHora] = useState<string>("08:00");
  const [valorReais, setValorReais] = useState<string>(tipos[0] ? centsToInput(tipos[0].preco) : "");
  const [observacoes, setObservacoes] = useState("");

  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"PJ" | "PF">("PJ");
  const [novoWhatsapp, setNovoWhatsapp] = useState("");
  const [novoEndereco, setNovoEndereco] = useState("");

  async function handleSalvarNovoCliente() {
    setError("");
    setLoading(true);
    const res = await salvarClienteAction({ tipo: novoTipo, nome: novoNome, whatsapp: novoWhatsapp, endereco: novoEndereco, documento: "", email: "", observacoes: "" });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.cliente) { setClienteId(res.cliente.id); setStep("form"); }
  }

  async function handleSalvarServico() {
    setError("");
    setLoading(true);
    const res = await salvarServicoAction({ clienteId, tipoServicoId: tipoId, tecnicoId, data, hora, valorReais, observacoes });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => { setError(""); setStep("form"); setOpen(true); }} className="min-h-[48px] flex items-center gap-2 rounded-full bg-[#2F5FE0] hover:bg-[#1B47B5] text-white px-5 text-sm font-bold shadow-md transition">
        <Plus className="w-4 h-4" /> {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-label={step === "form" ? "Novo serviço" : "Novo cliente"} className="w-full max-w-[560px] bg-white rounded-[28px] p-6 flex flex-col gap-4 text-[#0F1720] shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{step === "form" ? "Novo serviço" : "Novo cliente"}</h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            {step === "form" ? (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 min-w-[200px] flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Cliente
                    <select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      <option value={0}>Selecione o cliente</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => setStep("newClient")} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-4 text-xs font-bold">+ Cadastrar novo</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Tipo de serviço
                    <select value={tipoId} onChange={(e) => { const id = Number(e.target.value); setTipoId(id); const f = tipos.find((t) => t.id === id); if (f) setValorReais(centsToInput(f.preco)); }} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome} ({formatBRL(t.preco)})</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Técnico
                    <select value={tecnicoId} onChange={(e) => setTecnicoId(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Horário
                    <select value={hora} onChange={(e) => setHora(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      {HORARIOS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Valor (R$)<input value={valorReais} onChange={(e) => setValorReais(e.target.value)} inputMode="decimal" className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm" /></label>
                </div>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Observações<input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm" /></label>
                {error && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Cancelar</button>
                  <button type="button" disabled={loading} onClick={handleSalvarServico} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">{loading ? "Salvando..." : "Salvar serviço"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  {(["PJ", "PF"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setNovoTipo(k)} className={`flex-1 min-h-[44px] rounded-full text-xs font-bold ${novoTipo === k ? "bg-[#0F1720] text-white" : "border-[1.5px] border-[#C9D3E0]"}`}>
                      {k === "PJ" ? "PJ · Empresa" : "PF · Residencial"}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Nome<input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">WhatsApp<input value={novoWhatsapp} onChange={(e) => setNovoWhatsapp(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Endereço<input value={novoEndereco} onChange={(e) => setNovoEndereco(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
                {error && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setStep("form")} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Voltar</button>
                  <button type="button" onClick={handleSalvarNovoCliente} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Salvar cliente</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
