-- Adicionar coluna telefone à tabela vendas
ALTER TABLE vendas ADD COLUMN telefone TEXT;

-- Atualizar registros existentes com valor padrão (opcional)
UPDATE vendas SET telefone = '' WHERE telefone IS NULL;

-- Script de rollback caso necessário
-- ALTER TABLE vendas DROP COLUMN telefone;
