import { notFound } from "next/navigation";
import { db } from "@/db";
import { campanhas, inscricoes, tiposServico, tipoServicoColunas } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { centsToInput } from "@/lib/utils";
import { CampanhaDetalheView } from "./campanha-detalhe-view";
import { obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

export default async function CampanhaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await obterContexto();
  const verFinanceiro = !!ctx && pode(ctx.papel, "financeiro.acessar");
  const campId = Number(id);
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, campId));
  if (!camp) notFound();

  const [inscritos, tipos] = await Promise.all([
    db.select().from(inscricoes).where(eq(inscricoes.campanhaId, campId)),
    db.select(tipoServicoColunas).from(tiposServico).orderBy(asc(tiposServico.id)),
  ]);
  // Serviços oferecidos: os escolhidos na campanha (vazio = todo o catálogo), já com o
  // desconto da campanha, em centavos.
  const oferecidos = (camp.tiposServicoIds.length ? tipos.filter((t) => camp.tiposServicoIds.includes(t.id)) : tipos).map((t) => ({
    id: t.id,
    nome: t.nome,
    valorReais: centsToInput(Math.round((t.preco * (100 - camp.descontoPct)) / 100)),
    precoCampanha: Math.round((t.preco * (100 - camp.descontoPct)) / 100),
    precoCheio: t.preco,
  }));
  const nomes = Object.fromEntries(tipos.map((t) => [t.id, t.nome]));

  return <CampanhaDetalheView campanha={camp} inscritos={inscritos} oferecidos={oferecidos} nomesTipos={nomes} verFinanceiro={verFinanceiro} />;
}
