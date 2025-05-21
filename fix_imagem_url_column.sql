-- Script para verificar e corrigir a coluna imagem_url na tabela produtos

-- 1. Verificar a estrutura atual da tabela produtos
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'produtos' 
ORDER BY ordinal_position;

-- 2. Verificar as permissões RLS (Row Level Security) na tabela produtos
SELECT * FROM pg_policies WHERE tablename = 'produtos';

-- 3. Corrigir o tipo da coluna imagem_url (se necessário)
-- ALTER TABLE produtos ALTER COLUMN imagem_url TYPE TEXT;

-- 4. Garantir que a coluna aceite valores nulos
ALTER TABLE produtos ALTER COLUMN imagem_url DROP NOT NULL;
