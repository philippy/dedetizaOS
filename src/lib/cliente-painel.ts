import { addMonthsISO, diffDaysISO } from "@/lib/utils";

// Intervalo sugerido entre um serviço e o próximo (reforço preventivo).
export const MESES_RETORNO = 6;
// Quantos dias antes da data sugerida o cliente já aparece como "retorno a vencer".
export const DIAS_AVISO_RETORNO = 30;

export type ServicoPainel = { id: number; dataHora: string; valor: number; status: "agendado" | "concluido" | "cancelado" };
export type LancamentoPainel = { servicoId: number | null; tipo: "receber" | "pagar"; status: "aberto" | "pago"; vencimento: string; valor: number };

export type StatusLinha = "Pago" | "A receber" | "Em atraso" | "Concluído" | "Agendado" | "Cancelado";

export type PainelCliente = {
  ltv: number; // soma dos serviços concluídos (pagos ou não)
  qtdConcluidos: number;
  recebido: number; // já pago
  pendente: number; // em aberto que ainda não venceu
  qtdPendente: number;
  atraso: number; // em aberto e vencido
  qtdAtraso: number;
  diasAtrasoMaisAntigo: number;
  ultimoServico: string | null; // AAAA-MM-DD
  sugestao: string | null; // último serviço + 6 meses
  diasParaSugestao: number | null; // negativo = já passou
  proximoAgendado: string | null; // AAAA-MM-DD de serviço agendado de hoje em diante
  retorno: "vencido" | "a_vencer" | null;
};

export function calcularPainel(servicos: ServicoPainel[], lancs: LancamentoPainel[], hoje: string): PainelCliente {
  const concluidos = servicos.filter((s) => s.status === "concluido");
  const receber = lancs.filter((l) => l.tipo === "receber");
  const abertos = receber.filter((l) => l.status === "aberto");
  const vencidos = abertos.filter((l) => l.vencimento < hoje);
  const aVencer = abertos.filter((l) => l.vencimento >= hoje);

  const ultimoServico = concluidos.length ? concluidos.map((s) => s.dataHora.slice(0, 10)).sort().at(-1)! : null;
  const sugestao = ultimoServico ? addMonthsISO(ultimoServico, MESES_RETORNO) : null;
  const diasParaSugestao = sugestao ? diffDaysISO(hoje, sugestao) : null;

  const futuros = servicos.filter((s) => s.status === "agendado" && s.dataHora.slice(0, 10) >= hoje).map((s) => s.dataHora.slice(0, 10)).sort();
  const proximoAgendado = futuros[0] ?? null;

  let retorno: PainelCliente["retorno"] = null;
  if (diasParaSugestao !== null && !proximoAgendado) {
    if (diasParaSugestao < 0) retorno = "vencido";
    else if (diasParaSugestao <= DIAS_AVISO_RETORNO) retorno = "a_vencer";
  }

  const maisAntigo = vencidos.length ? vencidos.map((l) => l.vencimento).sort()[0] : null;

  return {
    ltv: concluidos.reduce((a, s) => a + s.valor, 0),
    qtdConcluidos: concluidos.length,
    recebido: receber.filter((l) => l.status === "pago").reduce((a, l) => a + l.valor, 0),
    pendente: aVencer.reduce((a, l) => a + l.valor, 0),
    qtdPendente: aVencer.length,
    atraso: vencidos.reduce((a, l) => a + l.valor, 0),
    qtdAtraso: vencidos.length,
    diasAtrasoMaisAntigo: maisAntigo ? diffDaysISO(maisAntigo, hoje) : 0,
    ultimoServico,
    sugestao,
    diasParaSugestao,
    proximoAgendado,
    retorno,
  };
}

// Situação de cada linha do histórico, a partir da conta a receber ligada ao serviço.
export function statusDaLinha(servico: ServicoPainel, lancs: LancamentoPainel[], hoje: string): StatusLinha {
  if (servico.status === "agendado") return "Agendado";
  if (servico.status === "cancelado") return "Cancelado";
  const conta = lancs.find((l) => l.servicoId === servico.id && l.tipo === "receber");
  if (!conta) return "Concluído";
  if (conta.status === "pago") return "Pago";
  return conta.vencimento < hoje ? "Em atraso" : "A receber";
}

export function textoPrazo(dias: number): string {
  if (dias === 0) return "hoje";
  const n = Math.abs(dias);
  const un = n === 1 ? "dia" : "dias";
  return dias > 0 ? `em ${n} ${un}` : `há ${n} ${un}`;
}
