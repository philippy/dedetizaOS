"use server";

import { db } from "@/db";
import { requireSession } from "@/lib/session";
import { tecnicos, clientes, tiposServico, servicos, lancamentos, campanhas, inscricoes, user } from "@/db/schema";
import { eq, and, ne, like, inArray } from "drizzle-orm";
import { DURACAO_PADRAO, DURACOES, formatDuracao, horaDe, minutosDe, sobrepoe } from "@/lib/agenda";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDaysISO, parseBRLToCents, todaySP } from "@/lib/utils";
import { soDigitos } from "@/lib/importar-clientes";

export async function canPublicRegister(): Promise<boolean> {
  try {
    const users = await db.select({ id: user.id }).from(user).limit(1);
    return users.length === 0;
  } catch {
    return false;
  }
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
  await requireSession();
  const parsed = clienteSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  if (v.id) {
    await db.update(clientes).set({
      tipo: v.tipo,
      nome: v.nome.trim(),
      documento: v.documento?.trim() || "",
      whatsapp: v.whatsapp.trim(),
      email: v.email?.trim() || "",
      endereco: v.endereco?.trim() || "",
      observacoes: v.observacoes?.trim() || "",
    }).where(eq(clientes.id, v.id));
  } else {
    const [novo] = await db.insert(clientes).values({
      tipo: v.tipo,
      nome: v.nome.trim(),
      documento: v.documento?.trim() || "",
      whatsapp: v.whatsapp.trim(),
      email: v.email?.trim() || "",
      endereco: v.endereco?.trim() || "",
      observacoes: v.observacoes?.trim() || "",
    }).returning();
    revalidatePath("/clientes");
    revalidatePath("/servicos");
    revalidatePath("/agenda");
    return { success: true, cliente: novo };
  }
  revalidatePath("/clientes");
  if (v.id) revalidatePath(`/clientes/${v.id}`);
  return { success: true };
}

const importacaoSchema = z.array(
  z.object({
    tipo: z.enum(["PF", "PJ"]),
    nome: z.string().trim().min(2).max(200),
    documento: z.string().trim().max(30).default(""),
    whatsapp: z.string().trim().max(40).default(""),
    email: z.string().trim().max(200).default(""),
    endereco: z.string().trim().max(400).default(""),
    observacoes: z.string().trim().max(1000).default(""),
  })
).max(2000);

// Importação em lote (tela Clientes > Importar planilha). Confere de novo no servidor
// quem já existe pelo CPF/CNPJ, porque a tela pode estar desatualizada.
export async function importarClientesAction(linhas: z.input<typeof importacaoSchema>) {
  await requireSession();
  const parsed = importacaoSchema.safeParse(linhas);
  if (!parsed.success) return { error: "Algumas linhas estão inválidas. Confira a pré-visualização e tente de novo." };
  if (parsed.data.length === 0) return { error: "Nenhuma linha selecionada para importar." };

  const existentes = await db.select({ documento: clientes.documento }).from(clientes);
  const docs = new Set(existentes.map((e) => soDigitos(e.documento ?? "")).filter((d) => d.length >= 11));
  const novos: typeof parsed.data = [];
  let jaExistiam = 0;
  for (const l of parsed.data) {
    const d = soDigitos(l.documento);
    if (d.length >= 11) {
      if (docs.has(d)) { jaExistiam++; continue; }
      docs.add(d);
    }
    novos.push(l);
  }
  for (let i = 0; i < novos.length; i += 200) {
    await db.insert(clientes).values(novos.slice(i, i + 200));
  }
  revalidatePath("/clientes");
  revalidatePath("/servicos");
  revalidatePath("/agenda");
  return { success: true, importados: novos.length, jaExistiam };
}

export async function excluirClienteAction(id: number) {
  await requireSession();
  await db.delete(clientes).where(eq(clientes.id, id));
  revalidatePath("/clientes");
  return { success: true };
}

export async function salvarTipoServicoAction(input: { id?: number; nome: string; precoReais: string; duracaoMin?: number }) {
  await requireSession();
  const nome = input.nome.trim();
  if (!nome) return { error: "Informe o nome do tipo de serviço." };
  const preco = parseBRLToCents(input.precoReais);
  if (preco <= 0) return { error: "Informe um preço maior que zero." };
  const duracaoMin = input.duracaoMin ?? DURACAO_PADRAO;
  if (!DURACOES.includes(duracaoMin)) return { error: "Escolha uma duração entre 30 min e 8 h." };

  const todos = await db.select({ id: tiposServico.id, nome: tiposServico.nome }).from(tiposServico);
  if (todos.some((t) => t.id !== input.id && t.nome.trim().toLowerCase() === nome.toLowerCase())) {
    return { error: `Já existe o tipo "${nome}" no catálogo.` };
  }

  if (input.id) {
    await db.update(tiposServico).set({ nome, preco, duracaoMin }).where(eq(tiposServico.id, input.id));
  } else {
    await db.insert(tiposServico).values({ nome, preco, duracaoMin });
  }
  revalidatePath("/servicos");
  revalidatePath("/agenda");
  revalidatePath("/campanhas");
  return { success: true };
}

export async function salvarServicoAction(input: {
  id?: number;
  clienteId: number;
  tipoServicoId: number;
  tecnicoId: number;
  data: string;
  hora: string;
  duracaoMin?: number;
  valorReais: string;
  observacoes?: string;
}) {
  await requireSession();
  if (!input.clienteId) return { error: "Selecione o cliente." };
  if (!input.tipoServicoId) return { error: "Selecione o tipo de serviço." };
  if (!input.tecnicoId) return { error: "Selecione o técnico." };
  if (!input.data || !input.hora) return { error: "Informe a data e o horário." };

  const dataHora = `${input.data}T${input.hora.slice(0, 5)}`;
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido." };
  const duracaoMin = input.duracaoMin ?? DURACAO_PADRAO;
  if (!DURACOES.includes(duracaoMin)) return { error: "Escolha uma duração entre 30 min e 8 h." };

  let atual: typeof servicos.$inferSelect | undefined;
  if (input.id) {
    [atual] = await db.select().from(servicos).where(eq(servicos.id, input.id));
    if (!atual) return { error: "Serviço não encontrado." };
    if (atual.status === "cancelado") return { error: "Serviço cancelado não pode ser editado." };
  }

  // Serviço concluído: o valor e o cliente ficam na conta a receber. Enquanto a conta
  // está em aberto, a edição acompanha; depois de paga, fica travada.
  let lancamentoDoServico: typeof lancamentos.$inferSelect | undefined;
  if (atual?.status === "concluido") {
    [lancamentoDoServico] = await db.select().from(lancamentos).where(eq(lancamentos.servicoId, atual.id));
    if (lancamentoDoServico?.status === "pago" && (valor !== atual.valor || input.clienteId !== atual.clienteId)) {
      return { error: "A conta a receber deste serviço já foi paga: o valor e o cliente não podem mudar. Se precisar corrigir, ajuste pelo Financeiro." };
    }
  }

  // Bloqueia sobreposição com outro serviço do mesmo técnico no mesmo dia, levando em
  // conta a duração de cada um. Só confere quando algo do horário mudou.
  const mudouHorario = !atual || atual.dataHora !== dataHora || atual.tecnicoId !== input.tecnicoId || atual.duracaoMin !== duracaoMin;
  if (mudouHorario) {
    const doDia = await db
      .select({ id: servicos.id, dataHora: servicos.dataHora, duracaoMin: servicos.duracaoMin, clienteNome: clientes.nome })
      .from(servicos)
      .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
      .where(and(eq(servicos.tecnicoId, input.tecnicoId), like(servicos.dataHora, `${input.data}%`), ne(servicos.status, "cancelado"), input.id ? ne(servicos.id, input.id) : undefined));
    const inicio = minutosDe(dataHora);
    const conflito = doDia.find((s) => sobrepoe(inicio, duracaoMin, minutosDe(s.dataHora), s.duracaoMin));
    if (conflito) {
      const [tech] = await db.select().from(tecnicos).where(eq(tecnicos.id, input.tecnicoId));
      const ini = minutosDe(conflito.dataHora);
      return { error: `Conflito: ${tech?.nome || "O técnico"} já tem ${conflito.clienteNome} das ${horaDe(ini)} às ${horaDe(ini + conflito.duracaoMin)} nesse dia. Este serviço ocuparia ${horaDe(inicio)} às ${horaDe(inicio + duracaoMin)} (${formatDuracao(duracaoMin)}).` };
    }
  }

  let contaAtualizada = false;
  if (atual) {
    await db.update(servicos).set({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, duracaoMin, valor, observacoes: input.observacoes || "" }).where(eq(servicos.id, atual.id));
    if (lancamentoDoServico && lancamentoDoServico.status === "aberto") {
      const [cli] = await db.select({ nome: clientes.nome }).from(clientes).where(eq(clientes.id, input.clienteId));
      const [tipo] = await db.select({ nome: tiposServico.nome }).from(tiposServico).where(eq(tiposServico.id, input.tipoServicoId));
      await db.update(lancamentos).set({ valor, clienteId: input.clienteId, descricao: `${tipo?.nome ?? "Serviço"} · ${cli?.nome ?? ""}` }).where(eq(lancamentos.id, lancamentoDoServico.id));
      contaAtualizada = valor !== lancamentoDoServico.valor || input.clienteId !== lancamentoDoServico.clienteId;
    }
  } else {
    await db.insert(servicos).values({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, duracaoMin, valor, status: "agendado", observacoes: input.observacoes || "" });
  }
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/financeiro");
  revalidatePath(`/clientes/${input.clienteId}`);
  if (atual && atual.clienteId !== input.clienteId) revalidatePath(`/clientes/${atual.clienteId}`);
  return { success: true, contaAtualizada };
}

export async function concluirServicoAction(servicoId: number) {
  await requireSession();
  const rows = await db
    .select({ servico: servicos, cliente: clientes, tipoServico: tiposServico })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .innerJoin(tiposServico, eq(servicos.tipoServicoId, tiposServico.id))
    .where(eq(servicos.id, servicoId));

  if (rows.length === 0) return { error: "Serviço não encontrado." };
  const { servico, cliente, tipoServico } = rows[0];

  await db.update(servicos).set({ status: "concluido" }).where(eq(servicos.id, servicoId));

  const existente = await db.select().from(lancamentos).where(eq(lancamentos.servicoId, servicoId));
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
  await requireSession();
  const [svc] = await db.select().from(servicos).where(eq(servicos.id, servicoId));
  if (!svc) return { error: "Serviço não encontrado." };
  if (svc.status === "concluido") return { error: "Serviço concluído não pode ser cancelado: a conta a receber já existe. Ajuste pelo Financeiro." };
  await db.update(servicos).set({ status: "cancelado" }).where(eq(servicos.id, servicoId));
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(`/clientes/${svc.clienteId}`);
  return { success: true };
}

export async function criarLancamentoPagarAction(input: { fornecedor: string; descricao: string; vencimento: string; valorReais: string }) {
  await requireSession();
  if (!input.fornecedor.trim()) return { error: "Informe o fornecedor." };
  if (!input.descricao.trim()) return { error: "Informe a descrição." };
  if (!input.vencimento) return { error: "Informe o vencimento." };
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor maior que zero." };

  await db.insert(lancamentos).values({ tipo: "pagar", fornecedor: input.fornecedor.trim(), descricao: input.descricao.trim(), vencimento: input.vencimento, valor, status: "aberto" });
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function darBaixaLancamentoAction(input: { lancamentoId: number; pagoEm: string; valorPagoReais: string }) {
  await requireSession();
  const [lanc] = await db.select().from(lancamentos).where(eq(lancamentos.id, input.lancamentoId));
  if (!lanc) return { error: "Lançamento não encontrado." };
  const valorPago = parseBRLToCents(input.valorPagoReais);
  if (valorPago <= 0) return { error: "Informe um valor válido." };

  await db.update(lancamentos).set({ status: "pago", pagoEm: input.pagoEm, valor: valorPago }).where(eq(lancamentos.id, input.lancamentoId));
  if (lanc.inscricaoId) {
    await db.update(inscricoes).set({ pago: true, valor: valorPago }).where(eq(inscricoes.id, lanc.inscricaoId));
  }
  revalidatePath("/");
  revalidatePath("/financeiro");
  revalidatePath("/campanhas");
  if (lanc.clienteId) revalidatePath(`/clientes/${lanc.clienteId}`);
  return { success: true };
}

export async function excluirLancamentoAction(id: number) {
  await requireSession();
  const [lanc] = await db.select().from(lancamentos).where(eq(lancamentos.id, id));
  if (!lanc || lanc.status === "pago") return { error: "Lançamento pago não pode ser excluído." };
  await db.delete(lancamentos).where(eq(lancamentos.id, id));
  revalidatePath("/");
  revalidatePath("/financeiro");
  return { success: true };
}

export async function salvarCampanhaAction(input: { id?: number; nome: string; local: string; dataInicio: string; dataFim: string; descontoPct: number; unidades: number; tiposServicoIds?: number[]; status?: "agendada" | "finalizada" | "cancelada" }) {
  await requireSession();
  if (!input.nome.trim() || !input.local.trim()) return { error: "Preencha nome e local." };
  if (!(input.unidades >= 1)) return { error: "Informe pelo menos 1 unidade." };
  if (!(input.descontoPct >= 0 && input.descontoPct <= 100)) return { error: "O desconto deve ficar entre 0 e 100%." };
  if (!input.dataInicio || !input.dataFim) return { error: "Informe as datas de início e fim." };
  if (input.dataFim < input.dataInicio) return { error: "A data de fim não pode ser antes da data de início." };

  // Só guarda tipos que existem no catálogo.
  const pedidos = Array.from(new Set(input.tiposServicoIds ?? []));
  const existentes = pedidos.length ? await db.select({ id: tiposServico.id }).from(tiposServico).where(inArray(tiposServico.id, pedidos)) : [];
  const tiposServicoIds = existentes.map((t) => t.id).sort((a, b) => a - b);

  const base = { nome: input.nome.trim(), local: input.local.trim(), dataInicio: input.dataInicio, dataFim: input.dataFim, descontoPct: Math.round(input.descontoPct), unidades: Math.round(input.unidades), tiposServicoIds };
  if (input.id) {
    await db.update(campanhas).set({ ...base, status: input.status || "agendada" }).where(eq(campanhas.id, input.id));
    revalidatePath("/campanhas");
    revalidatePath(`/campanhas/${input.id}`);
    return { success: true, id: input.id };
  }
  const [nova] = await db.insert(campanhas).values({ ...base, status: "agendada" }).returning();
  revalidatePath("/campanhas");
  return { success: true, id: nova.id };
}

export async function inscreverUnidadeCampanhaAction(input: { campanhaId: number; tipoServicoId?: number; unidade: string; morador: string; telefone: string; valorReais: string }) {
  await requireSession();
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, input.campanhaId));
  if (!camp) return { error: "Campanha não encontrada." };
  const inscritosAtuais = await db.select().from(inscricoes).where(eq(inscricoes.campanhaId, input.campanhaId));
  if (inscritosAtuais.length >= camp.unidades) return { error: `Limite máximo de ${camp.unidades} unidades atingido.` };
  if (!input.unidade.trim() || !input.morador.trim()) return { error: "Preencha unidade e morador." };
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido." };

  let tipoServicoId: number | null = null;
  if (input.tipoServicoId) {
    if (camp.tiposServicoIds.length > 0 && !camp.tiposServicoIds.includes(input.tipoServicoId)) return { error: "Esse serviço não faz parte desta campanha." };
    const [tipo] = await db.select({ id: tiposServico.id }).from(tiposServico).where(eq(tiposServico.id, input.tipoServicoId));
    if (!tipo) return { error: "Tipo de serviço não encontrado." };
    tipoServicoId = tipo.id;
  }

  const [nova] = await db.insert(inscricoes).values({ campanhaId: camp.id, tipoServicoId, unidade: input.unidade.trim(), morador: input.morador.trim(), telefone: input.telefone.trim(), valor, pago: false }).returning();
  await db.insert(lancamentos).values({ tipo: "receber", descricao: `Campanha ${camp.nome} · Unid. ${nova.unidade} (${nova.morador})`, inscricaoId: nova.id, vencimento: camp.dataInicio || todaySP(), valor, status: "aberto" });

  revalidatePath(`/campanhas/${camp.id}`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function marcarInscricaoPagaAction(inscricaoId: number) {
  await requireSession();
  const [insc] = await db.select().from(inscricoes).where(eq(inscricoes.id, inscricaoId));
  if (!insc) return { error: "Inscrição não encontrada." };
  const hoje = todaySP();
  await db.update(inscricoes).set({ pago: true }).where(eq(inscricoes.id, inscricaoId));
  await db.update(lancamentos).set({ status: "pago", pagoEm: hoje }).where(eq(lancamentos.inscricaoId, inscricaoId));
  revalidatePath(`/campanhas/${insc.campanhaId}`);
  revalidatePath("/campanhas");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

// --- GESTÃO DE TÉCNICOS ---
export async function salvarTecnicoAction(input: {
  nome: string;
  telefone: string;
  cor: string;
}) {
  await requireSession();
  const nm = (input.nome || "").trim();
  if (!nm) return { error: "Informe o nome do técnico." };

  const existentes = await db.select().from(tecnicos);
  if (existentes.some((t) => t.nome.toLowerCase() === nm.toLowerCase())) {
    return { error: "Já existe um técnico com esse nome." };
  }

  await db.insert(tecnicos).values({
    nome: nm,
    telefone: (input.telefone || "").trim() || "sem telefone",
    cor: input.cor || "#2F5FE0",
    ativo: true,
  });

  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/");
  return { success: true };
}

export async function alternarAtivoTecnicoAction(tecnicoId: number) {
  await requireSession();
  const [tech] = await db.select().from(tecnicos).where(eq(tecnicos.id, tecnicoId));
  if (!tech) return { error: "Técnico não encontrado." };

  if (tech.ativo) {
    const pendentes = await db
      .select()
      .from(servicos)
      .where(and(eq(servicos.tecnicoId, tecnicoId), eq(servicos.status, "agendado")));
    if (pendentes.length > 0) {
      return {
        error: `${tech.nome} tem ${pendentes.length} serviço(s) agendado(s). Reagende ou conclua antes de desativar.`,
      };
    }
  }

  await db
    .update(tecnicos)
    .set({ ativo: !tech.ativo })
    .where(eq(tecnicos.id, tecnicoId));

  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/");
  return { success: true, ativo: !tech.ativo, nome: tech.nome };
}

export async function excluirTecnicoAction(tecnicoId: number) {
  await requireSession();
  const [tech] = await db.select().from(tecnicos).where(eq(tecnicos.id, tecnicoId));
  if (!tech) return { error: "Técnico não encontrado." };

  const vinculados = await db
    .select()
    .from(servicos)
    .where(and(eq(servicos.tecnicoId, tecnicoId), eq(servicos.status, "agendado")));

  if (vinculados.length > 0) {
    return {
      error: `${tech.nome} possui ${vinculados.length} serviço(s) agendado(s). Reagende antes de remover.`,
    };
  }

  await db.update(servicos).set({ tecnicoId: null }).where(eq(servicos.tecnicoId, tecnicoId));
  await db.delete(tecnicos).where(eq(tecnicos.id, tecnicoId));

  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath("/");
  return { success: true };
}
