-- Usuarios criados pelo administrador entram com senha provisoria e precisam troca-la no primeiro acesso.
-- Aditivo e seguro: so uma coluna nova com DEFAULT. Quem ja existe fica como false (sem troca obrigatoria).
-- Rodar no SQL Editor da Neon ANTES de publicar o codigo.
ALTER TABLE membros ADD COLUMN IF NOT EXISTS senha_provisoria boolean NOT NULL DEFAULT false;
