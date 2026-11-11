"use server";

import { and, eq, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createHash, randomBytes, randomInt } from "crypto";
import { generateRandomString, hashPassword, verifyPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, empresas, membros, session as sessoes, user, verification } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { autorizar, obterContexto } from "@/lib/contexto";
import { ehPapel, ROTULO_PAPEL } from "@/lib/permissoes";
import { atorDe, registrarAuditoria } from "@/lib/auditoria";
import { emailConfigurado, enviarEmail, montarEmail, urlDoSistema } from "@/lib/email";
import { bloquearPix, estadoBloqueioPix, limparTentativasPix, MAX_FALHAS_PIX, reservarTentativaPix } from "@/lib/pix-limite";
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
type ResultadoSenha = { ok: true; email: string; senhaProvisoria: string; emailEnviado: boolean | null } | { error: string; campo?: string };

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

const MSG_BLOQUEIO_PIX = "A troca da chave Pix está bloqueada por excesso de senhas erradas.";
const hhmm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const quandoLiberar = (ate: Date) => `Libera sozinha às ${hhmm(ate)}${emailConfigurado() ? ", ou você pode desbloquear agora pelo link enviado ao seu e-mail" : ""}.`;
async function bloqueioAtual(userId: string) {
  return (await estadoBloqueioPix(userId)) ?? new Date(Date.now() + 3600_000);
}

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
    // Máximo de 3 senhas erradas; depois, bloqueio de 1 hora ou desbloqueio pelo link enviado ao e-mail.
    const t = await reservarTentativaPix(ctx.userId);
    if (!t.permitido) return { error: `${MSG_BLOQUEIO_PIX} ${quandoLiberar(t.ate)}`, campo: "senhaAtual" };
    if (!(await senhaConfere(ctx.userId, v.senhaAtual))) {
      if (t.falhas >= MAX_FALHAS_PIX) {
        await bloquearPix(ctx.userId);
        await registrarAuditoria({ empresaId: ctx.empresa.id, ator: atorDe(ctx), acao: "pix.bloqueado", detalhe: "3 senhas erradas seguidas ao tentar trocar a chave Pix" });
        return { error: `Senha incorreta. ${MSG_BLOQUEIO_PIX} ${quandoLiberar(await bloqueioAtual(ctx.userId))}`, campo: "senhaAtual" };
      }
      const restam = MAX_FALHAS_PIX - t.falhas;
      return { error: `Senha incorreta. ${restam === 1 ? "Resta 1 tentativa" : `Restam ${restam} tentativas`} antes de bloquear a troca da chave Pix por 1 hora.`, campo: "senhaAtual" };
    }
    await limparTentativasPix(ctx.userId);
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

  const campos: [string, string, string][] = [
    ["nome", atual.nome, v.nome],
    ["CNPJ", atual.cnpj, cnpj],
    ["endereço", atual.endereco, v.endereco],
    ["telefone", atual.telefone, telefone],
    ["e-mail", atual.email, email],
    ["responsável", atual.responsavel, v.responsavel],
  ];
  const mudados = campos.filter(([, a, b]) => a !== b).map(([n]) => n);
  if (mudados.length > 0) await registrarAuditoria({ empresaId: ctx.empresa.id, ator: atorDe(ctx), acao: "empresa.dados", detalhe: `Campos: ${mudados.join(", ")}` });
  if (pixMudou) {
    await registrarAuditoria({
      empresaId: ctx.empresa.id,
      ator: atorDe(ctx),
      acao: "pix.alterado",
      detalhe: `De ${atual.pixChave ? `${atual.pixTipo}: ${atual.pixChave}` : "(sem chave)"} para ${pixChave ? `${v.pixTipo}: ${pixChave}` : "(sem chave)"}; favorecido: ${v.pixFavorecido || "(nome da empresa)"}`,
    });
  }

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
    .select({ papel: membros.papel, nome: user.name, email: user.email })
    .from(membros)
    .innerJoin(user, eq(membros.userId, user.id))
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

  await registrarAuditoria({
    empresaId: ctx.empresa.id,
    ator: atorDe(ctx),
    acao: "usuario.papel",
    alvo: { id: data.userId, nome: alvo.nome, email: alvo.email },
    detalhe: `${ROTULO_PAPEL[alvo.papel]} → ${ROTULO_PAPEL[papel]}`,
  });
  revalidatePath("/configuracoes/empresa");
  return { ok: true };
}

// ---- Usuários da equipe ----

const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80, "Use no máximo 80 caracteres."),
  email: z.string().trim().toLowerCase().max(254),
  papel: z.enum(["admin", "financeiro", "normal"]),
  enviarEmail: z.boolean().optional().default(false),
});

// Manda o acesso por e-mail (opcional, só com SMTP configurado). A senha é provisória e precisa ser trocada no primeiro login.
async function enviarAcesso(args: { para: string; nome: string; empresa: string; senha: string; redefinida: boolean }): Promise<boolean> {
  const url = `${urlDoSistema()}/login`;
  const { texto, html } = montarEmail({
    titulo: args.redefinida ? "Sua senha provisória do Detetiza OS" : `Você recebeu acesso ao Detetiza OS`,
    linhas: [
      `Olá, ${args.nome.split(" ")[0]}.`,
      args.redefinida ? `O administrador de ${args.empresa} gerou uma nova senha provisória para você.` : `O administrador de ${args.empresa} criou o seu acesso.`,
      `E-mail: ${args.para}`,
      `Senha provisória: ${args.senha}`,
      "No primeiro acesso o sistema pede que você crie uma senha só sua. Depois, apague este e-mail.",
    ],
    botao: { texto: "Entrar no sistema", url },
    rodape: "Se você não esperava este e-mail, ignore-o ou avise o administrador.",
  });
  return enviarEmail({ para: args.para, assunto: args.redefinida ? "Nova senha provisória - Detetiza OS" : "Seu acesso ao Detetiza OS", texto, html });
}

// O administrador cria a conta direto no banco, sem abrir o cadastro público (a trava de src/lib/auth.ts continua valendo).
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

  await registrarAuditoria({
    empresaId: ctx.empresa.id,
    ator: atorDe(ctx),
    acao: "usuario.criado",
    alvo: { id: userId, nome: v.nome, email: v.email },
    detalhe: `Papel: ${ROTULO_PAPEL[v.papel]}`,
  });
  const emailEnviado = v.enviarEmail && emailConfigurado() ? await enviarAcesso({ para: v.email, nome: v.nome, empresa: ctx.empresa.nome, senha: senhaProvisoria, redefinida: false }) : null;

  revalidatePath("/configuracoes/empresa");
  return { ok: true, email: v.email, senhaProvisoria, emailEnviado };
}

// Gera uma nova senha provisória (esqueceu a senha), derruba as sessões da pessoa e exige a troca no próximo acesso.
export async function redefinirSenhaAction(data: { userId: string; enviarEmail?: boolean }): Promise<ResultadoSenha> {
  const sessao = await requireSession();
  const aut = await autorizar("equipe.gerenciar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  if (data.userId === sessao.user.id) return { error: "Para trocar a sua senha, use Minha conta." };
  const [alvo] = await db
    .select({ email: user.email, nome: user.name })
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

  await registrarAuditoria({ empresaId: ctx.empresa.id, ator: atorDe(ctx), acao: "usuario.senha_redefinida", alvo: { id: data.userId, nome: alvo.nome, email: alvo.email } });
  const emailEnviado = data.enviarEmail && emailConfigurado() ? await enviarAcesso({ para: alvo.email, nome: alvo.nome, empresa: ctx.empresa.nome, senha: senhaProvisoria, redefinida: true }) : null;

  revalidatePath("/configuracoes/empresa");
  return { ok: true, email: alvo.email, senhaProvisoria, emailEnviado };
}

// Tira o acesso de alguém (o usuário e suas sessões são apagados). Não remove a si mesmo nem o último administrador.
// O registro de atividades da pessoa NÃO é apagado: ele guarda nome e e-mail no momento de cada ação.
export async function removerUsuarioAction(data: { userId: string }): Promise<Resultado> {
  const sessao = await requireSession();
  const aut = await autorizar("equipe.gerenciar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  if (data.userId === sessao.user.id) return { error: "Você não pode remover o seu próprio acesso." };
  const [alvo] = await db
    .select({ papel: membros.papel, nome: user.name, email: user.email })
    .from(membros)
    .innerJoin(user, eq(membros.userId, user.id))
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

  await registrarAuditoria({
    empresaId: ctx.empresa.id,
    ator: atorDe(ctx),
    acao: "usuario.removido",
    alvo: { id: data.userId, nome: alvo.nome, email: alvo.email },
    detalhe: `Papel que tinha: ${ROTULO_PAPEL[alvo.papel]}`,
  });
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

  if (ctx.empresa) await registrarAuditoria({ empresaId: ctx.empresa.id, ator: atorDe(ctx), acao: "usuario.senha_definida" });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Desbloqueio da troca da chave Pix por e-mail ----

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const idDesbloqueio = (userId: string) => `pix-desbloqueio:${userId}`;

const mascarar = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

// Envia ao e-mail do administrador um link (válido por 30 minutos, uso único) que zera o bloqueio.
export async function pedirDesbloqueioPixAction(): Promise<{ ok: true; email: string } | { error: string }> {
  await requireSession();
  const aut = await autorizar("empresa.editar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;
  if (!emailConfigurado()) return { error: "O envio de e-mail ainda não está configurado. Aguarde o fim do bloqueio." };
  if (!(await estadoBloqueioPix(ctx.userId))) return { error: "A troca da chave Pix não está bloqueada." };

  const id = idDesbloqueio(ctx.userId);
  const [recente] = await db.select({ criado: verification.createdAt }).from(verification).where(eq(verification.identifier, id)).limit(1);
  if (recente?.criado && Date.now() - recente.criado.getTime() < 5 * 60_000) {
    return { error: "Já enviamos um link há pouco. Confira o seu e-mail (e o spam) e aguarde 5 minutos para pedir outro." };
  }

  const token = randomBytes(32).toString("hex");
  await db.delete(verification).where(eq(verification.identifier, id));
  await db.insert(verification).values({
    id: generateRandomString(32, "a-z", "A-Z", "0-9"),
    identifier: id,
    value: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 60_000),
  });

  const { texto, html } = montarEmail({
    titulo: "Desbloquear a troca da chave Pix",
    linhas: [
      `Alguém errou 3 vezes a senha ao tentar trocar a chave Pix de ${ctx.empresa.nome}, e a troca foi bloqueada por segurança.`,
      "Se foi você, abra o link abaixo (vale por 30 minutos) e confirme o desbloqueio.",
      "Se não foi você, não clique: a conta pode estar sendo usada por outra pessoa. Troque a sua senha em Minha conta.",
    ],
    botao: { texto: "Desbloquear a troca da chave Pix", url: `${urlDoSistema()}/configuracoes/desbloquear-pix?token=${token}` },
  });
  const enviado = await enviarEmail({ para: ctx.email, assunto: "Desbloquear a troca da chave Pix - Detetiza OS", texto, html });
  if (!enviado) {
    await db.delete(verification).where(eq(verification.identifier, id));
    return { error: "Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos." };
  }
  return { ok: true, email: mascarar(ctx.email) };
}

export async function desbloquearPixAction(data: { token: string }): Promise<Resultado> {
  await requireSession();
  const aut = await autorizar("empresa.editar");
  if ("erro" in aut) return { error: aut.erro };
  const { ctx } = aut;

  const token = String(data.token ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: "Link inválido." };
  const id = idDesbloqueio(ctx.userId); // o link só vale para quem o recebeu e está logado com essa conta
  const [v] = await db.select().from(verification).where(and(eq(verification.identifier, id), eq(verification.value, hashToken(token)))).limit(1);
  if (!v || v.expiresAt.getTime() < Date.now()) return { error: "Este link expirou ou já foi usado. Peça um novo na tela Dados da empresa." };

  await db.delete(verification).where(eq(verification.identifier, id));
  await limparTentativasPix(ctx.userId);
  await registrarAuditoria({ empresaId: ctx.empresa.id, ator: atorDe(ctx), acao: "pix.desbloqueado" });
  revalidatePath("/configuracoes/empresa");
  return { ok: true };
}

// Informa à tela de login se o e-mail está disponível (para mostrar "Esqueci minha senha"). Não expõe nada além disso.
export async function emailDisponivelAction(): Promise<boolean> {
  return emailConfigurado();
}
