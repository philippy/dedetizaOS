-- empresa_id nas tabelas de negócio (preparo para atender mais de uma empresa).
-- Todas as linhas que existem hoje passam a pertencer à PRIMEIRA empresa cadastrada (a Dedetizadora Impacto).
-- Rode ANTES de publicar o código. É seguro com o código antigo ainda no ar: o DEFAULT provisório preenche a
-- coluna nos inserts antigos. Depois do deploy, rode 2026-11-11-empresa-id-remover-default.sql.

DO $$
DECLARE
  eid integer;
  t text;
BEGIN
  SELECT id INTO eid FROM empresas ORDER BY id LIMIT 1;
  IF eid IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa cadastrada. Rode antes db/migracoes/2026-11-11-empresa-e-permissoes.sql';
  END IF;

  FOREACH t IN ARRAY ARRAY['tecnicos','clientes','tipos_servico','servicos','campanhas','inscricoes','lancamentos'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empresa_id integer REFERENCES empresas(id) ON DELETE RESTRICT', t);
    EXECUTE format('UPDATE %I SET empresa_id = %s WHERE empresa_id IS NULL', t, eid);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET DEFAULT %s', t, eid);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (empresa_id)', t || '_empresa_idx', t);
  END LOOP;
END $$;
