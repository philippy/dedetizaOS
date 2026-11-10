import { notFound } from "next/navigation";
import { db } from "@/db";
import { campanhas, inscricoes, tiposServico } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CampanhaDetalheView } from "./campanha-detalhe-view";

export const dynamic = "force-dynamic";

export default async function CampanhaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campId = Number(id);
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, campId));
  if (!camp) notFound();

  const [inscritos, tipos] = await Promise.all([
    db.select().from(inscricoes).where(eq(inscricoes.campanhaId, campId)),
    db.select().from(tiposServico),
  ]);
  const precoBase = tipos[0]?.preco || 24000;
  const valorComDesconto = Math.round((precoBase / 100) * (1 - camp.descontoPct / 100));

  return <CampanhaDetalheView campanha={camp} inscritos={inscritos} valorSugeridoReais={String(valorComDesconto)} />;
}
