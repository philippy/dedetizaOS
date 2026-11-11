import { db } from "@/db";
import { campanhas, inscricoes, tiposServico, tipoServicoColunas } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { CampanhasView } from "./campanhas-view";
import { empresaIdDe, obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const ctx = await obterContexto();
  const verFinanceiro = !!ctx && pode(ctx.papel, "financeiro.acessar");
  const eid = empresaIdDe(ctx);
  const [allCamps, allInsc, tipos] = await Promise.all([db.select().from(campanhas).where(eq(campanhas.empresaId, eid)), db.select().from(inscricoes).where(eq(inscricoes.empresaId, eid)), db.select(tipoServicoColunas).from(tiposServico).where(eq(tiposServico.empresaId, eid)).orderBy(asc(tiposServico.id))]);
  const rows = allCamps.map((c) => {
    const insc = allInsc.filter((i) => i.campanhaId === c.id);
    const receitaPaga = insc.filter((i) => i.pago).reduce((acc, i) => acc + i.valor, 0);
    return { ...c, inscritosCount: insc.length, receitaPaga: verFinanceiro ? receitaPaga : 0 };
  });
  return <CampanhasView campanhasList={rows} tiposList={tipos} verFinanceiro={verFinanceiro} />;
}
