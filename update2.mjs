// update2.mjs — Labels em todos os formulários (Campanhas, Clientes, Financeiro) + Build + Push
import fs from "fs";
import { execSync } from "child_process";

// 1. Campanhas View (com TODAS as labels, horários, chips de serviços e prévia de desconto igual ao Campanhas.dc.html)
const campanhasView = `"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarCampanhaAction } from "@/actions";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import { X } from "lucide-react";

const PRICES: Record<string, number> = {
  "Baratas e formigas": 240,
  "Roedores (desratização)": 320,
  Cupins: 480,
  "Pulgas e carrapatos": 260,
  Monitoramento: 150,
};

export function CampanhasView({ campanhasList }: { campanhasList: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Todas");

  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [dataInicio, setDataInicio] = useState(todaySP());
  const [dataFim, setDataFim] = useState(todaySP());
  const [tStart, setTStart] = useState("08:00");
  const [tEnd, setTEnd] = useState("16:00");
  const [svcs, setSvcs] = useState<string[]>(["Baratas e formigas"]);
  const [descontoPct, setDescontoPct] = useState("20");
  const [unidades, setUnidades] = useState("30");
  const [error, setError] = useState("");

  const discNum = Number(descontoPct) || 0;
  const previewText =
    svcs.length > 0
      ? "Preço na campanha: " +
        svcs
          .map(
            (k) =>
              \`\${k} R$ \${Math.round(PRICES[k] * (1 - discNum / 100))}\`
          )
          .join(" · ")
      : "Escolha os serviços e o desconto para ver o preço da campanha.";

  async function handleSave() {
    setError("");
    const res = await salvarCampanhaAction({
      nome,
      local: local || \`\${unidades} unidades · \${tStart} às \${tEnd}\`,
      dataInicio,
      dataFim,
      descontoPct: Number(descontoPct),
      unidades: Number(unidades),
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    setNome("");
    setLocal("");
    setModalOpen(false);
  }

  const shown = campanhasList.filter(
    (c) =>
      statusFilter === "Todas" ||
      c.status.toLowerCase() === statusFilter.toLowerCase()
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold">Campanhas</h1>
          <div className="text-sm font-semibold text-[#3A4658] mt-1">
            Dias de atendimento em condomínios e prédios com preço especial.
          </div>
        </div>
        <button
          onClick={() => {
            setError("");
            setModalOpen(true);
          }}
          className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
        >
          Cadastrar nova campanha
        </button>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-[0_8px_28px_rgba(20,40,80,0.08)] flex flex-col gap-4">
        <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2">
          {["Todas", "Agendada", "Finalizada", "Cancelada"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={\`min-h-[44px] rounded-full px-4 text-xs font-bold \${
                statusFilter === st
                  ? "bg-[#0F1720] text-white"
                  : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"
              }\`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs font-bold text-[#3A4658]">
                <th className="p-2.5">Campanha</th>
                <th className="p-2.5">Período</th>
                <th className="p-2.5">Atendimentos</th>
                <th className="p-2.5">Desconto</th>
                <th className="p-2.5">Receita paga</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-[#E3E8EF]">
                  <td className="p-3">
                    <div className="font-extrabold">{c.nome}</div>
                    <div className="text-xs text-[#3A4658]">{c.local}</div>
                  </td>
                  <td className="p-3 font-semibold">
                    {formatDateBR(c.dataInicio)} a {formatDateBR(c.dataFim)}
                  </td>
                  <td className="p-3 font-bold">
                    {c.inscritosCount} de {c.unidades}
                  </td>
                  <td className="p-3 font-bold">{c.descontoPct}%</td>
                  <td className="p-3 font-extrabold text-[#14653A]">
                    {formatBRL(c.receitaPaga)}
                  </td>
                  <td className="p-3">
                    <span className="inline-block rounded-full px-3 py-0.5 text-xs font-bold bg-[#DCE7FF] text-[#1B47B5] capitalize">
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={\`/campanhas/\${c.id}\`}
                      className="inline-flex items-center min-h-[44px] px-4 rounded-full bg-[#0F1720] text-white text-xs font-bold"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Nova Campanha com TODAS as Labels explícitas igual ao Campanhas.dc.html */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nc-title"
            className="w-full max-w-[580px] bg-white rounded-[28px] shadow-[0_24px_60px_rgba(15,23,32,0.35)] p-[26px] flex flex-col gap-3.5 text-[#0F1720]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="nc-title" className="text-[22px] font-extrabold">
                Nova campanha
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="w-11 h-11 rounded-full bg-[#E8ECF2] text-[#0F1720] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Nome da campanha
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Cond. Recanto Verde"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Local / Condomínio
                <input
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Ex.: Estrada do Sol, 1200"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Data de início
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Data de fim
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Horário de início
                <input
                  type="time"
                  value={tStart}
                  onChange={(e) => setTStart(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Horário de fim
                <input
                  type="time"
                  value={tEnd}
                  onChange={(e) => setTEnd(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>
            </div>

            <div>
              <div className="text-xs font-bold text-[#3A4658] mb-1.5">
                Tipos de serviço disponíveis
              </div>
              <div
                role="group"
                aria-label="Tipos de serviço disponíveis"
                className="flex flex-wrap gap-2"
              >
                {Object.keys(PRICES).map((k) => {
                  const on = svcs.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        setSvcs(
                          on ? svcs.filter((x) => x !== k) : [...svcs, k]
                        )
                      }
                      aria-pressed={on}
                      className={\`min-h-[44px] rounded-full px-4 text-xs font-bold transition \${
                        on
                          ? "bg-[#0F1720] text-white"
                          : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"
                      }\`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Desconto (0 a 100%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={descontoPct}
                  onChange={(e) => setDescontoPct(e.target.value)}
                  placeholder="20"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Nº de casas ou apartamentos
                <input
                  type="number"
                  min={1}
                  value={unidades}
                  onChange={(e) => setUnidades(e.target.value)}
                  placeholder="30"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white"
                />
              </label>
            </div>

            <div className="bg-[#F4F7FB] rounded-2xl px-3.5 py-3 text-xs font-semibold text-[#2F3A4A]">
              {previewText}
            </div>

            {error && (
              <div
                role="alert"
                className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-xs font-bold"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-5 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
              >
                Criar campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync("src/app/(app)/campanhas/campanhas-view.tsx", campanhasView, "utf-8");

// 2. Campanha Detalhe View (com labels explícitas no modal de Inscrever morador)
const campanhaDetalheView = `"use client";

import { useState } from "react";
import Link from "next/link";
import { inscreverUnidadeCampanhaAction, marcarInscricaoPagaAction } from "@/actions";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { X } from "lucide-react";

export function CampanhaDetalheView({ campanha, inscritos, valorSugeridoReais }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [unidade, setUnidade] = useState("");
  const [morador, setMorador] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valorReais, setValorReais] = useState(valorSugeridoReais);
  const [error, setError] = useState("");

  async function handleInscrever() {
    setError("");
    const res = await inscreverUnidadeCampanhaAction({
      campanhaId: campanha.id,
      unidade,
      morador,
      telefone,
      valorReais,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    setUnidade("");
    setMorador("");
    setTelefone("");
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/campanhas" className="text-xs font-bold text-[#1B47B5]">
            ← Todas as campanhas
          </Link>
          <h1 className="text-[28px] font-extrabold mt-1">
            Campanha · {campanha.nome}
          </h1>
          <p className="text-sm font-semibold text-[#3A4658]">
            {campanha.local} · {formatDateBR(campanha.dataInicio)} a{" "}
            {formatDateBR(campanha.dataFim)} · Desconto de {campanha.descontoPct}%
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setModalOpen(true);
          }}
          className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
        >
          Contratar serviço / Inscrever
        </button>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="text-left text-xs font-bold text-[#3A4658]">
              <th className="p-2.5">Unidade</th>
              <th className="p-2.5">Morador</th>
              <th className="p-2.5">Telefone</th>
              <th className="p-2.5">Valor</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {inscritos.map((i: any) => (
              <tr key={i.id} className="border-t border-[#E3E8EF]">
                <td className="p-3 font-extrabold">{i.unidade}</td>
                <td className="p-3 font-bold">{i.morador}</td>
                <td className="p-3">{i.telefone}</td>
                <td className="p-3 font-extrabold">{formatBRL(i.valor)}</td>
                <td className="p-3">
                  <span
                    className={\`rounded-full px-3 py-0.5 text-xs font-bold \${
                      i.pago
                        ? "bg-[#DDF3E4] text-[#14653A]"
                        : "bg-[#FFF0D1] text-[#7A4B00]"
                    }\`}
                  >
                    {i.pago ? "Pago" : "Aguardando Pix"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {!i.pago && (
                    <button
                      onClick={() => marcarInscricaoPagaAction(i.id)}
                      className="min-h-[38px] rounded-full bg-[#14653A] text-white px-4 text-xs font-bold"
                    >
                      Marcar como pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-14">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3.5 text-[#0F1720]"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-[22px] font-extrabold">Contratar serviço</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Casa ou apartamento
              <input
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="Ex.: Casa 15 ou Apto 42"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Nome do morador
              <input
                value={morador}
                onChange={(e) => setMorador(e.target.value)}
                placeholder="Ex.: Marina Souza"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Telefone / WhatsApp
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Valor (R$)
                <input
                  value={valorReais}
                  onChange={(e) => setValorReais(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>
            </div>

            <div className="bg-[#F4F7FB] rounded-2xl p-3 text-xs font-semibold text-[#2F3A4A]">
              O valor já vem com o desconto da campanha ({campanha.descontoPct}%) e pode ser editado.
            </div>

            {error && (
              <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-2.5 text-xs font-bold">
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
                onClick={handleInscrever}
                className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 font-bold text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync("src/app/(app)/campanhas/[id]/campanha-detalhe-view.tsx", campanhaDetalheView, "utf-8");

// 3. Clientes View e Ficha do Cliente com TODAS as labels explícitas
const clientesView = `"use client";

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
    const matchQ =
      !q.trim() ||
      c.nome.toLowerCase().includes(q.trim().toLowerCase()) ||
      c.whatsapp.includes(q.trim());
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
        <button
          onClick={() => setModalOpen(true)}
          className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
        >
          Cadastrar cliente
        </button>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[220px] flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
            Buscar cliente
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome do cliente ou WhatsApp..."
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
                  className={\`min-h-[48px] rounded-full px-5 text-xs font-bold \${
                    tipoFilter === t
                      ? "bg-[#0F1720] text-white"
                      : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB]"
                  }\`}
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
                <th className="p-2.5">Total pago</th>
                <th className="p-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
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
                  <td className="p-3 font-extrabold text-[#14653A]">
                    {formatBRL(c.totalPago)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link
                        href={\`/clientes/\${c.id}\`}
                        className="min-h-[40px] inline-flex items-center px-4 rounded-full border-[1.5px] border-[#0F1720] text-xs font-bold"
                      >
                        Gerenciar
                      </Link>
                      <button
                        onClick={() => excluirClienteAction(c.id)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[560px] bg-white rounded-[28px] p-[26px] flex flex-col gap-3.5 text-[#0F1720]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-extrabold">Cadastrar cliente</h2>
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
                  className={\`flex-1 min-h-[48px] rounded-full text-sm font-bold \${
                    tipo === k
                      ? "bg-[#0F1720] text-white"
                      : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB]"
                  }\`}
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
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync("src/app/(app)/clientes/clientes-view.tsx", clientesView, "utf-8");

const clienteFichaForm = `"use client";

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
    if (!res.error) setMsg("Dados de " + nome + " salvos com sucesso!");
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3.5"
    >
      <h2 className="text-[17px] font-extrabold">Dados do cliente</h2>
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
            className={\`flex-1 min-h-[44px] rounded-full text-xs font-bold \${
              tipo === k
                ? "bg-[#0F1720] text-white"
                : "border-[1.5px] border-[#C9D3E0]"
            }\`}
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
`;
fs.writeFileSync("src/app/(app)/clientes/[id]/cliente-ficha-form.tsx", clienteFichaForm, "utf-8");

// 4. Financeiro View com TODAS as labels nos modais de "Nova conta a pagar" e "Confirmar baixa"
const financeiroView = `"use client";

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
        <div>
          <h1 className="text-[28px] font-extrabold">Financeiro</h1>
          <div className="text-sm font-semibold text-[#3A4658] mt-1">
            Contas a receber e a pagar da Dedetizadora Impacto.
          </div>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
        >
          + Novo lançamento a pagar
        </button>
      </div>

      <section className="bg-white rounded-[24px] p-4 shadow-sm flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
          De
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
          Até
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
          Situação
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white"
          >
            <option value="Todas">Todas</option>
            <option value="Em aberto">Em aberto</option>
            <option value="Vencidas">Vencidas</option>
            <option value="Pagas">Pagas</option>
          </select>
        </label>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#DDF3E4] text-[#14653A] font-extrabold">
            <span>A receber</span>
            <span className="inline-flex items-center gap-1 text-xs">
              <ArrowDownLeft className="w-4 h-4" /> Entrada
            </span>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-2">
            {recList.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b">
                <div>
                  <div className="text-sm font-extrabold">{r.descricao}</div>
                  <div className="text-xs text-[#3A4658]">
                    Vence {formatDateBR(r.vencimento)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#14653A]">
                    {formatBRL(r.valor)}
                  </span>
                  {r.status === "aberto" ? (
                    <button
                      onClick={() => {
                        setBaixaItem(r);
                        setPagoEm(today);
                        setValorPagoReais(String(r.valor / 100));
                      }}
                      className="min-h-[38px] rounded-full border-[1.5px] border-[#0F1720] px-3 text-xs font-bold"
                    >
                      Dar baixa
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#14653A] bg-[#DDF3E4] px-2.5 py-1 rounded-full">
                      Recebido
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mx-5 border-t-2 border-[#0F1720] py-3 text-xs font-bold flex justify-between">
            <span>Total: {formatBRL(recTotal)}</span>
            <span>Recebido: {formatBRL(recDone)}</span>
          </div>
        </section>

        <section className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#FDE4E1] text-[#8E1B10] font-extrabold">
            <span>A pagar</span>
            <span className="inline-flex items-center gap-1 text-xs">
              <ArrowUpRight className="w-4 h-4" /> Saída
            </span>
          </div>
          <div className="p-5 flex-1 flex flex-col gap-2">
            {payList.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b">
                <div>
                  <div className="text-sm font-extrabold">
                    {p.fornecedor} · {p.descricao}
                  </div>
                  <div className="text-xs text-[#3A4658]">
                    Vence {formatDateBR(p.vencimento)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#8E1B10]">
                    {formatBRL(p.valor)}
                  </span>
                  {p.status === "aberto" ? (
                    <>
                      <button
                        onClick={() => {
                          setBaixaItem(p);
                          setPagoEm(today);
                          setValorPagoReais(String(p.valor / 100));
                        }}
                        className="min-h-[38px] rounded-full border-[1.5px] border-[#0F1720] px-3 text-xs font-bold"
                      >
                        Dar baixa
                      </button>
                      <button
                        onClick={() => excluirLancamentoAction(p.id)}
                        className="text-[#8E1B10] font-bold px-2"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-[#14653A] bg-[#DDF3E4] px-2.5 py-1 rounded-full">
                      Pago
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mx-5 border-t-2 border-[#0F1720] py-3 text-xs font-bold flex justify-between">
            <span>Total: {formatBRL(payTotal)}</span>
            <span>Pago: {formatBRL(payDone)}</span>
          </div>
        </section>
      </div>

      <section className="bg-[#0F1720] text-white rounded-[24px] p-5 flex flex-wrap justify-between gap-4">
        <div>
          <div className="text-xs text-[#C9D3E0]">
            Saldo previsto do período (a receber − a pagar)
          </div>
          <div className="text-2xl font-extrabold">
            {formatBRL(recTotal - payTotal)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#C9D3E0]">
            Saldo realizado (recebido − pago)
          </div>
          <div className="text-2xl font-extrabold">
            {formatBRL(recDone - payDone)}
          </div>
        </div>
      </section>

      {newOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3.5 text-[#0F1720]"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-[22px] font-extrabold">Nova conta a pagar</h2>
              <button
                onClick={() => setNewOpen(false)}
                className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Fornecedor
              <input
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex.: Aliança Químicos"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Descrição
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Reposição de produtos químicos"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Data de vencimento
                <input
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Valor (R$)
                <input
                  value={valorReais}
                  onChange={(e) => setValorReais(e.target.value)}
                  placeholder="1280"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await criarLancamentoPagarAction({
                    fornecedor,
                    descricao,
                    vencimento,
                    valorReais,
                  });
                  setNewOpen(false);
                }}
                className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 font-bold text-sm"
              >
                Salvar lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {baixaItem && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3.5 text-[#0F1720]"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-[22px] font-extrabold">Confirmar baixa</h2>
              <button
                onClick={() => setBaixaItem(null)}
                className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs font-bold bg-[#F4F7FB] p-3.5 rounded-xl">
              {baixaItem.fornecedor
                ? \`\${baixaItem.fornecedor} · \${baixaItem.descricao}\`
                : baixaItem.descricao}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Data do pagamento
                <input
                  type="date"
                  value={pagoEm}
                  onChange={(e) => setPagoEm(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Valor pago (R$)
                <input
                  value={valorPagoReais}
                  onChange={(e) => setValorPagoReais(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBaixaItem(null)}
                className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await darBaixaLancamentoAction({
                    lancamentoId: baixaItem.id,
                    pagoEm,
                    valorPagoReais,
                  });
                  setBaixaItem(null);
                }}
                className="min-h-[48px] rounded-full bg-[#14653A] text-white px-6 text-sm font-bold"
              >
                Confirmar baixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync("src/app/(app)/financeiro/financeiro-view.tsx", financeiroView, "utf-8");

console.log("📦 Testando build local...");
execSync("npm run build", { stdio: "inherit" });

console.log("🚀 Enviando todas as melhorias para o GitHub / Vercel...");
execSync("git add .", { stdio: "inherit" });
execSync('git commit -m "feat: agenda por tecnico, gestao de tecnicos e labels em todos os forms"', { stdio: "inherit" });
execSync("git push origin main", { stdio: "inherit" });
console.log("🎉 Pronto! Atualização publicada em https://dedetiza-os.vercel.app");