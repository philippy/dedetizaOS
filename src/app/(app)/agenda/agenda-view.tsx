"use client";

import { useState } from "react";
import {
  concluirServicoAction,
  cancelarServicoAction,
  salvarServicoAction,
  salvarTecnicoAction,
  alternarAtivoTecnicoAction,
  excluirTecnicoAction,
} from "@/actions";
import { addDaysISO, formatBRL, formatDateBR } from "@/lib/utils";
import { Plus, X } from "lucide-react";

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const SWATCHES = ["#2F5FE0", "#0F1720", "#4A5B78", "#14653A", "#7A4B00"];

export function AgendaView({
  initialDate,
  servicosList,
  tecnicosList,
  clientesList,
  tiposList,
}: {
  initialDate: string;
  servicosList: any[];
  tecnicosList: { id: number; nome: string; telefone: string; cor: string; ativo: boolean }[];
  clientesList: { id: number; nome: string; tipo: "PF" | "PJ" }[];
  tiposList: { id: number; nome: string; preco: number }[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<"timeline" | "kanban">("timeline");
  const [techFilter, setTechFilter] = useState<number>(0);

  // Modal de Serviço
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [clienteId, setClienteId] = useState<number>(clientesList[0]?.id || 0);
  const [tipoId, setTipoId] = useState<number>(tiposList[0]?.id || 0);
  const [tecnicoId, setTecnicoId] = useState<number>(tecnicosList[0]?.id || 0);
  const [data, setData] = useState<string>(initialDate);
  const [hora, setHora] = useState<string>("08:00");
  const [valorReais, setValorReais] = useState<string>("240");
  const [observacoes, setObservacoes] = useState<string>("");
  const [statusAtual, setStatusAtual] = useState<string>("agendado");
  const [svcError, setSvcError] = useState("");

  // Modal de Técnicos (Novo Técnico / Gerenciar Técnicos — Fiel ao Print 2)
  const [tmOpen, setTmOpen] = useState(false);
  const [tmMode, setTmMode] = useState<"new" | "manage">("new");
  const [tName, setTName] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tColor, setTColor] = useState("#2F5FE0");
  const [tmError, setTmError] = useState("");
  const [tmInfo, setTmInfo] = useState("");
  const [tmInfoOk, setTmInfoOk] = useState(true);

  const activeTechs = tecnicosList.filter(
    (t) => t.ativo && (techFilter === 0 || t.id === techFilter)
  );

  const dayServices = servicosList.filter(
    (s) => s.status !== "cancelado" && s.dataHora.slice(0, 10) === selectedDate
  );

  const doneCount = dayServices.filter((s) => s.status === "concluido").length;
  const schedCount = dayServices.filter((s) => s.status === "agendado").length;

  function pad(n: number) {
    return n < 10 ? "0" + n : "" + n;
  }

  function openNewAtSlot(techId: number, h: number) {
    setSvcError("");
    setEditingId(undefined);
    setClienteId(clientesList[0]?.id || 0);
    setTipoId(tiposList[0]?.id || 0);
    setTecnicoId(techId);
    setData(selectedDate);
    setHora(pad(h) + ":00");
    setValorReais(tiposList[0] ? String(tiposList[0].preco / 100) : "240");
    setObservacoes("");
    setStatusAtual("agendado");
    setModalOpen(true);
  }

  function openEditService(s: any) {
    setSvcError("");
    setEditingId(s.id);
    setClienteId(s.clienteId);
    setTipoId(s.tipoServicoId);
    setTecnicoId(s.tecnicoId || tecnicosList[0]?.id || 0);
    setData(s.dataHora.slice(0, 10));
    setHora(s.dataHora.slice(11, 16));
    setValorReais(String(s.valor / 100));
    setObservacoes(s.observacoes || "");
    setStatusAtual(s.status);
    setModalOpen(true);
  }

  async function handleSaveService() {
    setSvcError("");
    const res = await salvarServicoAction({
      id: editingId,
      clienteId,
      tipoServicoId: tipoId,
      tecnicoId,
      data,
      hora,
      valorReais,
      observacoes,
    });
    if (res.error) {
      setSvcError(res.error);
      return;
    }
    setModalOpen(false);
  }

  async function handleSaveTech() {
    setTmError("");
    const res = await salvarTecnicoAction({
      nome: tName,
      telefone: tPhone,
      cor: tColor,
    });
    if (res.error) {
      setTmError(res.error);
      return;
    }
    setTmInfo(tName.trim() + " cadastrado. A coluna dele já aparece na agenda.");
    setTmInfoOk(true);
    setTName("");
    setTPhone("");
    setTmMode("manage");
  }

  async function handleToggleTech(id: number) {
    setTmInfo("");
    const res = await alternarAtivoTecnicoAction(id);
    if (res.error) {
      setTmInfo(res.error);
      setTmInfoOk(false);
      return;
    }
    setTmInfo(
      res.nome +
        (res.ativo
          ? " ativado. A coluna voltou para a agenda."
          : " desativado. A coluna saiu da agenda.")
    );
    setTmInfoOk(true);
  }

  async function handleDeleteTech(id: number, nome: string) {
    setTmInfo("");
    const res = await excluirTecnicoAction(id);
    if (res.error) {
      setTmInfo(res.error);
      setTmInfoOk(false);
      return;
    }
    setTmInfo(nome + " removido com sucesso.");
    setTmInfoOk(true);
  }

  const weekDays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dtObj = new Date(`${selectedDate}T12:00:00Z`);
  const dayTitle = `${weekDays[dtObj.getUTCDay()]}, ${formatDateBR(selectedDate)}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Topo da Agenda igual ao Agenda.dc.html */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight">Agenda dos técnicos</h1>
          <div className="text-sm font-semibold text-[#3A4658] mt-1">
            {dayTitle} · {dayServices.length} serviços · {doneCount} concluídos · {schedCount} agendados
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openNewAtSlot(activeTechs[0]?.id || tecnicosList[0]?.id || 1, 8)}
            className="min-h-[48px] flex items-center gap-2 rounded-full bg-[#2F5FE0] hover:bg-[#1B47B5] text-white px-5 text-sm font-bold transition"
          >
            <Plus className="w-4 h-4" /> Novo serviço
          </button>

          <button
            onClick={() => {
              setTmError("");
              setTmInfo("");
              setTName("");
              setTPhone("");
              setTColor("#2F5FE0");
              setTmMode("new");
              setTmOpen(true);
            }}
            className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-4 text-sm font-bold hover:bg-slate-50"
          >
            Novo técnico
          </button>

          <button
            onClick={() => {
              setTmError("");
              setTmInfo("");
              setTmMode("manage");
              setTmOpen(true);
            }}
            className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-4 text-sm font-bold hover:bg-slate-50"
          >
            Gerenciar técnicos
          </button>

          <div
            role="group"
            aria-label="Modo de visualização"
            className="flex bg-[#E3E8EF] rounded-full p-1 gap-1"
          >
            <button
              onClick={() => setViewMode("timeline")}
              className={`min-h-[44px] rounded-full px-5 text-sm font-bold transition ${
                viewMode === "timeline"
                  ? "bg-[#0F1720] text-white"
                  : "text-[#2F3A4A]"
              }`}
            >
              Linha do tempo
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`min-h-[44px] rounded-full px-5 text-sm font-bold transition ${
                viewMode === "kanban"
                  ? "bg-[#0F1720] text-white"
                  : "text-[#2F3A4A]"
              }`}
            >
              Kanban por status
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Navegação de Data e Filtro de Técnico */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[20px] px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
            aria-label="Dia anterior"
            className="w-11 h-11 rounded-full border border-[#C9D3E0] font-extrabold text-lg hover:bg-slate-100"
          >
            ‹
          </button>
          <input
            type="date"
            aria-label="Escolher data da agenda"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-11 border-[1.5px] border-[#C9D3E0] rounded-full px-4 text-sm font-bold text-[#0F1720]"
          />
          <button
            onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
            aria-label="Próximo dia"
            className="w-11 h-11 rounded-full border border-[#C9D3E0] font-extrabold text-lg hover:bg-slate-100"
          >
            ›
          </button>
          <button
            onClick={() => setSelectedDate(initialDate)}
            className="min-h-[40px] px-3.5 rounded-full bg-[#F1F4F8] text-xs font-bold text-[#0F1720] hover:bg-slate-200"
          >
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[#3A4658] mr-1">Filtrar técnico:</span>
          <button
            onClick={() => setTechFilter(0)}
            className={`min-h-[38px] px-3.5 rounded-full text-xs font-bold ${
              techFilter === 0 ? "bg-[#0F1720] text-white" : "bg-[#F1F4F8] text-[#0F1720]"
            }`}
          >
            Todos
          </button>
          {tecnicosList
            .filter((t) => t.ativo)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTechFilter(t.id)}
                className={`min-h-[38px] px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  techFilter === t.id ? "bg-[#0F1720] text-white" : "bg-[#F1F4F8] text-[#0F1720]"
                }`}
              >
                <span
                  style={{ backgroundColor: t.cor }}
                  className="w-2.5 h-2.5 rounded-full"
                />
                {t.nome}
              </button>
            ))}
        </div>
      </div>

      {/* MODO 1: LINHA DO TEMPO POR TÉCNICO (Fiel ao Print 1) */}
      {viewMode === "timeline" ? (
        <div className="bg-white rounded-[24px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] p-[18px] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-[#3A4658]">
              Clique em um horário vazio da coluna do técnico para agendar ou clique em um serviço para editar/concluir.
            </div>
            <div className="flex flex-wrap gap-3.5 text-xs font-bold text-[#2F3A4A]">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-white border-2 border-[#8793A6]" />
                Agendado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-[#DDF3E4] border-2 border-[#7CC59B]" />
                Concluído
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div
              style={{ minWidth: 52 + activeTechs.length * 240 + "px" }}
              className="flex gap-3"
            >
              {/* Coluna de Horas (64px exatos por hora) */}
              <div className="w-[52px] shrink-0 pt-16">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="h-16 text-xs font-bold text-[#3A4658] pt-0.5"
                  >
                    {pad(h)}:00
                  </div>
                ))}
              </div>

              {/* Uma Coluna por Técnico Ativo */}
              {activeTechs.map((tech) => {
                const mine = dayServices.filter((s) => s.tecnicoId === tech.id);
                const hrsLoad = mine.length * 1;
                return (
                  <div key={tech.id} className="flex-1 min-w-[220px]">
                    {/* Cabeçalho do Técnico */}
                    <div className="h-14 mb-2 bg-[#F1F4F8] rounded-2xl px-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          style={{ backgroundColor: tech.cor }}
                          className="w-8 h-8 rounded-full text-white text-sm font-extrabold flex items-center justify-center shrink-0"
                        >
                          {tech.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-[15px] font-extrabold text-[#0F1720] truncate">
                          {tech.nome}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#3A4658] shrink-0">
                        {hrsLoad} h de 10 h
                      </div>
                    </div>

                    {/* Grade Vertical Fixa de 640px (10 horas * 64px) */}
                    <div className="relative h-[640px] rounded-2xl bg-[#FAFBFD] border border-[#E3E8EF]">
                      {HOURS.map((h, i) => (
                        <div
                          key={h}
                          onClick={() => openNewAtSlot(tech.id, h)}
                          style={{ top: i * 64 + "px" }}
                          className="absolute left-0 right-0 h-16 box-border border-t border-dashed border-[#D3DAE4] first:border-t-0 cursor-pointer hover:bg-[#2F5FE0]/5 transition"
                        />
                      ))}

                      {mine.map((svc) => {
                        const startH = parseInt(svc.dataHora.slice(11, 13), 10) || 8;
                        const clampedH = Math.max(8, Math.min(17, startH));
                        const topPx = (clampedH - 8) * 64 + 2;
                        const heightPx = 60; // 1h exata dentro do slot de 64px, sem sobrepor!
                        const endH = clampedH + 1;
                        const isDone = svc.status === "concluido";

                        return (
                          <div
                            key={svc.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditService(svc);
                            }}
                            style={{
                              top: topPx + "px",
                              height: heightPx + "px",
                            }}
                            className={`absolute left-1.5 right-1.5 box-border rounded-[14px] px-2.5 py-1.5 overflow-hidden cursor-pointer transition ${
                              isDone
                                ? "bg-[#DDF3E4] border-2 border-[#7CC59B]"
                                : "bg-white border-2 border-[#8793A6] shadow-[0_2px_8px_rgba(20,40,80,0.10)]"
                            }`}
                          >
                            <div className="text-[11px] font-bold text-[#2F3A4A] leading-tight">
                              {pad(clampedH)}:00 – {pad(endH)}:00
                            </div>
                            <div className="text-[13px] font-extrabold text-[#0F1720] leading-tight truncate">
                              {svc.clienteNome}
                            </div>
                            <div className="text-[11px] font-medium text-[#3A4658] leading-tight truncate">
                              {svc.tipoNome}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* MODO 2: KANBAN POR STATUS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "agendado", label: "Agendados do dia", items: dayServices.filter((x) => x.status === "agendado") },
            { key: "concluido", label: "Concluídos do dia", items: dayServices.filter((x) => x.status === "concluido") },
          ].map((lane) => (
            <div
              key={lane.key}
              className="bg-white rounded-[22px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold">{lane.label}</span>
                <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-[#E8ECF2] text-[#2F3A4A]">
                  {lane.items.length}
                </span>
              </div>
              {lane.items.map((kc) => (
                <div
                  key={kc.id}
                  onClick={() => openEditService(kc)}
                  className="bg-[#F4F7FB] border border-[#E3E8EF] rounded-2xl p-3 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-extrabold">{kc.clienteNome}</div>
                    <div className="text-xs text-[#3A4658]">
                      {kc.tipoNome} · {kc.tecnicoNome} às {kc.dataHora.slice(11, 16)}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold">{formatBRL(kc.valor)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CRIAR / EDITAR SERVIÇO (COM TODAS AS LABELS) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[560px] bg-white rounded-[28px] p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-extrabold">
                {editingId ? "Editar serviço" : "Novo serviço"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Cliente
              <select
                value={clienteId}
                onChange={(e) => setClienteId(Number(e.target.value))}
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white"
              >
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.tipo})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Tipo de serviço
                <select
                  value={tipoId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setTipoId(id);
                    const f = tiposList.find((t) => t.id === id);
                    if (f) setValorReais(String(f.preco / 100));
                  }}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white"
                >
                  {tiposList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({formatBRL(t.preco)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Técnico
                <select
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(Number(e.target.value))}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white"
                >
                  {tecnicosList
                    .filter((t) => t.ativo)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Dia
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720]"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Horário
                <select
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white"
                >
                  {HOURS.map((h) => {
                    const hs = pad(h) + ":00";
                    return (
                      <option key={hs} value={hs}>
                        {hs}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Valor (R$)
                <input
                  value={valorReais}
                  onChange={(e) => setValorReais(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720]"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Observações
              <input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Instruções para o técnico..."
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720]"
              />
            </label>

            {svcError && (
              <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-xs font-bold">
                {svcError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {editingId ? (
                <div className="flex gap-2">
                  {statusAtual !== "concluido" && (
                    <button
                      type="button"
                      onClick={async () => {
                        await concluirServicoAction(editingId);
                        setModalOpen(false);
                      }}
                      className="min-h-[48px] rounded-full bg-[#14653A] text-white px-5 text-xs font-bold"
                    >
                      ✓ Concluir e gerar conta
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await cancelarServicoAction(editingId);
                      setModalOpen(false);
                    }}
                    className="min-h-[48px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-4 text-xs font-bold"
                  >
                    Cancelar serviço
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveService}
                  className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
                >
                  Salvar serviço
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NOVO TÉCNICO E GERENCIAR TÉCNICOS (Idêntico ao Print 2 do Protótipo) */}
      {tmOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[580px] bg-white rounded-[28px] shadow-[0_24px_60px_rgba(15,23,32,0.35)] p-[26px] flex flex-col gap-4 text-[#0F1720]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[22px] font-extrabold">
                {tmMode === "new" ? "Novo técnico" : "Gerenciar técnicos"}
              </h2>
              <button
                onClick={() => setTmOpen(false)}
                aria-label="Fechar"
                className="w-11 h-11 rounded-full bg-[#E8ECF2] text-[#0F1720] text-xl font-bold flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tmMode === "new" ? (
              <>
                <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                  Nome do técnico
                  <input
                    value={tName}
                    onChange={(e) => {
                      setTName(e.target.value);
                      setTmError("");
                    }}
                    placeholder="Ex.: Carlos"
                    className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720]"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                  WhatsApp
                  <input
                    value={tPhone}
                    onChange={(e) => setTPhone(e.target.value)}
                    placeholder="(11) 90000-0000"
                    className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720]"
                  />
                </label>

                <div>
                  <div className="text-xs font-bold text-[#3A4658] mb-2">
                    Cor na agenda
                  </div>
                  <div role="group" aria-label="Cor na agenda" className="flex gap-2.5">
                    {SWATCHES.map((c) => {
                      const on = tColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTColor(c)}
                          aria-pressed={on}
                          aria-label={"Cor " + c}
                          style={{
                            backgroundColor: c,
                            border: on ? "4px solid #9DBBFF" : "2px solid #FFFFFF",
                            boxShadow: on
                              ? "0 0 0 2px #0F1720"
                              : "0 0 0 1px #C9D3E0",
                          }}
                          className="w-11 h-11 rounded-full transition"
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="text-xs font-medium text-[#3A4658]">
                  O técnico recebe um PIN para entrar no app. Ele só vê os próprios serviços.
                </div>

                {tmError && (
                  <div
                    role="alert"
                    className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-xs font-bold"
                  >
                    {tmError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTmOpen(false)}
                    className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-5 text-sm font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTech}
                    className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
                  >
                    Salvar técnico
                  </button>
                </div>
              </>
            ) : (
              <>
                {tmInfo && (
                  <div
                    role="status"
                    className={`rounded-[14px] px-3.5 py-2.5 text-xs font-bold ${
                      tmInfoOk
                        ? "bg-[#DDF3E4] text-[#14653A]"
                        : "bg-[#FFF0D1] text-[#7A4B00]"
                    }`}
                  >
                    {tmInfo}
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  {tecnicosList.map((t) => {
                    const nJobs = servicosList.filter(
                      (s) => s.tecnicoId === t.id && s.status === "agendado"
                    ).length;
                    return (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center gap-3 bg-[#F4F7FB] rounded-[18px] p-3"
                      >
                        <div
                          style={{ backgroundColor: t.cor }}
                          className="w-10 h-10 rounded-full text-white text-sm font-extrabold flex items-center justify-center shrink-0"
                        >
                          {t.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <div className="text-[15px] font-extrabold">{t.nome}</div>
                          <div className="text-xs font-medium text-[#3A4658]">
                            {t.telefone} · {nJobs}{" "}
                            {nJobs === 1 ? "serviço pendente" : "serviços pendentes"}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            t.ativo
                              ? "bg-[#DDF3E4] text-[#14653A]"
                              : "bg-[#E8ECF2] text-[#2F3A4A]"
                          }`}
                        >
                          {t.ativo ? "Ativo" : "Inativo"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleTech(t.id)}
                          className="min-h-[40px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-3.5 text-xs font-bold"
                        >
                          {t.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTech(t.id, t.nome)}
                          className="min-h-[40px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-3 text-xs font-bold"
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between gap-2 flex-wrap pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTmError("");
                      setTmInfo("");
                      setTmMode("new");
                    }}
                    className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-5 text-sm font-bold"
                  >
                    + Novo técnico
                  </button>
                  <button
                    type="button"
                    onClick={() => setTmOpen(false)}
                    className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-5 text-sm font-bold"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
