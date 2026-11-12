import { db } from "@/db";
import { auditoria } from "@/db/schema";

// Ações registradas. O texto da tela vem de ROTULO_ACAO.
export const ROTULO_ACAO = {
  "usuario.criado": "Criou um usuário",
  "usuario.removido": "Removeu o acesso de um usuário",
  "usuario.papel": "Mudou o papel de um usuário",
  "usuario.senha_redefinida": "Gerou nova senha provisória",
  "usuario.senha_definida": "Definiu a própria senha (primeiro acesso)",
  "empresa.dados": "Alterou os dados da empresa",
  "pix.alterado": "Alterou a chave Pix",
  "pix.bloqueado": "Troca da chave Pix bloqueada (3 senhas erradas)",
  "pix.desbloqueado": "Desbloqueou a troca da chave Pix por e-mail",
  "cliente.excluido": "Excluiu um cliente",
  "financeiro.baixa": "Deu baixa em uma conta",
  "financeiro.conta_criada": "Criou uma conta a pagar",
  "financeiro.conta_excluida": "Excluiu uma conta a pagar",
  "financeiro.inscricao_paga": "Marcou uma inscrição de campanha como paga",
} as const;
export type AcaoAuditoria = keyof typeof ROTULO_ACAO;

type Pessoa = { id: string; nome: string; email: string };

// Grava um evento. É um registro, não uma trava: se falhar, a ação em si não é desfeita (só vai para o log do servidor).
export async function registrarAuditoria(args: {
  empresaId: number;
  ator: Pessoa;
  acao: AcaoAuditoria;
  alvo?: Pessoa | null;
  detalhe?: string;
}) {
  try {
    await db.insert(auditoria).values({
      empresaId: args.empresaId,
      atorId: args.ator.id,
      atorNome: args.ator.nome,
      atorEmail: args.ator.email,
      acao: args.acao,
      alvoId: args.alvo?.id ?? null,
      alvoNome: args.alvo?.nome ?? null,
      alvoEmail: args.alvo?.email ?? null,
      detalhe: (args.detalhe ?? "").slice(0, 500),
    });
  } catch (e) {
    console.error("Falha ao registrar atividade", args.acao, (e as Error)?.message);
  }
}

export const atorDe = (ctx: { userId: string; nome: string; email: string }): Pessoa => ({ id: ctx.userId, nome: ctx.nome, email: ctx.email });
