// Regras puras da cobrança por WhatsApp e da descrição de contas. Sem acesso a banco,
// para poder ser usado no servidor e nos componentes de tela.
import { diffDaysISO, formatBRL, formatDateBR } from "./utils";

export type PixConfig = { chave: string; tipo: string; favorecido: string };

// Conta a receber pronta para cobrar.
export type ContaCobranca = {
  id: number;
  quem: string; // nome mostrado na tela
  saudacao: string; // como chamar a pessoa na mensagem
  oQue: string; // o que está sendo cobrado ("Cupins")
  vencimento: string; // AAAA-MM-DD
  valor: number; // centavos
  telefone: string; // pode vir vazio ou incompleto
};

type LancamentoBase = { tipo: "receber" | "pagar"; descricao: string; fornecedor: string | null };

export type ContextoLancamento = {
  clienteNome?: string | null;
  clienteTipo?: "PF" | "PJ" | null;
  clienteWhatsapp?: string | null;
  inscMorador?: string | null;
  inscTelefone?: string | null;
};

// Quem e o quê, como no protótipo. A descrição de serviço é "Tipo · Cliente";
// tira o nome do cliente do fim para não repetir.
export function quemEOque(l: LancamentoBase, ctx: ContextoLancamento = {}) {
  if (l.tipo === "pagar") return { who: l.fornecedor || "Fornecedor", what: l.descricao };
  if (ctx.clienteNome) {
    const sufixo = ` · ${ctx.clienteNome}`;
    const what = l.descricao.endsWith(sufixo) ? l.descricao.slice(0, -sufixo.length) : l.descricao;
    return { who: ctx.clienteNome, what };
  }
  const [a, ...resto] = l.descricao.split(" · ");
  return resto.length ? { who: a, what: resto.join(" · ") } : { who: l.descricao, what: "" };
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome.trim();
}

// Monta os dados de cobrança de um lançamento a receber. Cliente cadastrado usa o contato do
// cliente; inscrição de campanha usa o morador e o telefone da inscrição.
export function contaDeLancamento(
  l: LancamentoBase & { id: number; vencimento: string; valor: number },
  ctx: ContextoLancamento = {},
): ContaCobranca {
  const { who, what } = quemEOque(l, ctx);
  if (ctx.clienteNome) {
    return {
      id: l.id,
      quem: who,
      // Pessoa física: primeiro nome. Empresa: o nome da empresa, que a pessoa pode ajustar na mensagem.
      saudacao: ctx.clienteTipo === "PF" ? primeiroNome(ctx.clienteNome) : ctx.clienteNome,
      oQue: what,
      vencimento: l.vencimento,
      valor: l.valor,
      telefone: ctx.clienteWhatsapp ?? "",
    };
  }
  if (ctx.inscMorador) {
    // Descrição da campanha: "Campanha X · Unid. 12 (Morador)". O morador já vai na saudação,
    // então sai do texto: "Campanha X (Unid. 12)".
    const [campanha, ...resto] = l.descricao.split(" · ");
    const unidade = resto.join(" · ").replace(/\s*\([^)]*\)\s*$/, "").trim();
    return {
      id: l.id,
      quem: ctx.inscMorador,
      saudacao: primeiroNome(ctx.inscMorador),
      oQue: unidade ? `${campanha} (${unidade})` : campanha,
      vencimento: l.vencimento,
      valor: l.valor,
      telefone: ctx.inscTelefone ?? "",
    };
  }
  return { id: l.id, quem: who, saudacao: who, oQue: what, vencimento: l.vencimento, valor: l.valor, telefone: "" };
}

// Situação do vencimento em relação a hoje, para chips e para a mensagem.
export function situacaoVencimento(vencimento: string, hoje: string) {
  const atraso = diffDaysISO(vencimento, hoje); // positivo = vencida
  const dm = formatDateBR(vencimento).slice(0, 5);
  if (atraso > 0) {
    const dias = `${atraso} ${atraso === 1 ? "dia" : "dias"}`;
    return { atraso, curto: `Há ${dias}`, longo: `Vencida há ${dias}`, chip: "bg-[#FDE4E1] text-[#8E1B10]", quando: `venceu dia ${dm} (há ${dias})` };
  }
  if (atraso === 0) {
    return { atraso, curto: "Hoje", longo: "Vence hoje", chip: "bg-[#FFF0D1] text-[#7A4B00]", quando: `vence hoje (${dm})` };
  }
  const faltam = -atraso;
  const dias = `${faltam} ${faltam === 1 ? "dia" : "dias"}`;
  return { atraso, curto: `Em ${dias}`, longo: `Vence em ${dias}`, chip: "bg-[#DCE7FF] text-[#1B47B5]", quando: `vence dia ${dm}` };
}

export const PLACEHOLDER_PIX = "[informe a chave Pix]";

export function montarMensagemCobranca(conta: ContaCobranca, hoje: string, pix: PixConfig | null) {
  const { quando } = situacaoVencimento(conta.vencimento, hoje);
  const o = conta.oQue.trim();
  const oQue = o ? o.charAt(0).toLowerCase() + o.slice(1) : "";
  const valor = formatBRL(conta.valor).replace(/ /g, " ");
  const linhas = [
    `Olá ${conta.saudacao}. Sua conta${oQue ? ` de ${oQue}` : ""} ${quando}.`,
    "",
    "Segue abaixo a chave Pix e o valor:",
    `Valor: ${valor}`,
    pix ? `Chave Pix (${pix.tipo}): ${pix.chave}` : `Chave Pix: ${PLACEHOLDER_PIX}`,
  ];
  if (pix?.favorecido) linhas.push(`Favorecido: ${pix.favorecido}`);
  linhas.push("", "Depois de pagar, é só mandar o comprovante por aqui. Obrigado!");
  return linhas.join("\n");
}

// Telefone brasileiro só com dígitos e com o 55 na frente. Devolve null se não der para abrir o WhatsApp.
export function telefoneWhatsApp(telefone: string): string | null {
  let d = telefone.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return `55${d}`;
}

export function linkWhatsApp(telefone: string, texto?: string): string | null {
  const n = telefoneWhatsApp(telefone);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function horaAgoraSP() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date());
}
