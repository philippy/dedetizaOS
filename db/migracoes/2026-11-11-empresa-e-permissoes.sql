-- Configuracoes: dados da empresa, chave Pix e papeis de acesso (admin, financeiro, normal).
-- Aditivo e seguro: so cria tabelas novas e insere dados iniciais. Nao altera nenhuma tabela existente.
-- Pode rodar mais de uma vez (IF NOT EXISTS / ON CONFLICT / WHERE NOT EXISTS).
-- Rodar no SQL Editor da Neon ANTES de publicar o codigo.

CREATE TABLE IF NOT EXISTS empresas (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  cnpj text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  responsavel text NOT NULL DEFAULT '',
  pix_tipo text NOT NULL DEFAULT 'CNPJ',
  pix_chave text NOT NULL DEFAULT '',
  pix_favorecido text NOT NULL DEFAULT '',
  pix_atualizado_em timestamp,
  pix_atualizado_por text REFERENCES "user"(id) ON DELETE SET NULL,
  atualizado_em timestamp NOT NULL DEFAULT now(),
  atualizado_por text REFERENCES "user"(id) ON DELETE SET NULL,
  criado_em timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membros (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  empresa_id integer NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  papel text NOT NULL DEFAULT 'normal' CHECK (papel IN ('admin', 'financeiro', 'normal')),
  telefone text NOT NULL DEFAULT '',
  criado_em timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membros_empresa_idx ON membros (empresa_id);

-- Dados iniciais. A chave Pix abaixo e FICTICIA (CNPJ de exemplo): troque em Dados da empresa antes de cobrar.
INSERT INTO empresas (nome, pix_tipo, pix_chave, pix_favorecido)
SELECT 'Dedetizadora Impacto', 'CNPJ', '00.000.000/0001-00', 'Dedetizadora Impacto'
WHERE NOT EXISTS (SELECT 1 FROM empresas);

-- O primeiro usuario (o dono, que criou a conta) vira administrador; qualquer outro ja existente vira normal.
INSERT INTO membros (user_id, empresa_id, papel)
SELECT u.id, (SELECT min(id) FROM empresas),
       CASE WHEN u.id = (SELECT id FROM "user" ORDER BY created_at, id LIMIT 1) THEN 'admin' ELSE 'normal' END
FROM "user" u
ON CONFLICT (user_id) DO NOTHING;
