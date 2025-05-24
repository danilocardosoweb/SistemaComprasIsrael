-- Adição do campo retira_produto à tabela vendas
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS retira_produto TEXT DEFAULT 'Reserva';

-- Atualização dos registros existentes para definir o valor padrão
UPDATE vendas SET retira_produto = 'Reserva' WHERE retira_produto IS NULL;

-- Rollback (caso necessário)
-- ALTER TABLE vendas DROP COLUMN IF EXISTS retira_produto;
