import type { PixConfig } from "./cobranca";

// A chave Pix que vai na mensagem de cobrança vem das variáveis de ambiente da Vercel
// (PIX_CHAVE, PIX_TIPO, PIX_FAVORECIDO). Sem PIX_CHAVE a cobrança avisa e não deixa enviar.
// Só chame isto em Server Components: as variáveis não existem no navegador.
export function lerPixConfig(): PixConfig | null {
  const chave = process.env.PIX_CHAVE?.trim();
  if (!chave) return null;
  return {
    chave,
    tipo: process.env.PIX_TIPO?.trim() || "Pix",
    favorecido: process.env.PIX_FAVORECIDO?.trim() || "Dedetizadora Impacto",
  };
}
