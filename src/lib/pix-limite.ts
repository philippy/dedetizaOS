import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { membros } from "@/db/schema";

// Limite de tentativas de senha ao trocar a chave Pix: 3 erros bloqueiam por 1 hora. A tentativa é
// "reservada" ANTES de conferir a senha, numa única instrução SQL, para que várias tentativas ao mesmo
// tempo não furem o limite (o driver do Neon não tem transação).
export const MAX_FALHAS_PIX = 3;
export const HORAS_BLOQUEIO_PIX = 1;

const agoraUtc = sql`(now() at time zone 'utc')`;

export type TentativaPix = { permitido: true; falhas: number } | { permitido: false; ate: Date };

async function bloqueadoAte(userId: string): Promise<Date> {
  const [m] = await db.select({ ate: membros.pixBloqueadoAte }).from(membros).where(eq(membros.userId, userId)).limit(1);
  return m?.ate ?? new Date(Date.now() + HORAS_BLOQUEIO_PIX * 3600_000);
}

export async function bloquearPix(userId: string) {
  await db
    .update(membros)
    .set({ pixBloqueadoAte: sql`${agoraUtc} + interval '${sql.raw(String(HORAS_BLOQUEIO_PIX))} hour'` })
    .where(and(eq(membros.userId, userId), or(isNull(membros.pixBloqueadoAte), lte(membros.pixBloqueadoAte, agoraUtc))));
}

export async function reservarTentativaPix(userId: string): Promise<TentativaPix> {
  const [r] = await db
    .update(membros)
    .set({
      pixFalhas: sql`CASE WHEN ${membros.pixUltimaFalha} IS NOT NULL AND ${membros.pixUltimaFalha} > ${agoraUtc} - interval '${sql.raw(String(HORAS_BLOQUEIO_PIX))} hour' THEN ${membros.pixFalhas} + 1 ELSE 1 END`,
      pixUltimaFalha: agoraUtc,
      pixBloqueadoAte: null,
    })
    .where(and(eq(membros.userId, userId), or(isNull(membros.pixBloqueadoAte), lte(membros.pixBloqueadoAte, agoraUtc))))
    .returning({ falhas: membros.pixFalhas });

  if (!r) return { permitido: false, ate: await bloqueadoAte(userId) };
  if (r.falhas > MAX_FALHAS_PIX) {
    await bloquearPix(userId);
    return { permitido: false, ate: await bloqueadoAte(userId) };
  }
  return { permitido: true, falhas: r.falhas };
}

// Senha certa (ou desbloqueio por e-mail): zera o contador.
export async function limparTentativasPix(userId: string) {
  await db.update(membros).set({ pixFalhas: 0, pixUltimaFalha: null, pixBloqueadoAte: null }).where(eq(membros.userId, userId));
}

export async function estadoBloqueioPix(userId: string): Promise<Date | null> {
  const [m] = await db
    .select({ ate: membros.pixBloqueadoAte, ativo: sql<boolean>`${membros.pixBloqueadoAte} > ${agoraUtc}` })
    .from(membros)
    .where(eq(membros.userId, userId))
    .limit(1);
  return m?.ativo ? m.ate : null;
}
