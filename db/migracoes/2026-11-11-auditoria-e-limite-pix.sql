-- Registro de atividades (sem FK para o usuário: o histórico sobrevive à remoção da conta)
-- e controle de tentativas de senha na troca da chave Pix. Só adiciona; não altera dados existentes.

CREATE TABLE IF NOT EXISTS auditoria (
  id serial PRIMARY KEY,
  empresa_id integer NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  quando timestamp NOT NULL DEFAULT now(),
  ator_id text NOT NULL,
  ator_nome text NOT NULL,
  ator_email text NOT NULL,
  acao text NOT NULL,
  alvo_id text,
  alvo_nome text,
  alvo_email text,
  detalhe text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS auditoria_empresa_quando_idx ON auditoria (empresa_id, quando);

ALTER TABLE membros ADD COLUMN IF NOT EXISTS pix_falhas integer NOT NULL DEFAULT 0;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS pix_ultima_falha timestamp;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS pix_bloqueado_ate timestamp;
