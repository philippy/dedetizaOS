import { db } from "@/db";
import { lancamentos } from "@/db/schema";
import { todaySP } from "@/lib/utils";
import { FinanceiroView } from "./financeiro-view";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const list = await db.select().from(lancamentos);
  return <FinanceiroView today={todaySP()} lancamentosList={list} />;
}
