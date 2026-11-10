"use server";

import { db } from "@/db";
import {
  tecnicos,
  clientes,
  tiposServico,
  servicos,
  lancamentos,
  campanhas,
  inscricoes,
  user,
} from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDaysISO, parseBRLToCents, todaySP } from "@/lib/utils";

// Auto-seed de dados completos de demonstração caso o banco esteja vazio
export async function ensureSeedData() {
  const existingTechs = await db.select().from(tecnicos);
  if (existingTechs.length > 0) return;

  const hoje = todaySP();
  const amanha = addDaysISO(hoje, 1);
  const doisDias = addDaysISO(hoje, 2);
  const ontem = addDaysISO(hoje, -1);

  const [marcos, ana, paulo] = await db
    .insert(tecnicos)
    .values([
      { nome: "Marcos", telefone: "(11) 98888-0001", cor: "#2F5FE0", ativo: true },
      { nome: "Ana", telefone: "(11) 98888-0002", cor: "#0F1720", ativo: true },
      { nome: "Paulo", telefone: "(11) 98888-0003", cor: "#4A5B78", ativo: true },
    ])
    .returning();

  const [baratas, roedores, cupins, pulgas, monitoramento] = await db
    .insert(tiposServico)
    .values([
      { nome: "Baratas e formigas", preco: 24000 },
      { nome: "Roedores", preco: 32000 },
      { nome: "Cupins", preco: 48000 },
      { nome: "Pulgas e carrapatos", preco: 26000 },
      { nome: "Monitoramento", preco: 15000 },
    ])
    .returning();

  const clientesInseridos = await db
    .insert(clientes)
    .values([
      {
        tipo: "PJ",
        nome: "Padaria Sol Ltda",
        documento: "12.345.678/0001-90",
        whatsapp: "(11) 98888-1200",
        email: "contato@padariasol.com.br",
        endereco: "Av. das Flores, 210 · Centro",
        observacoes: "Serviços contratados: Baratas e formigas, Roedores.",
      },
      {
        tipo: "PJ",
        nome: "Mercado Bom Preço",
        documento: "23.456.789/0001-11",
        whatsapp: "(11) 93333-5510",
        email: "adm@bompreco.com.br",
        endereco: "Rua do Comércio, 850 · Vila Nova",
        observacoes: "Serviços contratados: Roedores, Monitoramento mensal.",
      },
      {
        tipo: "PJ",
        nome: "Clínica Vida Saúde",
        documento: "34.567.890/0001-22",
        whatsapp: "(11) 96666-2210",
        email: "financeiro@clinicavida.com.br",
        endereco: "Av. Brasil, 1420 · Sala 3",
        observacoes: "Serviços contratados: Monitoramento.",
      },
      {
        tipo: "PJ",
        nome: "Restaurante Sabor & Cia",
        documento: "45.678.901/0001-33",
        whatsapp: "(11) 92222-6405",
        email: "contato@saborecia.com.br",
        endereco: "Rua Gastronômica, 99 · Centro",
        observacoes: "Serviços contratados: Baratas e formigas.",
      },
      {
        tipo: "PF",
        nome: "Marina Souza (Residência)",
        documento: "123.456.789-01",
        whatsapp: "(11) 98123-4455",
        email: "marina.souza@email.com",
        endereco: "Rua Silva, 45 · Jardim América",
        observacoes: "Serviços contratados: Baratas e formigas.",
      },
      {
        tipo: "PF",
        nome: "Carlos Eduardo Menezes",
        documento: "234.567.890-12",
        whatsapp: "(11) 98456-7788",
        email: "carlos.m@email.com",
        endereco: "Rua do Ipê, 128 · Bela Vista",
        observacoes: "Serviços contratados: Cupins.",
      },
      {
        tipo: "PF",
        nome: "Ana Paula Ribeiro",
        documento: "345.678.901-23",
        whatsapp: "(11) 98345-6677",
        email: "anapaula@email.com",
        endereco: "Av. Central, 502 · Apto 32",
        observacoes: "Serviços contratados: Pulgas e carrapatos.",
      },
      {
        tipo: "PJ",
        nome: "Academia Fit Center",
        documento: "56.789.012/0001-44",
        whatsapp: "(11) 97777-3040",
        email: "gestao@academiafit.com.br",
        endereco: "Av. Esportiva, 300 · Galpão B",
        observacoes: "Serviços contratados: Baratas e formigas.",
      },
    ])
    .returning();

  const [padaria, mercado, clinica, restaurante, marina, carlos, anaPaula, academia] =
    clientesInseridos;

  const servicosCriados = await db
    .insert(servicos)
    .values([
      {
        clienteId: padaria.id,
        tipoServicoId: baratas.id,
        tecnicoId: marcos.id,
        dataHora: `${hoje}T08:00`,
        valor: 24000,
        status: "concluido",
        observacoes: "Concluído pela manhã.",
      },
      {
        clienteId: marina.id,
        tipoServicoId: baratas.id,
        tecnicoId: ana.id,
        dataHora: `${hoje}T09:00`,
        valor: 24000,
        status: "concluido",
        observacoes: "Pago via Pix na hora.",
      },
      {
        clienteId: clinica.id,
        tipoServicoId: monitoramento.id,
        tecnicoId: paulo.id,
        dataHora: `${hoje}T11:00`,
        valor: 15000,
        status: "agendado",
        observacoes: "Troca de porta-iscas.",
      },
      {
        clienteId: mercado.id,
        tipoServicoId: roedores.id,
        tecnicoId: ana.id,
        dataHora: `${hoje}T14:00`,
        valor: 32000,
        status: "agendado",
        observacoes: "Revisar depósito.",
      },
      {
        clienteId: carlos.id,
        tipoServicoId: cupins.id,
        tecnicoId: marcos.id,
        dataHora: `${hoje}T16:00`,
        valor: 48000,
        status: "agendado",
        observacoes: "Barreira química.",
      },
      {
        clienteId: restaurante.id,
        tipoServicoId: baratas.id,
        tecnicoId: marcos.id,
        dataHora: `${amanha}T09:00`,
        valor: 24000,
        status: "agendado",
        observacoes: "Cozinha industrial.",
      },
      {
        clienteId: anaPaula.id,
        tipoServicoId: pulgas.id,
        tecnicoId: paulo.id,
        dataHora: `${amanha}T14:00`,
        valor: 26000,
        status: "agendado",
        observacoes: "",
      },
      {
        clienteId: academia.id,
        tipoServicoId: baratas.id,
        tecnicoId: ana.id,
        dataHora: `${doisDias}T10:00`,
        valor: 24000,
        status: "agendado",
        observacoes: "Vestiários.",
      },
    ])
    .returning();

  const [campanhaVila] = await db
    .insert(campanhas)
    .values({
      nome: "Condomínio Vila Verde",
      local: "Estrada do Sol, 1200 · Casas 1 a 30",
      dataInicio: addDaysISO(hoje, 4),
      dataFim: addDaysISO(hoje, 5),
      descontoPct: 20,
      unidades: 30,
      status: "agendada",
    })
    .returning();

  const [insc1, insc2, insc3] = await db
    .insert(inscricoes)
    .values([
      {
        campanhaId: campanhaVila.id,
        unidade: "Casa 04",
        morador: "Rogério Lima",
        telefone: "(11) 99111-2233",
        valor: 19200,
        pago: true,
      },
      {
        campanhaId: campanhaVila.id,
        unidade: "Casa 12",
        morador: "Fernanda Alves",
        telefone: "(11) 99222-3344",
        valor: 19200,
        pago: false,
      },
      {
        campanhaId: campanhaVila.id,
        unidade: "Casa 19",
        morador: "Tiago Nogueira",
        telefone: "(11) 99333-4455",
        valor: 25600,
        pago: false,
      },
    ])
    .returning();

  await db.insert(lancamentos).values([
    {
      tipo: "receber",
      descricao: `Baratas e formigas · ${padaria.nome}`,
      clienteId: padaria.id,
      servicoId: servicosCriados[0].id,
      vencimento: addDaysISO(hoje, 30),
      valor: 24000,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: `Baratas e formigas · ${marina.nome}`,
      clienteId: marina.id,
      servicoId: servicosCriados[1].id,
      vencimento: hoje,
      valor: 24000,
      status: "pago",
      pagoEm: hoje,
    },
    {
      tipo: "receber",
      descricao: `Controle de roedores · ${mercado.nome}`,
      clienteId: mercado.id,
      vencimento: hoje,
      valor: 64000,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: `Dedetização geral · ${academia.nome}`,
      clienteId: academia.id,
      vencimento: addDaysISO(hoje, -5),
      valor: 48000,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: `Campanha ${campanhaVila.nome} · Casa 04 (Rogério Lima)`,
      inscricaoId: insc1.id,
      vencimento: hoje,
      valor: 19200,
      status: "pago",
      pagoEm: hoje,
    },
    {
      tipo: "receber",
      descricao: `Campanha ${campanhaVila.nome} · Casa 12 (Fernanda Alves)`,
      inscricaoId: insc2.id,
      vencimento: campanhaVila.dataInicio,
      valor: 19200,
      status: "aberto",
    },
    {
      tipo: "receber",
      descricao: `Campanha ${campanhaVila.nome} · Casa 19 (Tiago Nogueira)`,
      inscricaoId: insc3.id,
      vencimento: campanhaVila.dataInicio,
      valor: 25600,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Aliança Químicos",
      descricao: "Reposição de gel e inseticidas",
      vencimento: hoje,
      valor: 128000,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Posto Rede Brasil",
      descricao: "Combustível da frota",
      vencimento: hoje,
      valor: 46000,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Imobiliária Central",
      descricao: "Aluguel do galpão",
      vencimento: addDaysISO(hoje, 3),
      valor: 220000,
      status: "aberto",
    },
    {
      tipo: "pagar",
      fornecedor: "Folha de Pagamento",
      descricao: "Técnicos (Marcos, Ana, Paulo)",
      vencimento: ontem,
      valor: 690000,
      status: "pago",
      pagoEm: ontem,
    },
  ]);
}

export async function canPublicRegister(): Promise<boolean> {
  const users = await db.select({ id: user.id }).from(user).limit(1);
  return users.length === 0;
}

const clienteSchema = z.object({
  id: z.number().optional(),
  tipo: z.enum(["PF", "PJ"]),
  nome: z.string().min(2, "Informe o nome ou razão social."),
  documento: z.string().optional().default(""),
  whatsapp: z.string().min(8, "Informe o WhatsApp para contato."),
  email: z.string().optional().default(""),
  endereco: z.string().optional().default(""),
  observacoes: z.string().optional().default(""),
});

export async function salvarClienteAction(data: z.infer<typeof clienteSchema>) {
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  if (v.id) {
    await db
      .update(clientes)
      .set({
        tipo: v.tipo,
        nome: v.nome.trim(),
        documento: v.documento?.trim() || "",
        whatsapp: v.whatsapp.trim(),
        email: v.email?.trim() || "",
        endereco: v.endereco?.trim() || "",
        observacoes: v.observacoes?.trim() || "",
      })
      .where(eq(clientes.id, v.id));
  } else {
    const [novo] = await db
      .insert(clientes)
      .values({
        tipo: v.tipo,
        nome: v.nome.trim(),
        documento: v.documento?.trim() || "",
        whatsapp: v.whatsapp.trim(),
        email: v.email?.trim() || "",
        endereco: v.endereco?.trim() || "",
        observacoes: v.observacoes?.trim() || "",
      })
      .returning();
    revalidatePath("/clientes");
    revalidatePath("/servicos");
    revalidatePath("/agenda");
    return { success: true, cliente: novo };
  }

  revalidatePath("/clientes");
  if (v.id) revalidatePath(`/clientes/${v.id}`);
  return { success: true };
}

export async function excluirClienteAction(id: number) {
  await db.delete(clientes).where(eq(clientes.id, id));
  revalidatePath("/clientes");
  return { success: true };
}

export async function salvarTipoServicoAction(input: {
  id?: number;
  nome: string;
  precoReais: string;
}) {
  if (!input.nome.trim()) return { error: "Informe o nome do tipo de serviço." };
  const preco = parseBRLToCents(input.precoReais);
  if (preco <= 0) return { error: "Informe um preço maior que zero." };

  if (input.id) {
    await db
      .update(tiposServico)
      .set({ nome: input.nome.trim(), preco })
      .where(eq(tiposServico.id, input.id));
  } else {
    await db.insert(tiposServico).values({ nome: input.nome.trim(), preco });
  }
  revalidatePath("/servicos");
  return { success: true };
}

export async function salvarServicoAction(input: {
  id?: number;
  clienteId: number;
  tipoServicoId: number;
  tecnicoId: number;
  data: string;
  hora: string;
  valorReais: string;
  observacoes?: string;
}) {
  if (!input.clienteId) return { error: "Selecione o cliente." };
  if (!input.tipoServicoId) return { error: "Selecione o tipo de serviço." };
  if (!input.tecnicoId) return { error: "Selecione o técnico." };
  if (!input.data || !input.hora) return { error: "Informe a data e o horário." };

  const dataHora = `${input.data}T${input.hora.slice(0, 5)}`;
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido para o serviço." };

  const conflitos = await db
    .select({ id: servicos.id, clienteNome: clientes.nome })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .where(
      and(
        eq(servicos.tecnicoId, input.tecnicoId),
        eq(servicos.dataHora, dataHora),
        ne(servicos.status, "cancelado"),
        input.id ? ne(servicos.id, input.id) : undefined
      )
    );

  if (conflitos.length > 0) {
    const [tech] = await db
      .select()
      .from(tecnicos)
      .where(eq(tecnicos.id, input.tecnicoId));
    return {
      error: `Conflito: ${tech?.nome || "O técnico"} já tem ${conflitos[0].clienteNome} agendado nesse mesmo dia e horário.`,
    };
  }

  if (input.id) {
    await db
      .update(servicos)
      .set({
        clienteId: input.clienteId,
        tipoServicoId: input.tipoServicoId,
        tecnicoId: input.tecnicoId,
        dataHora,
        valor,
        observacoes: input.observacoes || "",
      })
      .where(eq(servicos.id, input.id));
  } else {
    await db.insert(servicos).values({
      clienteId: input.clienteId,
      tipoServicoId: input.tipoServicoId,
      tecnicoId: input.tecnicoId,
      dataHora,
      valor,
      status: "agendado",
      observacoes: input.observacoes || "",
    });
  }

  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(`/clientes/${input.clienteId}`);
  return { success: true };
}

export async function concluirServicoAction(servicoId: number) {
  const rows = await db
    .select({
      servico: servicos,
      cliente: clientes,
      tipoServico: tiposServico,
    })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .where(eq(servicos.id, servicoId));

  if (rows.length === 0) return { error: "Serviço não encontrado." };
  const { servico, cliente, tipoServico } = rows[0];

  if (servico.status === "concluido") {
    return { error: "Este serviço já está concluído." };
  }

  await db
    .update(servicos)
    .set({ status: "concluido" })
    .where(eq(servicos.id, servicoId));

  const existente = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.servicoId, servicoId));

  const hoje = todaySP();
  const vencimento = cliente.tipo === "PF" ? hoje : addDaysISO(hoje, 30);

  if (existente.length === 0) {
    await db.insert(lancamentos).values({
      tipo: "receber",
      descricao: `${tipoServico.nome} · ${cliente.nome}`,
      clienteId: cliente.id,
      servicoId: servico.id,
      vencimento,
      valor: servico.valor,
      status: "aberto",
    });
  }

  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${cliente.id}`);
  return { success: true, vencimento };
}

export async function cancelarServicoAction(servicoId: number) {
  const [svc] = await db
    .select()
    .from(servicos)
    .where(eq(servicos.id, servicoId));
  if (!svc) return { error: "Serviço não encontrado." };

  await db
    .update(servicos)
    .set({ status: "cancelado" })
    .where(eq(servicos.id, servicoId));

  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(`/clientes/${svc.clienteId}`);
  return { success: true };
}

export async function criarLancamentoPagarAction(input: {
  fornecedor: string;
  descricao: string;
  vencimento: string;
  valorReais: string;
}) {
  if (!input.fornecedor.trim()) return { error: "Informe o fornecedor." };
  if (!input.descricao.trim()) return { error: "Informe a descrição." };
  if (!input.vencimento) return { error: "Informe a data de vencimento." };
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  await db.insert(lancamentos).values({
    tipo: "pagar",
    fornecedor: input.fornecedor.trim(),
    descricao: input.descricao.trim(),
    vencimento: input.vencimento,
    valor,
    status: "aberto",
  });

  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function darBaixaLancamentoAction(input: {
  lancamentoId: number;
  pagoEm: string;
  valorPagoReais: string;
}) {
  const [lanc] = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, input.lancamentoId));
  if (!lanc) return { error: "Lançamento não encontrado." };

  const valorPago = parseBRLToCents(input.valorPagoReais);
  if (valorPago <= 0) return { error: "Informe um valor pago maior que zero." };
  if (!input.pagoEm) return { error: "Informe a data do pagamento." };

  await db
    .update(lancamentos)
    .set({
      status: "pago",
      pagoEm: input.pagoEm,
      valor: valorPago,
    })
    .where(eq(lancamentos.id, input.lancamentoId));

  if (lanc.inscricaoId) {
    await db
      .update(inscricoes)
      .set({ pago: true, valor: valorPago })
      .where(eq(inscricoes.id, lanc.inscricaoId));
  }

  revalidatePath("/");
  revalidatePath("/financeiro");
  revalidatePath("/campanhas");
  if (lanc.clienteId) revalidatePath(`/clientes/${lanc.clienteId}`);
  return { success: true };
}

export async function excluirLancamentoAction(id: number) {
  const [lanc] = await db
    .select()
    .from(lancamentos)
    .where(eq(lancamentos.id, id));
  if (!lanc) return { error: "Lançamento não encontrado." };
  if (lanc.status === "pago") {
    return { error: "Um lançamento já pago não pode ser excluído." };
  }

  await db.delete(lancamentos).where(eq(lancamentos.id, id));
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function salvarCampanhaAction(input: {
  id?: number;
  nome: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  descontoPct: number;
  unidades: number;
  status?: "agendada" | "finalizada" | "cancelada";
}) {
  if (!input.nome.trim()) return { error: "Informe o nome da campanha." };
  if (!input.local.trim()) return { error: "Informe o local/condomínio." };
  if (!input.dataInicio || !input.dataFim)
    return { error: "Informe as datas de início e fim." };
  if (input.dataFim < input.dataInicio)
    return { error: "A data de fim não pode ser anterior ao início." };
  if (input.descontoPct < 0 || input.descontoPct > 100)
    return { error: "O desconto deve estar entre 0% e 100%." };
  if (input.unidades < 1)
    return { error: "O número de unidades deve ser de pelo menos 1." };

  if (input.id) {
    await db
      .update(campanhas)
      .set({
        nome: input.nome.trim(),
        local: input.local.trim(),
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        descontoPct: input.descontoPct,
        unidades: input.unidades,
        status: input.status || "agendada",
      })
      .where(eq(campanhas.id, input.id));
    revalidatePath("/campanhas");
    revalidatePath(`/campanhas/${input.id}`);
    return { success: true, id: input.id };
  } else {
    const [nova] = await db
      .insert(campanhas)
      .values({
        nome: input.nome.trim(),
        local: input.local.trim(),
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        descontoPct: input.descontoPct,
        unidades: input.unidades,
        status: "agendada",
      })
      .returning();
    revalidatePath("/campanhas");
    return { success: true, id: nova.id };
  }
}

export async function inscreverUnidadeCampanhaAction(input: {
  campanhaId: number;
  unidade: string;
  morador: string;
  telefone: string;
  valorReais: string;
}) {
  const [camp] = await db
    .select()
    .from(campanhas)
    .where(eq(campanhas.id, input.campanhaId));
  if (!camp) return { error: "Campanha não encontrada." };

  const inscritosAtuais = await db
    .select()
    .from(inscricoes)
    .where(eq(inscricoes.campanhaId, input.campanhaId));

  if (inscritosAtuais.length >= camp.unidades) {
    return {
      error: `Limite atingido: esta campanha permite no máximo ${camp.unidades} unidades.`,
    };
  }

  if (!input.unidade.trim()) return { error: "Informe a casa ou apartamento." };
  if (!input.morador.trim()) return { error: "Informe o nome do morador." };
  if (!input.telefone.trim()) return { error: "Informe o telefone do morador." };

  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  const [novaInscricao] = await db
    .insert(inscricoes)
    .values({
      campanhaId: camp.id,
      unidade: input.unidade.trim(),
      morador: input.morador.trim(),
      telefone: input.telefone.trim(),
      valor,
      pago: false,
    })
    .returning();

  await db.insert(lancamentos).values({
    tipo: "receber",
    descricao: `Campanha ${camp.nome} · Unid. ${novaInscricao.unidade} (${novaInscricao.morador})`,
    inscricaoId: novaInscricao.id,
    vencimento: camp.dataInicio || todaySP(),
    valor,
    status: "aberto",
  });

  revalidatePath(`/campanhas/${camp.id}`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function marcarInscricaoPagaAction(inscricaoId: number) {
  const [insc] = await db
    .select()
    .from(inscricoes)
    .where(eq(inscricoes.id, inscricaoId));
  if (!insc) return { error: "Inscrição não encontrada." };

  const hoje = todaySP();
  await db
    .update(inscricoes)
    .set({ pago: true })
    .where(eq(inscricoes.id, inscricaoId));

  await db
    .update(lancamentos)
    .set({ status: "pago", pagoEm: hoje })
    .where(eq(lancamentos.inscricaoId, inscricaoId));

  revalidatePath(`/campanhas/${insc.campanhaId}`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}
