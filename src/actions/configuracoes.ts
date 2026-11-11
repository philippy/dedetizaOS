"use server";

import { and, eq, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomInt } from "crypto";
import { generateRandomString, hashPassword, verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, empresas, membros, session as sessoes, user } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { autorizar, obterContexto } from "@/lib/contexto";
import { ehPapel } from "@/lib/permissoes";
import {
  TIPOS_PIX,
  cnpjValido,
  emailValido,
  formatarCnpj,
  formatarTelefone,
  gerarSenhaProvisoria,
  normalizarChavePix,
  telefoneBR,
} from "@/lib/validacao";

type Resultado = { ok: true } | { error: string; campo?: string };
type ResultadoSenha = { ok: true; email: string; senhaProvisoria: string } | { error: string; campo?: string };

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

// ---- Usuários da equipe ----

const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80, "Use no máximo 80 caracteres."),
  email: z.string().trim().toLowerCase().max(254),
  papel: z.enum(["admin", "financeiro", "normal"]),
});

// O administrador cria a conta direto no banco, sem abrir o cadastro público (a trava de src/lib/auth.ts continua valendo).
// Sem serviço de e-mail, a senha provisória volta uma única vez para o administrador repassar à pessoa; só o hash é guardado.
// O driver do Neon não tem transação: se um passo falhar, o usuário recém-criado é apagado (as demais linhas saem em cascata).
export async function criarUsuarioAction(data: z.input<typeof novoUsuarioSchema>): Promise<ResultadoSenha> {
  await requireSession();
  const aut = await autorizar("equipe.gerenciar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  const parsed = novoUsuarioSchema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: i.message, campo: String(i.path[0] ?? "") };
  }
  const v = parsed.data;
  if (!emailValido(v.email)) return { error: "E-mail inválido.", campo: "email" };

  const [existe] = await db.select({ id: user.id }).from(user).where(eq(user.email, v.email)).limit(1);
  if (existe) return { error: "Já existe um usuário com esse e-mail.", campo: "email" };

  const senhaProvisoria = gerarSenhaProvisoria(randomInt);
  const userId = generateRandomString(32, "a-z", "A-Z", "0-9");
  try {
    await db.insert(user).values({ id: userId, name: v.nome, email: v.email, emailVerified: false });
    await db.insert(account).values({
      id: generateRandomString(32, "a-z", "A-Z", "0-9"),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(senhaProvisoria),
    });
    await db.insert(membros).values({ userId, empresaId: ctx.empresa.id, papel: v.papel, senhaProvisoria: true });
  } catch (e) {
    await db.delete(user).where(eq(user.id, userId)).catch(() => {});
    console.error("Falha ao criar usuário", e);
    return { error: "Não foi possível criar o usuário. Tente de novo." };
  }

  revalidatePath("/configuracoes/empresa");
  return { ok: true, email: v.email, senhaProvisoria };
}

// Gera uma nova senha provisória (esqueceu a senha), derruba as sessões da pessoa e exige a troca no próximo acesso.
export async function redefinirSenhaAction(data: { userId: string }): Promise<ResultadoSenha> {
  const sessao = await requireSession();
  const aut = await autorizar("equipe.gerenciar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  if (data.userId === sessao.user.id) return { error: "Para trocar a sua senha, use Minha conta." };
  const [alvo] = await db
    .select({ email: user.email })
    .from(membros)
    .innerJoin(user, eq(membros.userId, user.id))
    .where(and(eq(membros.userId, data.userId), eq(membros.empresaId, ctx.empresa.id)))
    .limit(1);
  if (!alvo) return { error: "Usuário não encontrado nesta empresa." };

  const senhaProvisoria = gerarSenhaProvisoria(randomInt);
  await db
    .update(account)
    .set({ password: await hashPassword(senhaProvisoria), updatedAt: new Date() })
    .where(and(eq(account.userId, data.userId), eq(account.providerId, "credential")));
  await db.update(membros).set({ senhaProvisoria: true }).where(eq(membros.userId, data.userId));
  await db.delete(sessoes).where(eq(sessoes.userId, data.userId));

  revalidatePath("/configuracoes/empresa");
  return { ok: true, email: alvo.email, senhaProvisoria };
}

// Tira o acesso de alguém (o usuário e suas sessões são apagados). Não remove a si mesmo nem o último administrador.
export async function removerUsuarioAction(data: { userId: string }): Promise<Resultado> {
  const sessao = await requireSession();
  const aut = await autorizar("equipe.gerenciar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  if (data.userId === sessao.user.id) return { error: "Você não pode remover o seu próprio acesso." };
  const [alvo] = await db
    .select({ papel: membros.papel })
    .from(membros)
    .where(and(eq(membros.userId, data.userId), eq(membros.empresaId, ctx.empresa.id)))
    .limit(1);
  if (!alvo) return { error: "Usuário não encontrado nesta empresa." };

  // Mesma trava do rebaixamento: só remove um administrador se existir outro.
  const feito = await db
    .delete(membros)
    .where(
      and(
        eq(membros.userId, data.userId),
        eq(membros.empresaId, ctx.empresa.id),
        or(
          ne(membros.papel, "admin"),
          sql`EXISTS (SELECT 1 FROM membros o WHERE o.empresa_id = ${membros.empresaId} AND o.papel = 'admin' AND o.user_id <> ${membros.userId})`,
        ),
      ),
    )
    .returning({ id: membros.userId });
  if (feito.length === 0) return { error: "A empresa precisa ter pelo menos um administrador." };

  try {
    await db.delete(user).where(eq(user.id, data.userId)); // sessões e contas saem em cascata
  } catch (e) {
    // Sem vínculo a pessoa já perdeu o papel; garante que também não consiga entrar.
    console.error("Falha ao apagar usuário removido", e);
    await db.delete(sessoes).where(eq(sessoes.userId, data.userId)).catch(() => {});
    await db.delete(account).where(eq(account.userId, data.userId)).catch(() => {});
  }

  revalidatePath("/configuracoes/empresa");
  return { ok: true };
}

const trocaSchema = z.object({
  atual: z.string().min(1, "Digite a senha provisória.").max(200),
  nova: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres.").max(200),
});

// Primeiro acesso: troca a senha provisória por uma que só a pessoa conhece e libera o sistema.
export async function trocarSenhaProvisoriaAction(data: z.input<typeof trocaSchema>): Promise<Resultado> {
  const sessao = await requireSession();
  const ctx = await obterContexto();
  if (!ctx?.senhaProvisoria) return { error: "Sua senha já foi definida." };

  const parsed = trocaSchema.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: i.message, campo: String(i.path[0] ?? "") };
  }
  const { atual, nova } = parsed.data;
  if (nova === atual) return { error: "A nova senha precisa ser diferente da provisória.", campo: "nova" };
  if (!(await senhaConfere(sessao.user.id, atual))) return { error: "Senha provisória incorreta.", campo: "atual" };

  await db
    .update(account)
    .set({ password: await hashPassword(nova), updatedAt: new Date() })
    .where(and(eq(account.userId, sessao.user.id), eq(account.providerId, "credential")));
  await db.update(membros).set({ senhaProvisoria: false }).where(eq(membros.userId, sessao.user.id));
  await db.delete(sessoes).where(and(eq(sessoes.userId, sessao.user.id), ne(sessoes.token, sessao.session.token)));

  revalidatePath("/", "layout");
  return { ok: true };
}
