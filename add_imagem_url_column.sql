-- Script para adicionar a coluna imagem_url à tabela produtos
ALTER TABLE produtos ADD COLUMN imagem_url TEXT;

-- Rollback (caso necessário)
-- ALTER TABLE produtos DROP COLUMN imagem_url;
