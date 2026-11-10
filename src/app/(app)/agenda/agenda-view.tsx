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
import { addDaysISO, centsToInput, formatBRL, formatDateBR, parseBRLToCents } from "@/lib/utils";
import { DURACAO_PADRAO, DURACOES, HORARIOS, distribuirFaixas, formatDuracao, horaDe, inicioDaSemana, minutosDe } from "@/lib/agenda";
import { Plus, X } from "lucide-react";

const SWATCHES = ["#2F5FE0", "#0F1720", "#4A5B78", "#14653A", "#7A4B00"];
const PX_HORA = 64;
const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Servico = {
  id: number;
  clienteId: number;
  clienteNome: string;
  tipoServicoId: number;
  tipoNome: string;
  tecnicoId: number | null;
  tecnicoNome: string | null;
  tecnicoCor: string | null;
  dataHora: string;
  duracaoMin: number;
  valor: number;
  status: "agendado" | "concluido" | "cancelado";
  observacoes: string | null;
};

type Modo = "timeline" | "semana" | "kanban";

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}

// Faixa de horas da grade: 08h–18h, ampliada se houver serviço fora disso.
function faixaDeHoras(itens: Servico[]) {
  let ini = 8;
  let fim = 18;
  for (const s of itens) {
    const m = minutosDe(s.dataHora);
    ini = Math.min(ini, Math.floor(m / 60));
    fim = Math.max(fim, Math.ceil((m + s.duracaoMin) / 60));
  }
  return Array.from({ length: fim - ini }, (_, i) => ini + i);
}

export function AgendaView({
  initialDate,
  servicosList,
  tecnicosList,
  clientesList,
  tiposList,
}: {
  initialDate: string;
  servicosList: Servico[];
  tecnicosList: { id: number; nome: string; telefone: string; cor: string; ativo: boolean }[];
  clientesList: { id: number; nome: string; tipo: "PF" | "PJ" }[];
  tiposList: { id: number; nome: string; preco: number; duracaoMin: number }[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<Modo>("timeline");
  const [techFilter, setTechFilter] = useState<number>(0);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);

  // Modal de Serviço
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [clienteId, setClienteId] = useState<number>(clientesList[0]?.id || 0);
  const [tipoId, setTipoId] = useState<number>(tiposList[0]?.id || 0);
  const [tecnicoId, setTecnicoId] = useState<number>(tecnicosList[0]?.id || 0);
  const [data, setData] = useState<string>(initialDate);
  const [hora, setHora] = useState<string>("08:00");
  const [duracaoMin, setDuracaoMin] = useState<number>(DURACAO_PADRAO);
  const [valorReais, setValorReais] = useState<string>("240,00");
  const [observacoes, setObservacoes] = useState<string>("");
  const [statusAtual, setStatusAtual] = useState<string>("agendado");
  const [svcError, setSvcError] = useState("");
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Modal de Técnicos
  const [tmOpen, setTmOpen] = useState(false);
  const [tmMode, setTmMode] = useState<"new" | "manage">("new");
  const [tName, setTName] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tColor, setTColor] = useState("#2F5FE0");
  const [tmError, setTmError] = useState("");
  const [tmInfo, setTmInfo] = useState("");
  const [tmInfoOk, setTmInfoOk] = useState(true);

  const tecnicosAtivos = tecnicosList.filter((t) => t.ativo);
  const activeTechs = tecnicosAtivos.filter((t) => techFilter === 0 || t.id === techFilter);
  const doTecnicoFiltrado = (s: Servico) => techFilter === 0 || s.tecnicoId === techFilter;

  const dayServices = servicosList.filter((s) => s.status !== "cancelado" && s.dataHora.slice(0, 10) === selectedDate);
  const doneCount = dayServices.filter((s) => s.status === "concluido").length;
  const schedCount = dayServices.filter((s) => s.status === "agendado").length;

  const semanaIni = inicioDaSemana(selectedDate);
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDaysISO(semanaIni, i));
  const weekServices = servicosList.filter(
    (s) => s.status !== "cancelado" && s.dataHora.slice(0, 10) >= diasSemana[0] && s.dataHora.slice(0, 10) <= diasSemana[6] && doTecnicoFiltrado(s)
  );

  const horasDia = faixaDeHoras(dayServices);
  const horasSemana = faixaDeHoras(weekServices);

  function precoDoTipo(id: number) {
    const t = tiposList.find((x) => x.id === id);
    return t ? centsToInput(t.preco) : "";
  }

  function duracaoDoTipo(id: number) {
    return tiposList.find((x) => x.id === id)?.duracaoMin ?? DURACAO_PADRAO;
  }

  function openNewAt(techId: number, dia: string, h: number) {
    setSvcError("");
    setConfirmarCancelar(false);
    setEditingId(undefined);
    setClienteId(clientesList[0]?.id || 0);
    setTipoId(tiposList[0]?.id || 0);
    setTecnicoId(techId);
    setData(dia);
    setHora(pad(h) + ":00");
    setValorReais(tiposList[0] ? centsToInput(tiposList[0].preco) : "");
    setDuracaoMin(tiposList[0]?.duracaoMin ?? DURACAO_PADRAO);
    setObservacoes("");
    setStatusAtual("agendado");
    setModalOpen(true);
  }

  function openEditService(s: Servico) {
    setSvcError("");
    setConfirmarCancelar(false);
    setEditingId(s.id);
    setClienteId(s.clienteId);
    setTipoId(s.tipoServicoId);
    setTecnicoId(s.tecnicoId || tecnicosAtivos[0]?.id || 0);
    setData(s.dataHora.slice(0, 10));
    setHora(s.dataHora.slice(11, 16));
    setValorReais(centsToInput(s.valor));
    setDuracaoMin(s.duracaoMin);
    setObservacoes(s.observacoes || "");
    setStatusAtual(s.status);
    setModalOpen(true);
  }

  async function handleSaveService() {
    setSvcError("");
    setSalvando(true);
    const res = await salvarServicoAction({ id: editingId, clienteId, tipoServicoId: tipoId, tecnicoId, data, hora, duracaoMin, valorReais, observacoes });
    setSalvando(false);
    if (res.error) {
      setSvcError(res.error);
      return;
    }
    const contaAtualizada = "contaAtualizada" in res && res.contaAtualizada;
    setAviso({
      texto: editingId
        ? `Serviço atualizado${contaAtualizada ? `. A conta a receber em aberto foi ajustada para ${formatBRL(parseBRLToCents(valorReais))}` : ""}.`
        : `Serviço agendado para ${formatDateBR(data).slice(0, 5)} às ${hora}, até ${horaDe(minutosDe(hora) + duracaoMin)}.`,
      ok: true,
    });
    setModalOpen(false);
  }

  async function handleConcluir() {
    if (!editingId) return;
    setSvcError("");
    setSalvando(true);
    const res = await concluirServicoAction(editingId);
    setSalvando(false);
    if ("error" in res && res.error) {
      setSvcError(res.error);
      return;
    }
    const venc = "vencimento" in res && res.vencimento ? formatDateBR(res.vencimento) : "";
    setAviso({ texto: `Serviço concluído. Conta a receber criada${venc ? `, vence ${venc}` : ""}.`, ok: true });
    setModalOpen(false);
  }

  async function handleCancelar() {
    if (!editingId) return;
    setSvcError("");
    setSalvando(true);
    const res = await cancelarServicoAction(editingId);
    setSalvando(false);
    if ("error" in res && res.error) {
      setSvcError(res.error);
      return;
    }
    setAviso({ texto: "Serviço cancelado. Ele sai da agenda e continua no histórico do cliente.", ok: true });
    setModalOpen(false);
  }

  async function handleSaveTech() {
    setTmError("");
    const res = await salvarTecnicoAction({ nome: tName, telefone: tPhone, cor: tColor });
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
    setTmInfo(res.nome + (res.ativo ? " ativado. A coluna voltou para a agenda." : " desativado. A coluna saiu da agenda."));
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
  const semana = viewMode === "semana";
  const passo = semana ? 7 : 1;
  const subtitulo = semana
    ? `Semana de ${formatDateBR(diasSemana[0]).slice(0, 5)} a ${formatDateBR(diasSemana[6]).slice(0, 5)} · ${weekServices.length} serviços · ${weekServices.filter((s) => s.status === "concluido").length} concluídos · ${weekServices.filter((s) => s.status === "agendado").length} agendados`
    : `${dayTitle} · ${dayServices.length} serviços · ${doneCount} concluídos · ${schedCount} agendados`;

  // Cartão de serviço posicionado pelo minuto de início, com altura proporcional à duração.
  function Cartao({ s, horaIni, faixa = 0, faixas = 1, mostrarTecnico = false }: { s: Servico; horaIni: number; faixa?: number; faixas?: number; mostrarTecnico?: boolean }) {
    const ini = minutosDe(s.dataHora);
    const top = ((ini - horaIni * 60) / 60) * PX_HORA + 2;
    const isDone = s.status === "concluido";
    const largura = 100 / faixas;
    const faixaHora = `${horaDe(ini)} – ${horaDe(ini + s.duracaoMin)}`;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openEditService(s); }}
        aria-label={`${faixaHora}, ${s.clienteNome}, ${s.tipoNome}${s.tecnicoNome ? `, ${s.tecnicoNome}` : ""}, ${isDone ? "concluído" : "agendado"}`}
        style={{
          top: top + "px",
          height: Math.max(26, (s.duracaoMin / 60) * PX_HORA - 4) + "px",
          left: `calc(${faixa * largura}% + 4px)`,
          width: `calc(${largura}% - 8px)`,
          ...(mostrarTecnico && s.tecnicoCor ? { borderLeftColor: s.tecnicoCor, borderLeftWidth: 5 } : {}),
        }}
        className={`absolute text-left box-border rounded-[14px] px-2.5 py-1.5 overflow-hidden transition ${
          isDone ? "bg-[#DDF3E4] border-2 border-[#7CC59B]" : "bg-white border-2 border-[#8793A6] shadow-[0_2px_8px_rgba(20,40,80,0.10)]"
        }`}
      >
        <div className="text-[11px] font-bold text-[#2F3A4A] leading-tight">{faixaHora}</div>
        <div className="text-[13px] font-extrabold text-[#0F1720] leading-tight truncate">{s.clienteNome}</div>
        <div className="text-[11px] font-medium text-[#3A4658] leading-tight truncate">
          {mostrarTecnico && s.tecnicoNome ? `${s.tecnicoNome} · ` : ""}{s.tipoNome}
        </div>
      </button>
    );
  }

  function Grade({ horas, onSlot, children }: { horas: number[]; onSlot: (h: number) => void; children: React.ReactNode }) {
    return (
      <div className="relative rounded-2xl bg-[#FAFBFD] border border-[#E3E8EF]" style={{ height: horas.length * PX_HORA + "px" }}>
        {horas.map((h, i) => (
          <div
            key={h}
            onClick={() => onSlot(h)}
            aria-hidden="true"
            style={{ top: i * PX_HORA + "px", height: PX_HORA + "px" }}
            className="absolute left-0 right-0 box-border border-t border-dashed border-[#D3DAE4] first:border-t-0 cursor-pointer hover:bg-[#2F5FE0]/5 transition"
          />
        ))}
        {children}
      </div>
    );
  }

  function ColunaHoras({ horas, topo }: { horas: number[]; topo: number }) {
    return (
      <div className="w-[52px] shrink-0" style={{ paddingTop: topo + "px" }}>
        {horas.map((h) => (
          <div key={h} className="text-xs font-bold text-[#3A4658] pt-0.5" style={{ height: PX_HORA + "px" }}>
            {pad(h)}:00
          </div>
        ))}
      </div>
    );
  }

  const legenda = (
    <div className="flex flex-wrap gap-3.5 text-xs font-bold text-[#2F3A4A]">
      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-white border-2 border-[#8793A6]" />Agendado</span>
      <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-[#DDF3E4] border-2 border-[#7CC59B]" />Concluído</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold leading-tight">Agenda dos técnicos</h1>
          <div className="text-sm font-semibold text-[#3A4658] mt-1">{subtitulo}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openNewAt(activeTechs[0]?.id || tecnicosAtivos[0]?.id || 0, selectedDate, 8)}
            className="min-h-[48px] flex items-center gap-2 rounded-full bg-[#2F5FE0] hover:bg-[#1B47B5] text-white px-5 text-sm font-bold transition"
          >
            <Plus className="w-4 h-4" /> Novo serviço
          </button>
          <button
            onClick={() => { setTmError(""); setTmInfo(""); setTName(""); setTPhone(""); setTColor("#2F5FE0"); setTmMode("new"); setTmOpen(true); }}
            className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-4 text-sm font-bold hover:bg-slate-50"
          >
            Novo técnico
          </button>
          <button
            onClick={() => { setTmError(""); setTmInfo(""); setTmMode("manage"); setTmOpen(true); }}
            className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full bg-white text-[#0F1720] px-4 text-sm font-bold hover:bg-slate-50"
          >
            Gerenciar técnicos
          </button>
          <div role="group" aria-label="Modo de visualização" className="flex flex-wrap bg-[#E3E8EF] rounded-full p-1 gap-1">
            {([["timeline", "Linha do tempo"], ["semana", "Semana"], ["kanban", "Kanban por status"]] as [Modo, string][]).map(([m, rot]) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                aria-pressed={viewMode === m}
                className={`min-h-[44px] rounded-full px-5 text-sm font-bold transition ${viewMode === m ? "bg-[#0F1720] text-white" : "text-[#2F3A4A]"}`}
              >
                {rot}
              </button>
            ))}
          </div>
        </div>
      </div>

      {aviso && (
        <div role="status" className={`flex items-center justify-between gap-2 rounded-2xl pl-4 pr-2 py-1.5 text-sm font-bold ${aviso.ok ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FDE4E1] text-[#8E1B10]"}`}>
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} aria-label="Fechar aviso" className="w-11 h-11 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* Navegação de data e filtro de técnico */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-[20px] px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(addDaysISO(selectedDate, -passo))}
            aria-label={semana ? "Semana anterior" : "Dia anterior"}
            className="w-11 h-11 rounded-full border border-[#C9D3E0] font-extrabold text-lg hover:bg-slate-100"
          >
            ‹
          </button>
          <input
            type="date"
            aria-label="Escolher data da agenda"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="h-11 border-[1.5px] border-[#C9D3E0] rounded-full px-4 text-sm font-bold text-[#0F1720]"
          />
          <button
            onClick={() => setSelectedDate(addDaysISO(selectedDate, passo))}
            aria-label={semana ? "Próxima semana" : "Próximo dia"}
            className="w-11 h-11 rounded-full border border-[#C9D3E0] font-extrabold text-lg hover:bg-slate-100"
          >
            ›
          </button>
          <button onClick={() => setSelectedDate(initialDate)} className="min-h-[44px] px-3.5 rounded-full bg-[#F1F4F8] text-xs font-bold text-[#0F1720] hover:bg-slate-200">
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[#3A4658] mr-1">Filtrar técnico:</span>
          <button
            onClick={() => setTechFilter(0)}
            aria-pressed={techFilter === 0}
            className={`min-h-[44px] px-3.5 rounded-full text-xs font-bold ${techFilter === 0 ? "bg-[#0F1720] text-white" : "bg-[#F1F4F8] text-[#0F1720]"}`}
          >
            Todos
          </button>
          {tecnicosAtivos.map((t) => (
            <button
              key={t.id}
              onClick={() => setTechFilter(t.id)}
              aria-pressed={techFilter === t.id}
              className={`min-h-[44px] px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${techFilter === t.id ? "bg-[#0F1720] text-white" : "bg-[#F1F4F8] text-[#0F1720]"}`}
            >
              <span style={{ backgroundColor: t.cor }} className="w-2.5 h-2.5 rounded-full" />
              {t.nome}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "timeline" && (
        <div className="bg-white rounded-[24px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] p-[18px] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-[#3A4658]">
              Clique em um horário vazio da coluna do técnico para agendar ou clique em um serviço para editar/concluir.
            </div>
            {legenda}
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 52 + activeTechs.length * 232 + "px" }} className="flex gap-3">
              <ColunaHoras horas={horasDia} topo={64} />
              {activeTechs.map((tech) => {
                const mine = dayServices.filter((s) => s.tecnicoId === tech.id);
                return (
                  <div key={tech.id} className="flex-1 min-w-[220px]">
                    <div className="h-14 mb-2 bg-[#F1F4F8] rounded-2xl px-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div style={{ backgroundColor: tech.cor }} className="w-8 h-8 rounded-full text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                          {tech.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-[15px] font-extrabold text-[#0F1720] truncate">{tech.nome}</div>
                      </div>
                      <div className="text-xs font-bold text-[#3A4658] shrink-0">{formatDuracao(mine.reduce((t, s) => t + s.duracaoMin, 0))} de {horasDia.length} h</div>
                    </div>
                    <Grade horas={horasDia} onSlot={(h) => openNewAt(tech.id, selectedDate, h)}>
                      {distribuirFaixas(mine.map((s) => ({ ...s, inicio: minutosDe(s.dataHora), duracao: s.duracaoMin }))).map((s) => (
                        <Cartao key={s.id} s={s} horaIni={horasDia[0]} faixa={s.faixa} faixas={s.faixas} />
                      ))}
                    </Grade>
                  </div>
                );
              })}
              {activeTechs.length === 0 && (
                <div className="flex-1 py-10 text-center text-sm font-semibold text-[#3A4658]">Nenhum técnico ativo. Cadastre ou ative um técnico em &quot;Gerenciar técnicos&quot;.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === "semana" && (
        <div className="bg-white rounded-[24px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] p-[18px] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] font-semibold text-[#3A4658]">
              Cada coluna é um dia; a cor da borda é a do técnico. Clique num horário vazio para agendar naquele dia.
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              {legenda}
              <div className="flex flex-wrap gap-3 text-xs font-bold text-[#2F3A4A]">
                {activeTechs.map((t) => (
                  <span key={t.id} className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: t.cor }} />{t.nome}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 52 + 7 * 160 + "px" }} className="flex gap-2">
              <ColunaHoras horas={horasSemana} topo={64} />
              {diasSemana.map((dia) => {
                const doDia = weekServices.filter((s) => s.dataHora.slice(0, 10) === dia);
                const d = new Date(`${dia}T12:00:00Z`);
                const hoje = dia === initialDate;
                return (
                  <div key={dia} className="flex-1 min-w-[150px]">
                    <button
                      type="button"
                      onClick={() => { setSelectedDate(dia); setViewMode("timeline"); }}
                      title="Abrir este dia na linha do tempo"
                      className={`w-full h-14 mb-2 rounded-2xl px-3 flex items-center justify-between gap-2 text-left ${hoje ? "bg-[#2F5FE0] text-white" : "bg-[#F1F4F8] text-[#0F1720]"}`}
                    >
                      <span className="flex flex-col leading-tight">
                        <span className="text-[13px] font-extrabold">{DIAS_CURTOS[d.getUTCDay()]} {formatDateBR(dia).slice(0, 5)}</span>
                        <span className={`text-[11px] font-bold ${hoje ? "text-white/80" : "text-[#3A4658]"}`}>{hoje ? "Hoje · " : ""}{doDia.length} serviço(s)</span>
                      </span>
                    </button>
                    <Grade horas={horasSemana} onSlot={(h) => openNewAt(techFilter || tecnicosAtivos[0]?.id || 0, dia, h)}>
                      {distribuirFaixas(doDia.map((s) => ({ ...s, inicio: minutosDe(s.dataHora), duracao: s.duracaoMin }))).map((s) => (
                        <Cartao key={s.id} s={s} horaIni={horasSemana[0]} faixa={s.faixa} faixas={s.faixas} mostrarTecnico />
                      ))}
                    </Grade>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "agendado", label: "Agendados do dia", items: dayServices.filter((x) => x.status === "agendado" && doTecnicoFiltrado(x)) },
            { key: "concluido", label: "Concluídos do dia", items: dayServices.filter((x) => x.status === "concluido" && doTecnicoFiltrado(x)) },
          ].map((lane) => (
            <div key={lane.key} className="bg-white rounded-[22px] shadow-[0_8px_28px_rgba(20,40,80,0.08)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold">{lane.label}</span>
                <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-[#E8ECF2] text-[#2F3A4A]">{lane.items.length}</span>
              </div>
              {lane.items.sort((a, b) => a.dataHora.localeCompare(b.dataHora)).map((kc) => (
                <button
                  key={kc.id}
                  type="button"
                  onClick={() => openEditService(kc)}
                  className="text-left bg-[#F4F7FB] border border-[#E3E8EF] rounded-2xl p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-extrabold">{kc.clienteNome}</div>
                    <div className="text-xs text-[#3A4658]">{kc.tipoNome} · {kc.tecnicoNome} às {kc.dataHora.slice(11, 16)}</div>
                  </div>
                  <span className="text-xs font-extrabold">{formatBRL(kc.valor)}</span>
                </button>
              ))}
              {lane.items.length === 0 && <div className="text-sm text-[#3A4658] py-2">Nada aqui.</div>}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR SERVIÇO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="svc-titulo" className="w-full max-w-[560px] bg-white rounded-[28px] p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 id="svc-titulo" className="text-[22px] font-extrabold">{editingId ? "Editar serviço" : "Novo serviço"}</h2>
              <button onClick={() => setModalOpen(false)} aria-label="Fechar" className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Cliente
              <select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white">
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Tipo de serviço
                <select
                  value={tipoId}
                  onChange={(e) => { const id = Number(e.target.value); setTipoId(id); if (statusAtual !== "concluido") { setValorReais(precoDoTipo(id)); } setDuracaoMin(duracaoDoTipo(id)); }}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white"
                >
                  {tiposList.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome} ({formatBRL(t.preco)} · {formatDuracao(t.duracaoMin)})</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Técnico
                <select value={tecnicoId} onChange={(e) => setTecnicoId(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white">
                  {tecnicosAtivos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Dia
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720]" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Horário
                <select value={hora} onChange={(e) => setHora(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white">
                  {(HORARIOS.includes(hora) ? HORARIOS : [hora, ...HORARIOS]).map((hs) => (
                    <option key={hs} value={hs}>{hs}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Duração
                <select value={duracaoMin} onChange={(e) => setDuracaoMin(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720] bg-white">
                  {(DURACOES.includes(duracaoMin) ? DURACOES : [duracaoMin, ...DURACOES]).map((d) => (
                    <option key={d} value={d}>{formatDuracao(d)}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Valor (R$)
                <input value={valorReais} onChange={(e) => setValorReais(e.target.value)} inputMode="decimal" className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720]" />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Observações
              <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções para o técnico..." className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm text-[#0F1720]" />
            </label>

            <div className="text-xs font-medium text-[#3A4658]">
              Ocupa a agenda de {hora} até {horaDe(minutosDe(hora) + duracaoMin)}. A duração começa igual à do tipo de serviço e pode ser ajustada.
              {editingId && statusAtual === "concluido" && " Este serviço já foi concluído: mudar o valor ou o cliente também muda a conta a receber, enquanto ela estiver em aberto."}
            </div>

            {svcError && (
              <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-xs font-bold">{svcError}</div>
            )}

            {confirmarCancelar ? (
              <div role="group" aria-label="Confirmar cancelamento" className="flex flex-wrap items-center justify-between gap-2 bg-[#FDE4E1] rounded-[18px] p-3">
                <span className="text-sm font-bold text-[#8E1B10]">Cancelar este serviço? Ele sai da agenda.</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmarCancelar(false)} className="min-h-[44px] border-[1.5px] border-[#0F1720] bg-white rounded-full px-4 text-xs font-bold">Voltar</button>
                  <button type="button" disabled={salvando} onClick={handleCancelar} className="min-h-[44px] rounded-full bg-[#8E1B10] text-white px-4 text-xs font-bold disabled:opacity-60">Sim, cancelar serviço</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {editingId && statusAtual === "agendado" ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={salvando} onClick={handleConcluir} className="min-h-[48px] rounded-full bg-[#14653A] text-white px-5 text-xs font-bold disabled:opacity-60">
                      ✓ Concluir e gerar conta
                    </button>
                    <button type="button" onClick={() => setConfirmarCancelar(true)} className="min-h-[48px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-4 text-xs font-bold">
                      Cancelar serviço
                    </button>
                  </div>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">
                    Fechar
                  </button>
                  <button type="button" disabled={salvando} onClick={handleSaveService} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold disabled:opacity-60">
                    {salvando ? "Salvando..." : "Salvar serviço"}
                  </button>
                </div>
              </div>
            )}
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
