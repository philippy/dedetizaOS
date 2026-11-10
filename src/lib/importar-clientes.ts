// Leitura e limpeza de uma planilha de clientes colada do Excel (ou lida de um CSV).
// Tudo roda no navegador, sem biblioteca: copiar no Excel gera texto separado por tab.
// A planilha real é bagunçada (telefone em vários formatos, CPF e CNPJ na mesma coluna,
// e-mail digitado na coluna errada), então cada linha volta com avisos em vez de falhar.

export type LinhaImportada = {
  linha: number; // posição na planilha (1 = primeira linha de dados)
  nome: string;
  tipo: "PF" | "PJ";
  tipoAssumido: boolean; // PF/PJ adivinhado pelo nome, sem CPF/CNPJ válido
  documento: string;
  whatsapp: string;
  email: string;
  endereco: string;
  observacoes: string;
  avisos: string[];
  erros: string[];
  duplicado: null | { onde: "banco" | "planilha"; de: string };
};

export type ResultadoLeitura = {
  linhas: LinhaImportada[];
  colunas: { titulo: string; campo: string }[]; // como cada coluna foi entendida
  temCabecalho: boolean;
};

export type ClienteExistente = { nome: string; documento: string | null };

type Campo = "nome" | "telefone" | "documento" | "endereco" | "numero" | "bairro" | "cidade" | "email" | "observacoes" | "extra";

const ROTULO_CAMPO: Record<Campo, string> = {
  nome: "Nome",
  telefone: "WhatsApp",
  documento: "CPF/CNPJ",
  endereco: "Endereço",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  email: "E-mail",
  observacoes: "Observações",
  extra: "Observações (coluna extra)",
};

const ALIASES: Record<Exclude<Campo, "extra">, string[]> = {
  nome: ["cliente", "nome", "nomecliente", "razaosocial", "empresa", "nomefantasia"],
  telefone: ["telefone", "tel", "fone", "celular", "whatsapp", "whats", "contato"],
  documento: ["cpfcnpj", "cnpjcpf", "cpf", "cnpj", "documento", "doc"],
  endereco: ["endereco", "logradouro", "rua"],
  numero: ["n", "no", "num", "numero", "nro"],
  bairro: ["bairro"],
  cidade: ["cidade", "municipio"],
  email: ["email", "emails", "correioeletronico"],
  observacoes: ["obs", "observacao", "observacoes", "anotacoes"],
};

// Ordem das colunas quando a planilha vem sem linha de títulos.
const ORDEM_PADRAO: Campo[] = ["nome", "telefone", "documento", "endereco", "numero", "bairro"];

const RE_EMAIL = /[^\s@;,<>()]+@[^\s@;,<>()]+\.[a-z]{2,}/i;

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function chave(s: string): string {
  return semAcento(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function limpar(s: string): string {
  return s.replace(/[ ​]/g, " ").replace(/\s+/g, " ").trim();
}

export function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

// --- Texto separado por tab / ; / , (aceita aspas) ---
function detectarSeparador(texto: string): string {
  const amostra = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 6).join("\n");
  const tabs = (amostra.match(/\t/g) || []).length;
  if (tabs > 0) return "\t";
  const pv = (amostra.match(/;/g) || []).length;
  const vg = (amostra.match(/,/g) || []).length;
  return pv >= vg && pv > 0 ? ";" : vg > 0 ? "," : "\t";
}

export function lerDelimitado(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let cel = "";
  let aspas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { cel += '"'; i++; }
      else if (c === '"') aspas = false;
      else cel += c;
    } else if (c === '"' && cel === "") {
      aspas = true;
    } else if (c === sep) {
      linha.push(cel); cel = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(cel); cel = "";
      linhas.push(linha); linha = [];
    } else {
      cel += c;
    }
  }
  if (cel !== "" || linha.length) { linha.push(cel); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => limpar(c) !== ""));
}

// --- CPF / CNPJ ---
export function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export function formatarCPF(d: string): string {
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
export function formatarCNPJ(d: string): string {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function tratarDocumento(bruto: string): { documento: string; tipo: "PF" | "PJ" | null; avisos: string[] } {
  const avisos: string[] = [];
  let d = soDigitos(bruto);
  if (!d) return { documento: "", tipo: null, avisos };
  // O Excel come o zero à esquerda: aceita 10 dígitos (CPF) ou 13 (CNPJ) se completar bate com o dígito verificador.
  if (d.length === 10 && cpfValido("0" + d)) { d = "0" + d; avisos.push("CPF sem o zero inicial: completei."); }
  if (d.length === 13 && cnpjValido("0" + d)) { d = "0" + d; avisos.push("CNPJ sem o zero inicial: completei."); }
  if (d.length === 11) {
    if (!cpfValido(d)) avisos.push("CPF com dígito verificador inválido: confira.");
    return { documento: formatarCPF(d), tipo: "PF", avisos };
  }
  if (d.length === 14) {
    if (!cnpjValido(d)) avisos.push("CNPJ com dígito verificador inválido: confira.");
    return { documento: formatarCNPJ(d), tipo: "PJ", avisos };
  }
  avisos.push(`Documento com ${d.length} dígitos (esperado 11 ou 14): mantido como veio.`);
  return { documento: bruto.trim().replace(/[,;.\s]+$/, ""), tipo: null, avisos };
}

// --- Telefone ---
function formatarUmTelefone(bruto: string): { texto: string; avisos: string[] } {
  const avisos: string[] = [];
  let d = soDigitos(bruto);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if ((d.length === 11 || d.length === 12) && d.startsWith("0")) d = d.slice(1);
  if (d.length === 11) {
    if (d[2] !== "9") avisos.push("Telefone com 11 dígitos sem o 9 do celular: confira.");
    return { texto: `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`, avisos };
  }
  if (d.length === 10) {
    if (/[2-5]/.test(d[2])) avisos.push("Parece telefone fixo: confirme se tem WhatsApp.");
    return { texto: `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`, avisos };
  }
  if (d.length === 9) {
    avisos.push("Telefone sem DDD.");
    return { texto: `${d.slice(0, 5)}-${d.slice(5)}`, avisos };
  }
  if (d.length === 8) {
    avisos.push("Telefone sem DDD.");
    return { texto: `${d.slice(0, 4)}-${d.slice(4)}`, avisos };
  }
  avisos.push("Telefone fora do padrão: mantido como veio.");
  return { texto: limpar(bruto), avisos };
}

function tratarTelefone(bruto: string): { whatsapp: string; outros: string[]; avisos: string[] } {
  const texto = limpar(bruto);
  if (!texto) return { whatsapp: "", outros: [], avisos: ["Sem telefone."] };
  const partes = texto.split(/\s*(?:\/|;|\be\b|\bou\b|\|)\s*/i).map(limpar).filter((p) => soDigitos(p).length >= 8);
  if (partes.length === 0) return { whatsapp: texto, outros: [], avisos: ["Telefone fora do padrão: mantido como veio."] };
  const { texto: principal, avisos } = formatarUmTelefone(partes[0]);
  const outros = partes.slice(1).map((p) => formatarUmTelefone(p).texto);
  if (outros.length) avisos.push("Havia mais de um número: o primeiro ficou como WhatsApp e os outros foram para as observações.");
  return { whatsapp: principal, outros, avisos };
}

// --- Tipo PF/PJ pelo nome, quando não há documento válido ---
const RE_EMPRESA =
  /\b(ltda|me|epp|eireli|mei|s\/?a|cia|comercio|comer|industria|indus|clinica|odonto|odontologia|consultorio|laboratorio|restaurante|padaria|mercado|mercadinho|supermercado|escola|colegio|condominio|associacao|instituto|academia|hotel|pousada|loja|auto|oficina|farmacia|drogaria|empresa|transportes?|construtora|imobiliaria|distribuidora|salao|studio|estudio|centro|casa de|bar|lanchonete|igreja|hospital|posto)\b/;

function pareceEmpresa(nome: string): boolean {
  return RE_EMPRESA.test(semAcento(nome).toLowerCase());
}

function montarEndereco(rua: string, numero: string, bairro: string, cidade: string): string {
  let r = limpar(rua).replace(/[,;\s]+$/, "");
  const n = limpar(numero);
  if (n && !new RegExp(`(^|[^\\d])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`).test(r)) r = r ? `${r}, ${n}` : n;
  return [r, limpar(bairro), limpar(cidade)].filter(Boolean).join(" · ");
}

function entenderColunas(cabecalho: string[]): Campo[] {
  const usados = new Set<Campo>();
  return cabecalho.map((titulo) => {
    const k = chave(titulo);
    for (const [campo, nomes] of Object.entries(ALIASES) as [Exclude<Campo, "extra">, string[]][]) {
      if (nomes.includes(k) && (!usados.has(campo) || campo === "observacoes")) {
        usados.add(campo);
        return campo;
      }
    }
    return "extra" as Campo;
  });
}

export function lerPlanilha(texto: string): ResultadoLeitura {
  const t = texto.trim();
  if (!t) return { linhas: [], colunas: [], temCabecalho: false };
  const tabela = lerDelimitado(t, detectarSeparador(t));
  if (tabela.length === 0) return { linhas: [], colunas: [], temCabecalho: false };

  const primeira = tabela[0];
  const mapeado = entenderColunas(primeira);
  const reconhecidas = mapeado.filter((c) => c !== "extra").length;
  const temCabecalho = reconhecidas >= 2 && mapeado.includes("nome");

  let campos: Campo[];
  let titulos: string[];
  let dados: string[][];
  if (temCabecalho) {
    campos = mapeado;
    titulos = primeira.map(limpar);
    dados = tabela.slice(1);
  } else {
    const largura = Math.max(...tabela.map((l) => l.length));
    campos = Array.from({ length: largura }, (_, i) => ORDEM_PADRAO[i] ?? "extra");
    titulos = campos.map((c, i) => (c === "extra" ? `Coluna ${i + 1}` : ROTULO_CAMPO[c]));
    dados = tabela;
  }
  const colunas = campos.map((campo, i) => ({ titulo: titulos[i] || `Coluna ${i + 1}`, campo: ROTULO_CAMPO[campo] }));

  const linhas: LinhaImportada[] = [];
  dados.forEach((cels, idx) => {
    const por = (campo: Campo) => cels.map((c, i) => (campos[i] === campo ? limpar(c ?? "") : "")).filter(Boolean).join(" ");
    const avisos: string[] = [];
    const erros: string[] = [];

    const nome = por("nome");
    if (!nome) {
      // Linha sem nome: se também não tem mais nada, é lixo (linha de filtro, total); ignora em silêncio.
      if (cels.every((c) => !limpar(c ?? ""))) return;
      erros.push("Sem nome do cliente.");
    } else if (nome.length < 2) {
      erros.push("Nome muito curto.");
    }

    // E-mail: o campo certo ou qualquer célula da linha que tenha cara de e-mail.
    let email = "";
    const colunasComEmail: string[] = [];
    cels.forEach((c, i) => {
      const m = limpar(c ?? "").match(RE_EMAIL);
      if (m) {
        if (!email) email = m[0].replace(/[.,;]+$/, "");
        if (campos[i] !== "email") colunasComEmail.push(titulos[i] || `coluna ${i + 1}`);
      }
    });
    if (colunasComEmail.length) avisos.push(`E-mail estava na coluna "${colunasComEmail[0]}": movi para o campo e-mail.`);
    const semEmail = (v: string) => (RE_EMAIL.test(v) ? limpar(v.replace(RE_EMAIL, "")) : v);

    const doc = tratarDocumento(por("documento"));
    avisos.push(...doc.avisos);
    const tel = tratarTelefone(por("telefone") || "");
    avisos.push(...tel.avisos);

    let tipo: "PF" | "PJ" = "PF";
    let tipoAssumido = false;
    if (doc.tipo) tipo = doc.tipo;
    else if (erros.length === 0) {
      tipoAssumido = true;
      tipo = pareceEmpresa(nome) ? "PJ" : "PF";
      avisos.push(`Sem CPF/CNPJ válido: assumi ${tipo === "PJ" ? "empresa (PJ)" : "pessoa física (PF)"} pelo nome. Confira.`);
    }

    const endereco = montarEndereco(semEmail(por("endereco")), por("numero"), semEmail(por("bairro")), semEmail(por("cidade")));

    const extras: string[] = [];
    const obs = por("observacoes");
    if (obs) extras.push(obs);
    cels.forEach((c, i) => {
      if (campos[i] === "extra" && limpar(c ?? "")) extras.push(`${titulos[i]}: ${limpar(c)}`);
    });
    if (tel.outros.length) extras.push(`Outros telefones: ${tel.outros.join(", ")}`);

    linhas.push({
      linha: idx + 1,
      nome,
      tipo,
      tipoAssumido,
      documento: doc.documento,
      whatsapp: tel.whatsapp,
      email,
      endereco,
      observacoes: extras.join(" · "),
      avisos,
      erros,
      duplicado: null,
    });
  });

  return { linhas, colunas, temCabecalho };
}

function chaveNome(nome: string): string {
  return chave(nome);
}

// Marca quem já existe no sistema e quem aparece duas vezes na própria planilha.
export function marcarDuplicados(linhas: LinhaImportada[], existentes: ClienteExistente[]): LinhaImportada[] {
  const docsBanco = new Map<string, string>();
  const nomesBanco = new Map<string, string>();
  for (const e of existentes) {
    const d = soDigitos(e.documento ?? "");
    if (d) docsBanco.set(d, e.nome);
    nomesBanco.set(chaveNome(e.nome), e.nome);
  }
  const vistosDoc = new Map<string, string>();
  const vistosNome = new Map<string, string>();
  return linhas.map((l) => {
    const d = soDigitos(l.documento);
    let dup: LinhaImportada["duplicado"] = null;
    if (d.length >= 11) {
      if (docsBanco.has(d)) dup = { onde: "banco", de: docsBanco.get(d)! };
      else if (vistosDoc.has(d)) dup = { onde: "planilha", de: vistosDoc.get(d)! };
      else vistosDoc.set(d, l.nome);
    } else if (l.nome) {
      const k = chaveNome(l.nome);
      if (nomesBanco.has(k)) dup = { onde: "banco", de: nomesBanco.get(k)! };
      else if (vistosNome.has(k)) dup = { onde: "planilha", de: vistosNome.get(k)! };
      else vistosNome.set(k, l.nome);
    }
    return { ...l, duplicado: dup };
  });
}

// Texto de planilha salvo como CSV no Excel brasileiro costuma vir em Windows-1252.
export function decodificarArquivo(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}
