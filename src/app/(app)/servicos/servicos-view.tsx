"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { concluirServicoAction, cancelarServicoAction, salvarTipoServicoAction } from "@/actions";
import { addDaysISO, formatBRL, formatDateBR, formatDateTimeBR, monthRangeISO } from "@/lib/utils";

type Servico = {
  id: number;
  clienteNome: string;
  tipoNome: string;
  tecnicoId: number | null;
  tecnicoNome: string | null;
  dataHora: string;
  valor: number;
  status: "agendado" | "concluido" | "cancelado";
};
type Tipo = { id: number; nome: string; preco: number };
type Tecnico = { id: number; nome: string; ativo: boolean };

type Status = "todos" | Servico["status"];
type Periodo = "Hoje" | "Esta semana" | "Este mês" | "Mês anterior" | "Próx. 30 dias" | "Tudo" | "Personalizado";

const STATUS_ROTULO: Record<Servico["status"], string> = { agendado: "Agendado", concluido: "Concluído", cancelado: "Cancelado" };
const STATUS_CHIP: Record<Servico["status"], string> = {
  agendado: "bg-[#DCE7FF] text-[#1B47B5]",
  concluido: "bg-[#DDF3E4] text-[#14653A]",
  cancelado: "bg-[#E8ECF2] text-[#2F3A4A]",
};

const inputCls = "h-12 w-full box-border border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720] bg-white";
const labelCls = "flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]";

export function ServicosView({ servicosList, tiposList, tecnicosList, today }: { servicosList: Servico[]; tiposList: Tipo[]; tecnicosList: Tecnico[]; today: string }) {
  const [mesIni, mesFim] = monthRangeISO(today);
  const [status, setStatus] = useState<Status>("todos");
  const [tecnico, setTecnico] = useState<number>(0);
  const [periodo, setPeriodo] = useState<Periodo>("Este mês");
  const [from, setFrom] = useState(mesIni);
  const [to, setTo] = useState(mesFim);

  const [novoTipoNome, setNovoTipoNome] = useState("");
  const [novoTipoPreco, setNovoTipoPreco] = useState("");
  const [tipoErro, setTipoErro] = useState("");

  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [cancelarId, setCancelarId] = useState<number | null>(null);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);

  const atalhos: { label: Periodo; de: string; ate: string }[] = [
    { label: "Hoje", de: today, ate: today },
    { label: "Esta semana", de: today, ate: addDaysISO(today, 6) },
    { label: "Este mês", de: mesIni, ate: mesFim },
    { label: "Mês anterior", de: monthRangeISO(today, -1)[0], ate: monthRangeISO(today, -1)[1] },
    { label: "Próx. 30 dias", de: today, ate: addDaysISO(today, 30) },
    { label: "Tudo", de: "", ate: "" },
  ];

  const filtrados = useMemo(
    () =>
      servicosList
        .filter((s) => {
          const dia = s.dataHora.slice(0, 10);
          if (from && dia < from) return false;
          if (to && dia > to) return false;
          if (status !== "todos" && s.status !== status) return false;
          if (tecnico && s.tecnicoId !== tecnico) return false;
          return true;
        })
        .sort((a, b) => a.dataHora.localeCompare(b.dataHora) || a.id - b.id),
    [servicosList, from, to, status, tecnico]
  );

  const totalConcluido = filtrados.filter((s) => s.status === "concluido").reduce((t, s) => t + s.valor, 0);
  const totalAgendado = filtrados.filter((s) => s.status === "agendado").reduce((t, s) => t + s.valor, 0);

  async function adicionarTipo(e: React.FormEvent) {
    e.preventDefault();
    setTipoErro("");
    const res = await salvarTipoServicoAction({ nome: novoTipoNome, precoReais: novoTipoPreco });
    if (res && "error" in res && res.error) {
      setTipoErro(res.error);
      return;
    }
    setAviso({ texto: `Tipo "${novoTipoNome.trim()}" adicionado ao catálogo.`, ok: true });
    setNovoTipoNome("");
    setNovoTipoPreco("");
  }

  async function concluir(s: Servico) {
    setOcupadoId(s.id);
    const res = await concluirServicoAction(s.id);
    setOcupadoId(null);
    if ("error" in res && res.error) {
      setAviso({ texto: res.error, ok: false });
      return;
    }
    const venc = "vencimento" in res && res.vencimento ? `, vence ${formatDateBR(res.vencimento)}` : "";
    setAviso({ texto: `${s.clienteNome}: serviço concluído. Conta a receber criada${venc}.`, ok: true });
  }

  async function cancelar(s: Servico) {
    setOcupadoId(s.id);
    const res = await cancelarServicoAction(s.id);
    setOcupadoId(null);
    setCancelarId(null);
    if ("error" in res && res.error) {
      setAviso({ texto: res.error, ok: false });
      return;
    }
    setAviso({ texto: `${s.clienteNome}: serviço cancelado.`, ok: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold m-0">Serviços</h1>
        <div className="text-sm font-semibold text-[#3A4658] mt-1">Catálogo de preços e todos os serviços agendados, concluídos e cancelados.</div>
      </div>

      {aviso && (
        <div role="status" className={`flex items-center justify-between gap-2 rounded-2xl pl-4 pr-2 py-1.5 text-sm font-bold ${aviso.ok ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FDE4E1] text-[#8E1B10]"}`}>
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} aria-label="Fechar aviso" className="w-11 h-11 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
      )}

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold m-0">Catálogo de tipos de serviço</h2>
        <div className="flex flex-wrap gap-2.5">
          {tiposList.map((t) => (
            <div key={t.id} className="bg-[#F4F7FB] border border-[#E3E8EF] rounded-2xl px-4 py-2 flex items-center gap-3 text-sm">
              <span className="font-bold">{t.nome}</span>
              <span className="font-extrabold text-[#1B47B5]">{formatBRL(t.preco)}</span>
            </div>
          ))}
        </div>
        <form onSubmit={adicionarTipo} className="flex flex-wrap items-end gap-2.5 pt-2">
          <label className={`${labelCls} basis-56 grow`}>
            Novo tipo de serviço
            <input value={novoTipoNome} onChange={(e) => { setNovoTipoNome(e.target.value); setTipoErro(""); }} placeholder="Ex.: Escorpiões" className={inputCls} />
          </label>
          <label className={`${labelCls} basis-36`}>
            Preço (R$)
            <input value={novoTipoPreco} onChange={(e) => { setNovoTipoPreco(e.target.value); setTipoErro(""); }} placeholder="290,00" inputMode="decimal" className={inputCls} />
          </label>
          <button type="submit" className="min-h-[48px] rounded-full bg-[#0F1720] text-white px-5 text-sm font-bold">+ Adicionar</button>
          {tipoErro && <div role="alert" className="basis-full bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold">{tipoErro}</div>}
        </form>
      </section>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-bold text-[#3A4658]">Período</div>
            <div role="group" aria-label="Atalhos de período" className="flex flex-wrap gap-2">
              {atalhos.map((a) => {
                const on = periodo === a.label;
                return (
                  <button
                    key={a.label}
                    aria-pressed={on}
                    onClick={() => { setPeriodo(a.label); setFrom(a.de); setTo(a.ate); }}
                    className={`min-h-[44px] rounded-full px-4 text-[13px] font-bold ${on ? "bg-[#0F1720] text-white" : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"}`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className={`${labelCls} basis-40 min-w-0`}>
            De
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPeriodo("Personalizado"); }} className={inputCls} />
          </label>
          <label className={`${labelCls} basis-40 min-w-0`}>
            Até
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPeriodo("Personalizado"); }} className={inputCls} />
          </label>
          <label className={`${labelCls} basis-40 min-w-0`}>
            Situação
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={inputCls}>
              <option value="todos">Todas</option>
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <label className={`${labelCls} basis-40 min-w-0`}>
            Técnico
            <select value={tecnico} onChange={(e) => setTecnico(Number(e.target.value))} className={inputCls}>
              <option value={0}>Todos</option>
              {tecnicosList.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.ativo ? "" : " (inativo)"}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="text-[13px] font-semibold text-[#3A4658]">
          {from || to ? `Mostrando ${from ? formatDateBR(from) : "o início"} a ${to ? formatDateBR(to) : "hoje em diante"}` : "Mostrando todos os períodos"} · {filtrados.length} serviço(s) · concluídos {formatBRL(totalConcluido)} · agendados {formatBRL(totalAgendado)}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-[#3A4658]">
                <th className="p-2.5">Data/Hora</th><th className="p-2.5">Cliente</th><th className="p-2.5">Serviço</th><th className="p-2.5">Técnico</th><th className="p-2.5">Valor</th><th className="p-2.5">Situação</th><th className="p-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((s) => (
                <tr key={s.id} className="border-t border-[#E3E8EF]">
                  <td className="p-3 font-semibold whitespace-nowrap">{formatDateTimeBR(s.dataHora)}</td>
                  <td className="p-3 font-extrabold">{s.clienteNome}</td>
                  <td className="p-3">{s.tipoNome}</td>
                  <td className="p-3">{s.tecnicoNome || "—"}</td>
                  <td className="p-3 font-extrabold whitespace-nowrap">{formatBRL(s.valor)}</td>
                  <td className="p-3"><span className={`rounded-full px-3 py-0.5 text-xs font-bold whitespace-nowrap ${STATUS_CHIP[s.status]}`}>{STATUS_ROTULO[s.status]}</span></td>
                  <td className="p-3 text-right">
                    {s.status === "agendado" && cancelarId !== s.id && (
                      <div className="inline-flex gap-2">
                        <button disabled={ocupadoId === s.id} onClick={() => concluir(s)} className="min-h-[44px] rounded-full bg-[#14653A] text-white px-3.5 text-xs font-bold disabled:opacity-60">Concluir</button>
                        <button onClick={() => setCancelarId(s.id)} className="min-h-[44px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-3.5 text-xs font-bold">Cancelar</button>
                      </div>
                    )}
                    {cancelarId === s.id && (
                      <div className="inline-flex items-center gap-1.5" role="group" aria-label="Confirmar cancelamento">
                        <span className="text-xs font-bold text-[#8E1B10]">Cancelar?</span>
                        <button disabled={ocupadoId === s.id} onClick={() => cancelar(s)} className="min-h-[44px] rounded-full bg-[#8E1B10] text-white px-3.5 text-xs font-bold disabled:opacity-60">Sim</button>
                        <button onClick={() => setCancelarId(null)} className="min-h-[44px] rounded-full border-[1.5px] border-[#0F1720] px-3.5 text-xs font-bold">Não</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-[13px] font-semibold text-[#3A4658]">Nenhum serviço neste período e filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
