import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientes, tiposServico, tecnicos, tipoServicoColunas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { formatDateBR, todaySP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [clientesList, tiposList, tecnicosList] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome, tipo: clientes.tipo }).from(clientes),
    db.select(tipoServicoColunas).from(tiposServico),
    db.select({ id: tecnicos.id, nome: tecnicos.nome, cor: tecnicos.cor }).from(tecnicos).where(eq(tecnicos.ativo, true)),
  ]);

  return (
    <AppShell clientesList={clientesList} tiposList={tiposList} tecnicosList={tecnicosList} todayLabel={formatDateBR(todaySP())}>
      {children}
    </AppShell>
  );
}
