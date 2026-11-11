"use server";

import { and, eq, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, empresas, membros, user } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { autorizar, obterContexto } from "@/lib/contexto";
import { ehPapel } from "@/lib/permissoes";
import {
  TIPOS_PIX,
  cnpjValido,
  emailValido,
  formatarCnpj,
  formatarTelefone,
  normalizarChavePix,
  telefoneBR,
} from "@/lib/validacao";

type Resultado = { ok: true } | { error: string; campo?: string };

const texto = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`).default("");

const empresaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa.").max(120, "Use no máximo 120 caracteres."),
  cnpj: texto(30),
  endereco: texto(200),
  telefone: texto(30),
  email: texto(254),
  responsavel: texto(120),
  pixTipo: z.enum(TIPOS_PIX),
  pixChave: texto(120),
  pixFavorecido: texto(120),
  senhaAtual: z.string().max(200).optional().default(""),
});

async function senhaConfere(userId: string, senha: string) {
  const [conta] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  if (!conta?.password) return false;
  return verifyPassword({ hash: conta.password, password: senha });
}

// Só o administrador altera. A empresa vem da sessão (nunca do navegador). Mudar a chave Pix, que
// redireciona os pagamentos dos clientes, pede a senha de novo.
export async function salvarEmpresaAction(data: z.input<typeof empresaSchema>): Promise<Resultado> {
  await requireSession();
  const aut = await autorizar("empresa.editar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  const parsed = empresaSchema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: i.message, campo: String(i.path[0] ?? "") };
  }
  const v = parsed.data;

  let cnpj = "";
  if (v.cnpj) {
    if (!cnpjValido(v.cnpj)) return { error: "O CNPJ da empresa não é válido. Confira os números.", campo: "cnpj" };
    cnpj = formatarCnpj(v.cnpj);
  }
  let telefone = "";
  if (v.telefone) {
    if (!telefoneBR(v.telefone)) return { error: "Telefone inválido. Use DDD e número, ex.: (11) 90000-0000.", campo: "telefone" };
    telefone = formatarTelefone(v.telefone);
  }
  let email = "";
  if (v.email) {
    if (!emailValido(v.email)) return { error: "E-mail inválido.", campo: "email" };
    email = v.email.toLowerCase();
  }

  const atual = ctx.empresa;
  let pixChave = "";
  if (v.pixChave) {
    if (v.pixTipo === atual.pixTipo && v.pixChave === atual.pixChave) {
      // Chave que já estava salva e não foi mexida (ex.: a chave de exemplo): não bloqueia a edição dos outros dados.
      pixChave = atual.pixChave;
    } else {
      const n = normalizarChavePix(v.pixTipo, v.pixChave);
      if (!n.ok) return { error: n.erro, campo: "pixChave" };
      pixChave = n.chave;
    }
  }

  const pixMudou = v.pixTipo !== atual.pixTipo || pixChave !== atual.pixChave || v.pixFavorecido !== atual.pixFavorecido;
  if (pixMudou) {
    if (!v.senhaAtual) return { error: "Para mudar a chave Pix, digite sua senha.", campo: "senhaAtual" };
    if (!(await senhaConfere(ctx.userId, v.senhaAtual))) return { error: "Senha incorreta.", campo: "senhaAtual" };
  }

  const agora = new Date();
  await db
    .update(empresas)
    .set({
      nome: v.nome,
      cnpj,
      endereco: v.endereco,
      telefone,
      email,
      responsavel: v.responsavel,
      pixTipo: v.pixTipo,
      pixChave,
      pixFavorecido: v.pixFavorecido,
      ...(pixMudou ? { pixAtualizadoEm: agora, pixAtualizadoPor: ctx.userId } : {}),
      atualizadoEm: agora,
      atualizadoPor: ctx.userId,
    })
    .where(eq(empresas.id, ctx.empresa.id));

  revalidatePath("/", "layout");
  return { ok: true };
}

const contaSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(80, "Use no máximo 80 caracteres."),
  telefone: texto(30),
});

// Qualquer pessoa logada edita a própria conta (nome e telefone). A senha é trocada na tela pelo Better Auth.
export async function salvarMinhaContaAction(data: z.input<typeof contaSchema>): Promise<Resultado> {
  const session = await requireSession();
  const parsed = contaSchema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: i.message, campo: String(i.path[0] ?? "") };
  }
  const v = parsed.data;

  let telefone = "";
  if (v.telefone) {
    if (!telefoneBR(v.telefone)) return { error: "Telefone inválido. Use DDD e número, ex.: (11) 90000-0000.", campo: "telefone" };
    telefone = formatarTelefone(v.telefone);
  }

  const ctx = await obterContexto();
  if (ctx?.temVinculo) {
    await db.update(membros).set({ telefone }).where(eq(membros.userId, session.user.id));
  } else if (telefone) {
    return { error: "Seu usuário ainda não está vinculado a uma empresa. Peça ao administrador.", campo: "telefone" };
  }
  await db.update(user).set({ name: v.nome, updatedAt: new Date() }).where(eq(user.id, session.user.id));

  revalidatePath("/", "layout");
  return { ok: true };
}

// Só o administrador muda o papel de alguém, e só dentro da própria empresa. Sempre sobra um administrador.
export async function alterarPapelAction(data: { userId: string; papel: string }): Promise<Resultado> {
  await requireSession();
  const aut = await autorizar("equipe.gerenciar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  if (!ehPapel(data.papel)) return { error: "Papel inválido." };
  const papel = data.papel;

  const [alvo] = await db
    .select({ papel: membros.papel })
    .from(membros)
    .where(and(eq(membros.userId, data.userId), eq(membros.empresaId, ctx.empresa.id)))
    .limit(1);
  if (!alvo) return { error: "Usuário não encontrado nesta empresa." };
  if (alvo.papel === papel) return { ok: true };

  // Uma única instrução: só rebaixa um administrador se existir outro. Evita deixar a empresa sem administrador
  // mesmo com dois cliques ao mesmo tempo (o driver do Neon não tem transação).
  const feito = await db
    .update(membros)
    .set({ papel })
    .where(
      and(
        eq(membros.userId, data.userId),
        eq(membros.empresaId, ctx.empresa.id),
        papel === "admin"
          ? undefined
          : or(
              ne(membros.papel, "admin"),
              sql`EXISTS (SELECT 1 FROM membros o WHERE o.empresa_id = ${membros.empresaId} AND o.papel = 'admin' AND o.user_id <> ${membros.userId})`,
            ),
      ),
    )
    .returning({ id: membros.userId });
  if (feito.length === 0) return { error: "A empresa precisa ter pelo menos um administrador." };

  revalidatePath("/configuracoes/empresa");
  return { ok: true };
}
