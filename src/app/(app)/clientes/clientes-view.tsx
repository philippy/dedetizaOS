"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarClienteAction, excluirClienteAction } from "@/actions";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { X } from "lucide-react";
import { Modal } from "@/components/modal";

export function ClientesView({ clientesList, verFinanceiro }: { clientesList: any[]; verFinanceiro: boolean }) {
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
  const [aviso, setAviso] = useState("");

  async function excluir(c: { id: number; nome: string }) {
    setAviso("");
    const prev = await excluirClienteAction(c.id);
    if ("error" in prev && prev.error) {
      setAviso(prev.error);
      return;
    }
    if ("precisaConfirmar" in prev && prev.precisaConfirmar) {
      const historico = prev.servicos > 0 || prev.contas > 0
        ? `\n\nIsso apaga também ${prev.servicos} serviço(s) do histórico dele(a). ${prev.contas > 0 ? `As ${prev.contas} conta(s) financeira(s) continuam no Financeiro, sem vínculo com o cliente.` : ""}`
        : "";
      if (!window.confirm(`Excluir o cliente ${prev.nome}?\n\nEsta ação é IRREVERSÍVEL.${historico}`)) return;
      const res = await excluirClienteAction(c.id, true);
      if ("error" in res && res.error) setAviso(res.error);
    }
  }

  const filtered = clientesList.filter((c) => {
    const matchTipo = tipoFilter === "Todos" || c.tipo === tipoFilter;
    const matchQ =
      !q.trim() ||
      c.nome.toLowerCase().includes(q.trim().toLowerCase()) ||
      c.whatsapp.includes(q.trim()) ||
      (c.documento || "").replace(/\D/g, "").includes(q.trim().replace(/\D/g, "") || "\u0000");
    return matchTipo && matchQ;
  });

  async function handleSave() {
    setError("");
    const res = await salvarClienteAction({
      tipo,
      nome,
      documento,
      whatsapp,
      email,
      endereco,
      observacoes,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    setNome("");
    setDocumento("");
    setWhatsapp("");
    setEmail("");
    setEndereco("");
    setObservacoes("");
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold">Clientes</h1>
          <div className="text-sm font-semibold text-[#3A4658] mt-1">
            Empresas e residências atendidas, com histórico e retorno.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/clientes/importar"
            className="min-h-[48px] inline-flex items-center rounded-full border-[1.5px] border-[#0F1720] bg-white text-[#0F1720] px-5 text-sm font-bold hover:bg-slate-50"
          >
            Importar planilha
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
          >
            Cadastrar cliente
          </button>
        </div>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[220px] flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
            Buscar cliente
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, WhatsApp ou CPF/CNPJ..."
              className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720]"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-[#3A4658]">Tipo</span>
            <div className="flex gap-2">
              {(["Todos", "PJ", "PF"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipoFilter(t)}
                  className={`min-h-[48px] rounded-full px-5 text-xs font-bold ${
                    tipoFilter === t
                      ? "bg-[#0F1720] text-white"
                      : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB]"
                  }`}
                >
                  {t === "Todos" ? "Todos" : t === "PJ" ? "Empresa (PJ)" : "Residencial (PF)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-[#3A4658]">
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5">Contato</th>
                <th className="p-2.5">Endereço</th>
                <th className="p-2.5">Último serviço</th>
                {verFinanceiro && <th className="p-2.5">Total pago</th>}
                <th className="p-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={verFinanceiro ? 6 : 5} className="p-6 text-center text-sm font-semibold text-[#3A4658]">
                    Nenhum cliente encontrado{q.trim() ? ` para "${q.trim()}"` : ""}.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-[#E3E8EF]">
                  <td className="p-3">
                    <div className="font-extrabold">{c.nome}</div>
                    <span className="inline-block mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#DCE7FF] text-[#1B47B5]">
                      {c.tipo === "PJ" ? "Empresa" : "Residencial"}
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{c.whatsapp}</td>
                  <td className="p-3 text-xs text-[#3A4658]">{c.endereco || "—"}</td>
                  <td className="p-3">
                    {c.ultimoServico ? formatDateBR(c.ultimoServico) : "Sem serviço"}
                  </td>
                  {verFinanceiro && (
                    <td className="p-3 font-extrabold text-[#14653A]">
                      {formatBRL(c.totalPago)}
                    </td>
                  )}
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="min-h-[40px] inline-flex items-center px-4 rounded-full border-[1.5px] border-[#0F1720] text-xs font-bold"
                      >
                        Gerenciar
                      </Link>
                      <button
                        onClick={() => excluir(c)}
                        className="min-h-[40px] px-3 rounded-full text-xs font-bold text-[#8E1B10]"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {aviso && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{aviso}</div>}

      {modalOpen && (
        <Modal titleId="cli-titulo" onClose={() => setModalOpen(false)}>
          <>
            <div className="flex items-center justify-between">
              <h2 id="cli-titulo" className="text-[22px] font-extrabold">Cadastrar cliente</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              {(["PJ", "PF"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTipo(k)}
                  className={`flex-1 min-h-[48px] rounded-full text-sm font-bold ${
                    tipo === k
                      ? "bg-[#0F1720] text-white"
                      : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB]"
                  }`}
                >
                  {k === "PJ" ? "Empresa" : "Residencial"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Nome ou razão social
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Pet Shop Au Au"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                {tipo === "PJ" ? "CNPJ" : "CPF"}
                <input
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder={tipo === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                WhatsApp
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                E-mail
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Endereço do serviço
              <input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Observações para o técnico
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Serviços contratados, horários de atendimento..."
                className="border-[1.5px] border-[#C9D3E0] rounded-[14px] p-3 text-sm"
              />
            </label>

            {error && (
              <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
              >
                Salvar cliente
              </button>
            </div>
          </>
        </Modal>
      )}
    </div>
  );
}
