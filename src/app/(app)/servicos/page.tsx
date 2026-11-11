import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { empresaIdDe, obterContexto } from "@/lib/contexto";
import { todaySP } from "@/lib/utils";
import { ServicosView } from "./servicos-view";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const eid = empresaIdDe(await obterContexto());
  const [servicosList, tiposList, tecnicosList] = await Promise.all([
    db.select({ id: servicos.id, clienteNome: clientes.nome, tipoNome: tiposServico.nome, tecnicoId: servicos.tecnicoId, tecnicoNome: tecnicos.nome, dataHora: servicos.dataHora, duracaoMin: servicos.duracaoMin, valor: servicos.valor, status: servicos.status })
      .from(servicos).innerJoin(clientes, eq(servicos.clienteId, clientes.id)).innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id)).leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id)).where(eq(servicos.empresaId, eid)),
    db.select().from(tiposServico).where(eq(tiposServico.empresaId, eid)),
    db.select().from(tecnicos).where(eq(tecnicos.empresaId, eid)),
  ]);
  return <ServicosView servicosList={servicosList} tiposList={tiposList} tecnicosList={tecnicosList} today={todaySP()} />;
}
