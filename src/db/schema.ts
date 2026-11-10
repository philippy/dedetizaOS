import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tecnicos = pgTable("tecnicos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  cor: text("cor").notNull().default("#2F5FE0"),
  ativo: boolean("ativo").notNull().default(true),
});

export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  tipo: text("tipo", { enum: ["PF", "PJ"] }).notNull().default("PJ"),
  nome: text("nome").notNull(),
  documento: text("documento").default(""),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").default(""),
  endereco: text("endereco").default(""),
  observacoes: text("observacoes").default(""),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const tiposServico = pgTable("tipos_servico", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  preco: integer("preco").notNull(),
  // Tempo que o serviço costuma levar, em minutos. Serve de padrão ao agendar.
  duracaoMin: integer("duracao_min").notNull().default(60),
});

export const servicos = pgTable("servicos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clientes.id, { onDelete: "cascade" }),
  tipoServicoId: integer("tipo_servico_id").notNull().references(() => tiposServico.id),
  tecnicoId: integer("tecnico_id").references(() => tecnicos.id),
  dataHora: text("data_hora").notNull(),
  valor: integer("valor").notNull(),
  // Duração deste serviço, em minutos (começa igual à do tipo e pode ser ajustada).
  duracaoMin: integer("duracao_min").notNull().default(60),
  status: text("status", { enum: ["agendado", "concluido", "cancelado"] }).notNull().default("agendado"),
  observacoes: text("observacoes").default(""),
});

export const campanhas = pgTable("campanhas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  local: text("local").notNull(),
  dataInicio: date("data_inicio", { mode: "string" }).notNull(),
  dataFim: date("data_fim", { mode: "string" }).notNull(),
  descontoPct: integer("desconto_pct").notNull().default(20),
  unidades: integer("unidades").notNull(),
  // Tipos de serviço oferecidos na campanha. Vazio = todo o catálogo.
  tiposServicoIds: integer("tipos_servico_ids").array().notNull().default(sql`'{}'::integer[]`),
  status: text("status", { enum: ["agendada", "finalizada", "cancelada"] }).notNull().default("agendada"),
});

export const inscricoes = pgTable("inscricoes", {
  id: serial("id").primaryKey(),
  campanhaId: integer("campanha_id").notNull().references(() => campanhas.id, { onDelete: "cascade" }),
  unidade: text("unidade").notNull(),
  tipoServicoId: integer("tipo_servico_id").references(() => tiposServico.id, { onDelete: "set null" }),
  morador: text("morador").notNull(),
  telefone: text("telefone").notNull(),
  valor: integer("valor").notNull(),
  pago: boolean("pago").notNull().default(false),
});

export const lancamentos = pgTable("lancamentos", {
  id: serial("id").primaryKey(),
  tipo: text("tipo", { enum: ["receber", "pagar"] }).notNull(),
  descricao: text("descricao").notNull(),
  clienteId: integer("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  fornecedor: text("fornecedor"),
  servicoId: integer("servico_id").references(() => servicos.id, { onDelete: "set null" }),
  inscricaoId: integer("inscricao_id").references(() => inscricoes.id, { onDelete: "cascade" }),
  vencimento: date("vencimento", { mode: "string" }).notNull(),
  valor: integer("valor").notNull(),
  status: text("status", { enum: ["aberto", "pago"] }).notNull().default("aberto"),
  pagoEm: date("pago_em", { mode: "string" }),
});
