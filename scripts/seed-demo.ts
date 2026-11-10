// Carrega o conjunto de demonstração (src/lib/demo-data.ts). Só para banco de teste.
//   npm run seed:demo            -> só roda se o banco estiver vazio
//   npm run seed:demo -- --reset -> APAGA os dados de negócio e recarrega
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { tecnicos } from "../src/db/schema";
import { sqlRecriarDemo } from "../src/lib/demo-data";
import { todaySP } from "../src/lib/utils";

async function main() {
  const reset = process.argv.includes("--reset");
  const existentes = await db.select({ id: tecnicos.id }).from(tecnicos).limit(1);
  if (existentes.length > 0 && !reset) {
    console.log("O banco já tem dados. Nada foi inserido. Use --reset para apagar e recarregar.");
    return;
  }
  await db.execute(sql.raw(sqlRecriarDemo(todaySP())));
  console.log("Dados de demonstração carregados.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
