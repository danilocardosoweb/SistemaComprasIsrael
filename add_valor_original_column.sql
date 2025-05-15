-- Adicionar coluna valor_original à tabela vendas
ALTER TABLE vendas ADD COLUMN valor_original DECIMAL(10, 2);

-- Caso precise reverter a alteração
-- ALTER TABLE vendas DROP COLUMN valor_original;
