"use server";

import { db, sqlClient } from "@/db";
import { tecnicos, clientes, tiposServico, servicos, lancamentos, campanhas, inscricoes, user } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDaysISO, parseBRLToCents, todaySP } from "@/lib/utils";

let tablesInitialized = false;

export async function ensureSeedData() {
  try {
    if (!tablesInitialized) {
      await sqlClient`CREATE TABLE IF NOT EXISTS "user" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL UNIQUE, "email_verified" boolean DEFAULT false NOT NULL, "image" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "session" ("id" text PRIMARY KEY NOT NULL, "expires_at" timestamp NOT NULL, "token" text NOT NULL UNIQUE, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, "ip_address" text, "user_agent" text, "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "account" ("id" text PRIMARY KEY NOT NULL, "account_id" text NOT NULL, "provider_id" text NOT NULL, "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "access_token" text, "refresh_token" text, "id_token" text, "access_token_expires_at" timestamp, "refresh_token_expires_at" timestamp, "scope" text, "password" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "verification" ("id" text PRIMARY KEY NOT NULL, "identifier" text NOT NULL, "value" text NOT NULL, "expires_at" timestamp NOT NULL, "created_at" timestamp DEFAULT now(), "updated_at" timestamp DEFAULT now());`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "tecnicos" ("id" serial PRIMARY KEY NOT NULL, "nome" text NOT NULL, "telefone" text NOT NULL, "cor" text DEFAULT '#2F5FE0' NOT NULL, "ativo" boolean DEFAULT true NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "clientes" ("id" serial PRIMARY KEY NOT NULL, "tipo" text DEFAULT 'PJ' NOT NULL, "nome" text NOT NULL, "documento" text DEFAULT '', "whatsapp" text NOT NULL, "email" text DEFAULT '', "endereco" text DEFAULT '', "observacoes" text DEFAULT '', "criado_em" timestamp DEFAULT now() NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "tipos_servico" ("id" serial PRIMARY KEY NOT NULL, "nome" text NOT NULL, "preco" integer NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "servicos" ("id" serial PRIMARY KEY NOT NULL, "cliente_id" integer NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE, "tipo_servico_id" integer NOT NULL REFERENCES "tipos_servico"("id"), "tecnico_id" integer REFERENCES "tecnicos"("id"), "data_hora" text NOT NULL, "valor" integer NOT NULL, "status" text DEFAULT 'agendado' NOT NULL, "observacoes" text DEFAULT '');`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "campanhas" ("id" serial PRIMARY KEY NOT NULL, "nome" text NOT NULL, "local" text NOT NULL, "data_inicio" date NOT NULL, "data_fim" date NOT NULL, "desconto_pct" integer DEFAULT 20 NOT NULL, "unidades" integer NOT NULL, "status" text DEFAULT 'agendada' NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "inscricoes" ("id" serial PRIMARY KEY NOT NULL, "campanha_id" integer NOT NULL REFERENCES "campanhas"("id") ON DELETE CASCADE, "unidade" text NOT NULL, "morador" text NOT NULL, "telefone" text NOT NULL, "valor" integer NOT NULL, "pago" boolean DEFAULT false NOT NULL);`;
      await sqlClient`CREATE TABLE IF NOT EXISTS "lancamentos" ("id" serial PRIMARY KEY NOT NULL, "tipo" text NOT NULL, "descricao" text NOT NULL, "cliente_id" integer REFERENCES "clientes"("id") ON DELETE SET NULL, "fornecedor" text, "servico_id" integer REFERENCES "servicos"("id") ON DELETE SET NULL, "inscricao_id" integer REFERENCES "inscricoes"("id") ON DELETE CASCADE, "vencimento" date NOT NULL, "valor" integer NOT NULL, "status" text DEFAULT 'aberto' NOT NULL, "pago_em" date);`;
      tablesInitialized = true;
    }

    const existingTechs = await db.select().from(tecnicos);
    if (existingTechs.length > 0) return;

    const hoje = todaySP();
    const amanha = addDaysISO(hoje, 1);
    const ontem = addDaysISO(hoje, -1);

    const [marcos, ana, paulo] = await db.insert(tecnicos).values([
      { nome: "Marcos", telefone: "(11) 98888-0001", cor: "#2F5FE0", ativo: true },
      { nome: "Ana", telefone: "(11) 98888-0002", cor: "#0F1720", ativo: true },
      { nome: "Paulo", telefone: "(11) 98888-0003", cor: "#4A5B78", ativo: true },
    ]).returning();

    const [baratas, roedores, cupins, pulgas, monitoramento] = await db.insert(tiposServico).values([
      { nome: "Baratas e formigas", preco: 24000 },
      { nome: "Roedores", preco: 32000 },
      { nome: "Cupins", preco: 48000 },
      { nome: "Pulgas e carrapatos", preco: 26000 },
      { nome: "Monitoramento", preco: 15000 },
    ]).returning();

    const [padaria, mercado, clinica, marina, carlos] = await db.insert(clientes).values([
      { tipo: "PJ", nome: "Padaria Sol Ltda", documento: "12.345.678/0001-90", whatsapp: "(11) 98888-1200", email: "contato@padariasol.com.br", endereco: "Av. das Flores, 210 · Centro", observacoes: "Serviços contratados: Baratas e formigas, Roedores." },
      { tipo: "PJ", nome: "Mercado Bom Preço", documento: "23.456.789/0001-11", whatsapp: "(11) 93333-5510", email: "adm@bompreco.com.br", endereco: "Rua do Comércio, 850 · Vila Nova", observacoes: "Serviços contratados: Roedores, Monitoramento." },
      { tipo: "PJ", nome: "Clínica Vida Saúde", documento: "34.567.890/0001-22", whatsapp: "(11) 96666-2210", email: "financeiro@clinicavida.com.br", endereco: "Av. Brasil, 1420 · Sala 3", observacoes: "Serviços contratados: Monitoramento." },
      { tipo: "PF", nome: "Marina Souza (Residência)", documento: "123.456.789-01", whatsapp: "(11) 98123-4455", email: "marina@email.com", endereco: "Rua Silva, 45 · Jardim América", observacoes: "Serviços contratados: Baratas e formigas." },
      { tipo: "PF", nome: "Carlos Eduardo Menezes", documento: "234.567.890-12", whatsapp: "(11) 98456-7788", email: "carlos@email.com", endereco: "Rua do Ipê, 128 · Bela Vista", observacoes: "Serviços contratados: Cupins." },
    ]).returning();

    const svcs = await db.insert(servicos).values([
      { clienteId: padaria.id, tipoServicoId: baratas.id, tecnicoId: marcos.id, dataHora: `${hoje}T08:00`, valor: 24000, status: "concluido", observacoes: "Concluído pela manhã." },
      { clienteId: marina.id, tipoServicoId: baratas.id, tecnicoId: ana.id, dataHora: `${hoje}T09:00`, valor: 24000, status: "concluido", observacoes: "Pago via Pix." },
      { clienteId: clinica.id, tipoServicoId: monitoramento.id, tecnicoId: paulo.id, dataHora: `${hoje}T11:00`, valor: 15000, status: "agendado", observacoes: "Troca de iscas." },
      { clienteId: mercado.id, tipoServicoId: roedores.id, tecnicoId: ana.id, dataHora: `${hoje}T14:00`, valor: 32000, status: "agendado", observacoes: "Depósito." },
      { clienteId: carlos.id, tipoServicoId: cupins.id, tecnicoId: marcos.id, dataHora: `${amanha}T10:00`, valor: 48000, status: "agendado", observacoes: "Telhado." },
    ]).returning();

    const [camp] = await db.insert(campanhas).values({
      nome: "Condomínio Vila Verde",
      local: "Estrada do Sol, 1200 · Casas 1 a 30",
      dataInicio: addDaysISO(hoje, 4),
      dataFim: addDaysISO(hoje, 5),
      descontoPct: 20,
      unidades: 30,
      status: "agendada",
    }).returning();

    const [i1, i2] = await db.insert(inscricoes).values([
      { campanhaId: camp.id, unidade: "Casa 04", morador: "Rogério Lima", telefone: "(11) 99111-2233", valor: 19200, pago: true },
      { campanhaId: camp.id, unidade: "Casa 12", morador: "Fernanda Alves", telefone: "(11) 99222-3344", valor: 19200, pago: false },
    ]).returning();

    await db.insert(lancamentos).values([
      { tipo: "receber", descricao: `Baratas e formigas · ${padaria.nome}`, clienteId: padaria.id, servicoId: svcs[0].id, vencimento: addDaysISO(hoje, 30), valor: 24000, status: "aberto" },
      { tipo: "receber", descricao: `Baratas e formigas · ${marina.nome}`, clienteId: marina.id, servicoId: svcs[1].id, vencimento: hoje, valor: 24000, status: "pago", pagoEm: hoje },
      { tipo: "receber", descricao: `Controle de roedores · ${mercado.nome}`, clienteId: mercado.id, vencimento: hoje, valor: 64000, status: "aberto" },
      { tipo: "receber", descricao: `Campanha ${camp.nome} · Casa 04`, inscricaoId: i1.id, vencimento: hoje, valor: 19200, status: "pago", pagoEm: hoje },
      { tipo: "receber", descricao: `Campanha ${camp.nome} · Casa 12`, inscricaoId: i2.id, vencimento: camp.dataInicio, valor: 19200, status: "aberto" },
      { tipo: "pagar", fornecedor: "Aliança Químicos", descricao: "Reposição de gel e inseticidas", vencimento: hoje, valor: 128000, status: "aberto" },
      { tipo: "pagar", fornecedor: "Posto Rede Brasil", descricao: "Combustível da frota", vencimento: hoje, valor: 46000, status: "aberto" },
      { tipo: "pagar", fornecedor: "Folha de Pagamento", descricao: "Técnicos (Marcos, Ana, Paulo)", vencimento: ontem, valor: 690000, status: "pago", pagoEm: ontem },
    ]);
  } catch (err) {
    console.error("Seed info:", err);
  }
}

export async function canPublicRegister(): Promise<boolean> {
  try {
    await ensureSeedData();
    const users = await db.select({ id: user.id }).from(user).limit(1);
    return users.length === 0;
  } catch {
    return true;
  }
}

const clienteSchema = z.object({
  id: z.number().optional(),
  tipo: z.enum(["PF", "PJ"]),
  nome: z.string().min(2, "Informe o nome ou razão social."),
  documento: z.string().optional().default(""),
  whatsapp: z.string().min(8, "Informe o WhatsApp para contato."),
  email: z.string().optional().default(""),
  endereco: z.string().optional().default(""),
  observacoes: z.string().optional().default(""),
});

export async function salvarClienteAction(data: z.infer<typeof clienteSchema>) {
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  if (v.id) {
    await db.update(clientes).set({
      tipo: v.tipo,
      nome: v.nome.trim(),
      documento: v.documento?.trim() || "",
      whatsapp: v.whatsapp.trim(),
      email: v.email?.trim() || "",
      endereco: v.endereco?.trim() || "",
      observacoes: v.observacoes?.trim() || "",
    }).where(eq(clientes.id, v.id));
  } else {
    const [novo] = await db.insert(clientes).values({
      tipo: v.tipo,
      nome: v.nome.trim(),
      documento: v.documento?.trim() || "",
      whatsapp: v.whatsapp.trim(),
      email: v.email?.trim() || "",
      endereco: v.endereco?.trim() || "",
      observacoes: v.observacoes?.trim() || "",
    }).returning();
    revalidatePath("/clientes");
    revalidatePath("/servicos");
    revalidatePath("/agenda");
    return { success: true, cliente: novo };
  }
  revalidatePath("/clientes");
  if (v.id) revalidatePath(`/clientes/${v.id}`);
  return { success: true };
}

export async function excluirClienteAction(id: number) {
  await db.delete(clientes).where(eq(clientes.id, id));
  revalidatePath("/clientes");
  return { success: true };
}

export async function salvarTipoServicoAction(input: { id?: number; nome: string; precoReais: string }) {
  if (!input.nome.trim()) return { error: "Informe o nome do tipo de serviço." };
  const preco = parseBRLToCents(input.precoReais);
  if (preco <= 0) return { error: "Informe um preço maior que zero." };
  if (input.id) {
    await db.update(tiposServico).set({ nome: input.nome.trim(), preco }).where(eq(tiposServico.id, input.id));
  } else {
    await db.insert(tiposServico).values({ nome: input.nome.trim(), preco });
  }
  revalidatePath("/servicos");
  return { success: true };
}

export async function salvarServicoAction(input: {
  id?: number;
  clienteId: number;
  tipoServicoId: number;
  tecnicoId: number;
  data: string;
  hora: string;
  valorReais: string;
  observacoes?: string;
}) {
  if (!input.clienteId) return { error: "Selecione o cliente." };
  if (!input.tipoServicoId) return { error: "Selecione o tipo de serviço." };
  if (!input.tecnicoId) return { error: "Selecione o técnico." };
  if (!input.data || !input.hora) return { error: "Informe a data e o horário." };

  const dataHora = `${input.data}T${input.hora.slice(0, 5)}`;
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido." };

  const conflitos = await db
    .select({ id: servicos.id, clienteNome: clientes.nome })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .where(and(eq(servicos.tecnicoId, input.tecnicoId), eq(servicos.dataHora, dataHora), ne(servicos.status, "cancelado"), input.id ? ne(servicos.id, input.id) : undefined));

  if (conflitos.length > 0) {
    const [tech] = await db.select().from(tecnicos).where(eq(tecnicos.id, input.tecnicoId));
    return { error: `Conflito: ${tech?.nome || "O técnico"} já tem ${conflitos[0].clienteNome} agendado nesse mesmo dia e horário.` };
  }

  if (input.id) {
    await db.update(servicos).set({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, valor, observacoes: input.observacoes || "" }).where(eq(servicos.id, input.id));
  } else {
    await db.insert(servicos).values({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, valor, status: "agendado", observacoes: input.observacoes || "" });
  }
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(`/clientes/${input.clienteId}`);
  return { success: true };
}

export async function concluirServicoAction(servicoId: number) {
  const rows = await db
    .select({ servico: servicos, cliente: clientes, tipoServico: tiposServico })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .where(eq(servicos.id, servicoId));

  if (rows.length === 0) return { error: "Serviço não encontrado." };
  const { servico, cliente, tipoServico } = rows[0];

  await db.update(servicos).set({ status: "concluido" }).where(eq(servicos.id, servicoId));

  const existente = await db.select().from(lancamentos).where(eq(lancamentos.servicoId, servicoId));
  const hoje = todaySP();
  const vencimento = cliente.tipo === "PF" ? hoje : addDaysISO(hoje, 30);

  if (existente.length === 0) {
    await db.insert(lancamentos).values({
      tipo: "receber",
      descricao: `${tipoServico.nome} · ${cliente.nome}`,
      clienteId: cliente.id,
      servicoId: servico.id,
      vencimento,
      valor: servico.valor,
      status: "aberto",
    });
  }
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${cliente.id}`);
  return { success: true, vencimento };
}

export async function cancelarServicoAction(servicoId: number) {
  const [svc] = await db.select().from(servicos).where(eq(servicos.id, servicoId));
  if (!svc) return { error: "Serviço não encontrado." };
  await db.update(servicos).set({ status: "cancelado" }).where(eq(servicos.id, servicoId));
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(`/clientes/${svc.clienteId}`);
  return { success: true };
}

export async function criarLancamentoPagarAction(input: { fornecedor: string; descricao: string; vencimento: string; valorReais: string }) {
  if (!input.fornecedor.trim()) return { error: "Informe o fornecedor." };
  if (!input.descricao.trim()) return { error: "Informe a descrição." };
  if (!input.vencimento) return { error: "Informe o vencimento." };
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  await db.insert(lancamentos).values({ tipo: "pagar", fornecedor: input.fornecedor.trim(), descricao: input.descricao.trim(), vencimento: input.vencimento, valor, status: "aberto" });
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function darBaixaLancamentoAction(input: { lancamentoId: number; pagoEm: string; valorPagoReais: string }) {
  const [lanc] = await db.select().from(lancamentos).where(eq(lancamentos.id, input.lancamentoId));
  if (!lanc) return { error: "Lançamento não encontrado." };
  const valorPago = parseBRLToCents(input.valorPagoReais);
  if (valorPago <= 0) return { error: "Informe um valor válido." };

  await db.update(lancamentos).set({ status: "pago", pagoEm: input.pagoEm, valor: valorPago }).where(eq(lancamentos.id, input.lancamentoId));
  if (lanc.inscricaoId) {
    await db.update(inscricoes).set({ pago: true, valor: valorPago }).where(eq(inscricoes.id, lanc.inscricaoId));
  }
  revalidatePath("/");
  revalidatePath("/financeiro");
  revalidatePath("/campanhas");
  if (lanc.clienteId) revalidatePath(`/clientes/${lanc.clienteId}`);
  return { success: true };
}

export async function excluirLancamentoAction(id: number) {
  const [lanc] = await db.select().from(lancamentos).where(eq(lancamentos.id, id));
  if (!lanc || lanc.status === "pago") return { error: "Lançamento pago não pode ser excluído." };
  await db.delete(lancamentos).where(eq(lancamentos.id, id));
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function salvarCampanhaAction(input: { id?: number; nome: string; local: string; dataInicio: string; dataFim: string; descontoPct: number; unidades: number; status?: "agendada" | "finalizada" | "cancelada" }) {
  if (!input.nome.trim() || !input.local.trim()) return { error: "Preencha nome e local." };
  if (input.unidades < 1) return { error: "Informe pelo menos 1 unidade." };

  if (input.id) {
    await db.update(campanhas).set({ nome: input.nome.trim(), local: input.local.trim(), dataInicio: input.dataInicio, dataFim: input.dataFim, descontoPct: input.descontoPct, unidades: input.unidades, status: input.status || "agendada" }).where(eq(campanhas.id, input.id));
    revalidatePath("/campanhas");
    return { success: true, id: input.id };
  } else {
    const [nova] = await db.insert(campanhas).values({ nome: input.nome.trim(), local: input.local.trim(), dataInicio: input.dataInicio, dataFim: input.dataFim, descontoPct: input.descontoPct, unidades: input.unidades, status: "agendada" }).returning();
    revalidatePath("/campanhas");
    return { success: true, id: nova.id };
  }
}

export async function inscreverUnidadeCampanhaAction(input: { campanhaId: number; unidade: string; morador: string; telefone: string; valorReais: string }) {
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, input.campanhaId));
  if (!camp) return { error: "Campanha não encontrada." };
  const inscritosAtuais = await db.select().from(inscricoes).where(eq(inscricoes.campanhaId, input.campanhaId));
  if (inscritosAtuais.length >= camp.unidades) return { error: `Limite máximo de ${camp.unidades} unidades atingido.` };
  if (!input.unidade.trim() || !input.morador.trim()) return { error: "Preencha unidade e morador." };
  const valor = parseBRLToCents(input.valorReais);

  const [nova] = await db.insert(inscricoes).values({ campanhaId: camp.id, unidade: input.unidade.trim(), morador: input.morador.trim(), telefone: input.telefone.trim(), valor, pago: false }).returning();
  await db.insert(lancamentos).values({ tipo: "receber", descricao: `Campanha ${camp.nome} · Unid. ${nova.unidade} (${nova.morador})`, inscricaoId: nova.id, vencimento: camp.dataInicio || todaySP(), valor, status: "aberto" });

  revalidatePath(`/campanhas/${camp.id}`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function marcarInscricaoPagaAction(inscricaoId: number) {
  const [insc] = await db.select().from(inscricoes).where(eq(inscricoes.id, inscricaoId));
  if (!insc) return { error: "Inscrição não encontrada." };
  const hoje = todaySP();
  await db.update(inscricoes).set({ pago: true }).where(eq(inscricoes.id, inscricaoId));
  await db.update(lancamentos).set({ status: "pago", pagoEm: hoje }).where(eq(lancamentos.inscricaoId, inscricaoId));
  revalidatePath(`/campanhas/${insc.campanhaId}`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}
