"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import ImpactoAnimation from "@/components/impacto/ImpactoAnimation";
import { CobrancaModal } from "@/components/cobranca-modal";
import { Modal } from "@/components/modal";
import { linkWhatsApp, situacaoVencimento, type ContaCobranca, type PixConfig } from "@/lib/cobranca";
import { formatBRL, formatDateBR } from "@/lib/utils";

export type ServicoHoje = {
  id: number;
  hora: string;
  clienteNome: string;
  tipoNome: string;
  tecnicoNome: string | null;
  status: "agendado" | "concluido" | "cancelado";
  valor: number;
  endereco: string;
  whatsapp: string;
  observacoes: string;
  pagamento: string;
};

export type ContaInicio = {
  id: number;
  tipo: "receber" | "pagar";
  quem: string;
  oQue: string;
  vencimento: string;
  valor: number;
  contato: string; // só a receber: "Nome · telefone"
  cobranca: ContaCobranca | null; // só a receber
};

type Detalhe = { t: "servico"; id: number } | { t: "conta"; id: number } | null;

const OUTLINE = "inline-flex items-center min-h-[48px] rounded-full border-[1.5px] border-[#0F1720] bg-white px-5 text-sm font-bold";
const PRIMARY = "inline-flex items-center min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-5 text-sm font-bold";

export function InicioView({ hoje, pix, servicos, contas, verFinanceiro }: {
  hoje: string;
  pix: PixConfig | null;
  servicos: ServicoHoje[];
  contas: ContaInicio[];
  verFinanceiro: boolean;
}) {
  const [detalhe, setDetalhe] = useState<Detalhe>(null);
  const [cobrar, setCobrar] = useState<ContaCobranca | null>(null);
  const [cobradas, setCobradas] = useState<Record<number, string>>({});

  const servico = detalhe?.t === "servico" ? servicos.find((s) => s.id === detalhe.id) : undefined;
  const conta = detalhe?.t === "conta" ? contas.find((c) => c.id === detalhe.id) : undefined;

  function Linhas({ rows }: { rows: [string, string][] }) {
    return (
      <div className="bg-[#F4F7FB] rounded-[18px] px-4 py-1">
        {rows.map(([k, v], i) => (
          <div key={k} className={`flex gap-3 py-2.5 ${i === 0 ? "" : "border-t border-[#E3E8EF]"}`}>
            <div className="shrink-0 basis-28 text-xs font-bold text-[#3A4658]">{k}</div>
            <div className="min-w-0 flex-1 text-sm font-semibold leading-[1.4] break-words">{v}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">Início</h1>
      <div className={`grid grid-cols-1 ${verFinanceiro ? "lg:grid-cols-2" : ""} gap-5 items-start`}>
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Trabalhos de hoje ({formatDateBR(hoje)})</h2>
            <Link href="/agenda" className="text-xs font-bold text-[#1B47B5] min-h-[44px] inline-flex items-center">Abrir agenda →</Link>
          </div>
          <div className="rounded-[16px] overflow-hidden"><ImpactoAnimation type="street" /></div>
          {servicos.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#3A4658]">Nenhum serviço agendado para hoje.</div>
          ) : (
            <>
              {servicos.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setDetalhe({ t: "servico", id: job.id })}
                  aria-label={`Ver detalhes do serviço de ${job.clienteNome} às ${job.hora}`}
                  className="flex items-center justify-between gap-3 py-3 min-h-[56px] w-full text-left border-t border-slate-200 hover:bg-[#F4F7FB] rounded-lg"
                >
                  <div className="w-14 text-sm font-extrabold">{job.hora}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{job.clienteNome}</div>
                    <div className="text-xs text-[#3A4658]">{job.tipoNome} · {job.tecnicoNome ?? "Sem técnico"}</div>
                  </div>
                  <span className={`text-xs font-bold rounded-full px-3 py-1 ${job.status === "concluido" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#E8ECF2] text-[#2F3A4A]"}`}>
                    {job.status === "concluido" ? "Concluído" : "Agendado"}
                  </span>
                  <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#3A4658]" aria-hidden="true" />
                </button>
              ))}
              <div className="text-xs font-semibold text-[#3A4658]">Toque em um serviço para ver os detalhes.</div>
            </>
          )}
        </section>

        {verFinanceiro && <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Contas de hoje e vencidas</h2>
            <Link href="/financeiro" className="text-xs font-bold text-[#1B47B5] whitespace-nowrap min-h-[44px] inline-flex items-center">Financeiro →</Link>
          </div>
          <div className="rounded-[16px] overflow-hidden"><ImpactoAnimation type="payment" /></div>
          {contas.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#3A4658]">Nenhuma conta vence hoje nem está vencida.</div>
          ) : (
            <>
              {contas.map((c) => {
                const sit = situacaoVencimento(c.vencimento, hoje);
                const receber = c.tipo === "receber";
                return (
                  <div key={c.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDetalhe({ t: "conta", id: c.id })}
                      aria-label={`Ver detalhes da conta ${c.quem}, ${sit.longo.toLowerCase()}`}
                      className="basis-full sm:basis-0 sm:flex-1 min-w-0 min-h-[56px] flex items-center justify-between gap-3 py-2.5 text-left hover:bg-[#F4F7FB] rounded-lg"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{c.quem}</span>
                        <span className="block text-xs text-[#3A4658] mt-0.5">
                          {c.oQue ? `${c.oQue} · ` : ""}vence {formatDateBR(c.vencimento).slice(0, 5)}
                        </span>
                        {cobradas[c.id] && <span className="block text-[11px] font-bold text-[#14653A] mt-0.5">WhatsApp aberto hoje às {cobradas[c.id]}</span>}
                      </span>
                      <span className="shrink-0 w-[116px] text-right">
                        <span className={`block text-sm font-extrabold ${receber ? "text-[#14653A]" : "text-[#8E1B10]"}`}>{formatBRL(c.valor)}</span>
                        <span className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${sit.chip}`}>{sit.curto}</span>
                      </span>
                      <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#3A4658]" aria-hidden="true" />
                    </button>
                    {receber && c.cobranca ? (
                      <button
                        type="button"
                        onClick={() => setCobrar(c.cobranca)}
                        aria-label={`Cobrar ${c.quem} por WhatsApp`}
                        className="ml-auto sm:ml-0 mb-2 sm:mb-0 min-h-[44px] w-[96px] shrink-0 rounded-full border-[1.5px] border-[#0F1720] bg-white px-4 text-xs font-bold"
                      >
                        Cobrar
                      </button>
                    ) : (
                      // Reserva o espaço do botão para os valores ficarem na mesma coluna em todas as linhas.
                      <span aria-hidden="true" className="hidden sm:block w-[96px] shrink-0" />
                    )}
                  </div>
                );
              })}
              <div className="text-xs font-semibold text-[#3A4658]">Toque em uma conta para ver os detalhes.</div>
            </>
          )}
        </section>}
      </div>

      {servico && (
        <Modal titleId="det-servico-titulo" onClose={() => setDetalhe(null)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#3A4658]">Serviço · hoje às {servico.hora}</div>
              <h2 id="det-servico-titulo" className="text-[22px] font-extrabold leading-tight mt-0.5 m-0">{servico.clienteNome}</h2>
              <span className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-bold ${servico.status === "concluido" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#E8ECF2] text-[#2F3A4A]"}`}>
                {servico.status === "concluido" ? "Concluído" : "Agendado"}
              </span>
            </div>
            <button onClick={() => setDetalhe(null)} aria-label="Fechar" className="w-11 h-11 shrink-0 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <Linhas
            rows={[
              ["Serviço", servico.tipoNome],
              ["Técnico", servico.tecnicoNome ?? "Sem técnico"],
              ["Endereço", servico.endereco || "Não informado"],
              ["Contato", servico.whatsapp || "Não informado"],
              ["Valor", formatBRL(servico.valor)],
              ...(servico.pagamento ? ([["Pagamento", servico.pagamento]] as [string, string][]) : []),
              ...(servico.observacoes ? ([["Observações", servico.observacoes]] as [string, string][]) : []),
            ]}
          />
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {servico.endereco && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(servico.endereco)}`} target="_blank" rel="noopener noreferrer" className={OUTLINE}>Abrir no Maps</a>
            )}
            {linkWhatsApp(servico.whatsapp) && (
              <a href={linkWhatsApp(servico.whatsapp)!} target="_blank" rel="noopener noreferrer" className={OUTLINE}>Falar com o cliente</a>
            )}
            <Link href="/agenda" className={PRIMARY}>Ver na agenda</Link>
          </div>
        </Modal>
      )}

      {conta && (
        <Modal titleId="det-conta-titulo" onClose={() => setDetalhe(null)}>
          {(() => {
            const sit = situacaoVencimento(conta.vencimento, hoje);
            const receber = conta.tipo === "receber";
            return (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#3A4658]">{receber ? "Conta a receber" : "Conta a pagar"}</div>
                    <h2 id="det-conta-titulo" className="text-[22px] font-extrabold leading-tight mt-0.5 m-0">{conta.quem}</h2>
                    <span className={`inline-block mt-2 rounded-full px-3 py-1 text-xs font-bold ${sit.chip}`}>{sit.longo}</span>
                  </div>
                  <button onClick={() => setDetalhe(null)} aria-label="Fechar" className="w-11 h-11 shrink-0 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
                </div>
                <Linhas
                  rows={[
                    ["Descrição", conta.oQue || "—"],
                    ["Vencimento", `${formatDateBR(conta.vencimento)} · ${sit.longo.toLowerCase()}`],
                    ["Valor", formatBRL(conta.valor)],
                    ...(receber && conta.contato ? ([["Contato", conta.contato]] as [string, string][]) : []),
                    ...(cobradas[conta.id] ? ([["Cobrança", `WhatsApp aberto hoje às ${cobradas[conta.id]}`]] as [string, string][]) : []),
                  ]}
                />
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Link href="/financeiro" className={receber ? OUTLINE : PRIMARY}>{receber ? "Dar baixa no Financeiro" : "Abrir no Financeiro"}</Link>
                  {receber && conta.cobranca && (
                    <button
                      type="button"
                      onClick={() => {
                        setCobrar(conta.cobranca);
                        setDetalhe(null);
                      }}
                      className={PRIMARY}
                    >
                      Cobrar por WhatsApp
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </Modal>
      )}

      {cobrar && (
        <CobrancaModal
          key={cobrar.id}
          conta={cobrar}
          hoje={hoje}
          pix={pix}
          onClose={() => setCobrar(null)}
          onAberto={(id, hora) => setCobradas((p) => ({ ...p, [id]: hora }))}
        />
      )}
    </>
  );
}
