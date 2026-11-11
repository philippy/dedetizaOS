-- Rode DEPOIS que o código novo (que grava empresa_id explicitamente em todo insert) estiver no ar.
-- Sem o DEFAULT, qualquer insert que esquecer a empresa dá erro em vez de cair, em silêncio, na primeira empresa.

ALTER TABLE tecnicos ALTER COLUMN empresa_id DROP DEFAULT;
ALTER TABLE clientes ALTER COLUMN empresa_id DROP DEFAULT;
ALTER TABLE tipos_servico ALTER COLUMN empresa_id DROP DEFAULT;
ALTER TABLE servicos ALTER COLUMN empresa_id DROP DEFAULT;
ALTER TABLE campanhas ALTER COLUMN empresa_id DROP DEFAULT;
ALTER TABLE inscricoes ALTER COLUMN empresa_id DROP DEFAULT;
ALTER TABLE lancamentos ALTER COLUMN empresa_id DROP DEFAULT;
