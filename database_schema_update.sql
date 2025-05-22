-- Atualização do Esquema do Banco de Dados - Divino Vendas App
-- Adição da coluna opcao_parcelamento à tabela produtos

-- Adicionar a coluna opcao_parcelamento à tabela produtos
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS opcao_parcelamento TEXT;

-- Comandos para rollback (caso seja necessário reverter as alterações)
/*
ALTER TABLE produtos
DROP COLUMN IF EXISTS opcao_parcelamento;
*/
