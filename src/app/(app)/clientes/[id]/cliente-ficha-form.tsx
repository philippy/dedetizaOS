"use client";

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
