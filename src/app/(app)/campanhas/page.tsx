import { db } from "@/db";
import { campanhas, inscricoes, tiposServico, tipoServicoColunas } from "@/db/schema";
import { asc } from "drizzle-orm";
import { CampanhasView } from "./campanhas-view";
import { obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

export default async function CampanhasPage() {
  const ctx = await obterContexto();
  const verFinanceiro = !!ctx && pode(ctx.papel, "financeiro.acessar");
  const [allCamps, allInsc, tipos] = await Promise.all([db.select().from(campanhas), db.select().from(inscricoes), db.select(tipoServicoColunas).from(tiposServico).orderBy(asc(tiposServico.id))]);
  const rows = allCamps.map((c) => {
    const insc = allInsc.filter((i) => i.campanhaId === c.id);
    const receitaPaga = insc.filter((i) => i.pago).reduce((acc, i) => acc + i.valor, 0);
    return { ...c, inscritosCount: insc.length, receitaPaga: verFinanceiro ? receitaPaga : 0 };
  });
  return <CampanhasView campanhasList={rows} tiposList={tipos} verFinanceiro={verFinanceiro} />;
}
