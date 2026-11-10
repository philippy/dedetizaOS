// Reduz a foto escolhida no navegador antes de enviar: lado maior de até 640 px, JPEG.
// Fica em torno de 30 a 80 KB, o bastante para o cartão do serviço, e vai direto no banco.
export const IMAGEM_LADO_MAX = 640;

export async function reduzirImagem(arquivo: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error("Use uma foto JPG, PNG ou WebP.");
  if (arquivo.size > 15 * 1024 * 1024) throw new Error("A foto é grande demais (máximo 15 MB).");
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, IMAGEM_LADO_MAX / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível ler a foto neste navegador.");
  ctx.fillStyle = "#FFFFFF"; // PNG com fundo transparente vira branco no JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
