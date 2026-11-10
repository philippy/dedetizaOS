"use client";

import { useState } from "react";
import Link from "next/link";
import { salvarCampanhaAction } from "@/actions";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import { X } from "lucide-react";

export function CampanhasView({ campanhasList }: { campanhasList: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [dataInicio, setDataInicio] = useState(todaySP());
  const [dataFim, setDataFim] = useState(todaySP());
  const [descontoPct, setDescontoPct] = useState("20");
  const [unidades, setUnidades] = useState("30");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold">Campanhas</h1>
        <button onClick={() => setModalOpen(true)} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Nova campanha</button>
      </div>
      <section className="bg-white rounded-[24px] p-5 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2.5">Campanha</th><th className="p-2.5">Período</th><th className="p-2.5">Inscritos</th><th className="p-2.5">Desconto</th><th className="p-2.5">Receita paga</th><th className="p-2.5 text-right">Ação</th></tr></thead>
          <tbody>
            {campanhasList.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3"><div className="font-extrabold">{c.nome}</div><div className="text-xs text-[#3A4658]">{c.local}</div></td>
                <td className="p-3">{formatDateBR(c.dataInicio)} a {formatDateBR(c.dataFim)}</td>
                <td className="p-3 font-bold">{c.inscritosCount} de {c.unidades}</td>
                <td className="p-3 font-bold">{c.descontoPct}%</td>
                <td className="p-3 font-extrabold text-[#14653A]">{formatBRL(c.receitaPaga)}</td>
                <td className="p-3 text-right"><Link href={`/campanhas/${c.id}`} className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-[#0F1720] text-white text-xs font-bold">Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-14">
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3">
            <div className="flex justify-between items-center"><h2 className="text-xl font-extrabold">Nova campanha</h2><button onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button></div>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do condomínio" className="h-11 border rounded-xl px-3 text-sm" />
            <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Endereço / Local" className="h-11 border rounded-xl px-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={descontoPct} onChange={(e) => setDescontoPct(e.target.value)} placeholder="Desconto %" className="h-11 border rounded-xl px-3 text-sm" />
              <input type="number" value={unidades} onChange={(e) => setUnidades(e.target.value)} placeholder="Nº unidades" className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            <button onClick={async () => { await salvarCampanhaAction({ nome, local, dataInicio, dataFim, descontoPct: Number(descontoPct), unidades: Number(unidades) }); setModalOpen(false); }} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Criar campanha</button>
          </div>
        </div>
      )}
    </div>
  );
}
