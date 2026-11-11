"use client";

import { useState } from "react";
import Link from "next/link";
import { inscreverUnidadeCampanhaAction, marcarInscricaoPagaAction } from "@/actions";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { X } from "lucide-react";

export function CampanhaDetalheView({ campanha, inscritos, oferecidos, nomesTipos, verFinanceiro }: { campanha: any; inscritos: any[]; oferecidos: { id: number; nome: string; valorReais: string; precoCampanha: number; precoCheio: number }[]; nomesTipos: Record<number, string>; verFinanceiro: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [unidade, setUnidade] = useState("");
  const [morador, setMorador] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipoId, setTipoId] = useState<number>(oferecidos[0]?.id ?? 0);
  const [valorReais, setValorReais] = useState(oferecidos[0]?.valorReais ?? "");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [pagandoId, setPagandoId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pagos" | "aguardando">("todos");

  const pagos = inscritos.filter((i: any) => i.pago);
  const aguardando = inscritos.filter((i: any) => !i.pago);
  const soma = (l: any[]) => l.reduce((a, i) => a + i.valor, 0);
  const livres = Math.max(0, campanha.unidades - inscritos.length);
  const mostrados = filtro === "todos" ? inscritos : filtro === "pagos" ? pagos : aguardando;
  const periodo = campanha.dataInicio === campanha.dataFim ? formatDateBR(campanha.dataInicio) : `${formatDateBR(campanha.dataInicio)} a ${formatDateBR(campanha.dataFim)}`;
  const CHIP_STATUS: Record<string, string> = {
    agendada: "bg-[#DCE7FF] text-[#1B47B5]",
    finalizada: "bg-[#DDF3E4] text-[#14653A]",
    cancelada: "bg-[#FDE4E1] text-[#8E1B10]",
  };
  const kpis = [
    { label: "Atendimentos contratados", value: `${inscritos.length} de ${campanha.unidades}`, sub: `${livres} ${livres === 1 ? "unidade ainda sem contratação" : "unidades ainda sem contratação"}` },
    { label: "Pagos", value: String(pagos.length), sub: `${aguardando.length} aguardando Pix` },
    ...(verFinanceiro
      ? [
          { label: "Receita confirmada", value: formatBRL(soma(pagos)), sub: "pagamentos já baixados no Financeiro" },
          { label: "A confirmar", value: formatBRL(soma(aguardando)), sub: "contratados, ainda sem pagamento" },
        ]
      : []),
  ];

  async function marcarPago(id: number, unidadeNome: string) {
    setPagandoId(id);
    const res = await marcarInscricaoPagaAction(id);
    setPagandoId(null);
    if (res && "error" in res && res.error) {
      setAviso({ texto: res.error, ok: false });
      return;
    }
    setAviso({ texto: `${unidadeNome}: pagamento registrado e baixa feita no Financeiro.`, ok: true });
  }

  async function handleInscrever() {
    setError("");
    const res = await inscreverUnidadeCampanhaAction({
      campanhaId: campanha.id,
      tipoServicoId: tipoId || undefined,
      unidade,
      morador,
      telefone,
      valorReais,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    setAviso({ texto: `${unidade.trim()} inscrita. Conta a receber criada no Financeiro.`, ok: true });
    setUnidade("");
    setMorador("");
    setTelefone("");
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/campanhas" className="inline-flex items-center min-h-[44px] text-[13px] font-bold text-[#1B47B5]">
            ← Todas as campanhas
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[28px] font-extrabold">Campanha · {campanha.nome}</h1>
            <span className={`rounded-full px-3.5 py-0.5 text-[13px] font-bold capitalize ${CHIP_STATUS[campanha.status] ?? "bg-[#E8ECF2] text-[#3A4658]"}`}>{campanha.status}</span>
          </div>
          <p className="text-sm font-semibold text-[#3A4658] mt-1">
            {campanha.local} · {periodo}
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setModalOpen(true);
          }}
          className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
        >
          Contratar serviço
        </button>
      </div>

      {aviso && (
        <div role="status" className={`flex items-center justify-between gap-2 rounded-2xl pl-4 pr-2 py-1.5 text-sm font-bold ${aviso.ok ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FDE4E1] text-[#8E1B10]"}`}>
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} aria-label="Fechar aviso" className="w-11 h-11 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-[24px] shadow-sm px-4 py-4 sm:px-5 min-w-0">
            <div className="text-[13px] font-semibold text-[#3A4658]">{k.label}</div>
            <div className="text-xl sm:text-[26px] font-extrabold leading-tight mt-1 break-words">{k.value}</div>
            <div className="text-xs font-semibold text-[#3A4658] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Casas e apartamentos</h2>
            <div role="group" aria-label="Filtrar lista" className="flex flex-wrap gap-2">
              {([["todos", "Todos", inscritos.length], ["pagos", "Pagos", pagos.length], ["aguardando", "Aguardando Pix", aguardando.length]] as const).map(([k, rotulo, n]) => (
                <button
                  key={k}
                  onClick={() => setFiltro(k)}
                  aria-pressed={filtro === k}
                  className={`min-h-[44px] rounded-full px-4 text-xs font-bold ${filtro === k ? "bg-[#0F1720] text-white" : "border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] text-[#0F1720]"}`}
                >
                  {rotulo} ({n})
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-[#3A4658]">
                  <th className="p-2.5">Unidade</th>
                  <th className="p-2.5">Morador</th>
                  <th className="p-2.5">Serviço</th>
                  <th className="p-2.5">Valor</th>
                  <th className="p-2.5">Pix</th>
                  <th className="p-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {mostrados.map((i: any) => (
                  <tr key={i.id} className="border-t border-[#E3E8EF]">
                    <td className="p-3 font-extrabold">{i.unidade}</td>
                    <td className="p-3">
                      <div className="font-bold">{i.morador}</div>
                      <div className="text-xs font-semibold text-[#3A4658]">{i.telefone}</div>
                    </td>
                    <td className="p-3">{i.tipoServicoId ? nomesTipos[i.tipoServicoId] ?? "—" : "—"}</td>
                    <td className="p-3 font-extrabold">{formatBRL(i.valor)}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold whitespace-nowrap ${i.pago ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FFF0D1] text-[#7A4B00]"}`}>
                        {i.pago ? "Pago" : "Aguardando Pix"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {!i.pago && verFinanceiro && (
                        <button
                          disabled={pagandoId === i.id}
                          onClick={() => marcarPago(i.id, i.unidade)}
                          className="min-h-[44px] rounded-full bg-[#14653A] text-white px-4 text-xs font-bold disabled:opacity-60"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mostrados.length === 0 && (
              <div className="py-8 text-center text-sm font-semibold text-[#3A4658]">
                {inscritos.length === 0 ? 'Nenhum atendimento contratado ainda. Use "Contratar serviço" para cadastrar o primeiro morador.' : "Nenhuma unidade nesse filtro."}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <h2 className="text-[17px] font-extrabold">Resumo da campanha</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-semibold text-[#3A4658]">Período</dt>
            <dd className="font-bold text-right">{periodo}</dd>
            <dt className="font-semibold text-[#3A4658]">Desconto</dt>
            <dd className="font-bold text-right">{campanha.descontoPct}%</dd>
            <dt className="font-semibold text-[#3A4658]">Unidades</dt>
            <dd className="font-bold text-right">{campanha.unidades}</dd>
          </dl>
          <div className="text-xs font-bold text-[#3A4658] mt-1">Serviços e preço na campanha</div>
          <ul className="flex flex-col gap-2 text-sm">
            {oferecidos.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-[#E3E8EF] pt-2">
                <span className="font-bold">{o.nome}</span>
                <span className="font-extrabold">
                  {formatBRL(o.precoCampanha)} <span className="text-xs font-semibold text-[#3A4658]">(de {formatBRL(o.precoCheio)})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-14">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-white rounded-[28px] p-6 flex flex-col gap-3.5 text-[#0F1720]"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-[22px] font-extrabold">Contratar serviço</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oferecidos.length > 0 && (
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Serviço contratado
                <select
                  value={tipoId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setTipoId(id);
                    const o = oferecidos.find((x) => x.id === id);
                    if (o) setValorReais(o.valorReais);
                  }}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm bg-white"
                >
                  {oferecidos.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome} ({o.valorReais.replace(/^/, "R$ ")})</option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Casa ou apartamento
              <input
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="Ex.: Casa 15 ou Apto 42"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
              Nome do morador
              <input
                value={morador}
                onChange={(e) => setMorador(e.target.value)}
                placeholder="Ex.: Marina Souza"
                className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Telefone / WhatsApp
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]">
                Valor (R$)
                <input
                  value={valorReais}
                  onChange={(e) => setValorReais(e.target.value)}
                  className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm"
                />
              </label>
            </div>

            <div className="bg-[#F4F7FB] rounded-2xl p-3 text-xs font-semibold text-[#2F3A4A]">
              O valor já vem com o desconto da campanha ({campanha.descontoPct}%) para o serviço escolhido e pode ser editado.
            </div>

            {error && (
              <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-2.5 text-xs font-bold">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInscrever}
                className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 font-bold text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
