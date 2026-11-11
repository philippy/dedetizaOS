import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/contexto";
import { ROTULO_PAPEL, pode } from "@/lib/permissoes";
import { db } from "@/db";
import { clientes, tiposServico, tecnicos, tipoServicoColunas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { formatDateBR, todaySP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await obterContexto();
  return { title: ctx?.empresa ? `Detetiza OS — ${ctx.empresa.nome}` : "Detetiza OS" };
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");

  const [clientesList, tiposList, tecnicosList] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome, tipo: clientes.tipo }).from(clientes),
    db.select(tipoServicoColunas).from(tiposServico),
    db.select({ id: tecnicos.id, nome: tecnicos.nome, cor: tecnicos.cor }).from(tecnicos).where(eq(tecnicos.ativo, true)),
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
      {children}
    </AppShell>
  );
}
