import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export class NaoAutorizadoError extends Error {
  constructor() {
    super("Sessão expirada. Entre novamente.");
    this.name = "NaoAutorizadoError";
  }
}

// Toda Server Action é um endpoint público. Chame isto na primeira linha de cada
// ação que lê ou grava dados.
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new NaoAutorizadoError();
  return session;
}
