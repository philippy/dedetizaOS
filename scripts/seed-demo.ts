// Dados de demonstração. Rodar só em banco de teste:  npm run seed:demo
// Não roda sozinho no app. Se o banco já tem técnicos, não insere nada.
import { db } from "../src/db";
import { tecnicos, clientes, tiposServico, servicos, lancamentos, campanhas, inscricoes } from "../src/db/schema";
import { addDaysISO, todaySP } from "../src/lib/utils";

async function main() {
  const existingTechs = await db.select().from(tecnicos);
  if (existingTechs.length > 0) {
    console.log("Já existem técnicos no banco. Nada foi inserido.");
    return;
  }

  const hoje = todaySP();
  const amanha = addDaysISO(hoje, 1);
  const ontem = addDaysISO(hoje, -1);

  const [marcos, ana, paulo] = await db.insert(tecnicos).values([
    { nome: "Marcos", telefone: "(11) 98888-0001", cor: "#2F5FE0", ativo: true },
    { nome: "Ana", telefone: "(11) 98888-0002", cor: "#0F1720", ativo: true },
    { nome: "Paulo", telefone: "(11) 98888-0003", cor: "#4A5B78", ativo: true },
  ]).returning();

  const [baratas, roedores, cupins, pulgas, monitoramento] = await db.insert(tiposServico).values([
    { nome: "Baratas e formigas", preco: 24000 },
    { nome: "Roedores", preco: 32000 },
    { nome: "Cupins", preco: 48000 },
    { nome: "Pulgas e carrapatos", preco: 26000 },
    { nome: "Monitoramento", preco: 15000 },
  ]).returning();

  const [padaria, mercado, clinica, marina, carlos] = await db.insert(clientes).values([
    { tipo: "PJ", nome: "Padaria Sol Ltda", documento: "12.345.678/0001-90", whatsapp: "(11) 98888-1200", email: "contato@padariasol.com.br", endereco: "Av. das Flores, 210 · Centro", observacoes: "Serviços contratados: Baratas e formigas, Roedores." },
    { tipo: "PJ", nome: "Mercado Bom Preço", documento: "23.456.789/0001-11", whatsapp: "(11) 93333-5510", email: "adm@bompreco.com.br", endereco: "Rua do Comércio, 850 · Vila Nova", observacoes: "Serviços contratados: Roedores, Monitoramento." },
    { tipo: "PJ", nome: "Clínica Vida Saúde", documento: "34.567.890/0001-22", whatsapp: "(11) 96666-2210", email: "financeiro@clinicavida.com.br", endereco: "Av. Brasil, 1420 · Sala 3", observacoes: "Serviços contratados: Monitoramento." },
    { tipo: "PF", nome: "Marina Souza (Residência)", documento: "123.456.789-01", whatsapp: "(11) 98123-4455", email: "marina@email.com", endereco: "Rua Silva, 45 · Jardim América", observacoes: "Serviços contratados: Baratas e formigas." },
    { tipo: "PF", nome: "Carlos Eduardo Menezes", documento: "234.567.890-12", whatsapp: "(11) 98456-7788", email: "carlos@email.com", endereco: "Rua do Ipê, 128 · Bela Vista", observacoes: "Serviços contratados: Cupins." },
  ]).returning();

  const svcs = await db.insert(servicos).values([
    { clienteId: padaria.id, tipoServicoId: baratas.id, tecnicoId: marcos.id, dataHora: `${hoje}T08:00`, valor: 24000, status: "concluido", observacoes: "Concluído pela manhã." },
    { clienteId: marina.id, tipoServicoId: baratas.id, tecnicoId: ana.id, dataHora: `${hoje}T09:00`, valor: 24000, status: "concluido", observacoes: "Pago via Pix." },
    { clienteId: clinica.id, tipoServicoId: monitoramento.id, tecnicoId: paulo.id, dataHora: `${hoje}T11:00`, valor: 15000, status: "agendado", observacoes: "Troca de iscas." },
    { clienteId: mercado.id, tipoServicoId: roedores.id, tecnicoId: ana.id, dataHora: `${hoje}T14:00`, valor: 32000, status: "agendado", observacoes: "Depósito." },
    { clienteId: carlos.id, tipoServicoId: cupins.id, tecnicoId: marcos.id, dataHora: `${amanha}T10:00`, valor: 48000, status: "agendado", observacoes: "Telhado." },
  ]).returning();

  const [camp] = await db.insert(campanhas).values({
    nome: "Condomínio Vila Verde",
    local: "Estrada do Sol, 1200 · Casas 1 a 30",
    dataInicio: addDaysISO(hoje, 4),
    dataFim: addDaysISO(hoje, 5),
    descontoPct: 20,
    unidades: 30,
    status: "agendada",
  }).returning();

  const [i1, i2] = await db.insert(inscricoes).values([
    { campanhaId: camp.id, unidade: "Casa 04", morador: "Rogério Lima", telefone: "(11) 99111-2233", valor: 19200, pago: true },
    { campanhaId: camp.id, unidade: "Casa 12", morador: "Fernanda Alves", telefone: "(11) 99222-3344", valor: 19200, pago: false },
  ]).returning();

  await db.insert(lancamentos).values([
    { tipo: "receber", descricao: `Baratas e formigas · ${padaria.nome}`, clienteId: padaria.id, servicoId: svcs[0].id, vencimento: addDaysISO(hoje, 30), valor: 24000, status: "aberto" },
    { tipo: "receber", descricao: `Baratas e formigas · ${marina.nome}`, clienteId: marina.id, servicoId: svcs[1].id, vencimento: hoje, valor: 24000, status: "pago", pagoEm: hoje },
    { tipo: "receber", descricao: `Controle de roedores · ${mercado.nome}`, clienteId: mercado.id, vencimento: hoje, valor: 64000, status: "aberto" },
    { tipo: "receber", descricao: `Campanha ${camp.nome} · Casa 04`, inscricaoId: i1.id, vencimento: hoje, valor: 19200, status: "pago", pagoEm: hoje },
    { tipo: "receber", descricao: `Campanha ${camp.nome} · Casa 12`, inscricaoId: i2.id, vencimento: camp.dataInicio, valor: 19200, status: "aberto" },
    { tipo: "pagar", fornecedor: "Aliança Químicos", descricao: "Reposição de gel e inseticidas", vencimento: hoje, valor: 128000, status: "aberto" },
    { tipo: "pagar", fornecedor: "Posto Rede Brasil", descricao: "Combustível da frota", vencimento: hoje, valor: 46000, status: "aberto" },
    { tipo: "pagar", fornecedor: "Folha de Pagamento", descricao: "Técnicos (Marcos, Ana, Paulo)", vencimento: ontem, valor: 690000, status: "pago", pagoEm: ontem },
  ]);
  console.log("Dados de demonstração inseridos.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
