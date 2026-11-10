// setup.mjs — Instalador 100% Automático do Detetiza OS
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const files = {
  "package.json": JSON.stringify(
    {
      name: "detetiza-mvp",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "drizzle-kit push && next build",
        start: "next start",
        "db:push": "drizzle-kit push",
        "seed:demo": "tsx scripts/seed-demo.ts",
        "import:clientes": "tsx scripts/import-clientes.ts",
      },
      dependencies: {
        "@neondatabase/serverless": "^0.10.4",
        "better-auth": "^1.2.5",
        clsx: "^2.1.1",
        "drizzle-orm": "^0.39.3",
        "lucide-react": "^0.475.0",
        next: "15.1.7",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "tailwind-merge": "^3.0.1",
        zod: "^3.24.2",
      },
      devDependencies: {
        "@types/node": "^22.13.4",
        "@types/react": "^19.0.8",
        "@types/react-dom": "^19.0.3",
        dotenv: "^16.4.7",
        "drizzle-kit": "^0.30.4",
        postcss: "^8.5.2",
        tailwindcss: "^3.4.17",
        tsx: "^4.19.2",
        typescript: "^5.7.3",
      },
    },
    null,
    2
  ),

  ".gitignore": `node_modules/
.next/
out/
build/
.DS_Store
*.pem
npm-debug.log*
.env
.env*.local
.vercel
dados/
`,

  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
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

  "next.config.ts": `import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
`,

  "postcss.config.mjs": `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};
export default config;
`,

  "tailwind.config.ts": `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
`,

  "drizzle.config.ts": `import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
  },
});
`,

  "src/db/schema.ts": `import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

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
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
  tipoServicoId: integer("tipo_servico_id")
    .notNull()
    .references(() => tiposServico.id),
  tecnicoId: integer("tecnico_id").references(() => tecnicos.id),
  dataHora: timestamp("data_hora", { mode: "string" }).notNull(),
  valor: integer("valor").notNull(),
  status: text("status", { enum: ["agendado", "concluido", "cancelado"] })
    .notNull()
    .default("agendado"),
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
  status: text("status", { enum: ["agendada", "finalizada", "cancelada"] })
    .notNull()
    .default("agendada"),
});

export const inscricoes = pgTable("inscricoes", {
  id: serial("id").primaryKey(),
  campanhaId: integer("campanha_id")
    .notNull()
    .references(() => campanhas.id, { onDelete: "cascade" }),
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
  clienteId: integer("cliente_id").references(() => clientes.id, {
    onDelete: "set null",
  }),
  fornecedor: text("fornecedor"),
  servicoId: integer("servico_id").references(() => servicos.id, {
    onDelete: "set null",
  }),
  inscricaoId: integer("inscricao_id").references(() => inscricoes.id, {
    onDelete: "cascade",
  }),
  vencimento: date("vencimento", { mode: "string" }).notNull(),
  valor: integer("valor").notNull(),
  status: text("status", { enum: ["aberto", "pago"] })
    .notNull()
    .default("aberto"),
  pagoEm: date("pago_em", { mode: "string" }),
});
`,

  "src/db/index.ts": `import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
`,

  "src/lib/utils.ts": `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

export function parseBRLToCents(val: string | number): number {
  if (typeof val === "number") return Math.round(val * 100);
  const cleaned = val.replace(/[R$\\s.]/g, "").replace(",", ".");
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
  secret: process.env.BETTER_AUTH_SECRET || "detetiza_impacto_secret_default_2026_key",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});
`,

  "src/lib/auth-client.ts": `import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
`,

  "src/actions/index.ts": `"use server";

import { db } from "@/db";
import {
  tecnicos,
  clientes,
  tiposServico,
  servicos,
  lancamentos,
  campanhas,
  inscricoes,
  user,
} from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDaysISO, parseBRLToCents, todaySP } from "@/lib/utils";

// Auto-seed de dados completos de demonstração caso o banco esteja vazio
export async function ensureSeedData() {
  const existingTechs = await db.select().from(tecnicos);
  if (existingTechs.length > 0) return;

  const hoje = todaySP();
  const amanha = addDaysISO(hoje, 1);
  const doisDias = addDaysISO(hoje, 2);
  const ontem = addDaysISO(hoje, -1);

  const [marcos, ana, paulo] = await db
    .insert(tecnicos)
    .values([
      { nome: "Marcos", telefone: "(11) 98888-0001", cor: "#2F5FE0", ativo: true },
      { nome: "Ana", telefone: "(11) 98888-0002", cor: "#0F1720", ativo: true },
      { nome: "Paulo", telefone: "(11) 98888-0003", cor: "#4A5B78", ativo: true },
    ])
    .returning();

  const [baratas, roedores, cupins, pulgas, monitoramento] = await db
    .insert(tiposServico)
    .values([
      { nome: "Baratas e formigas", preco: 24000 },
      { nome: "Roedores", preco: 32000 },
      { nome: "Cupins", preco: 48000 },
      { nome: "Pulgas e carrapatos", preco: 26000 },
      { nome: "Monitoramento", preco: 15000 },
    ])
    .returning();

  const clientesInseridos = await db
    .insert(clientes)
    .values([
      {
        tipo: "PJ",
        nome: "Padaria Sol Ltda",
        documento: "12.345.678/0001-90",
        whatsapp: "(11) 98888-1200",
        email: "contato@padariasol.com.br",
        endereco: "Av. das Flores, 210 · Centro",
        observacoes: "Serviços contratados: Baratas e formigas, Roedores.",
      },
      {
        tipo: "PJ",
        nome: "Mercado Bom Preço",
        documento: "23.456.789/0001-11",
        whatsapp: "(11) 93333-5510",
        email: "adm@bompreco.com.br",
        endereco: "Rua do Comércio, 850 · Vila Nova",
        observacoes: "Serviços contratados: Roedores, Monitoramento mensal.",
      },
      {
        tipo: "PJ",
        nome: "Clínica Vida Saúde",
        documento: "34.567.890/0001-22",
        whatsapp: "(11) 96666-2210",
        email: "financeiro@clinicavida.com.br",
        endereco: "Av. Brasil, 1420 · Sala 3",
        observacoes: "Serviços contratados: Monitoramento.",
      },
      {
        tipo: "PJ",
        nome: "Restaurante Sabor & Cia",
        documento: "45.678.901/0001-33",
        whatsapp: "(11) 92222-6405",
        email: "contato@saborecia.com.br",
        endereco: "Rua Gastronômica, 99 · Centro",
        observacoes: "Serviços contratados: Baratas e formigas.",
      },
      {
        tipo: "PF",
        nome: "Marina Souza (Residência)",
        documento: "123.456.789-01",
        whatsapp: "(11) 98123-4455",
        email: "marina.souza@email.com",
        endereco: "Rua Silva, 45 · Jardim América",
        observacoes: "Serviços contratados: Baratas e formigas.",
      },
      {
        tipo: "PF",
        nome: "Carlos Eduardo Menezes",
        documento: "234.567.890-12",
        whatsapp: "(11) 98456-7788",
        email: "carlos.m@email.com",
        endereco: "Rua do Ipê, 128 · Bela Vista",
        observacoes: "Serviços contratados: Cupins.",
      },
      {
        tipo: "PF",
        nome: "Ana Paula Ribeiro",
        documento: "345.678.901-23",
        whatsapp: "(11) 98345-6677",
        email: "anapaula@email.com",
        endereco: "Av. Central, 502 · Apto 32",
        observacoes: "Serviços contratados: Pulgas e carrapatos.",
      },
      {
        tipo: "PJ",
        nome: "Academia Fit Center",
        documento: "56.789.012/0001-44",
        whatsapp: "(11) 97777-3040",
        email: "gestao@academiafit.com.br",
        endereco: "Av. Esportiva, 300 · Galpão B",
        observacoes: "Serviços contratados: Baratas e formigas.",
      },
    ])
    .returning();

  const [padaria, mercado, clinica, restaurante, marina, carlos, anaPaula, academia] =
    clientesInseridos;

  const servicosCriados = await db
    .insert(servicos)
    .values([
      {
        clienteId: padaria.id,
        tipoServicoId: baratas.id,
        tecnicoId: marcos.id,
        dataHora: \`\${hoje}T08:00\`,
        valor: 24000,
        status: "concluido",
        observacoes: "Concluído pela manhã.",
      },
      {
        clienteId: marina.id,
        tipoServicoId: baratas.id,
        tecnicoId: ana.id,
        dataHora: \`\${hoje}T09:00\`,
        valor: 24000,
        status: "concluido",
        observacoes: "Pago via Pix na hora.",
      },
      {
        clienteId: clinica.id,
        tipoServicoId: monitoramento.id,
        tecnicoId: paulo.id,
        dataHora: \`\${hoje}T11:00\`,
        valor: 15000,
        status: "agendado",
        observacoes: "Troca de porta-iscas.",
      },
      {
        clienteId: mercado.id,
        tipoServicoId: roedores.id,
        tecnicoId: ana.id,
        dataHora: \`\${hoje}T14:00\`,
        valor: 32000,
        status: "agendado",
        observacoes: "Revisar depósito.",
      },
      {
        clienteId: carlos.id,
        tipoServicoId: cupins.id,
        tecnicoId: marcos.id,
        dataHora: \`\${hoje}T16:00\`,
        valor: 48000,
        status: "agendado",
        observacoes: "Barreira química.",
      },
      {
        clienteId: restaurante.id,
        tipoServicoId: baratas.id,
        tecnicoId: marcos.id,
        dataHora: \`\${amanha}T09:00\`,
        valor: 24000,
        status: "agendado",
        observacoes: "Cozinha industrial.",
      },
      {
        clienteId: anaPaula.id,
        tipoServicoId: pulgas.id,
        tecnicoId: paulo.id,
        dataHora: \`\${amanha}T14:00\`,
        valor: 26000,
        status: "agendado",
        observacoes: "",
      },
      {
        clienteId: academia.id,
        tipoServicoId: baratas.id,
        tecnicoId: ana.id,
        dataHora: \`\${doisDias}T10:00\`,
        valor: 24000,
        status: "agendado",
        observacoes: "Vestiários.",
      },
    ])
    .returning();

  const [campanhaVila] = await db
    .insert(campanhas)
    .values({
      nome: "Condomínio Vila Verde",
      local: "Estrada do Sol, 1200 · Casas 1 a 30",
      dataInicio: addDaysISO(hoje, 4),
      dataFim: addDaysISO(hoje, 5),
      descontoPct: 20,
      unidades: 30,
      status: "agendada",
    })
    .returning();

  const [insc1, insc2, insc3] = await db
    .insert(inscricoes)
    .values([
      {
        campanhaId: campanhaVila.id,
        unidade: "Casa 04",
        morador: "Rogério Lima",
        telefone: "(11) 99111-2233",
        valor: 19200,
        pago: true,
      },
      {
        campanhaId: campanhaVila.id,
        unidade: "Casa 12",
        morador: "Fernanda Alves",
        telefone: "(11) 99222-3344",
        valor: 19200,
        pago: false,
      },
      {
        campanhaId: campanhaVila.id,
        unidade: "Casa 19",
        morador: "Tiago Nogueira",
        telefone: "(11) 99333-4455",
        valor: 25600,
        pago: false,
      },
    ])
    .returning();

  await db.insert(lancamentos).values([
    {
      tipo: "receber",
      descricao: \`Baratas e formigas · \${padaria.nome}\`,
      clienteId: padaria.id,
      servicoId: servicosCriados[0].id,
      vencimento: addDaysISO(hoje, 30),
      valor: 24000,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: \`Baratas e formigas · \${marina.nome}\`,
      clienteId: marina.id,
      servicoId: servicosCriados[1].id,
      vencimento: hoje,
      valor: 24000,
      status: "pago",
      pagoEm: hoje,
    },
    {
      tipo: "receber",
      descricao: \`Controle de roedores · \${mercado.nome}\`,
      clienteId: mercado.id,
      vencimento: hoje,
      valor: 64000,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: \`Dedetização geral · \${academia.nome}\`,
      clienteId: academia.id,
      vencimento: addDaysISO(hoje, -5),
      valor: 48000,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: \`Campanha \${campanhaVila.nome} · Casa 04 (Rogério Lima)\`,
      inscricaoId: insc1.id,
      vencimento: hoje,
      valor: 19200,
      status: "pago",
      pagoEm: hoje,
    },
    {
      tipo: "receber",
      descricao: \`Campanha \${campanhaVila.nome} · Casa 12 (Fernanda Alves)\`,
      inscricaoId: insc2.id,
      vencimento: campanhaVila.dataInicio,
      valor: 19200,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: \`Campanha \${campanhaVila.nome} · Casa 19 (Tiago Nogueira)\`,
      inscricaoId: insc3.id,
      vencimento: campanhaVila.dataInicio,
      valor: 25600,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Aliança Químicos",
      descricao: "Reposição de gel e inseticidas",
      vencimento: hoje,
      valor: 128000,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Posto Rede Brasil",
      descricao: "Combustível da frota",
      vencimento: hoje,
      valor: 46000,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Imobiliária Central",
      descricao: "Aluguel do galpão",
      vencimento: addDaysISO(hoje, 3),
      valor: 220000,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Folha de Pagamento",
      descricao: "Técnicos (Marcos, Ana, Paulo)",
      vencimento: ontem,
      valor: 690000,
      status: "pago",
      pagoEm: ontem,
    },
  ]);
}

export async function canPublicRegister(): Promise<boolean> {
  const users = await db.select({ id: user.id }).from(user).limit(1);
  return users.length === 0;
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
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  if (v.id) {
    await db
      .update(clientes)
      .set({
        tipo: v.tipo,
        nome: v.nome.trim(),
        documento: v.documento?.trim() || "",
        whatsapp: v.whatsapp.trim(),
        email: v.email?.trim() || "",
        endereco: v.endereco?.trim() || "",
        observacoes: v.observacoes?.trim() || "",
      })
      .where(eq(clientes.id, v.id));
  } else {
    const [novo] = await db
      .insert(clientes)
      .values({
        tipo: v.tipo,
        nome: v.nome.trim(),
        documento: v.documento?.trim() || "",
        whatsapp: v.whatsapp.trim(),
        email: v.email?.trim() || "",
        endereco: v.endereco?.trim() || "",
        observacoes: v.observacoes?.trim() || "",
      })
      .returning();
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

export async function salvarTipoServicoAction(input: {
  id?: number;
  nome: string;
  precoReais: string;
}) {
  if (!input.nome.trim()) return { error: "Informe o nome do tipo de serviço." };
  const preco = parseBRLToCents(input.precoReais);
  if (preco <= 0) return { error: "Informe um preço maior que zero." };

  if (input.id) {
    await db
      .update(tiposServico)
      .set({ nome: input.nome.trim(), preco })
      .where(eq(tiposServico.id, input.id));
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
  if (valor <= 0) return { error: "Informe um valor válido para o serviço." };

  const conflitos = await db
    .select({ id: servicos.id, clienteNome: clientes.nome })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .where(
      and(
        eq(servicos.tecnicoId, input.tecnicoId),
        eq(servicos.dataHora, dataHora),
        ne(servicos.status, "cancelado"),
        input.id ? ne(servicos.id, input.id) : undefined
      )
    );

  if (conflitos.length > 0) {
    const [tech] = await db
      .select()
      .from(tecnicos)
      .where(eq(tecnicos.id, input.tecnicoId));
    return {
      error: \`Conflito: \${tech?.nome || "O técnico"} já tem \${conflitos[0].clienteNome} agendado nesse mesmo dia e horário.\`,
    };
  }

  if (input.id) {
    await db
      .update(servicos)
      .set({
        clienteId: input.clienteId,
        tipoServicoId: input.tipoServicoId,
        tecnicoId: input.tecnicoId,
        dataHora,
        valor,
        observacoes: input.observacoes || "",
      })
      .where(eq(servicos.id, input.id));
  } else {
    await db.insert(servicos).values({
      clienteId: input.clienteId,
      tipoServicoId: input.tipoServicoId,
      tecnicoId: input.tecnicoId,
      dataHora,
      valor,
      status: "agendado",
      observacoes: input.observacoes || "",
    });
  }

  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(\`/clientes/\${input.clienteId}\`);
  return { success: true };
}

export async function concluirServicoAction(servicoId: number) {
  const rows = await db
    .select({
      servico: servicos,
      cliente: clientes,
      tipoServico: tiposServico,
    })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .where(eq(servicos.id, servicoId));

  if (rows.length === 0) return { error: "Serviço não encontrado." };
  const { servico, cliente, tipoServico } = rows[0];

  if (servico.status === "concluido") {
    return { error: "Este serviço já está concluído." };
  }

  await db
    .update(servicos)
    .set({ status: "concluido" })
    .where(eq(servicos.id, servicoId));

  const existente = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.servicoId, servicoId));

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
  const [svc] = await db
    .select()
    .from(servicos)
    .where(eq(servicos.id, servicoId));
  if (!svc) return { error: "Serviço não encontrado." };

  await db
    .update(servicos)
    .set({ status: "cancelado" })
    .where(eq(servicos.id, servicoId));

  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(\`/clientes/\${svc.clienteId}\`);
  return { success: true };
}

export async function criarLancamentoPagarAction(input: {
  fornecedor: string;
  descricao: string;
  vencimento: string;
  valorReais: string;
}) {
  if (!input.fornecedor.trim()) return { error: "Informe o fornecedor." };
  if (!input.descricao.trim()) return { error: "Informe a descrição." };
  if (!input.vencimento) return { error: "Informe a data de vencimento." };
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  await db.insert(lancamentos).values({
    tipo: "pagar",
    fornecedor: input.fornecedor.trim(),
    descricao: input.descricao.trim(),
    vencimento: input.vencimento,
    valor,
    status: "aberto",
  });

  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function darBaixaLancamentoAction(input: {
  lancamentoId: number;
  pagoEm: string;
  valorPagoReais: string;
}) {
  const [lanc] = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, input.lancamentoId));
  if (!lanc) return { error: "Lançamento não encontrado." };

  const valorPago = parseBRLToCents(input.valorPagoReais);
  if (valorPago <= 0) return { error: "Informe um valor pago maior que zero." };
  if (!input.pagoEm) return { error: "Informe a data do pagamento." };

  await db
    .update(lancamentos)
    .set({
      status: "pago",
      pagoEm: input.pagoEm,
      valor: valorPago,
    })
    .where(eq(lancamentos.id, input.lancamentoId));

  if (lanc.inscricaoId) {
    await db
      .update(inscricoes)
      .set({ pago: true, valor: valorPago })
      .where(eq(inscricoes.id, lanc.inscricaoId));
  }

  revalidatePath("/");
  revalidatePath("/financeiro");
  revalidatePath("/campanhas");
  if (lanc.clienteId) revalidatePath(\`/clientes/\${lanc.clienteId}\`);
  return { success: true };
}

export async function excluirLancamentoAction(id: number) {
  const [lanc] = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, id));
  if (!lanc) return { error: "Lançamento não encontrado." };
  if (lanc.status === "pago") {
    return { error: "Um lançamento já pago não pode ser excluído." };
  }

  await db.delete(lancamentos).where(eq(lancamentos.id, id));
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function salvarCampanhaAction(input: {
  id?: number;
  nome: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  descontoPct: number;
  unidades: number;
  status?: "agendada" | "finalizada" | "cancelada";
}) {
  if (!input.nome.trim()) return { error: "Informe o nome da campanha." };
  if (!input.local.trim()) return { error: "Informe o local/condomínio." };
  if (!input.dataInicio || !input.dataFim)
    return { error: "Informe as datas de início e fim." };
  if (input.dataFim < input.dataInicio)
    return { error: "A data de fim não pode ser anterior ao início." };
  if (input.descontoPct < 0 || input.descontoPct > 100)
    return { error: "O desconto deve estar entre 0% e 100%." };
  if (input.unidades < 1)
    return { error: "O número de unidades deve ser de pelo menos 1." };

  if (input.id) {
    await db
      .update(campanhas)
      .set({
        nome: input.nome.trim(),
        local: input.local.trim(),
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        descontoPct: input.descontoPct,
        unidades: input.unidades,
        status: input.status || "agendada",
      })
      .where(eq(campanhas.id, input.id));
    revalidatePath("/campanhas");
    revalidatePath(\`/campanhas/\${input.id}\`);
    return { success: true, id: input.id };
  } else {
    const [nova] = await db
      .insert(campanhas)
      .values({
        nome: input.nome.trim(),
        local: input.local.trim(),
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        descontoPct: input.descontoPct,
        unidades: input.unidades,
        status: "agendada",
      })
      .returning();
    revalidatePath("/campanhas");
    return { success: true, id: nova.id };
  }
}

export async function inscreverUnidadeCampanhaAction(input: {
  campanhaId: number;
  unidade: string;
  morador: string;
  telefone: string;
  valorReais: string;
}) {
  const [camp] = await db
    .select()
    .from(campanhas)
    .where(eq(campanhas.id, input.campanhaId));
  if (!camp) return { error: "Campanha não encontrada." };

  const inscritosAtuais = await db
    .select()
    .from(inscricoes)
    .where(eq(inscricoes.campanhaId, input.campanhaId));

  if (inscritosAtuais.length >= camp.unidades) {
    return {
      error: \`Limite atingido: esta campanha permite no máximo \${camp.unidades} unidades.\`,
    };
  }

  if (!input.unidade.trim()) return { error: "Informe a casa ou apartamento." };
  if (!input.morador.trim()) return { error: "Informe o nome do morador." };
  if (!input.telefone.trim()) return { error: "Informe o telefone do morador." };

  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  const [novaInscricao] = await db
    .insert(inscricoes)
    .values({
      campanhaId: camp.id,
      unidade: input.unidade.trim(),
      morador: input.morador.trim(),
      telefone: input.telefone.trim(),
      valor,
      pago: false,
    })
    .returning();

  await db.insert(lancamentos).values({
    tipo: "receber",
    descricao: \`Campanha \${camp.nome} · Unid. \${novaInscricao.unidade} (\${novaInscricao.morador})\`,
    inscricaoId: novaInscricao.id,
    vencimento: camp.dataInicio || todaySP(),
    valor,
    status: "aberto",
  });

  revalidatePath(\`/campanhas/\${camp.id}\`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function marcarInscricaoPagaAction(inscricaoId: number) {
  const [insc] = await db
    .select()
    .from(inscricoes)
    .where(eq(inscricoes.id, inscricaoId));
  if (!insc) return { error: "Inscrição não encontrada." };

  const hoje = todaySP();
  await db
    .update(inscricoes)
    .set({ pago: true })
    .where(eq(inscricoes.id, inscricaoId));

  await db
    .update(lancamentos)
    .set({ status: "pago", pagoEm: hoje })
    .where(eq(lancamentos.inscricaoId, inscricaoId));

  revalidatePath(\`/campanhas/\${insc.campanhaId}\`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}
`,
};

console.log("📁 Criando estrutura de pastas e arquivos...");
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

console.log("📦 Instalando pacotes do projeto (npm install)...");
execSync("npm install", { stdio: "inherit" });

console.log("🔗 Puxando variáveis do banco Neon na Vercel...");
try {
  execSync("npx vercel link --yes", { stdio: "inherit" });
  execSync("npx vercel env pull .env.local --yes", { stdio: "inherit" });
} catch (e) {
  console.log("⚠️ Caso ainda não esteja logado na Vercel CLI, rode 'npx vercel login' e depois 'npx vercel env pull .env.local'.");
}

// Garante BETTER_AUTH_SECRET no .env.local
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  if (!envContent.includes("BETTER_AUTH_SECRET")) {
    fs.appendFileSync(
      ".env.local",
      '\nBETTER_AUTH_SECRET="detetiza_impacto_chave_secreta_2026_xyz"\nBETTER_AUTH_URL="https://dedetiza-os.vercel.app"\n'
    );
  }
}

console.log("🗄️ Criando tabelas no banco Neon...");
try {
  execSync("npx drizzle-kit push", { stdio: "inherit" });
} catch (e) {
  console.log("⚠️ O banco será sincronizado automaticamente durante o build na Vercel.");
}

console.log("🚀 Enviando código para o GitHub (https://github.com/philippy/dedetizaOS.git)...");
try {
  if (!fs.existsSync(".git")) {
    execSync("git init", { stdio: "inherit" });
  }
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "feat: MVP completo Detetiza OS + auto-seed Neon"', {
    stdio: "inherit",
  });
  execSync("git branch -M main", { stdio: "inherit" });
  try {
    execSync("git remote add origin https://github.com/philippy/dedetizaOS.git", {
      stdio: "pipe",
    });
  } catch {}
  execSync("git push -u origin main --force", { stdio: "inherit" });
  console.log("✅ Tudo enviado! A Vercel já está publicando em https://dedetiza-os.vercel.app");
} catch (e) {
  console.error("Erro no git push:", e.message);
}