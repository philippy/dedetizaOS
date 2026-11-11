import { cache } from "react";
import { headers } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { empresas, membros } from "@/db/schema";
import { pode, type Acao, type Papel } from "@/lib/permissoes";
import type { PixConfig } from "@/lib/cobranca";

export type Empresa = typeof empresas.$inferSelect;

// Quem está logado, em qual empresa e com qual papel. Só no servidor.
export type Contexto = {
  userId: string;
  nome: string;
  email: string;
  papel: Papel;
  telefone: string;
  senhaProvisoria: boolean;
  empresa: Empresa | null;
  // false quando a pessoa ainda não tem vínculo na tabela membros (usa a primeira empresa, só leitura).
  temVinculo: boolean;
};

// Tabela ainda não criada no banco (SQL de db/migracoes ainda não rodou): o app continua de pé.
function tabelaAusente(e: unknown) {
  const x = e as { code?: string; message?: string; cause?: { code?: string } } | null;
  return x?.code === "42P01" || x?.cause?.code === "42P01" || /relation "(empresas|membros)" does not exist/.test(x?.message ?? "");
}

// Uma consulta por requisição, mesmo chamada em vários lugares da mesma página.
export const obterContexto = cache(async (): Promise<Contexto | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const base = { userId: session.user.id, nome: session.user.name, email: session.user.email };

  try {
    const [vinculo] = await db
      .select({ papel: membros.papel, telefone: membros.telefone, senhaProvisoria: membros.senhaProvisoria, empresa: empresas })
      .from(membros)
      .innerJoin(empresas, eq(membros.empresaId, empresas.id))
      .where(eq(membros.userId, session.user.id))
      .limit(1);
    if (vinculo) return { ...base, papel: vinculo.papel, telefone: vinculo.telefone, senhaProvisoria: vinculo.senhaProvisoria, empresa: vinculo.empresa, temVinculo: true };

    // Sem vínculo: papel normal e a primeira empresa, só para leitura. Nada é gravado ao abrir a página.
    const [primeira] = await db.select().from(empresas).orderBy(asc(empresas.id)).limit(1);
    return { ...base, papel: "normal", telefone: "", senhaProvisoria: false, empresa: primeira ?? null, temVinculo: false };
  } catch (e) {
    if (!tabelaAusente(e)) throw e;
    return { ...base, papel: "normal", telefone: "", senhaProvisoria: false, empresa: null, temVinculo: false };
  }
});

// Para Server Actions: confere o papel no servidor. Nunca confie em empresa_id nem em papel vindos do navegador.
export async function autorizar(acao: Acao): Promise<{ ctx: Contexto & { empresa: Empresa } } | { erro: string }> {
  const ctx = await obterContexto();
  if (!ctx) return { erro: "Sessão expirada. Entre novamente." };
  if (!pode(ctx.papel, acao) || !ctx.temVinculo || !ctx.empresa) return { erro: "Você não tem permissão para fazer isso." };
  return { ctx: { ...ctx, empresa: ctx.empresa } };
}

// Chave Pix da mensagem de cobrança. Vem dos dados da empresa. As variáveis PIX_* da Vercel só valem como
// plano B de transição: quando a empresa não existe ou a chave nunca foi configurada na tela. Se alguém
// apagar a chave na tela, a cobrança fica sem chave (e avisa), em vez de voltar para a variável antiga.
export function pixDaEmpresa(empresa: Empresa | null): PixConfig | null {
  if (empresa) {
    const chave = empresa.pixChave.trim();
    if (chave) return { chave, tipo: empresa.pixTipo || "Pix", favorecido: empresa.pixFavorecido.trim() || empresa.nome };
    if (empresa.pixAtualizadoEm) return null;
  }
  return pixDasVariaveis();
}

function pixDasVariaveis(): PixConfig | null {
  const chave = process.env.PIX_CHAVE?.trim();
  if (!chave) return null;
  return {
    chave,
    tipo: process.env.PIX_TIPO?.trim() || "Pix",
    favorecido: process.env.PIX_FAVORECIDO?.trim() || "Dedetizadora Impacto",
  };
}
