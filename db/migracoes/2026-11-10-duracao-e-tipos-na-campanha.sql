-- Aplicar no SQL Editor da Neon ANTES de publicar o código que usa estas colunas.
-- Só adiciona colunas com valor padrão; não altera nem apaga dados. Pode rodar mais de uma vez.
ALTER TABLE tipos_servico ADD COLUMN IF NOT EXISTS duracao_min integer NOT NULL DEFAULT 60;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS duracao_min integer NOT NULL DEFAULT 60;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS tipos_servico_ids integer[] NOT NULL DEFAULT '{}';
ALTER TABLE inscricoes ADD COLUMN IF NOT EXISTS tipo_servico_id integer REFERENCES tipos_servico(id) ON DELETE SET NULL;
