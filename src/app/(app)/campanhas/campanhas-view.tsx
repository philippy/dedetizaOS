"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarCampanhaAction } from "@/actions";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import { X } from "lucide-react";

export function CampanhasView({ campanhasList, tiposList }: { campanhasList: any[]; tiposList: { id: number; nome: string; preco: number }[] }) {
  // Preços do catálogo (centavos), não valores fixos no código.
  const PRICES: Record<string, number> = Object.fromEntries(tiposList.map((t) => [t.nome, t.preco]));
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Todas");

  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [dataInicio, setDataInicio] = useState(todaySP());
  const [dataFim, setDataFim] = useState(todaySP());
  const [tStart, setTStart] = useState("08:00");
  const [tEnd, setTEnd] = useState("16:00");
  const [svcs, setSvcs] = useState<string[]>(tiposList[0] ? [tiposList[0].nome] : []);
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
              `${k} ${formatBRL(Math.round((PRICES[k] * (100 - discNum)) / 100))}`
          )
          .join(" · ")
      : "Escolha os serviços e o desconto para ver o preço da campanha.";

  async function handleSave() {
    setError("");
    const res = await salvarCampanhaAction({
      nome,
      local: local || `${unidades} unidades · ${tStart} às ${tEnd}`,
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
              className={`min-h-[44px] rounded-full px-4 text-xs font-bold ${
                statusFilter === st
                  ? "bg-[#0F1720] text-white"
                  : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"
              }`}
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
                      href={`/campanhas/${c.id}`}
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
                      className={`min-h-[44px] rounded-full px-4 text-xs font-bold transition ${
                        on
                          ? "bg-[#0F1720] text-white"
                          : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"
                      }`}
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
