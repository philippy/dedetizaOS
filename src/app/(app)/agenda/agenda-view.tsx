"use client";

import { useState } from "react";
import { concluirServicoAction, cancelarServicoAction, salvarServicoAction } from "@/actions";
import { addDaysISO, formatBRL, formatDateBR } from "@/lib/utils";
import { X } from "lucide-react";

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export function AgendaView({ initialStartDate, servicosList, tecnicosList, clientesList, tiposList }: any) {
  const [weekStart, setWeekStart] = useState(initialStartDate);
  const [techFilter, setTechFilter] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [clienteId, setClienteId] = useState<number>(clientesList[0]?.id || 0);
  const [tipoId, setTipoId] = useState<number>(tiposList[0]?.id || 0);
  const [tecnicoId, setTecnicoId] = useState<number>(tecnicosList[0]?.id || 0);
  const [data, setData] = useState<string>(initialStartDate);
  const [hora, setHora] = useState<string>("08:00");
  const [valorReais, setValorReais] = useState<string>("240");
  const [observacoes, setObservacoes] = useState<string>("");
  const [statusAtual, setStatusAtual] = useState<string>("agendado");
  const [error, setError] = useState("");

  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function openNewAtSlot(dayIso: string, hourStr: string) {
    setError("");
    setEditingId(undefined);
    setClienteId(clientesList[0]?.id || 0);
    setTipoId(tiposList[0]?.id || 0);
    setTecnicoId(techFilter || tecnicosList[0]?.id || 0);
    setData(dayIso);
    setHora(hourStr);
    setValorReais(tiposList[0] ? String(tiposList[0].preco / 100) : "240");
    setObservacoes("");
    setStatusAtual("agendado");
    setModalOpen(true);
  }

  function openEditService(s: any) {
    setError("");
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

  async function handleSave() {
    setError("");
    const res = await salvarServicoAction({ id: editingId, clienteId, tipoServicoId: tipoId, tecnicoId, data, hora, valorReais, observacoes });
    if (res.error) { setError(res.error); return; }
    setModalOpen(false);
  }

  const filtered = servicosList.filter((s: any) => s.status !== "cancelado" && (techFilter === 0 || s.tecnicoId === techFilter));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold">Agenda dos técnicos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-full shadow-sm">
            <button onClick={() => setTechFilter(0)} className={`min-h-[40px] px-4 rounded-full text-xs font-bold ${techFilter === 0 ? "bg-[#0F1720] text-white" : ""}`}>Todos</button>
            {tecnicosList.map((t: any) => (
              <button key={t.id} onClick={() => setTechFilter(t.id)} className={`min-h-[40px] px-4 rounded-full text-xs font-bold flex items-center gap-1.5 ${techFilter === t.id ? "bg-[#0F1720] text-white" : ""}`}>
                <span style={{ backgroundColor: t.cor }} className="w-2.5 h-2.5 rounded-full" />{t.nome}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm">
            <button onClick={() => setWeekStart(addDaysISO(weekStart, -7))} className="w-10 h-10 rounded-full font-bold">‹</button>
            <span className="px-3 text-xs font-bold">{formatDateBR(days[0]).slice(0, 5)} a {formatDateBR(days[6]).slice(0, 5)}</span>
            <button onClick={() => setWeekStart(addDaysISO(weekStart, 7))} className="w-10 h-10 rounded-full font-bold">›</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] p-4 shadow-sm overflow-x-auto">
        <div className="min-w-[980px] grid grid-cols-[64px_repeat(7,1fr)] gap-2">
          <div className="pt-14 flex flex-col">{HOURS.map((h) => <div key={h} className="h-20 text-xs font-bold text-[#3A4658] pr-2 text-right">{h}</div>)}</div>
          {days.map((dayIso) => {
            const wd = dayNames[new Date(`${dayIso}T12:00:00Z`).getUTCDay()];
            return (
              <div key={dayIso} className="flex flex-col">
                <div className="h-12 mb-2 bg-[#F1F4F8] rounded-2xl px-3 flex items-center justify-between text-xs font-bold">
                  <span>{wd}</span><span>{dayIso.slice(8, 10)}/{dayIso.slice(5, 7)}</span>
                </div>
                <div className="flex flex-col border border-[#E3E8EF] rounded-2xl overflow-hidden bg-[#FAFBFD]">
                  {HOURS.map((h) => {
                    const slotServices = filtered.filter((s: any) => s.dataHora.slice(0, 10) === dayIso && s.dataHora.slice(11, 16) === h);
                    return (
                      <div key={h} onClick={() => { if (slotServices.length === 0) openNewAtSlot(dayIso, h); }} className="h-20 border-t border-dashed border-[#D3DAE4] first:border-t-0 p-1 flex flex-col gap-1 cursor-pointer hover:bg-[#2F5FE0]/5">
                        {slotServices.map((svc: any) => (
                          <button key={svc.id} type="button" onClick={(e) => { e.stopPropagation(); openEditService(svc); }} style={{ borderLeftColor: svc.tecnicoCor || "#2F5FE0" }} className={`w-full text-left rounded-xl p-1.5 border-l-4 shadow-sm text-xs ${svc.status === "concluido" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-white text-[#0F1720] border border-[#C9D3E0]"}`}>
                            <div className="font-extrabold truncate">{svc.clienteNome}</div>
                            <div className="text-[11px] truncate">{svc.tecnicoNome} · {svc.tipoNome}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12">
          <div className="w-full max-w-[540px] bg-white rounded-[28px] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{editingId ? "Editar serviço" : "Novo serviço"}</h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold">Cliente<select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} className="h-12 border rounded-xl px-3 text-sm bg-white">{clientesList.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold">Serviço<select value={tipoId} onChange={(e) => { const id = Number(e.target.value); setTipoId(id); const f = tiposList.find((t: any) => t.id === id); if (f) setValorReais(String(f.preco / 100)); }} className="h-12 border rounded-xl px-3 text-sm bg-white">{tiposList.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold">Técnico<select value={tecnicoId} onChange={(e) => setTecnicoId(Number(e.target.value))} className="h-12 border rounded-xl px-3 text-sm bg-white">{tecnicosList.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold">Dia<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 border rounded-xl px-3 text-sm" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold">Hora<select value={hora} onChange={(e) => setHora(e.target.value)} className="h-12 border rounded-xl px-3 text-sm bg-white">{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold">Valor (R$)<input value={valorReais} onChange={(e) => setValorReais(e.target.value)} className="h-12 border rounded-xl px-3 text-sm" /></label>
            </div>
            {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
            <div className="flex justify-between gap-2 pt-2">
              {editingId ? (
                <div className="flex gap-2">
                  {statusAtual !== "concluido" && <button type="button" onClick={async () => { await concluirServicoAction(editingId); setModalOpen(false); }} className="min-h-[44px] rounded-full bg-[#14653A] text-white px-4 text-xs font-bold">✓ Concluir</button>}
                  <button type="button" onClick={async () => { await cancelarServicoAction(editingId); setModalOpen(false); }} className="min-h-[44px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-4 text-xs font-bold">Cancelar</button>
                </div>
              ) : <div />}
              <button type="button" onClick={handleSave} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
