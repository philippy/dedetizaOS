import { db } from "@/db";
import { servicos, clientes, tiposServico, tecnicos, tipoServicoColunas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todaySP } from "@/lib/utils";
import { AgendaView } from "./agenda-view";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {

  const [servicosList, tecnicosList, clientesList, tiposList] = await Promise.all([
    db
      .select({
        id: servicos.id,
        clienteId: servicos.clienteId,
        clienteNome: clientes.nome,
        tipoServicoId: servicos.tipoServicoId,
        tipoNome: tiposServico.nome,
        tecnicoId: servicos.tecnicoId,
        tecnicoNome: tecnicos.nome,
        tecnicoCor: tecnicos.cor,
        dataHora: servicos.dataHora,
        duracaoMin: servicos.duracaoMin,
        valor: servicos.valor,
        status: servicos.status,
        observacoes: servicos.observacoes,
      })
      .from(servicos)
      .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
      .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
      .leftJoin(tecnicos, eq(servicos.tecnicoId, tecnicos.id)),
    db.select().from(tecnicos),
    db.select({ id: clientes.id, nome: clientes.nome, tipo: clientes.tipo }).from(clientes),
    db.select(tipoServicoColunas).from(tiposServico),
  ]);

  return (
    <AgendaView
      initialDate={todaySP()}
      servicosList={servicosList}
      tecnicosList={tecnicosList}
      clientesList={clientesList}
      tiposList={tiposList}
    />
  );
}
