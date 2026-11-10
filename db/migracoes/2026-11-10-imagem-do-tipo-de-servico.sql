-- Foto do tipo de servico (Servicos > catalogo). Aditivo e seguro: coluna nova, opcional.
-- Rodar no SQL Editor da Neon ANTES de publicar o codigo.
ALTER TABLE tipos_servico ADD COLUMN IF NOT EXISTS imagem text;
