"use client";

import { useEffect, useState } from "react";
import { contarDadosAction, recriarDemoAction } from "@/actions/manutencao";

const ROTULOS: Record<string, string> = {
  tecnicos: "Técnicos",
  tipos_servico: "Tipos de serviço",
  clientes: "Clientes",
  servicos: "Serviços",
  campanhas: "Campanhas",
  inscricoes: "Inscrições",
  lancamentos: "Lançamentos",
};

export function ManutencaoView() {
  const [atual, setAtual] = useState<Record<string, number> | null>(null);
  const [res, setRes] = useState<{ antes: Record<string, number>; depois: Record<string, number> } | null>(null);
  const [erro, setErro] = useState("");
  const [conf, setConf] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { contarDadosAction().then(setAtual).catch(() => setErro("Não foi possível contar os registros.")); }, []);

  async function recriar() {
    setOcupado(true); setErro("");
    const r = await recriarDemoAction(conf);
    setOcupado(false);
    if (!r.ok) { setErro(r.error); return; }
    setRes({ antes: r.antes, depois: r.depois });
    setAtual(r.depois); setConf("");
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-[28px] font-extrabold m-0">Manutenção</h1>
        <p className="text-sm font-semibold text-[#3A4658] mt-1">
          Apaga todos os técnicos, tipos de serviço, clientes, serviços, campanhas, inscrições e lançamentos e
          carrega o conjunto de demonstração (datas a partir de hoje). Usuários e senhas não são alterados.
        </p>
      </div>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3 border-2 border-[#FDE4E1]">
        <h2 className="text-[17px] font-extrabold m-0">Recriar dados de demonstração</h2>
        {atual && (
          <p className="text-sm text-[#3A4658] m-0">
            Hoje no banco: {Object.keys(ROTULOS).map((k) => `${ROTULOS[k]} ${atual[k]}`).join(" · ")}.
          </p>
        )}
        <p className="text-sm text-[#3A4658] m-0">
          Não dá para desfazer por aqui. Roda tudo de uma vez: se der erro no meio, nada é alterado.
          Digite <b>RECRIAR</b> para confirmar.
        </p>
        <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658] max-w-xs">
          Confirmação
          <input value={conf} onChange={(e) => setConf(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm text-[#0F1720]" />
        </label>
        <button onClick={recriar} disabled={ocupado || conf !== "RECRIAR"} className="self-start min-h-[48px] rounded-full bg-[#8E1B10] text-white px-6 text-sm font-bold disabled:opacity-50">
          {ocupado ? "Recriando..." : "Apagar e recriar"}
        </button>
      </section>

      {res && (
        <section role="status" className="bg-[#DDF3E4] text-[#14653A] rounded-[24px] p-5 flex flex-col gap-2">
          <h2 className="text-[17px] font-extrabold m-0">Dados de demonstração carregados</h2>
          <ul className="m-0 pl-5 text-sm font-semibold">
            {Object.keys(ROTULOS).map((k) => <li key={k}>{ROTULOS[k]}: {res.antes[k]} → {res.depois[k]}</li>)}
          </ul>
        </section>
      )}

      {erro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-2xl px-4 py-3 text-sm font-bold">{erro}</div>}
    </div>
  );
}
