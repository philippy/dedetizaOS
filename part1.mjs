// parte1.mjs — Base, Banco Neon, Auto-Seed, Login, Início, Agenda e Serviços
import fs from "fs";
import path from "path";

const files = {
  ".npmrc": `legacy-peer-deps=true\n`,

  "package.json": JSON.stringify(
    {
      name: "detetiza-mvp",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        "@neondatabase/serverless": "^0.10.4",
        "better-auth": "^1.1.18",
        clsx: "^2.1.1",
        "drizzle-orm": "^0.38.3",
        "lucide-react": "^0.468.0",
        next: "15.1.6",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "tailwind-merge": "^2.6.0",
        zod: "^3.24.1",
      },
      devDependencies: {
        "@types/node": "^20.17.10",
        "@types/react": "^19.0.2",
        "@types/react-dom": "^19.0.2",
        autoprefixer: "^10.4.20",
        dotenv: "^16.4.7",
        "drizzle-kit": "^0.30.1",
        postcss: "^8.4.49",
        tailwindcss: "^3.4.17",
        tsx: "^4.19.2",
        typescript: "^5.7.2",
      },
    },
    null,
    2
  ),

  "next.config.ts": `import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
`,

  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2
  ),

  "postcss.config.mjs": `export default { plugins: { tailwindcss: {} } };\n`,

  "tailwind.config.ts": `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-jakarta)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
`,

  "src/db/schema.ts": `import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";

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
});

export const servicos = pgTable("servicos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clientes.id, { onDelete: "cascade" }),
  tipoServicoId: integer("tipo_servico_id").notNull().references(() => tiposServico.id),
  tecnicoId: integer("tecnico_id").references(() => tecnicos.id),
  dataHora: text("data_hora").notNull(),
  valor: integer("valor").notNull(),
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
  status: text("status", { enum: ["agendada", "finalizada", "cancelada"] }).notNull().default("agendada"),
});

export const inscricoes = pgTable("inscricoes", {
  id: serial("id").primaryKey(),
  campanhaId: integer("campanha_id").notNull().references(() => campanhas.id, { onDelete: "cascade" }),
  unidade: text("unidade").notNull(),
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
`,

  "src/db/index.ts": `import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  "postgresql://user:pass@localhost:5432/db";

export const sqlClient = neon(connectionString);
export const db = drizzle(sqlClient, { schema });
`,

  "src/lib/utils.ts": `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

export function parseBRLToCents(val: string | number): number {
  if (typeof val === "number") return Math.round(val * 100);
  const cleaned = String(val).replace(/[R$\\s.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export function todaySP(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return \`\${y}-\${m}-\${d}\`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(\`\${isoDate}T12:00:00Z\`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return "—";
  const clean = isoDate.slice(0, 10);
  const [y, m, d] = clean.split("-");
  if (!y || !m || !d) return isoDate;
  return \`\${d}/\${m}/\${y}\`;
}

export function formatDateTimeBR(isoDateTime?: string | null): string {
  if (!isoDateTime) return "—";
  const datePart = formatDateBR(isoDateTime.slice(0, 10));
  const timePart = isoDateTime.slice(11, 16) || "08:00";
  return \`\${datePart} · \${timePart}\`;
}
`,

  "src/lib/auth.ts": `import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "detetiza_impacto_secret_default_2026_key_998877",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true },
});
`,

  "src/lib/auth-client.ts": `import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
`,

  "src/actions/index.ts": `"use server";

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
      await sqlClient\`CREATE TABLE IF NOT EXISTS "user" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "email" text NOT NULL UNIQUE, "email_verified" boolean DEFAULT false NOT NULL, "image" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "session" ("id" text PRIMARY KEY NOT NULL, "expires_at" timestamp NOT NULL, "token" text NOT NULL UNIQUE, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, "ip_address" text, "user_agent" text, "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "account" ("id" text PRIMARY KEY NOT NULL, "account_id" text NOT NULL, "provider_id" text NOT NULL, "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "access_token" text, "refresh_token" text, "id_token" text, "access_token_expires_at" timestamp, "refresh_token_expires_at" timestamp, "scope" text, "password" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "verification" ("id" text PRIMARY KEY NOT NULL, "identifier" text NOT NULL, "value" text NOT NULL, "expires_at" timestamp NOT NULL, "created_at" timestamp DEFAULT now(), "updated_at" timestamp DEFAULT now());\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "tecnicos" ("id" serial PRIMARY KEY NOT NULL, "nome" text NOT NULL, "telefone" text NOT NULL, "cor" text DEFAULT '#2F5FE0' NOT NULL, "ativo" boolean DEFAULT true NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "clientes" ("id" serial PRIMARY KEY NOT NULL, "tipo" text DEFAULT 'PJ' NOT NULL, "nome" text NOT NULL, "documento" text DEFAULT '', "whatsapp" text NOT NULL, "email" text DEFAULT '', "endereco" text DEFAULT '', "observacoes" text DEFAULT '', "criado_em" timestamp DEFAULT now() NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "tipos_servico" ("id" serial PRIMARY KEY NOT NULL, "nome" text NOT NULL, "preco" integer NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "servicos" ("id" serial PRIMARY KEY NOT NULL, "cliente_id" integer NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE, "tipo_servico_id" integer NOT NULL REFERENCES "tipos_servico"("id"), "tecnico_id" integer REFERENCES "tecnicos"("id"), "data_hora" text NOT NULL, "valor" integer NOT NULL, "status" text DEFAULT 'agendado' NOT NULL, "observacoes" text DEFAULT '');\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "campanhas" ("id" serial PRIMARY KEY NOT NULL, "nome" text NOT NULL, "local" text NOT NULL, "data_inicio" date NOT NULL, "data_fim" date NOT NULL, "desconto_pct" integer DEFAULT 20 NOT NULL, "unidades" integer NOT NULL, "status" text DEFAULT 'agendada' NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "inscricoes" ("id" serial PRIMARY KEY NOT NULL, "campanha_id" integer NOT NULL REFERENCES "campanhas"("id") ON DELETE CASCADE, "unidade" text NOT NULL, "morador" text NOT NULL, "telefone" text NOT NULL, "valor" integer NOT NULL, "pago" boolean DEFAULT false NOT NULL);\`;
      await sqlClient\`CREATE TABLE IF NOT EXISTS "lancamentos" ("id" serial PRIMARY KEY NOT NULL, "tipo" text NOT NULL, "descricao" text NOT NULL, "cliente_id" integer REFERENCES "clientes"("id") ON DELETE SET NULL, "fornecedor" text, "servico_id" integer REFERENCES "servicos"("id") ON DELETE SET NULL, "inscricao_id" integer REFERENCES "inscricoes"("id") ON DELETE CASCADE, "vencimento" date NOT NULL, "valor" integer NOT NULL, "status" text DEFAULT 'aberto' NOT NULL, "pago_em" date);\`;
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
      { clienteId: padaria.id, tipoServicoId: baratas.id, tecnicoId: marcos.id, dataHora: \`\${hoje}T08:00\`, valor: 24000, status: "concluido", observacoes: "Concluído pela manhã." },
      { clienteId: marina.id, tipoServicoId: baratas.id, tecnicoId: ana.id, dataHora: \`\${hoje}T09:00\`, valor: 24000, status: "concluido", observacoes: "Pago via Pix." },
      { clienteId: clinica.id, tipoServicoId: monitoramento.id, tecnicoId: paulo.id, dataHora: \`\${hoje}T11:00\`, valor: 15000, status: "agendado", observacoes: "Troca de iscas." },
      { clienteId: mercado.id, tipoServicoId: roedores.id, tecnicoId: ana.id, dataHora: \`\${hoje}T14:00\`, valor: 32000, status: "agendado", observacoes: "Depósito." },
      { clienteId: carlos.id, tipoServicoId: cupins.id, tecnicoId: marcos.id, dataHora: \`\${amanha}T10:00\`, valor: 48000, status: "agendado", observacoes: "Telhado." },
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
      { tipo: "receber", descricao: \`Baratas e formigas · \${padaria.nome}\`, clienteId: padaria.id, servicoId: svcs[0].id, vencimento: addDaysISO(hoje, 30), valor: 24000, status: "aberto" },
      { tipo: "receber", descricao: \`Baratas e formigas · \${marina.nome}\`, clienteId: marina.id, servicoId: svcs[1].id, vencimento: hoje, valor: 24000, status: "pago", pagoEm: hoje },
      { tipo: "receber", descricao: \`Controle de roedores · \${mercado.nome}\`, clienteId: mercado.id, vencimento: hoje, valor: 64000, status: "aberto" },
      { tipo: "receber", descricao: \`Campanha \${camp.nome} · Casa 04\`, inscricaoId: i1.id, vencimento: hoje, valor: 19200, status: "pago", pagoEm: hoje },
      { tipo: "receber", descricao: \`Campanha \${camp.nome} · Casa 12\`, inscricaoId: i2.id, vencimento: camp.dataInicio, valor: 19200, status: "aberto" },
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
  if (v.id) revalidatePath(\`/clientes/\${v.id}\`);
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

  const dataHora = \`\${input.data}T\${input.hora.slice(0, 5)}\`;
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido." };

  const conflitos = await db
    .select({ id: servicos.id, clienteNome: clientes.nome })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .where(and(eq(servicos.tecnicoId, input.tecnicoId), eq(servicos.dataHora, dataHora), ne(servicos.status, "cancelado"), input.id ? ne(servicos.id, input.id) : undefined));

  if (conflitos.length > 0) {
    const [tech] = await db.select().from(tecnicos).where(eq(tecnicos.id, input.tecnicoId));
    return { error: \`Conflito: \${tech?.nome || "O técnico"} já tem \${conflitos[0].clienteNome} agendado nesse mesmo dia e horário.\` };
  }

  if (input.id) {
    await db.update(servicos).set({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, valor, observacoes: input.observacoes || "" }).where(eq(servicos.id, input.id));
  } else {
    await db.insert(servicos).values({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, valor, status: "agendado", observacoes: input.observacoes || "" });
  }
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(\`/clientes/\${input.clienteId}\`);
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
      descricao: \`\${tipoServico.nome} · \${cliente.nome}\`,
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
  revalidatePath(\`/clientes/\${cliente.id}\`);
  return { success: true, vencimento };
}

export async function cancelarServicoAction(servicoId: number) {
  const [svc] = await db.select().from(servicos).where(eq(servicos.id, servicoId));
  if (!svc) return { error: "Serviço não encontrado." };
  await db.update(servicos).set({ status: "cancelado" }).where(eq(servicos.id, servicoId));
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(\`/clientes/\${svc.clienteId}\`);
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
  if (lanc.clienteId) revalidatePath(\`/clientes/\${lanc.clienteId}\`);
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
  if (inscritosAtuais.length >= camp.unidades) return { error: \`Limite máximo de \${camp.unidades} unidades atingido.\` };
  if (!input.unidade.trim() || !input.morador.trim()) return { error: "Preencha unidade e morador." };
  const valor = parseBRLToCents(input.valorReais);

  const [nova] = await db.insert(inscricoes).values({ campanhaId: camp.id, unidade: input.unidade.trim(), morador: input.morador.trim(), telefone: input.telefone.trim(), valor, pago: false }).returning();
  await db.insert(lancamentos).values({ tipo: "receber", descricao: \`Campanha \${camp.nome} · Unid. \${nova.unidade} (\${nova.morador})\`, inscricaoId: nova.id, vencimento: camp.dataInicio || todaySP(), valor, status: "aberto" });

  revalidatePath(\`/campanhas/\${camp.id}\`);
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
  revalidatePath(\`/campanhas/\${insc.campanhaId}\`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}
`,

  "src/components/novo-servico-modal.tsx": `"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { salvarClienteAction, salvarServicoAction } from "@/actions";
import { formatBRL, todaySP } from "@/lib/utils";

export function NovoServicoModal({ clientes, tipos, tecnicos, triggerLabel = "Novo serviço" }: { clientes: any[]; tipos: any[]; tecnicos: any[]; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "newClient">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [clienteId, setClienteId] = useState<number>(clientes[0]?.id || 0);
  const [tipoId, setTipoId] = useState<number>(tipos[0]?.id || 0);
  const [tecnicoId, setTecnicoId] = useState<number>(tecnicos[0]?.id || 0);
  const [data, setData] = useState<string>(todaySP());
  const [hora, setHora] = useState<string>("08:00");
  const [valorReais, setValorReais] = useState<string>(tipos[0] ? String(tipos[0].preco / 100) : "240");
  const [observacoes, setObservacoes] = useState("");

  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"PJ" | "PF">("PJ");
  const [novoWhatsapp, setNovoWhatsapp] = useState("");
  const [novoEndereco, setNovoEndereco] = useState("");

  async function handleSalvarNovoCliente() {
    setError("");
    setLoading(true);
    const res = await salvarClienteAction({ tipo: novoTipo, nome: novoNome, whatsapp: novoWhatsapp, endereco: novoEndereco, documento: "", email: "", observacoes: "" });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    if (res.cliente) { setClienteId(res.cliente.id); setStep("form"); }
  }

  async function handleSalvarServico() {
    setError("");
    setLoading(true);
    const res = await salvarServicoAction({ clienteId, tipoServicoId: tipoId, tecnicoId, data, hora, valorReais, observacoes });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => { setError(""); setStep("form"); setOpen(true); }} className="min-h-[48px] flex items-center gap-2 rounded-full bg-[#2F5FE0] hover:bg-[#1B47B5] text-white px-5 text-sm font-bold shadow-md transition">
        <Plus className="w-4 h-4" /> {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div role="dialog" aria-modal="true" className="w-full max-w-[560px] bg-white rounded-[28px] p-6 flex flex-col gap-4 text-[#0F1720] shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{step === "form" ? "Novo serviço" : "Novo cliente"}</h2>
              <button onClick={() => setOpen(false)} className="w-11 h-11 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            {step === "form" ? (
              <>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 min-w-[200px] flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Cliente
                    <select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      <option value={0}>Selecione o cliente</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => setStep("newClient")} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-4 text-xs font-bold">+ Cadastrar novo</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Tipo de serviço
                    <select value={tipoId} onChange={(e) => { const id = Number(e.target.value); setTipoId(id); const f = tipos.find((t) => t.id === id); if (f) setValorReais(String(f.preco / 100)); }} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome} ({formatBRL(t.preco)})</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Técnico
                    <select value={tecnicoId} onChange={(e) => setTecnicoId(Number(e.target.value))} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm" /></label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
                    Horário
                    <select value={hora} onChange={(e) => setHora(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm bg-white">
                      {Array.from({ length: 10 }, (_, i) => { const h = String(8 + i).padStart(2, "0") + ":00"; return <option key={h} value={h}>{h}</option>; })}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Valor (R$)<input value={valorReais} onChange={(e) => setValorReais(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm" /></label>
                </div>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Observações<input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3 text-sm" /></label>
                {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Cancelar</button>
                  <button type="button" disabled={loading} onClick={handleSalvarServico} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">{loading ? "Salvando..." : "Salvar serviço"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  {(["PJ", "PF"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setNovoTipo(k)} className={\`flex-1 min-h-[44px] rounded-full text-xs font-bold \${novoTipo === k ? "bg-[#0F1720] text-white" : "border-[1.5px] border-[#C9D3E0]"}\`}>
                      {k === "PJ" ? "PJ · Empresa" : "PF · Residencial"}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Nome<input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">WhatsApp<input value={novoWhatsapp} onChange={(e) => setNovoWhatsapp(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
                <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Endereço<input value={novoEndereco} onChange={(e) => setNovoEndereco(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
                {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setStep("form")} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Voltar</button>
                  <button type="button" onClick={handleSalvarNovoCliente} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Salvar cliente</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
`,

  "src/components/app-shell.tsx": `"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Calendar, Users, Wrench, Megaphone, CreditCard, LogOut, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { NovoServicoModal } from "./novo-servico-modal";

const NAV_ITEMS = [
  { href: "/", label: "Início", icon: LayoutGrid },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Wrench },
  { href: "/financeiro", label: "Financeiro", icon: CreditCard },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
];

export function AppShell({ children, clientesList, tiposList, tecnicosList, todayLabel }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#E9EEF5] p-3 md:p-6 pb-24 md:pb-6 text-[#0F1720]">
      <div className="relative rounded-[28px] md:rounded-[36px] border-4 md:border-[6px] border-white bg-[#F4F7FB] shadow-[0_18px_50px_rgba(20,40,80,0.14)] p-4 md:p-6 flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-[46px] h-[46px] rounded-[15px] bg-[#0F1720] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#9DBBFF]" />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-tight">Dedetizadora Impacto</div>
              <div className="text-xs font-semibold text-[#3A4658]">Detetiza OS</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center bg-white rounded-full px-4 h-12 text-sm font-semibold shadow-sm">{todayLabel}</div>
            <NovoServicoModal clientes={clientesList} tipos={tiposList} tecnicos={tecnicosList} />
            <button onClick={handleLogout} title="Sair" aria-label="Sair" className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm"><LogOut className="w-5 h-5" /></button>
            <div className="w-12 h-12 rounded-full bg-[#2F5FE0] text-white flex items-center justify-center text-sm font-extrabold">DI</div>
          </div>
        </header>
        <div className="flex gap-5 items-start">
          <nav aria-label="Navegação principal" className="hidden md:flex flex-col gap-1.5 p-2 bg-white rounded-[22px] shadow-md shrink-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} className={\`w-12 h-12 rounded-[15px] flex items-center justify-center transition \${active ? "bg-[#2F5FE0] text-white" : "text-[#0F1720] hover:bg-[#F4F7FB]"}\`}>
                  <Icon className="w-[22px] h-[22px]" />
                </Link>
              );
            })}
          </nav>
          <main className="flex-1 min-w-0 flex flex-col gap-4">{children}</main>
        </div>
      </div>
      <nav aria-label="Navegação móvel" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={\`min-h-[48px] min-w-[54px] px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold \${active ? "bg-[#2F5FE0] text-white" : "text-[#0F1720]"}\`}>
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
`,

  "src/app/globals.css": `@tailwind base;\n@tailwind components;\n@tailwind utilities;\nbody { margin: 0; background-color: #E9EEF5; color: #0F1720; }\n`,

  "src/app/layout.tsx": `import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta" });
export const metadata: Metadata = { title: "Detetiza OS — Dedetizadora Impacto" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
`,

  "src/app/api/auth/[...all]/route.ts": `import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
`,

  "src/app/login/page.tsx": `"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { canPublicRegister } from "@/actions";

export default function LoginPage() {
  const router = useRouter();
  const [allowRegister, setAllowRegister] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("Dedetizadora Impacto");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    canPublicRegister().then((can) => {
      setAllowRegister(can);
      if (can) setIsSignUp(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (isSignUp && allowRegister) {
      const { error: err } = await authClient.signUp.email({ email, password, name });
      setLoading(false);
      if (err) { setError(err.message || "Erro ao criar conta."); return; }
      router.push("/");
      router.refresh();
    } else {
      const { error: err } = await authClient.signIn.email({ email, password });
      setLoading(false);
      if (err) { setError("E-mail ou senha incorretos."); return; }
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4 text-[#0F1720]">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-xl p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[15px] bg-[#0F1720] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#9DBBFF]" /></div>
          <div>
            <h1 className="text-xl font-extrabold">Dedetizadora Impacto</h1>
            <p className="text-xs font-semibold text-[#3A4658]">Detetiza OS · Acesso ao sistema</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && allowRegister && (
            <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Nome<input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
          )}
          <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@impacto.com.br" className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Senha<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
          {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
          <button type="submit" disabled={loading} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">{loading ? "Aguarde..." : isSignUp && allowRegister ? "Criar primeiro usuário e entrar" : "Entrar no Detetiza OS"}</button>
        </form>
        {allowRegister && (
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-bold text-[#1B47B5] text-center hover:underline">
            {isSignUp ? "Já tem conta? Entrar" : "Primeiro acesso? Criar conta"}
          </button>
        )}
      </div>
    </div>
  );
}
`,

  "src/app/(app)/layout.tsx": `import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientes, tiposServico, tecnicos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ensureSeedData } from "@/actions";
import { formatDateBR, todaySP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await ensureSeedData();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [clientesList, tiposList, tecnicosList] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome, tipo: clientes.tipo }).from(clientes),
    db.select().from(tiposServico),
    db.select({ id: tecnicos.id, nome: tecnicos.nome, cor: tecnicos.cor }).from(tecnicos).where(eq(tecnicos.ativo, true)),
  ]);

  return (
    <AppShell clientesList={clientesList} tiposList={tiposList} tecnicosList={tecnicosList} todayLabel={formatDateBR(todaySP())}>
      {children}
    </AppShell>
  );
}
`,

  "src/app/(app)/page.tsx": `import Link from "next/link";
import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos, lancamentos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatBRL, formatDateBR, todaySP } from "@/lib/utils";
import { ensureSeedData } from "@/actions";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  await ensureSeedData();
  const hoje = todaySP();
  const mesPrefix = hoje.slice(0, 7);

  const allServicos = await db
    .select({ id: servicos.id, dataHora: servicos.dataHora, valor: servicos.valor, status: servicos.status, clienteNome: clientes.nome, tipoNome: tiposServico.nome, tecnicoNome: tecnicos.nome, tecnicoCor: tecnicos.cor })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id));

  const servicosHoje = allServicos.filter((s) => s.dataHora.startsWith(hoje) && s.status !== "cancelado").sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const allLancamentos = await db.select().from(lancamentos);
  const lancMes = allLancamentos.filter((l) => l.vencimento.startsWith(mesPrefix));
  const receberMesTotal = lancMes.filter((l) => l.tipo === "receber").reduce((acc, l) => acc + l.valor, 0);
  const pagarMesTotal = lancMes.filter((l) => l.tipo === "pagar").reduce((acc, l) => acc + l.valor, 0);
  const contasHoje = allLancamentos.filter((l) => l.vencimento === hoje && l.status === "aberto");
  const contasVencidas = allLancamentos.filter((l) => l.vencimento < hoje && l.status === "aberto");
  const totalVencido = contasVencidas.reduce((acc, l) => acc + l.valor, 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">A receber no mês</div>
          <div className="text-[26px] font-extrabold text-[#14653A] mt-1">{formatBRL(receberMesTotal)}</div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">A pagar no mês</div>
          <div className="text-[26px] font-extrabold text-[#8E1B10] mt-1">{formatBRL(pagarMesTotal)}</div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">Vencem hoje</div>
          <div className="text-[26px] font-extrabold text-[#0F1720] mt-1">{contasHoje.length}</div>
        </div>
        <div className="bg-white rounded-[24px] p-5 shadow-sm">
          <div className="text-xs font-semibold text-[#3A4658]">Contas vencidas</div>
          <div className="text-[26px] font-extrabold text-[#B42318] mt-1">{formatBRL(totalVencido)}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Trabalhos de hoje ({formatDateBR(hoje)})</h2>
            <Link href="/agenda" className="text-xs font-bold text-[#1B47B5]">Abrir agenda →</Link>
          </div>
          {servicosHoje.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#3A4658]">Nenhum serviço agendado para hoje.</div>
          ) : (
            servicosHoje.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 py-3 border-t border-slate-200">
                <div className="w-14 text-sm font-extrabold">{job.dataHora.slice(11, 16)}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{job.clienteNome}</div>
                  <div className="text-xs text-[#3A4658]">{job.tipoNome} · {job.tecnicoNome}</div>
                </div>
                <span className={\`text-xs font-bold rounded-full px-3 py-1 \${job.status === "concluido" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#E8ECF2] text-[#2F3A4A]"}\`}>
                  {job.status === "concluido" ? "Concluído" : "Agendado"}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold">Contas de hoje e vencidas</h2>
            <Link href="/financeiro" className="text-xs font-bold text-[#1B47B5]">Financeiro →</Link>
          </div>
          {[...contasVencidas, ...contasHoje].map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 border-t border-slate-200">
              <div>
                <div className="text-sm font-bold">{c.fornecedor ? \`\${c.fornecedor} · \${c.descricao}\` : c.descricao}</div>
                <div className="text-xs text-[#3A4658]">Vence {formatDateBR(c.vencimento)}</div>
              </div>
              <div className={\`text-sm font-extrabold \${c.tipo === "receber" ? "text-[#14653A]" : "text-[#8E1B10]"}\`}>{formatBRL(c.valor)}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
`,

  "src/app/(app)/agenda/page.tsx": `import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todaySP } from "@/lib/utils";
import { AgendaView } from "./agenda-view";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const [servicosList, tecnicosList, clientesList, tiposList] = await Promise.all([
    db.select({ id: servicos.id, clienteId: servicos.clienteId, clienteNome: clientes.nome, tipoServicoId: servicos.tipoServicoId, tipoNome: tiposServico.nome, tecnicoId: servicos.tecnicoId, tecnicoNome: tecnicos.nome, tecnicoCor: tecnicos.cor, dataHora: servicos.dataHora, valor: servicos.valor, status: servicos.status, observacoes: servicos.observacoes })
      .from(servicos).innerJoin(clientes, eq(servicos.clienteId, clientes.id)).innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id)).leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id)),
    db.select().from(tecnicos),
    db.select({ id: clientes.id, nome: clientes.nome, tipo: clientes.tipo }).from(clientes),
    db.select().from(tiposServico),
  ]);
  return <AgendaView initialStartDate={todaySP()} servicosList={servicosList} tecnicosList={tecnicosList} clientesList={clientesList} tiposList={tiposList} />;
}
`,

  "src/app/(app)/agenda/agenda-view.tsx": `"use client";

import { useState } from "react";
import { concluirServicoAction, cancelarServicoAction, salvarServicoAction } from "@/actions";
import { addDaysISO, formatBRL, formatDateBR } from "@/lib/utils";
import { X } from "lucide-react";

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export function AgendaView({ initialStartDate, servicosList, tecnicosList, clientesList, tiposList }: any) {
  const [weekStart, setWeekStart] = useState(initialStartDate);
  const [techFilter, setTechFilter] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [clienteId, setClienteId] = useState<number>(clientesList[0]?.id || 0);
  const [tipoId, setTipoId] = useState<number>(tiposList[0]?.id || 0);
  const [tecnicoId, setTecnicoId] = useState<number>(tecnicosList[0]?.id || 0);
  const [data, setData] = useState<string>(initialStartDate);
  const [hora, setHora] = useState<string>("08:00");
  const [valorReais, setValorReais] = useState<string>("240");
  const [observacoes, setObservacoes] = useState<string>("");
  const [statusAtual, setStatusAtual] = useState<string>("agendado");
  const [error, setError] = useState("");

  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function openNewAtSlot(dayIso: string, hourStr: string) {
    setError("");
    setEditingId(undefined);
    setClienteId(clientesList[0]?.id || 0);
    setTipoId(tiposList[0]?.id || 0);
    setTecnicoId(techFilter || tecnicosList[0]?.id || 0);
    setData(dayIso);
    setHora(hourStr);
    setValorReais(tiposList[0] ? String(tiposList[0].preco / 100) : "240");
    setObservacoes("");
    setStatusAtual("agendado");
    setModalOpen(true);
  }

  function openEditService(s: any) {
    setError("");
    setEditingId(s.id);
    setClienteId(s.clienteId);
    setTipoId(s.tipoServicoId);
    setTecnicoId(s.tecnicoId || tecnicosList[0]?.id || 0);
    setData(s.dataHora.slice(0, 10));
    setHora(s.dataHora.slice(11, 16));
    setValorReais(String(s.valor / 100));
    setObservacoes(s.observacoes || "");
    setStatusAtual(s.status);
    setModalOpen(true);
  }

  async function handleSave() {
    setError("");
    const res = await salvarServicoAction({ id: editingId, clienteId, tipoServicoId: tipoId, tecnicoId, data, hora, valorReais, observacoes });
    if (res.error) { setError(res.error); return; }
    setModalOpen(false);
  }

  const filtered = servicosList.filter((s: any) => s.status !== "cancelado" && (techFilter === 0 || s.tecnicoId === techFilter));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold">Agenda dos técnicos</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-full shadow-sm">
            <button onClick={() => setTechFilter(0)} className={\`min-h-[40px] px-4 rounded-full text-xs font-bold \${techFilter === 0 ? "bg-[#0F1720] text-white" : ""}\`}>Todos</button>
            {tecnicosList.map((t: any) => (
              <button key={t.id} onClick={() => setTechFilter(t.id)} className={\`min-h-[40px] px-4 rounded-full text-xs font-bold flex items-center gap-1.5 \${techFilter === t.id ? "bg-[#0F1720] text-white" : ""}\`}>
                <span style={{ backgroundColor: t.cor }} className="w-2.5 h-2.5 rounded-full" />{t.nome}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-full p-1 shadow-sm">
            <button onClick={() => setWeekStart(addDaysISO(weekStart, -7))} className="w-10 h-10 rounded-full font-bold">‹</button>
            <span className="px-3 text-xs font-bold">{formatDateBR(days[0]).slice(0, 5)} a {formatDateBR(days[6]).slice(0, 5)}</span>
            <button onClick={() => setWeekStart(addDaysISO(weekStart, 7))} className="w-10 h-10 rounded-full font-bold">›</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] p-4 shadow-sm overflow-x-auto">
        <div className="min-w-[980px] grid grid-cols-[64px_repeat(7,1fr)] gap-2">
          <div className="pt-14 flex flex-col">{HOURS.map((h) => <div key={h} className="h-20 text-xs font-bold text-[#3A4658] pr-2 text-right">{h}</div>)}</div>
          {days.map((dayIso) => {
            const wd = dayNames[new Date(\`\${dayIso}T12:00:00Z\`).getUTCDay()];
            return (
              <div key={dayIso} className="flex flex-col">
                <div className="h-12 mb-2 bg-[#F1F4F8] rounded-2xl px-3 flex items-center justify-between text-xs font-bold">
                  <span>{wd}</span><span>{dayIso.slice(8, 10)}/{dayIso.slice(5, 7)}</span>
                </div>
                <div className="flex flex-col border border-[#E3E8EF] rounded-2xl overflow-hidden bg-[#FAFBFD]">
                  {HOURS.map((h) => {
                    const slotServices = filtered.filter((s: any) => s.dataHora.slice(0, 10) === dayIso && s.dataHora.slice(11, 16) === h);
                    return (
                      <div key={h} onClick={() => { if (slotServices.length === 0) openNewAtSlot(dayIso, h); }} className="h-20 border-t border-dashed border-[#D3DAE4] first:border-t-0 p-1 flex flex-col gap-1 cursor-pointer hover:bg-[#2F5FE0]/5">
                        {slotServices.map((svc: any) => (
                          <button key={svc.id} type="button" onClick={(e) => { e.stopPropagation(); openEditService(svc); }} style={{ borderLeftColor: svc.tecnicoCor || "#2F5FE0" }} className={\`w-full text-left rounded-xl p-1.5 border-l-4 shadow-sm text-xs \${svc.status === "concluido" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-white text-[#0F1720] border border-[#C9D3E0]"}\`}>
                            <div className="font-extrabold truncate">{svc.clienteNome}</div>
                            <div className="text-[11px] truncate">{svc.tecnicoNome} · {svc.tipoNome}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F1720]/55 flex items-start justify-center p-4 pt-12">
          <div className="w-full max-w-[540px] bg-white rounded-[28px] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{editingId ? "Editar serviço" : "Novo serviço"}</h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-full bg-[#E8ECF2] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <label className="flex flex-col gap-1 text-xs font-bold">Cliente<select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))} className="h-12 border rounded-xl px-3 text-sm bg-white">{clientesList.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold">Serviço<select value={tipoId} onChange={(e) => { const id = Number(e.target.value); setTipoId(id); const f = tiposList.find((t: any) => t.id === id); if (f) setValorReais(String(f.preco / 100)); }} className="h-12 border rounded-xl px-3 text-sm bg-white">{tiposList.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold">Técnico<select value={tecnicoId} onChange={(e) => setTecnicoId(Number(e.target.value))} className="h-12 border rounded-xl px-3 text-sm bg-white">{tecnicosList.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold">Dia<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12 border rounded-xl px-3 text-sm" /></label>
              <label className="flex flex-col gap-1 text-xs font-bold">Hora<select value={hora} onChange={(e) => setHora(e.target.value)} className="h-12 border rounded-xl px-3 text-sm bg-white">{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-xs font-bold">Valor (R$)<input value={valorReais} onChange={(e) => setValorReais(e.target.value)} className="h-12 border rounded-xl px-3 text-sm" /></label>
            </div>
            {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
            <div className="flex justify-between gap-2 pt-2">
              {editingId ? (
                <div className="flex gap-2">
                  {statusAtual !== "concluido" && <button type="button" onClick={async () => { await concluirServicoAction(editingId); setModalOpen(false); }} className="min-h-[44px] rounded-full bg-[#14653A] text-white px-4 text-xs font-bold">✓ Concluir</button>}
                  <button type="button" onClick={async () => { await cancelarServicoAction(editingId); setModalOpen(false); }} className="min-h-[44px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-4 text-xs font-bold">Cancelar</button>
                </div>
              ) : <div />}
              <button type="button" onClick={handleSave} className="min-h-[44px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`,

  "src/app/(app)/servicos/page.tsx": `import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ServicosView } from "./servicos-view";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const [servicosList, tiposList, tecnicosList] = await Promise.all([
    db.select({ id: servicos.id, clienteNome: clientes.nome, tipoNome: tiposServico.nome, tecnicoId: servicos.tecnicoId, tecnicoNome: tecnicos.nome, dataHora: servicos.dataHora, valor: servicos.valor, status: servicos.status })
      .from(servicos).innerJoin(clientes, eq(servicos.clienteId, clientes.id)).innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id)).leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id)),
    db.select().from(tiposServico),
    db.select().from(tecnicos),
  ]);
  return <ServicosView servicosList={servicosList} tiposList={tiposList} tecnicosList={tecnicosList} />;
}
`,

  "src/app/(app)/servicos/servicos-view.tsx": `"use client";

import { useState } from "react";
import { concluirServicoAction, cancelarServicoAction, salvarTipoServicoAction } from "@/actions";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";

export function ServicosView({ servicosList, tiposList, tecnicosList }: any) {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [novoTipoNome, setNovoTipoNome] = useState("");
  const [novoTipoPreco, setNovoTipoPreco] = useState("");

  const filtered = servicosList.filter((s: any) => statusFilter === "todos" || s.status === statusFilter).sort((a: any, b: any) => b.dataHora.localeCompare(a.dataHora));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-extrabold">Serviços</h1>
      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-3">
        <h2 className="text-[17px] font-extrabold">Catálogo de tipos de serviço</h2>
        <div className="flex flex-wrap gap-2.5">
          {tiposList.map((t: any) => (
            <div key={t.id} className="bg-[#F4F7FB] border rounded-2xl px-4 py-2 flex items-center gap-3 text-sm">
              <span className="font-bold">{t.nome}</span><span className="font-extrabold text-[#1B47B5]">{formatBRL(t.preco)}</span>
            </div>
          ))}
        </div>
        <form onSubmit={async (e) => { e.preventDefault(); await salvarTipoServicoAction({ nome: novoTipoNome, precoReais: novoTipoPreco }); setNovoTipoNome(""); setNovoTipoPreco(""); }} className="flex flex-wrap gap-2 pt-2">
          <input value={novoTipoNome} onChange={(e) => setNovoTipoNome(e.target.value)} placeholder="Novo serviço..." className="h-11 border rounded-xl px-3 text-xs" />
          <input value={novoTipoPreco} onChange={(e) => setNovoTipoPreco(e.target.value)} placeholder="Preço (R$)" className="h-11 w-28 border rounded-xl px-3 text-xs" />
          <button type="submit" className="min-h-[44px] rounded-full bg-[#0F1720] text-white px-4 text-xs font-bold">+ Adicionar</button>
        </form>
      </section>

      <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {["todos", "agendado", "concluido", "cancelado"].map((st) => (
            <button key={st} onClick={() => setStatusFilter(st)} className={\`min-h-[40px] rounded-full px-4 text-xs font-bold capitalize \${statusFilter === st ? "bg-[#0F1720] text-white" : "border bg-[#F4F7FB]"}\`}>{st}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-[#3A4658]"><th className="p-2.5">Data/Hora</th><th className="p-2.5">Cliente</th><th className="p-2.5">Serviço</th><th className="p-2.5">Técnico</th><th className="p-2.5">Valor</th><th className="p-2.5">Status</th><th className="p-2.5 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-semibold">{formatDateTimeBR(s.dataHora)}</td>
                  <td className="p-3 font-extrabold">{s.clienteNome}</td>
                  <td className="p-3">{s.tipoNome}</td>
                  <td className="p-3">{s.tecnicoNome || "—"}</td>
                  <td className="p-3 font-extrabold">{formatBRL(s.valor)}</td>
                  <td className="p-3"><span className="rounded-full px-3 py-0.5 text-xs font-bold bg-[#DCE7FF] text-[#1B47B5]">{s.status}</span></td>
                  <td className="p-3 text-right">
                    {s.status === "agendado" && (
                      <div className="inline-flex gap-2">
                        <button onClick={() => concluirServicoAction(s.id)} className="min-h-[38px] rounded-full bg-[#14653A] text-white px-3 text-xs font-bold">Concluir</button>
                        <button onClick={() => cancelarServicoAction(s.id)} className="min-h-[38px] rounded-full bg-[#FDE4E1] text-[#8E1B10] px-3 text-xs font-bold">Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}
console.log("✅ Parte 1 gravada com sucesso! Agora rode: node parte2.mjs");