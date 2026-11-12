import { createHash } from "crypto";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailConfigurado, enviarEmail, montarEmail } from "@/lib/email";
import * as schema from "@/db/schema";

// Sem BETTER_AUTH_SECRET configurado, deriva a chave de um valor que só existe no
// ambiente (a URL do banco), em vez de usar uma chave escrita no código.
// O ideal é configurar BETTER_AUTH_SECRET na Vercel.
function resolveSecret() {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const base = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || "";
  return createHash("sha256").update(`detetiza-os:${base}`).digest("hex");
}

export const auth = betterAuth({
  secret: resolveSecret(),
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "https://dedetiza-os.vercel.app"),
  // Só o endereço de produção (e o local, fora de produção). Sem curinga "*.vercel.app": qualquer pessoa
  // publica um site nesse domínio, e ele passaria a ser aceito como origem confiável do login.
  trustedOrigins: ["https://dedetiza-os.vercel.app", ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://localhost:3100"])],
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
    // "Esqueci minha senha": só existe com SMTP configurado (ver src/lib/email.ts). O link vale 1 hora e todas as sessões caem.
    ...(emailConfigurado()
      ? {
          sendResetPassword: async ({ user, url }: { user: { name: string; email: string }; url: string }) => {
            const { texto, html } = montarEmail({
              titulo: "Redefinir a sua senha",
              linhas: [
                `Olá, ${user.name.split(" ")[0]}.`,
                "Recebemos um pedido para redefinir a senha do seu acesso ao Detetiza OS. O link abaixo vale por 1 hora.",
                "Se não foi você, ignore este e-mail: a sua senha continua a mesma.",
              ],
              botao: { texto: "Criar nova senha", url },
            });
            await enviarEmail({ para: user.email, assunto: "Redefinir senha - Detetiza OS", texto, html });
          },
        }
      : {}),
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    // Quem redefine por e-mail escolheu a própria senha: não precisa mais trocar a provisória.
    onPasswordReset: async ({ user }: { user: { id: string } }) => {
      await db.update(schema.membros).set({ senhaProvisoria: false }).where(eq(schema.membros.userId, user.id)).catch(() => {});
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Cadastro público só vale para o primeiro usuário. Depois disso, qualquer
        // tentativa de criar conta (pela tela ou direto na API) é recusada.
        // Para liberar de novo, defina ALLOW_SIGNUP=true no ambiente.
        before: async (novoUsuario) => {
          if (process.env.ALLOW_SIGNUP === "true") return { data: novoUsuario };
          const existentes = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
          if (existentes.length > 0) {
            throw new APIError("FORBIDDEN", { message: "Cadastro desativado. Peça acesso ao administrador." });
          }
          return { data: novoUsuario };
        },
        // Banco novo: o primeiro usuário cria a empresa e vira administrador dela. Só roda se ainda não
        // existir nenhuma empresa; os demais usuários são vinculados por um administrador.
        after: async (criado) => {
          try {
            const existentes = await db.select({ id: schema.empresas.id }).from(schema.empresas).limit(1);
            if (existentes.length > 0) return;
            const [empresa] = await db.insert(schema.empresas).values({ nome: criado.name }).returning({ id: schema.empresas.id });
            await db.insert(schema.membros).values({ userId: criado.id, empresaId: empresa.id, papel: "admin" });
          } catch (e) {
            // Não derruba o cadastro (ex.: SQL de db/migracoes ainda não rodou). O vínculo pode ser criado depois.
            console.error("Não foi possível criar a empresa do primeiro usuário", e);
          }
        },
      },
    },
  },
});
