import { pgTable, serial, text, integer, boolean, timestamp, date, index } from "drizzle-orm/pg-core";
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

// Empresa (hoje só existe uma, mas tudo que é "da empresa" já nasce com empresa_id para o sistema
// poder atender várias). As tabelas de negócio (clientes, servicos...) ainda NÃO têm empresa_id.
export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj").notNull().default(""),
  endereco: text("endereco").notNull().default(""),
  telefone: text("telefone").notNull().default(""),
  email: text("email").notNull().default(""),
  responsavel: text("responsavel").notNull().default(""),
  // Chave Pix usada na cobrança por WhatsApp. pix_tipo: CNPJ, CPF, E-mail, Celular ou Aleatória.
  pixTipo: text("pix_tipo").notNull().default("CNPJ"),
  pixChave: text("pix_chave").notNull().default(""),
  pixFavorecido: text("pix_favorecido").notNull().default(""),
  // Quem mexeu na chave e quando. Trocar a chave desvia pagamentos, então fica visível na tela.
  pixAtualizadoEm: timestamp("pix_atualizado_em"),
  pixAtualizadoPor: text("pix_atualizado_por").references(() => user.id, { onDelete: "set null" }),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
  atualizadoPor: text("atualizado_por").references(() => user.id, { onDelete: "set null" }),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

// Quem pertence a qual empresa e com qual papel (admin, financeiro, normal). Fica numa tabela própria
// para não mexer nas tabelas do Better Auth. telefone = contato do usuário (tela Minha conta).
export const membros = pgTable("membros", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  empresaId: integer("empresa_id").notNull().references(() => empresas.id, { onDelete: "restrict" }),
  papel: text("papel", { enum: ["admin", "financeiro", "normal"] }).notNull().default("normal"),
  telefone: text("telefone").notNull().default(""),
  // true enquanto a pessoa usa a senha provisória dada pelo administrador: ela precisa trocar antes de usar o sistema.
  senhaProvisoria: boolean("senha_provisoria").notNull().default(false),
  // Limite de tentativas de senha ao trocar a chave Pix: 3 erros bloqueiam por 1 hora (ou desbloqueio por e-mail).
  pixFalhas: integer("pix_falhas").notNull().default(0),
  pixUltimaFalha: timestamp("pix_ultima_falha"),
  pixBloqueadoAte: timestamp("pix_bloqueado_ate"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
}, (t) => [index("membros_empresa_idx").on(t.empresaId)]);

// Registro de atividades. Sem chave estrangeira para o usuário: guarda nome e e-mail de quem fez (e de quem sofreu a ação)
// no momento do fato, então o histórico continua inteiro mesmo depois de a conta ser removida.
export const auditoria = pgTable("auditoria", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id").notNull().references(() => empresas.id, { onDelete: "restrict" }),
  quando: timestamp("quando").notNull().defaultNow(),
  atorId: text("ator_id").notNull(),
  atorNome: text("ator_nome").notNull(),
  atorEmail: text("ator_email").notNull(),
  acao: text("acao").notNull(),
  alvoId: text("alvo_id"),
  alvoNome: text("alvo_nome"),
  alvoEmail: text("alvo_email"),
  detalhe: text("detalhe").notNull().default(""),
}, (t) => [index("auditoria_empresa_quando_idx").on(t.empresaId, t.quando)]);

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
  // Foto do serviço, já reduzida no navegador, como data URL (jpeg/png/webp). Pesada: só a
  // tela Serviços lê; as demais telas usam tipoServicoColunas.
  imagem: text("imagem"),
});

// Colunas leves do tipo de serviço (sem a imagem), para telas que só precisam de nome, preço e duração.
export const tipoServicoColunas = {
  id: tiposServico.id,
  nome: tiposServico.nome,
  preco: tiposServico.preco,
  duracaoMin: tiposServico.duracaoMin,
};

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
