import { sql } from "drizzle-orm";
import { db } from "@/db";

// Remove as cópias repetidas dos DADOS DE DEMONSTRAÇÃO (o auto-seed antigo rodou
// mais de uma vez em paralelo). Mantém a cópia de menor id de cada grupo e
// redireciona as referências para ela antes de apagar. Só mexe em registros com
// os nomes do seed; dados cadastrados de verdade ficam como estão.
// Tudo roda num único bloco (uma transação): ou faz tudo, ou nada.
// Em modo simulação o bloco termina com erro de propósito, o que desfaz tudo e
// devolve as contagens.

export type DedupeResultado = Record<
  "tecnicos" | "tipos_servico" | "clientes" | "campanhas" | "inscricoes" | "servicos" | "lancamentos",
  number
>;

const BLOCO = (aplicar: boolean) => `
DO $$
DECLARE
  n_tec int; n_tip int; n_cli int; n_camp int; n_insc int; n_svc int; n_lanc int;
  demo_cli text[] := ARRAY['Padaria Sol Ltda','Mercado Bom Preço','Clínica Vida Saúde','Marina Souza (Residência)','Carlos Eduardo Menezes'];
  demo_tec text[] := ARRAY['Marcos','Ana','Paulo'];
  demo_tip text[] := ARRAY['Baratas e formigas','Roedores','Cupins','Pulgas e carrapatos','Monitoramento'];
  demo_forn text[] := ARRAY['Aliança Químicos','Posto Rede Brasil','Folha de Pagamento'];
BEGIN
  -- 1. Técnicos (mesmo nome)
  CREATE TEMP TABLE m_tec ON COMMIT DROP AS
    SELECT id, min(id) OVER (PARTITION BY lower(nome)) AS keep FROM tecnicos WHERE nome = ANY(demo_tec);
  UPDATE servicos s SET tecnico_id = m.keep FROM m_tec m WHERE s.tecnico_id = m.id AND m.id <> m.keep;
  DELETE FROM tecnicos t USING m_tec m WHERE t.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_tec = ROW_COUNT;

  -- 2. Tipos de serviço (mesmo nome e preço)
  CREATE TEMP TABLE m_tip ON COMMIT DROP AS
    SELECT id, min(id) OVER (PARTITION BY nome, preco) AS keep FROM tipos_servico WHERE nome = ANY(demo_tip);
  UPDATE servicos s SET tipo_servico_id = m.keep FROM m_tip m WHERE s.tipo_servico_id = m.id AND m.id <> m.keep;
  DELETE FROM tipos_servico t USING m_tip m WHERE t.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_tip = ROW_COUNT;

  -- 3. Clientes (mesmo tipo, nome, documento e WhatsApp)
  CREATE TEMP TABLE m_cli ON COMMIT DROP AS
    SELECT id, min(id) OVER (PARTITION BY tipo, nome, documento, whatsapp) AS keep FROM clientes WHERE nome = ANY(demo_cli);
  UPDATE servicos s SET cliente_id = m.keep FROM m_cli m WHERE s.cliente_id = m.id AND m.id <> m.keep;
  UPDATE lancamentos l SET cliente_id = m.keep FROM m_cli m WHERE l.cliente_id = m.id AND m.id <> m.keep;
  DELETE FROM clientes c USING m_cli m WHERE c.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_cli = ROW_COUNT;

  -- 4. Campanhas (mesmo nome, local e datas)
  CREATE TEMP TABLE m_camp ON COMMIT DROP AS
    SELECT id, min(id) OVER (PARTITION BY nome, local, data_inicio, data_fim) AS keep FROM campanhas WHERE nome = 'Condomínio Vila Verde';
  UPDATE inscricoes i SET campanha_id = m.keep FROM m_camp m WHERE i.campanha_id = m.id AND m.id <> m.keep;
  DELETE FROM campanhas c USING m_camp m WHERE c.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_camp = ROW_COUNT;

  -- 5. Inscrições repetidas dentro da campanha de demonstração
  CREATE TEMP TABLE m_insc ON COMMIT DROP AS
    SELECT i.id, min(i.id) OVER (PARTITION BY i.campanha_id, i.unidade, i.morador, i.telefone, i.valor, i.pago) AS keep
    FROM inscricoes i JOIN campanhas c ON c.id = i.campanha_id WHERE c.nome = 'Condomínio Vila Verde';
  UPDATE lancamentos l SET inscricao_id = m.keep FROM m_insc m WHERE l.inscricao_id = m.id AND m.id <> m.keep;
  DELETE FROM inscricoes i USING m_insc m WHERE i.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_insc = ROW_COUNT;

  -- 6. Serviços repetidos dos clientes de demonstração
  CREATE TEMP TABLE m_svc ON COMMIT DROP AS
    SELECT s.id, min(s.id) OVER (PARTITION BY s.cliente_id, s.tipo_servico_id, s.tecnico_id, s.data_hora, s.valor, s.status, s.observacoes) AS keep
    FROM servicos s JOIN clientes c ON c.id = s.cliente_id WHERE c.nome = ANY(demo_cli);
  UPDATE lancamentos l SET servico_id = m.keep FROM m_svc m WHERE l.servico_id = m.id AND m.id <> m.keep;
  DELETE FROM servicos s USING m_svc m WHERE s.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_svc = ROW_COUNT;

  -- 7. Lançamentos repetidos ligados à demonstração
  CREATE TEMP TABLE m_lanc ON COMMIT DROP AS
    SELECT l.id, min(l.id) OVER (PARTITION BY l.tipo, l.descricao, l.cliente_id, l.fornecedor, l.servico_id, l.inscricao_id, l.vencimento, l.valor, l.status, l.pago_em) AS keep
    FROM lancamentos l
    LEFT JOIN clientes c ON c.id = l.cliente_id
    WHERE c.nome = ANY(demo_cli)
       OR l.fornecedor = ANY(demo_forn)
       OR l.descricao LIKE 'Campanha Condomínio Vila Verde%';
  DELETE FROM lancamentos l USING m_lanc m WHERE l.id = m.id AND m.id <> m.keep;
  GET DIAGNOSTICS n_lanc = ROW_COUNT;

  ${aplicar ? "" : `RAISE EXCEPTION 'SIMULACAO:%', json_build_object(
    'tecnicos', n_tec, 'tipos_servico', n_tip, 'clientes', n_cli, 'campanhas', n_camp,
    'inscricoes', n_insc, 'servicos', n_svc, 'lancamentos', n_lanc)::text;`}
  RAISE NOTICE 'APLICADO:%', json_build_object(
    'tecnicos', n_tec, 'tipos_servico', n_tip, 'clientes', n_cli, 'campanhas', n_camp,
    'inscricoes', n_insc, 'servicos', n_svc, 'lancamentos', n_lanc)::text;
END $$;
`;

async function contar(): Promise<Record<string, number>> {
  const r = await db.execute(sql.raw(`SELECT
    (SELECT count(*) FROM tecnicos)::int AS tecnicos, (SELECT count(*) FROM tipos_servico)::int AS tipos_servico,
    (SELECT count(*) FROM clientes)::int AS clientes, (SELECT count(*) FROM campanhas)::int AS campanhas,
    (SELECT count(*) FROM inscricoes)::int AS inscricoes, (SELECT count(*) FROM servicos)::int AS servicos,
    (SELECT count(*) FROM lancamentos)::int AS lancamentos`));
  const rows = (r as unknown as { rows?: Record<string, number>[] }).rows ?? (r as unknown as Record<string, number>[]);
  return rows[0];
}

export async function simularDedupe(): Promise<{ remover: DedupeResultado; total: Record<string, number> }> {
  const total = await contar();
  try {
    await db.execute(sql.raw(BLOCO(false)));
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e) + " " + String((e as { cause?: { message?: string } })?.cause?.message ?? "");
    const m = msg.match(/SIMULACAO:(\{.*?\})/);
    if (m) return { remover: JSON.parse(m[1]) as DedupeResultado, total };
    throw e;
  }
  throw new Error("Simulação não retornou resultado.");
}

export async function aplicarDedupe(): Promise<{ antes: Record<string, number>; depois: Record<string, number> }> {
  const antes = await contar();
  await db.execute(sql.raw(BLOCO(true)));
  const depois = await contar();
  return { antes, depois };
}
