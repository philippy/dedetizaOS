import { db } from "@/db";
import { clientes } from "@/db/schema";
import { ImportarView } from "./importar-view";

export const dynamic = "force-dynamic";

export default async function ImportarClientesPage() {
  const existentes = await db.select({ nome: clientes.nome, documento: clientes.documento }).from(clientes);
  return <ImportarView existentes={existentes} />;
}
