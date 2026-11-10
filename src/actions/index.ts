"use server";

import { db } from "@/db";
import { requireSession } from "@/lib/session";
import { tecnicos, clientes, tiposServico, servicos, lancamentos, campanhas, inscricoes, user } from "@/db/schema";
import { eq, and, ne, like } from "drizzle-orm";
import { DURACAO_MIN, horaDe, minutosDe, sobrepoe } from "@/lib/agenda";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDaysISO, parseBRLToCents, todaySP } from "@/lib/utils";

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

export async function excluirClienteAction(id: number) {
  await requireSession();
  await db.delete(clientes).where(eq(clientes.id, id));
  revalidatePath("/clientes");
  return { success: true };
}

export async function salvarTipoServicoAction(input: { id?: number; nome: string; precoReais: string }) {
  await requireSession();
  if (!input.nome.trim()) return { error: "Informe o nome do tipo de serviço." };
  const preco = parseBRLToCents(input.precoReais);
  if (preco <= 0) return { error: "Informe um preço maior que zero." };
  if (input.id) {
    await db.update(tiposServico).set({ nome: input.nome.trim(), preco }).where(eq(tiposServico.id, input.id));
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
  await requireSession();
  if (!input.clienteId) return { error: "Selecione o cliente." };
  if (!input.tipoServicoId) return { error: "Selecione o tipo de serviço." };
  if (!input.tecnicoId) return { error: "Selecione o técnico." };
  if (!input.data || !input.hora) return { error: "Informe a data e o horário." };

  const dataHora = `${input.data}T${input.hora.slice(0, 5)}`;
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido." };

  // Cada serviço ocupa 1 hora: bloqueia qualquer sobreposição com outro serviço do
  // mesmo técnico no mesmo dia (não só o mesmo horário exato).
  const doDia = await db
    .select({ id: servicos.id, dataHora: servicos.dataHora, clienteNome: clientes.nome })
    .from(servicos)
    .innerJoin(clientes, eq(servicos.clienteId, clientes.id))
    .where(and(eq(servicos.tecnicoId, input.tecnicoId), like(servicos.dataHora, `${input.data}%`), ne(servicos.status, "cancelado"), input.id ? ne(servicos.id, input.id) : undefined));
  const inicio = minutosDe(dataHora);
  const conflito = doDia.find((s) => sobrepoe(inicio, minutosDe(s.dataHora)));

  if (conflito) {
    const [tech] = await db.select().from(tecnicos).where(eq(tecnicos.id, input.tecnicoId));
    const ini = minutosDe(conflito.dataHora);
    return { error: `Conflito: ${tech?.nome || "O técnico"} já tem ${conflito.clienteNome} das ${horaDe(ini)} às ${horaDe(ini + DURACAO_MIN)} nesse dia.` };
  }

  if (input.id) {
    await db.update(servicos).set({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, valor, observacoes: input.observacoes || "" }).where(eq(servicos.id, input.id));
  } else {
    await db.insert(servicos).values({ clienteId: input.clienteId, tipoServicoId: input.tipoServicoId, tecnicoId: input.tecnicoId, dataHora, valor, status: "agendado", observacoes: input.observacoes || "" });
  }
  revalidatePath("/");
  revalidatePath("/agenda");
  revalidatePath("/servicos");
  revalidatePath(`/clientes/${input.clienteId}`);
  return { success: true };
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

export async function salvarCampanhaAction(input: { id?: number; nome: string; local: string; dataInicio: string; dataFim: string; descontoPct: number; unidades: number; status?: "agendada" | "finalizada" | "cancelada" }) {
  await requireSession();
  if (!input.nome.trim() || !input.local.trim()) return { error: "Preencha nome e local." };
  if (input.unidades < 1) return { error: "Informe pelo menos 1 unidade." };

  if (input.id) {
    await db.update(campanhas).set({ nome: input.nome.trim(), local: input.local.trim(), dataInicio: input.dataInicio, dataFim: input.dataFim, descontoPct: input.descontoPct, unidades: input.unidades, status: input.status || "agendada" }).where(eq(campanhas.id, input.id));
    revalidatePath("/campanhas");
    return { success: true, id: input.id };
  } else {
    const [nova] = await db.insert(campanhas).values({ nome: input.nome.trim(), local: input.local.trim(), dataInicio: input.dataInicio, dataFim: input.dataFim, descontoPct: input.descontoPct, unidades: input.unidades, status: "agendada" }).returning();
    revalidatePath("/campanhas");
    return { success: true, id: nova.id };
  }
}

export async function inscreverUnidadeCampanhaAction(input: { campanhaId: number; unidade: string; morador: string; telefone: string; valorReais: string }) {
  await requireSession();
  const [camp] = await db.select().from(campanhas).where(eq(campanhas.id, input.campanhaId));
  if (!camp) return { error: "Campanha não encontrada." };
  const inscritosAtuais = await db.select().from(inscricoes).where(eq(inscricoes.campanhaId, input.campanhaId));
  if (inscritosAtuais.length >= camp.unidades) return { error: `Limite máximo de ${camp.unidades} unidades atingido.` };
  if (!input.unidade.trim() || !input.morador.trim()) return { error: "Preencha unidade e morador." };
  const valor = parseBRLToCents(input.valorReais);
  if (valor <= 0) return { error: "Informe um valor válido." };

  const [nova] = await db.insert(inscricoes).values({ campanhaId: camp.id, unidade: input.unidade.trim(), morador: input.morador.trim(), telefone: input.telefone.trim(), valor, pago: false }).returning();
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
