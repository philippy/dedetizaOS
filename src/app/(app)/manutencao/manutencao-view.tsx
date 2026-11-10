"use client";

import { useState } from "react";
import { aplicarDedupeAction, simularDedupeAction } from "@/actions/manutencao";

const ROTULOS: Record<string, string> = {
  tecnicos: "Técnicos",
  tipos_servico: "Tipos de serviço",
  clientes: "Clientes",
  campanhas: "Campanhas",
  inscricoes: "Inscrições",
  servicos: "Serviços",
  lancamentos: "Lançamentos",
};

type Sim = { remover: Record<string, number>; total: Record<string, number> };
type Apl = { antes: Record<string, number>; depois: Record<string, number> };

export function ManutencaoView() {
  const [sim, setSim] = useState<Sim | null>(null);
  const [apl, setApl] = useState<Apl | null>(null);
  const [erro, setErro] = useState("");
  const [conf, setConf] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function simular() {
    setOcupado(true); setErro(""); setApl(null);
    const r = await simularDedupeAction();
    setOcupado(false);
    if (!r.ok) { setErro(r.error); return; }
    setSim({ remover: r.remover, total: r.total });
  }

  async function aplicar() {
    setOcupado(true); setErro("");
    const r = await aplicarDedupeAction(conf);
    setOcupado(false);
    if (!r.ok) { setErro(r.error); return; }
    setApl({ antes: r.antes, depois: r.depois });
    setSim(null); setConf("");
  }

  const totalRemover = sim ? Object.values(sim.remover).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-[28px] font-extrabold m-0">Manutenção</h1>
        <p className="text-sm font-semibold text-[#3A4658] mt-1">
          Remove as cópias repetidas dos dados de demonstração (clientes, técnicos, tipos, serviços, campanha e
          contas de exemplo). Mantém uma cópia de cada. O que foi cadastrado de verdade não é alterado.
        </p>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold m-0">1. Simular</h2>
        <p className="text-sm text-[#3A4658] m-0">Mostra quantos registros seriam removidos. Não grava nada.</p>
        <button onClick={simular} disabled={ocupado} className="self-start min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold disabled:opacity-60">
          {ocupado && !sim ? "Simulando..." : "Simular"}
        </button>
        {sim && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#3A4658]"><th className="py-2">Tabela</th><th className="py-2 text-right">Hoje</th><th className="py-2 text-right">Remover</th><th className="py-2 text-right">Fica</th></tr>
            </thead>
            <tbody>
              {Object.keys(ROTULOS).map((k) => (
                <tr key={k} className="border-t border-[#E3E8EF]">
                  <td className="py-2 font-bold">{ROTULOS[k]}</td>
                  <td className="py-2 text-right">{sim.total[k]}</td>
                  <td className="py-2 text-right font-extrabold text-[#8E1B10]">{sim.remover[k]}</td>
                  <td className="py-2 text-right">{sim.total[k] - sim.remover[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {sim && totalRemover > 0 && (
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3 border-2 border-[#FDE4E1]">
          <h2 className="text-[17px] font-extrabold m-0">2. Remover {totalRemover} registros</h2>
          <p className="text-sm text-[#3A4658] m-0">
            Não dá para desfazer por aqui. Roda tudo de uma vez: se der erro no meio, nada é alterado.
            Digite <b>REMOVER</b> para confirmar.
          </p>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658] max-w-xs">
            Confirmação
            <input value={conf} onChange={(e) => setConf(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720]" />
          </label>
          <button onClick={aplicar} disabled={ocupado || conf !== "REMOVER"} className="self-start min-h-[48px] rounded-full bg-[#8E1B10] text-white px-6 text-sm font-bold disabled:opacity-50">
            {ocupado ? "Removendo..." : "Remover duplicados"}
          </button>
        </section>
      )}

      {sim && totalRemover === 0 && (
        <div role="status" className="bg-[#DDF3E4] text-[#14653A] rounded-2xl px-4 py-3 text-sm font-bold">Não há duplicados de demonstração.</div>
      )}

      {apl && (
        <section role="status" className="bg-[#DDF3E4] text-[#14653A] rounded-[24px] p-5 flex flex-col gap-2">
          <h2 className="text-[17px] font-extrabold m-0">Duplicados removidos</h2>
          <ul className="m-0 pl-5 text-sm font-semibold">
            {Object.keys(ROTULOS).map((k) => <li key={k}>{ROTULOS[k]}: {apl.antes[k]} → {apl.depois[k]}</li>)}
          </ul>
        </section>
      )}

      {erro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-2xl px-4 py-3 text-sm font-bold">{erro}</div>}
    </div>
  );
}
