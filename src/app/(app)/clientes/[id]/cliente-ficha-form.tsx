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
  const [erro, setErro] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = await salvarClienteAction({
      id: cliente.id,
      tipo,
      nome,
      documento,
      whatsapp,
      email,
      endereco,
      observacoes,
    });
    if (res.error) {
      setMsg("");
      setErro(res.error);
      return;
    }
    setErro("");
    setMsg("Dados de " + nome + " salvos com sucesso!");
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3.5"
    >
      <h2 className="text-[17px] font-extrabold">Dados do cliente</h2>
      {erro && (
        <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-2.5 text-xs font-bold">
          {erro}
        </div>
      )}
      {msg && (
        <div className="bg-[#DDF3E4] text-[#14653A] rounded-xl p-2.5 text-xs font-bold">
          {msg}
        </div>
      )}

      <div className="flex gap-2">
        {(["PJ", "PF"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTipo(k)}
            className={`flex-1 min-h-[44px] rounded-full text-xs font-bold ${
              tipo === k
                ? "bg-[#0F1720] text-white"
                : "border-[1.5px] border-[#C9D3E0]"
            }`}
          >
            {k === "PJ" ? "Empresa (PJ)" : "Residencial (PF)"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
        Nome ou razão social
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
          {tipo === "PJ" ? "CNPJ" : "CPF"}
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
          WhatsApp
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
        E-mail
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
        Endereço do serviço
        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
        Observações para o técnico
        <textarea
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="border-[1.5px] border-[#C9D3E0] rounded-[14px] p-3 text-sm"
        />
      </label>

      <button
        type="submit"
        className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm"
      >
        Salvar alterações
      </button>
    </form>
  );
}
