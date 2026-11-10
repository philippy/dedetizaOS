"use client";

import { useState } from "react";
import { concluirServicoAction, cancelarServicoAction, salvarTipoServicoAction } from "@/actions";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";

export function ServicosView({ servicosList, tiposList, tecnicosList }: any) {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [novoTipoNome, setNovoTipoNome] = useState("");
  const [novoTipoPreco, setNovoTipoPreco] = useState("");

  const filtered = servicosList.filter((s: any) => statusFilter === "todos" || s.status === statusFilter).sort((a: any, b: any) => b.dataHora.localeCompare(a.dataHora));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-extrabold">Serviços</h1>
      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold">Catálogo de tipos de serviço</h2>
        <div className="flex flex-wrap gap-2.5">
          {tiposList.map((t: any) => (
            <div key={t.id} className="bg-[#F4F7FB] border rounded-2xl px-4 py-2 flex items-center gap-3 text-sm">
              <span className="font-bold">{t.nome}</span><span className="font-extrabold text-[#1B47B5]">{formatBRL(t.preco)}</span>
            </div>
          ))}
        </div>
        <form onSubmit={async (e) => { e.preventDefault(); await salvarTipoServicoAction({ nome: novoTipoNome, precoReais: novoTipoPreco }); setNovoTipoNome(""); setNovoTipoPreco(""); }} className="flex flex-wrap gap-2 pt-2">
          <input value={novoTipoNome} onChange={(e) => setNovoTipoNome(e.target.value)} placeholder="Novo serviço..." className="h-11 border rounded-xl px-3 text-xs" />
          <input value={novoTipoPreco} onChange={(e) => setNovoTipoPreco(e.target.value)} placeholder="Preço (R$)" className="h-11 w-28 border rounded-xl px-3 text-xs" />
          <button type="submit" className="min-h-[44px] rounded-full bg-[#0F1720] text-white px-4 text-xs font-bold">+ Adicionar</button>
        </form>
      </section>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {["todos", "agendado", "concluido", "cancelado"].map((st) => (
            <button key={st} onClick={() => setStatusFilter(st)} className={`min-h-[40px] rounded-full px-4 text-xs font-bold capitalize ${statusFilter === st ? "bg-[#0F1720] text-white" : "border bg-[#F4F7FB]"}`}>{st}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2.5">Data/Hora</th><th className="p-2.5">Cliente</th><th className="p-2.5">Serviço</th><th className="p-2.5">Técnico</th><th className="p-2.5">Valor</th><th className="p-2.5">Status</th><th className="p-2.5 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-semibold">{formatDateTimeBR(s.dataHora)}</td>
                  <td className="p-3 font-extrabold">{s.clienteNome}</td>
                  <td className="p-3">{s.tipoNome}</td>
                  <td className="p-3">{s.tecnicoNome || "—"}</td>
                  <td className="p-3 font-extrabold">{formatBRL(s.valor)}</td>
                  <td className="p-3"><span className="rounded-full px-3 py-0.5 text-xs font-bold bg-[#DCE7FF] text-[#1B47B5]">{s.status}</span></td>
                  <td className="p-3 text-right">
                    {s.status === "agendado" && (
                      <div className="inline-flex gap-2">
                        <button onClick={() => concluirServicoAction(s.id)} className="min-h-[38px] rounded-full bg-[#14653A] text-white px-3 text-xs font-bold">Concluir</button>
                        <button onClick={() => cancelarServicoAction(s.id)} className="min-h-[38px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-3 text-xs font-bold">Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
