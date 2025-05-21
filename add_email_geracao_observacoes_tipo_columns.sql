-- Adicionar colunas email, geracao, observacoes e tipo à tabela vendas
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS geracao TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Atualizar as vendas existentes para tipo 'venda' por padrão
UPDATE vendas SET tipo = 'venda' WHERE tipo IS NULL;

-- Comandos para rollback (caso seja necessário reverter as alterações)
/*
ALTER TABLE vendas 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS geracao,
DROP COLUMN IF EXISTS observacoes,
DROP COLUMN IF EXISTS tipo;
*/
