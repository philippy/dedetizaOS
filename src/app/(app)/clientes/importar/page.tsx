import { eq } from "drizzle-orm";
import { db } from "@/db";
import { empresaIdDe, obterContexto } from "@/lib/contexto";
import { clientes } from "@/db/schema";
import { ImportarView } from "./importar-view";

export const dynamic = "force-dynamic";

export default async function ImportarClientesPage() {
  const eid = empresaIdDe(await obterContexto());
  const existentes = await db.select({ nome: clientes.nome, documento: clientes.documento }).from(clientes).where(eq(clientes.empresaId, eid));
  return <ImportarView existentes={existentes} />;
}
