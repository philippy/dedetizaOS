// Conjunto de dados de demonstração da Dedetizadora Impacto.
// Datas relativas a "hoje" (America/Sao_Paulo): cobre o mês anterior, o atual e o
// próximo, para Início, Agenda, Financeiro e Campanhas terem o que mostrar.
// Segue as regras do sistema: serviço concluído gera conta a receber (PF vence no
// dia, PJ em 30 dias); cada inscrição de campanha gera uma conta a receber.
// Nomes, telefones e documentos são fictícios.

import { addDaysISO, monthRangeISO } from "./utils";

type Tec = { id: number; nome: string; telefone: string; cor: string; ativo: boolean };
type Tipo = { id: number; nome: string; preco: number; duracaoMin: number };
type Cli = { id: number; tipo: "PF" | "PJ"; nome: string; documento: string; whatsapp: string; email: string; endereco: string; observacoes: string };
type Svc = { id: number; clienteId: number; tipoServicoId: number; tecnicoId: number; dataHora: string; duracaoMin: number; valor: number; status: "agendado" | "concluido" | "cancelado"; observacoes: string };
type Camp = { id: number; nome: string; local: string; dataInicio: string; dataFim: string; descontoPct: number; unidades: number; tiposServicoIds: number[]; status: "agendada" | "finalizada" | "cancelada" };
type Insc = { id: number; campanhaId: number; tipoServicoId: number; unidade: string; morador: string; telefone: string; valor: number; pago: boolean };
type Lanc = { tipo: "receber" | "pagar"; descricao: string; clienteId: number | null; fornecedor: string | null; servicoId: number | null; inscricaoId: number | null; vencimento: string; valor: number; status: "aberto" | "pago"; pagoEm: string | null };

const TECNICOS: Tec[] = [
  { id: 1, nome: "Marcos", telefone: "(11) 98888-0001", cor: "#2F5FE0", ativo: true },
  { id: 2, nome: "Ana", telefone: "(11) 98888-0002", cor: "#0E7C66", ativo: true },
  { id: 3, nome: "Paulo", telefone: "(11) 98888-0003", cor: "#B4531A", ativo: true },
  { id: 4, nome: "Jorge", telefone: "(11) 98888-0004", cor: "#6B7280", ativo: false },
];

const TIPOS: Tipo[] = [
  { id: 1, nome: "Baratas e formigas", preco: 24000, duracaoMin: 60 },
  { id: 2, nome: "Roedores", preco: 32000, duracaoMin: 90 },
  { id: 3, nome: "Cupins", preco: 48000, duracaoMin: 180 },
  { id: 4, nome: "Pulgas e carrapatos", preco: 26000, duracaoMin: 60 },
  { id: 5, nome: "Monitoramento mensal", preco: 15000, duracaoMin: 30 },
  { id: 6, nome: "Limpeza de caixa d'água", preco: 38000, duracaoMin: 120 },
];

const CLIENTES: Cli[] = [
  { id: 1, tipo: "PJ", nome: "Padaria Sol Ltda", documento: "00.000.001/0001-91", whatsapp: "(11) 90000-1201", email: "contato@padariasol.exemplo", endereco: "Av. das Flores, 210 · Centro", observacoes: "Atender antes das 6h ou depois das 14h. Falar com Sr. Antônio." },
  { id: 2, tipo: "PJ", nome: "Mercado Bom Preço", documento: "00.000.002/0001-72", whatsapp: "(11) 90000-1202", email: "adm@bompreco.exemplo", endereco: "Rua do Comércio, 850 · Vila Nova", observacoes: "Contrato de monitoramento mensal de roedores no depósito." },
  { id: 3, tipo: "PJ", nome: "Clínica Vida Saúde", documento: "00.000.003/0001-53", whatsapp: "(11) 90000-1203", email: "financeiro@clinicavida.exemplo", endereco: "Av. Brasil, 1420 · Sala 3", observacoes: "Exige certificado de execução para a vigilância sanitária." },
  { id: 4, tipo: "PJ", nome: "Restaurante Sabor & Cia", documento: "00.000.004/0001-34", whatsapp: "(11) 90000-1204", email: "gerencia@saborecia.exemplo", endereco: "Rua XV de Novembro, 77 · Centro", observacoes: "Cozinha fechada às segundas: preferir esse dia." },
  { id: 5, tipo: "PJ", nome: "Academia Fit Center", documento: "00.000.005/0001-15", whatsapp: "(11) 90000-1205", email: "contato@fitcenter.exemplo", endereco: "Av. Paulista, 2000 · Loja 4", observacoes: "" },
  { id: 6, tipo: "PJ", nome: "Escola Pequeno Saber", documento: "00.000.006/0001-04", whatsapp: "(11) 90000-1206", email: "secretaria@pequenosaber.exemplo", endereco: "Rua das Acácias, 300 · Jardim América", observacoes: "Só aos sábados, sem alunos no prédio." },
  { id: 7, tipo: "PF", nome: "Marina Souza", documento: "000.000.001-91", whatsapp: "(11) 90000-2201", email: "marina@email.exemplo", endereco: "Rua Silva, 45 · Jardim América", observacoes: "Tem cachorro: usar gel em vez de pulverização." },
  { id: 8, tipo: "PF", nome: "Carlos Eduardo Menezes", documento: "000.000.002-72", whatsapp: "(11) 90000-2202", email: "carlos@email.exemplo", endereco: "Rua do Ipê, 128 · Bela Vista", observacoes: "Cupim no telhado e no batente da cozinha." },
  { id: 9, tipo: "PF", nome: "Ana Paula Ribeiro", documento: "000.000.003-53", whatsapp: "(11) 90000-2203", email: "", endereco: "Rua Bahia, 512 · Apto 31 · Consolação", observacoes: "" },
  { id: 10, tipo: "PF", nome: "Roberto Lima", documento: "000.000.004-34", whatsapp: "(11) 90000-2204", email: "roberto@email.exemplo", endereco: "Rua Pará, 89 · Higienópolis", observacoes: "Paga sempre por Pix no dia." },
  { id: 11, tipo: "PF", nome: "Juliana Costa", documento: "000.000.005-15", whatsapp: "(11) 90000-2205", email: "", endereco: "Rua Cuba, 14 · Jardim Europa", observacoes: "" },
  { id: 12, tipo: "PF", nome: "Fernando Alves", documento: "000.000.006-04", whatsapp: "(11) 90000-2206", email: "fernando@email.exemplo", endereco: "Av. Rebouças, 1500 · Apto 72 · Pinheiros", observacoes: "Primeiro atendimento: indicação da Marina." },
];

// [dias a partir de hoje, hora, cliente, tipo, técnico, status, observação]
type SvcSpec = [number, string, number, number, number, Svc["status"], string];
const SERVICOS: SvcSpec[] = [
  // mês anterior (gera contas PJ já vencidas ou pagas)
  [-40, "08:00", 2, 2, 1, "concluido", "Depósito e área de carga."],
  [-38, "09:00", 4, 1, 2, "concluido", "Cozinha e salão."],
  [-35, "14:00", 3, 5, 3, "concluido", "Troca de iscas."],
  [-33, "10:00", 7, 1, 2, "concluido", "Gel na cozinha."],
  [-30, "08:00", 6, 4, 1, "concluido", "Pátio e quadra."],
  // últimas semanas
  [-21, "09:00", 5, 1, 3, "concluido", "Vestiários."],
  [-19, "10:00", 9, 4, 2, "concluido", "Apartamento com gato."],
  [-14, "08:00", 2, 5, 1, "concluido", "Monitoramento do depósito."],
  [-12, "15:00", 10, 1, 3, "concluido", "Pago por Pix."],
  [-10, "09:00", 11, 1, 2, "cancelado", "Cliente viajou. Reagendar."],
  [-9, "14:00", 8, 3, 1, "concluido", "Primeira etapa: telhado."],
  [-7, "08:00", 3, 5, 3, "concluido", "Troca de iscas."],
  [-6, "10:00", 1, 2, 2, "concluido", "Depósito de farinha."],
  [-5, "13:00", 12, 1, 3, "concluido", ""],
  [-3, "09:00", 4, 6, 1, "concluido", "Caixa de 5.000 L."],
  [-2, "16:00", 7, 1, 2, "concluido", "Retorno de garantia."],
  [-1, "10:00", 5, 5, 3, "concluido", ""],
  // hoje
  [0, "08:00", 1, 1, 1, "concluido", "Antes da abertura."],
  [0, "09:30", 10, 4, 2, "concluido", "Pago por Pix."],
  [0, "11:00", 3, 5, 3, "agendado", "Troca de iscas."],
  [0, "14:00", 2, 2, 2, "agendado", "Depósito."],
  [0, "16:00", 9, 1, 1, "agendado", ""],
  // próximos dias
  [1, "10:00", 8, 3, 1, "agendado", "Segunda etapa: batente da cozinha."],
  [1, "14:00", 11, 1, 2, "agendado", "Reagendado."],
  [2, "08:00", 4, 5, 3, "agendado", ""],
  [3, "09:00", 12, 4, 2, "agendado", ""],
  [6, "08:00", 6, 1, 1, "agendado", "Sábado, sem alunos."],
  [7, "10:00", 5, 2, 3, "agendado", ""],
  [8, "15:00", 7, 5, 2, "agendado", "Avaliação de rotina."],
  [10, "09:00", 2, 5, 1, "agendado", "Monitoramento do depósito."],
];

// [dia do mês, fornecedor, descrição, valor em centavos]
const CONTAS_FIXAS: [number, string, string, number][] = [
  [5, "Folha de pagamento", "Técnicos (Marcos, Ana, Paulo)", 690000],
  [10, "Imobiliária Centro", "Aluguel do galpão", 220000],
  [12, "Vivo Empresas", "Internet e telefone", 22000],
  [15, "Contabilidade Silva", "Honorários", 65000],
  [20, "Simples Nacional", "Guia do mês", 142000],
];

export function gerarDadosDemo(hoje: string) {
  const d = (n: number) => addDaysISO(hoje, n);
  const [mesIni] = monthRangeISO(hoje);
  const [antIni] = monthRangeISO(hoje, -1);
  const [proxIni] = monthRangeISO(hoje, 1);
  const noDia = (ini: string, dia: number) => `${ini.slice(0, 8)}${String(dia).padStart(2, "0")}`;

  const servicos: Svc[] = SERVICOS.map(([dias, hora, cli, tipo, tec, status, obs], i) => ({
    id: i + 1, clienteId: cli, tipoServicoId: tipo, tecnicoId: tec, dataHora: `${d(dias)}T${hora}`,
    duracaoMin: TIPOS[tipo - 1].duracaoMin, valor: TIPOS[tipo - 1].preco, status, observacoes: obs,
  }));

  const lancamentos: Lanc[] = [];

  // Serviços concluídos -> conta a receber
  servicos.filter((s) => s.status === "concluido").forEach((s, i) => {
    const c = CLIENTES[s.clienteId - 1];
    const data = s.dataHora.slice(0, 10);
    const venc = c.tipo === "PF" ? data : addDaysISO(data, 30);
    // PF paga no dia, exceto uma conta vencida para testar cobrança.
    // PJ: vencidas há mais de 3 dias foram pagas; a mais recente fica vencida.
    let pago = false;
    if (c.tipo === "PF") pago = !(s.clienteId === 9);
    else pago = venc < d(-3) && s.clienteId !== 2;
    lancamentos.push({
      tipo: "receber", descricao: `${TIPOS[s.tipoServicoId - 1].nome} · ${c.nome}`, clienteId: c.id, fornecedor: null,
      servicoId: s.id, inscricaoId: null, vencimento: venc, valor: s.valor,
      status: pago ? "pago" : "aberto", pagoEm: pago ? venc : null,
    });
    void i;
  });

  // Campanhas
  const campanhas: Camp[] = [
    { id: 1, nome: "Condomínio Jardim das Palmeiras", local: "Rua das Palmeiras, 400 · Casas 1 a 40", dataInicio: d(-20), dataFim: d(-19), descontoPct: 15, unidades: 40, tiposServicoIds: [1, 2], status: "finalizada" },
    { id: 2, nome: "Condomínio Vila Verde", local: "Estrada do Sol, 1200 · Casas 1 a 30", dataInicio: d(4), dataFim: d(5), descontoPct: 20, unidades: 30, tiposServicoIds: [1, 4], status: "agendada" },
  ];
  const base = TIPOS[0].preco;
  const comDesc = (pct: number) => Math.round((base * (100 - pct)) / 100);
  const insc: [number, string, string, string, boolean][] = [
    [1, "Casa 02", "Rogério Lima", "(11) 90000-3101", true],
    [1, "Casa 07", "Patrícia Gomes", "(11) 90000-3102", true],
    [1, "Casa 11", "Luiz Fernando Rocha", "(11) 90000-3103", true],
    [1, "Casa 15", "Beatriz Nunes", "(11) 90000-3104", true],
    [1, "Casa 18", "Marcelo Dias", "(11) 90000-3105", true],
    [1, "Casa 23", "Sandra Melo", "(11) 90000-3106", true],
    [1, "Casa 31", "Tiago Martins", "(11) 90000-3107", true],
    [1, "Casa 38", "Cláudia Pires", "(11) 90000-3108", false],
    [2, "Casa 04", "Fernanda Alves", "(11) 90000-3201", true],
    [2, "Casa 09", "Eduardo Santos", "(11) 90000-3202", true],
    [2, "Casa 12", "Helena Duarte", "(11) 90000-3203", false],
    [2, "Casa 20", "Ricardo Moura", "(11) 90000-3204", false],
    [2, "Casa 27", "Vanessa Lopes", "(11) 90000-3205", false],
  ];
  const inscricoes: Insc[] = insc.map(([camp, unidade, morador, tel, pago], i) => ({
    id: i + 1, campanhaId: camp, tipoServicoId: 1, unidade, morador, telefone: tel, valor: comDesc(campanhas[camp - 1].descontoPct), pago,
  }));
  inscricoes.forEach((x) => {
    const c = campanhas[x.campanhaId - 1];
    lancamentos.push({
      tipo: "receber", descricao: `Campanha ${c.nome} · Unid. ${x.unidade} (${x.morador})`, clienteId: null, fornecedor: null,
      servicoId: null, inscricaoId: x.id, vencimento: c.dataInicio, valor: x.valor,
      status: x.pago ? "pago" : "aberto", pagoEm: x.pago ? (c.dataInicio < hoje ? c.dataInicio : hoje) : null,
    });
  });

  // Contas a pagar fixas: mês anterior pagas; mês atual pagas se já venceram; próximo mês em aberto.
  for (const [dia, forn, desc, valor] of CONTAS_FIXAS) {
    const ant = noDia(antIni, dia);
    lancamentos.push({ tipo: "pagar", descricao: desc, clienteId: null, fornecedor: forn, servicoId: null, inscricaoId: null, vencimento: ant, valor, status: "pago", pagoEm: ant });
    const atual = noDia(mesIni, dia);
    const pago = atual < hoje;
    lancamentos.push({ tipo: "pagar", descricao: desc, clienteId: null, fornecedor: forn, servicoId: null, inscricaoId: null, vencimento: atual, valor, status: pago ? "pago" : "aberto", pagoEm: pago ? atual : null });
    if (dia <= 12) {
      const prox = noDia(proxIni, dia);
      lancamentos.push({ tipo: "pagar", descricao: desc, clienteId: null, fornecedor: forn, servicoId: null, inscricaoId: null, vencimento: prox, valor, status: "aberto", pagoEm: null });
    }
  }
  // Contas variáveis
  lancamentos.push(
    { tipo: "pagar", descricao: "Reposição de gel e inseticidas", clienteId: null, fornecedor: "Aliança Químicos", servicoId: null, inscricaoId: null, vencimento: hoje, valor: 128000, status: "aberto", pagoEm: null },
    { tipo: "pagar", descricao: "Combustível da frota", clienteId: null, fornecedor: "Posto Rede Brasil", servicoId: null, inscricaoId: null, vencimento: hoje, valor: 46000, status: "aberto", pagoEm: null },
    { tipo: "pagar", descricao: "Seguro da frota · parcela 8 de 12", clienteId: null, fornecedor: "Porto Seguros", servicoId: null, inscricaoId: null, vencimento: d(-3), valor: 38000, status: "aberto", pagoEm: null },
    { tipo: "pagar", descricao: "EPIs (luvas, máscaras e macacões)", clienteId: null, fornecedor: "Proteção Total EPI", servicoId: null, inscricaoId: null, vencimento: d(-12), valor: 54000, status: "pago", pagoEm: d(-12) },
    { tipo: "pagar", descricao: "Reposição de iscas raticidas", clienteId: null, fornecedor: "Aliança Químicos", servicoId: null, inscricaoId: null, vencimento: d(9), valor: 86000, status: "aberto", pagoEm: null },
  );

  return { tecnicos: TECNICOS, tipos: TIPOS, clientes: CLIENTES, servicos, campanhas, inscricoes, lancamentos };
}

const q = (v: string | number | boolean | null) =>
  v === null ? "NULL" : typeof v === "number" ? String(v) : typeof v === "boolean" ? (v ? "true" : "false") : `'${v.replace(/'/g, "''")}'`;

// Um único bloco: apaga os dados de negócio (usuários e sessões ficam) e insere o
// conjunto de demonstração. Ou faz tudo, ou nada.
export function sqlRecriarDemo(hoje: string): string {
  const g = gerarDadosDemo(hoje);
  const rows = (t: string, cols: string[], vals: (string | number | boolean | null)[][]) =>
    `INSERT INTO ${t} (${cols.join(", ")}) VALUES\n${vals.map((r) => `(${r.map(q).join(", ")})`).join(",\n")};`;
  return `DO $demo$
BEGIN
TRUNCATE lancamentos, inscricoes, campanhas, servicos, clientes, tipos_servico, tecnicos RESTART IDENTITY CASCADE;
${rows("tecnicos", ["id", "nome", "telefone", "cor", "ativo"], g.tecnicos.map((t) => [t.id, t.nome, t.telefone, t.cor, t.ativo]))}
${rows("tipos_servico", ["id", "nome", "preco", "duracao_min"], g.tipos.map((t) => [t.id, t.nome, t.preco, t.duracaoMin]))}
${rows("clientes", ["id", "tipo", "nome", "documento", "whatsapp", "email", "endereco", "observacoes"], g.clientes.map((c) => [c.id, c.tipo, c.nome, c.documento, c.whatsapp, c.email, c.endereco, c.observacoes]))}
${rows("servicos", ["id", "cliente_id", "tipo_servico_id", "tecnico_id", "data_hora", "duracao_min", "valor", "status", "observacoes"], g.servicos.map((s) => [s.id, s.clienteId, s.tipoServicoId, s.tecnicoId, s.dataHora, s.duracaoMin, s.valor, s.status, s.observacoes]))}
${rows("campanhas", ["id", "nome", "local", "data_inicio", "data_fim", "desconto_pct", "unidades", "tipos_servico_ids", "status"], g.campanhas.map((c) => [c.id, c.nome, c.local, c.dataInicio, c.dataFim, c.descontoPct, c.unidades, `{${c.tiposServicoIds.join(",")}}`, c.status]))}
${rows("inscricoes", ["id", "campanha_id", "tipo_servico_id", "unidade", "morador", "telefone", "valor", "pago"], g.inscricoes.map((i) => [i.id, i.campanhaId, i.tipoServicoId, i.unidade, i.morador, i.telefone, i.valor, i.pago]))}
${rows("lancamentos", ["tipo", "descricao", "cliente_id", "fornecedor", "servico_id", "inscricao_id", "vencimento", "valor", "status", "pago_em"], g.lancamentos.map((l) => [l.tipo, l.descricao, l.clienteId, l.fornecedor, l.servicoId, l.inscricaoId, l.vencimento, l.valor, l.status, l.pagoEm]))}
PERFORM setval(pg_get_serial_sequence('tecnicos', 'id'), (SELECT max(id) FROM tecnicos));
PERFORM setval(pg_get_serial_sequence('tipos_servico', 'id'), (SELECT max(id) FROM tipos_servico));
PERFORM setval(pg_get_serial_sequence('clientes', 'id'), (SELECT max(id) FROM clientes));
PERFORM setval(pg_get_serial_sequence('servicos', 'id'), (SELECT max(id) FROM servicos));
PERFORM setval(pg_get_serial_sequence('campanhas', 'id'), (SELECT max(id) FROM campanhas));
PERFORM setval(pg_get_serial_sequence('inscricoes', 'id'), (SELECT max(id) FROM inscricoes));
END $demo$;`;
}
