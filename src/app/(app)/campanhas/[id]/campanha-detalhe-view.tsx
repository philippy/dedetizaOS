"use client";

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
          <h1 className="text-[28px] font-extrabold mt-1">Campanha · {campanha.nome}</h1>
          <p className="text-sm font-semibold text-[#3A4658]">
            {campanha.local} · {formatDateBR(campanha.dataInicio)} a {formatDateBR(campanha.dataFim)} · Desconto {campanha.descontoPct}%
          </p>
        </div>
        <button
          onClick={() => { setError(""); setModalOpen(true); }}
          className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
        >
          Inscrever unidade
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
              <tr key={i.id} className="border-t">
                <td className="p-3 font-extrabold">{i.unidade}</td>
                <td className="p-3 font-bold">{i.morador}</td>
                <td className="p-3">{i.telefone}</td>
                <td className="p-3 font-extrabold">{formatBRL(i.valor)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${i.pago ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FFF0D1] text-[#7A4B00]"}`}>
                    {i.pago ? "Pago" : "Em aberto"}
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
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold">Inscrever morador</h2>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Casa ou Apto (Ex.: Casa 15)" className="h-11 border rounded-xl px-3 text-sm" />
            <input value={morador} onChange={(e) => setMorador(e.target.value)} placeholder="Nome do morador" className="h-11 border rounded-xl px-3 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="WhatsApp" className="h-11 border rounded-xl px-3 text-sm" />
              <input value={valorReais} onChange={(e) => setValorReais(e.target.value)} placeholder="Valor (R$)" className="h-11 border rounded-xl px-3 text-sm" />
            </div>
            {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-2.5 text-xs font-bold">{error}</div>}
            <button onClick={handleInscrever} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Confirmar inscrição</button>
          </div>
        </div>
      )}
    </div>
  );
}
