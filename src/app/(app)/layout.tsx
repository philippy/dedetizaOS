import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { empresaIdDe, obterContexto } from "@/lib/contexto";
import { ROTULO_PAPEL, pode } from "@/lib/permissoes";
import { db } from "@/db";
import { clientes, tiposServico, tecnicos, tipoServicoColunas } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ModalAcessivel } from "@/components/modal-acessivel";
import { TrocaSenhaObrigatoria } from "@/components/troca-senha-obrigatoria";
import { formatDateBR, todaySP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await obterContexto();
  return { title: ctx?.empresa ? `Detetiza OS — ${ctx.empresa.nome}` : "Detetiza OS" };
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");
  // Conta criada pelo administrador: nada do sistema aparece antes de trocar a senha provisória.
  if (ctx.senhaProvisoria) return <TrocaSenhaObrigatoria nome={ctx.nome} empresaNome={ctx.empresa?.nome ?? "Detetiza OS"} />;

  const eid = empresaIdDe(ctx);
  const [clientesList, tiposList, tecnicosList] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome, tipo: clientes.tipo }).from(clientes).where(eq(clientes.empresaId, eid)),
    db.select(tipoServicoColunas).from(tiposServico).where(eq(tiposServico.empresaId, eid)),
    db.select({ id: tecnicos.id, nome: tecnicos.nome, cor: tecnicos.cor }).from(tecnicos).where(and(eq(tecnicos.empresaId, eid), eq(tecnicos.ativo, true))),
  ]);

  return (
    <AppShell
      clientesList={clientesList}
      tiposList={tiposList}
      tecnicosList={tecnicosList}
      todayLabel={formatDateBR(todaySP())}
      empresaNome={ctx.empresa?.nome ?? "Detetiza OS"}
      verFinanceiro={pode(ctx.papel, "financeiro.acessar")}
      usuario={{ nome: ctx.nome, email: ctx.email, rotuloPapel: ROTULO_PAPEL[ctx.papel] }}
    >
      <ModalAcessivel />
      {children}
    </AppShell>
  );
}
