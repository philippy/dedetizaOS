"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { importarClientesAction } from "@/actions";
import { decodificarArquivo, lerPlanilha, marcarDuplicados, type ClienteExistente, type LinhaImportada } from "@/lib/importar-clientes";

type Escolha = { importar: boolean; tipo: "PF" | "PJ" };
type Filtro = "todas" | "atencao";

const inputCls = "w-full box-border border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 py-3 text-sm text-[#0F1720] bg-white";

export function ImportarView({ existentes }: { existentes: ClienteExistente[] }) {
  const [texto, setTexto] = useState("");
  const [conferido, setConferido] = useState(false);
  const [escolhas, setEscolhas] = useState<Record<number, Escolha>>({});
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [erroArquivo, setErroArquivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ texto: string; ok: boolean } | null>(null);

  const leitura = useMemo(() => {
    if (!conferido) return null;
    const l = lerPlanilha(texto);
    return { ...l, linhas: marcarDuplicados(l.linhas, existentes) };
  }, [conferido, texto, existentes]);

  function conferir() {
    setResultado(null);
    const l = lerPlanilha(texto);
    const marcadas = marcarDuplicados(l.linhas, existentes);
    const inicial: Record<number, Escolha> = {};
    for (const x of marcadas) inicial[x.linha] = { importar: x.erros.length === 0 && !x.duplicado, tipo: x.tipo };
    setEscolhas(inicial);
    setFiltro("todas");
    setConferido(true);
  }

  function novaColagem() {
    setConferido(false);
    setTexto("");
    setEscolhas({});
    setResultado(null);
  }

  async function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErroArquivo("");
    if (/\.(xlsx|xls|xlsm)$/i.test(f.name)) {
      setErroArquivo("Este formato não é lido aqui. Abra a planilha, selecione as linhas, copie e cole na caixa abaixo. Ou salve como CSV e escolha o arquivo.");
      return;
    }
    if (f.size > 5_000_000) {
      setErroArquivo("Arquivo grande demais (limite de 5 MB).");
      return;
    }
    setTexto(decodificarArquivo(await f.arrayBuffer()));
    setConferido(false);
  }

  const linhas = leitura?.linhas ?? [];
  const comEscolha = (l: LinhaImportada) => escolhas[l.linha] ?? { importar: false, tipo: l.tipo };
  const selecionadas = linhas.filter((l) => comEscolha(l).importar);
  const prontas = linhas.filter((l) => l.erros.length === 0 && !l.duplicado && l.avisos.length === 0).length;
  const comAviso = linhas.filter((l) => l.erros.length === 0 && !l.duplicado && l.avisos.length > 0).length;
  const duplicadas = linhas.filter((l) => l.duplicado).length;
  const comErro = linhas.filter((l) => l.erros.length > 0).length;
  const visiveis = filtro === "atencao" ? linhas.filter((l) => l.erros.length > 0 || l.duplicado || l.avisos.length > 0) : linhas;

  function alterar(linha: number, parte: Partial<Escolha>) {
    setEscolhas((prev) => ({ ...prev, [linha]: { ...(prev[linha] ?? { importar: false, tipo: "PF" }), ...parte } }));
  }

  function marcarTodas(valor: boolean) {
    setEscolhas((prev) => {
      const novo = { ...prev };
      for (const l of linhas) if (l.erros.length === 0) novo[l.linha] = { ...(novo[l.linha] ?? { tipo: l.tipo }), importar: valor && !l.duplicado };
      return novo;
    });
  }

  async function importar() {
    setEnviando(true);
    setResultado(null);
    const res = await importarClientesAction(
      selecionadas.map((l) => ({
        tipo: comEscolha(l).tipo,
        nome: l.nome,
        documento: l.documento,
        whatsapp: l.whatsapp,
        email: l.email,
        endereco: l.endereco,
        observacoes: l.observacoes,
      }))
    );
    setEnviando(false);
    if ("error" in res && res.error) {
      setResultado({ texto: res.error, ok: false });
      return;
    }
    if ("importados" in res) {
      const extra = res.jaExistiam ? ` ${res.jaExistiam} já existia(m) pelo CPF/CNPJ e foi(ram) ignorado(s).` : "";
      setResultado({ texto: `${res.importados} cliente(s) importado(s).${extra}`, ok: true });
      setConferido(false);
      setTexto("");
      setEscolhas({});
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/clientes" className="text-xs font-bold text-[#1B47B5] min-h-[44px] inline-flex items-center">← Clientes</Link>
        <h1 className="text-[28px] font-extrabold mt-1">Importar clientes</h1>
        <div className="text-sm font-semibold text-[#3A4658] mt-1">
          Cole as linhas da sua planilha. O sistema arruma telefone, CPF/CNPJ e endereço e mostra o que ficou duvidoso antes de importar.
        </div>
      </div>

      {resultado && (
        <div role="status" className={`rounded-2xl px-4 py-3 text-sm font-bold flex flex-wrap items-center justify-between gap-2 ${resultado.ok ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FDE4E1] text-[#8E1B10]"}`}>
          <span>{resultado.texto}</span>
          {resultado.ok && <Link href="/clientes" className="min-h-[44px] inline-flex items-center rounded-full bg-[#14653A] text-white px-5 text-xs font-bold">Ver clientes</Link>}
        </div>
      )}

      {!conferido && (
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <h2 className="text-[17px] font-extrabold m-0">1. Cole a planilha</h2>
          <ol className="text-[13px] font-semibold text-[#3A4658] list-decimal pl-5 m-0 flex flex-col gap-0.5">
            <li>No Excel, selecione as linhas dos clientes, <b>incluindo a linha de títulos</b> (Cliente, Telefone, CPF/CNPJ, Endereço, N°, Bairro).</li>
            <li>Copie (Ctrl+C) e cole na caixa abaixo (Ctrl+V).</li>
          </ol>
          <textarea
            value={texto}
            onChange={(e) => { setTexto(e.target.value); setErroArquivo(""); }}
            rows={10}
            aria-label="Linhas da planilha"
            placeholder={"CLIENTE\tTELEFONE\tCPF / CNPJ\tENDEREÇO\tN°\tBAIRRO\nCasa de Carnes Almeida\t12 98830-7877\t09.086.574/0001-07\tAv. Elísia Galdino Sobrinho\t266\tMurumbi"}
            className={`${inputCls} font-mono text-[13px] leading-snug`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!texto.trim()} onClick={conferir} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold disabled:opacity-50">
              Conferir dados
            </button>
            <label className="min-h-[48px] inline-flex items-center rounded-full border-[1.5px] border-[#0F1720] px-5 text-sm font-bold cursor-pointer">
              Ou escolher um arquivo CSV
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={lerArquivo} className="sr-only" />
            </label>
          </div>
          {erroArquivo && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold">{erroArquivo}</div>}
          <div className="text-xs font-semibold text-[#3A4658]">
            Dica: as cores da planilha (como as células em vermelho) não vêm junto ao copiar. Se elas significam algo, coloque em uma coluna de texto (ex.: Observações) antes de copiar.
          </div>
        </section>
      )}

      {conferido && leitura && (
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-extrabold m-0">2. Confira antes de importar</h2>
            <button type="button" onClick={novaColagem} className="min-h-[44px] rounded-full border-[1.5px] border-[#0F1720] px-4 text-xs font-bold">Colar outra planilha</button>
          </div>

          {linhas.length === 0 ? (
            <div className="text-sm font-semibold text-[#3A4658]">Não encontrei nenhuma linha de cliente no que foi colado.</div>
          ) : (
            <>
              <div className="text-[13px] font-semibold text-[#3A4658]">
                {leitura.temCabecalho ? "Colunas entendidas: " : "Sem linha de títulos: assumi a ordem Nome, Telefone, CPF/CNPJ, Endereço, Número, Bairro. "}
                {leitura.colunas.map((c) => `${c.titulo} → ${c.campo}`).join(" · ")}
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-[#E8ECF2] text-[#2F3A4A] px-3 py-1">{linhas.length} linhas lidas</span>
                <span className="rounded-full bg-[#DDF3E4] text-[#14653A] px-3 py-1">{prontas} prontas</span>
                <span className="rounded-full bg-[#FFF0D1] text-[#7A4B00] px-3 py-1">{comAviso} com aviso</span>
                <span className="rounded-full bg-[#DCE7FF] text-[#1B47B5] px-3 py-1">{duplicadas} já existem</span>
                <span className="rounded-full bg-[#FDE4E1] text-[#8E1B10] px-3 py-1">{comErro} com erro</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label="Filtrar linhas" className="flex gap-2">
                  {([["todas", "Todas"], ["atencao", "Só as que pedem atenção"]] as [Filtro, string][]).map(([k, r]) => (
                    <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)} className={`min-h-[44px] rounded-full px-4 text-xs font-bold ${filtro === k ? "bg-[#0F1720] text-white" : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB]"}`}>{r}</button>
                  ))}
                </div>
                <button type="button" onClick={() => marcarTodas(true)} className="min-h-[44px] rounded-full border-[1.5px] border-[#C9D3E0] px-4 text-xs font-bold">Marcar todas (menos as que já existem)</button>
                <button type="button" onClick={() => marcarTodas(false)} className="min-h-[44px] rounded-full border-[1.5px] border-[#C9D3E0] px-4 text-xs font-bold">Desmarcar todas</button>
              </div>

              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {visiveis.map((l) => {
                  const e = comEscolha(l);
                  const bloqueada = l.erros.length > 0;
                  return (
                    <li key={l.linha} className={`rounded-2xl border p-3 flex gap-3 ${bloqueada ? "bg-[#FDE4E1]/50 border-[#F2B8B1]" : e.importar ? "bg-white border-[#C9D3E0]" : "bg-[#F4F7FB] border-[#E3E8EF]"}`}>
                      <label className="min-w-[44px] min-h-[44px] flex items-start justify-center pt-1 cursor-pointer">
                        <input type="checkbox" checked={e.importar} disabled={bloqueada} onChange={(ev) => alterar(l.linha, { importar: ev.target.checked })} aria-label={`Importar ${l.nome || "linha " + l.linha}`} className="w-5 h-5 accent-[#2F5FE0]" />
                      </label>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-extrabold break-words">{l.nome || "(sem nome)"}</span>
                          <div role="group" aria-label="Tipo do cliente" className="flex gap-1">
                            {(["PJ", "PF"] as const).map((t) => (
                              <button key={t} type="button" aria-pressed={e.tipo === t} disabled={bloqueada} onClick={() => alterar(l.linha, { tipo: t })} className={`min-h-[32px] rounded-full px-3 text-[11px] font-bold ${e.tipo === t ? "bg-[#0F1720] text-white" : "border border-[#C9D3E0] bg-white"}`}>{t}</button>
                            ))}
                          </div>
                          {l.duplicado && (
                            <span className="rounded-full bg-[#DCE7FF] text-[#1B47B5] px-2.5 py-0.5 text-[11px] font-bold">
                              {l.duplicado.onde === "banco" ? `Já cadastrado como "${l.duplicado.de}"` : `Repetido na planilha ("${l.duplicado.de}")`}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-0.5 text-[13px] text-[#2F3A4A]">
                          <div><span className="text-[11px] font-bold text-[#3A4658]">CPF/CNPJ </span>{l.documento || "—"}</div>
                          <div><span className="text-[11px] font-bold text-[#3A4658]">WhatsApp </span>{l.whatsapp || "—"}</div>
                          <div className="break-all"><span className="text-[11px] font-bold text-[#3A4658]">E-mail </span>{l.email || "—"}</div>
                          <div className="sm:col-span-2 lg:col-span-4"><span className="text-[11px] font-bold text-[#3A4658]">Endereço </span>{l.endereco || "—"}</div>
                          {l.observacoes && <div className="sm:col-span-2 lg:col-span-4"><span className="text-[11px] font-bold text-[#3A4658]">Observações </span>{l.observacoes}</div>}
                        </div>
                        {(l.erros.length > 0 || l.avisos.length > 0) && (
                          <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
                            {l.erros.map((m) => <li key={m} className="text-xs font-bold text-[#8E1B10]">✕ {m} Esta linha não será importada.</li>)}
                            {l.avisos.map((m) => <li key={m} className="text-xs font-bold text-[#7A4B00]">! {m}</li>)}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
                {visiveis.length === 0 && <li className="text-sm font-semibold text-[#3A4658] py-3">Nenhuma linha pede atenção.</li>}
              </ul>

              <div className="sticky bottom-[72px] md:bottom-3 bg-white/95 backdrop-blur rounded-2xl border border-[#E3E8EF] p-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold">{selecionadas.length} de {linhas.length} marcadas para importar</span>
                <button type="button" disabled={enviando || selecionadas.length === 0} onClick={importar} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold disabled:opacity-50">
                  {enviando ? "Importando..." : `Importar ${selecionadas.length} cliente(s)`}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
