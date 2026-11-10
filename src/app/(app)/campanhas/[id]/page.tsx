import { notFound } from "next/navigation";
import { db } from "@/db";
import { campanhas, inscricoes, tiposServico } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { centsToInput } from "@/lib/utils";
import { CampanhaDetalheView } from "./campanha-detalhe-view";

export const dynamic = "force-dynamic";

export default async function CampanhaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campId = Number(id);
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, campId));
  if (!camp) notFound();

  const [inscritos, tipos] = await Promise.all([
    db.select().from(inscricoes).where(eq(inscricoes.campanhaId, campId)),
    db.select().from(tiposServico).orderBy(asc(tiposServico.id)),
  ]);
  // A campanha não guarda o tipo de serviço: usa "Baratas e formigas" (o mais comum
  // em condomínio) ou o primeiro do catálogo, com o desconto da campanha, em centavos.
  const base = tipos.find((t) => t.nome === "Baratas e formigas") ?? tipos[0];
  const precoBase = base?.preco ?? 24000;
  const valorComDesconto = Math.round((precoBase * (100 - camp.descontoPct)) / 100);

  return <CampanhaDetalheView campanha={camp} inscritos={inscritos} valorSugeridoReais={centsToInput(valorComDesconto)} />;
}
