// Validação e formatação de documentos e chave Pix. Sem acesso a banco.

export const TIPOS_PIX = ["CNPJ", "CPF", "E-mail", "Celular", "Aleatória"] as const;
export type TipoPix = (typeof TIPOS_PIX)[number];

export function ehTipoPix(valor: unknown): valor is TipoPix {
  return typeof valor === "string" && (TIPOS_PIX as readonly string[]).includes(valor);
}

export function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}

// ---- CPF ----
export function cpfValido(entrada: string): boolean {
  const d = soDigitos(entrada);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[t])) return false;
  }
  return true;
}

export function formatarCpf(entrada: string): string {
  const d = soDigitos(entrada);
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

// ---- CNPJ ----
// Aceita o CNPJ numérico de sempre e o alfanumérico (a Receita passa a emitir a partir de julho de 2026:
// 12 primeiras posições com letras e números, 2 dígitos verificadores numéricos). No cálculo, cada
// caractere vale o código ASCII menos 48 (0-9 valem 0-9; A=17, B=18...), com os mesmos pesos de sempre.
// Regra conferida com o exemplo 12.ABC.345/01DE-35 (dígitos 35) publicado sobre o novo formato.
export function limparCnpj(entrada: string): string {
  return entrada.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function dvCnpj(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += (base.charCodeAt(i) - 48) * pesos[i];
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(entrada: string): boolean {
  const c = limparCnpj(entrada);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)) return false;
  if (/^(.)\1{13}$/.test(c)) return false; // 00.000.000/0000-00 e semelhantes
  const d1 = dvCnpj(c.slice(0, 12));
  const d2 = dvCnpj(c.slice(0, 12) + d1);
  return c.slice(12) === `${d1}${d2}`;
}

export function formatarCnpj(entrada: string): string {
  const c = limparCnpj(entrada);
  return c.replace(/^([0-9A-Z]{2})([0-9A-Z]{3})([0-9A-Z]{3})([0-9A-Z]{4})([0-9]{2})$/, "$1.$2.$3/$4-$5");
}

// ---- Telefone ----
// Telefone brasileiro com DDD (10 ou 11 dígitos), com ou sem o 55 na frente. Devolve só os dígitos
// com DDD, ou null se não for válido.
export function telefoneBR(entrada: string): string | null {
  let d = soDigitos(entrada).replace(/^0+/, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d.length === 11 && d[2] !== "9") return null; // celular tem 9 na frente
  return d;
}

export function formatarTelefone(entrada: string): string {
  const d = telefoneBR(entrada);
  if (!d) return entrada.trim();
  return d.length === 11 ? d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
}

export function emailValido(entrada: string): boolean {
  const e = entrada.trim();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

// ---- Chave Pix ----
// Confere a chave pelo tipo e devolve a forma que vai na mensagem de cobrança.
export function normalizarChavePix(tipo: TipoPix, valor: string): { ok: true; chave: string } | { ok: false; erro: string } {
  const v = valor.trim();
  switch (tipo) {
    case "CNPJ":
      return cnpjValido(v) ? { ok: true, chave: formatarCnpj(v) } : { ok: false, erro: "O CNPJ da chave Pix não é válido. Confira os números." };
    case "CPF":
      return cpfValido(v) ? { ok: true, chave: formatarCpf(v) } : { ok: false, erro: "O CPF da chave Pix não é válido. Confira os números." };
    case "E-mail":
      return emailValido(v) ? { ok: true, chave: v.toLowerCase() } : { ok: false, erro: "O e-mail da chave Pix não é válido." };
    case "Celular": {
      const d = telefoneBR(v);
      if (!d || d.length !== 11) return { ok: false, erro: "O celular da chave Pix precisa ter DDD e 9 dígitos." };
      return { ok: true, chave: `+55${d}` };
    }
    case "Aleatória": {
      const u = v.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u)
        ? { ok: true, chave: u }
        : { ok: false, erro: "A chave aleatória tem 32 letras e números separados por hífen (ex.: 123e4567-e89b-12d3-a456-426614174000)." };
    }
  }
}

// ---- Senha provisória ----
// Sem 0/O, 1/l/I, para não confundir ao repassar a senha por mensagem.
const ALFABETO_SENHA = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Ex.: "Xk7m-Qp4w-Tn9c". Usa o gerador criptográfico do Node (só no servidor).
export function gerarSenhaProvisoria(sorteio: (max: number) => number): string {
  const grupo = () => Array.from({ length: 4 }, () => ALFABETO_SENHA[sorteio(ALFABETO_SENHA.length)]).join("");
  return `${grupo()}-${grupo()}-${grupo()}`;
}
