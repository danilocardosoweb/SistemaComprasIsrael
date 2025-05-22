-- Script para adicionar o campo preco_variavel à tabela produtos
-- Execute este script no painel SQL do Supabase

-- Adicionar a coluna preco_variavel se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' 
    AND column_name = 'preco_variavel'
  ) THEN
    ALTER TABLE public.produtos 
    ADD COLUMN preco_variavel BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- Modificar a coluna preco para aceitar texto (para "Consulte Valores")
DO $$
BEGIN
  -- Verificar se a coluna é do tipo numérico
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' 
    AND column_name = 'preco'
    AND data_type = 'numeric'
  ) THEN
    -- Alterar o tipo da coluna para text
    ALTER TABLE public.produtos 
    ALTER COLUMN preco TYPE TEXT USING preco::TEXT;
  END IF;
END
$$;

-- Script de rollback (caso necessário)
-- ALTER TABLE public.produtos DROP COLUMN IF EXISTS preco_variavel;
-- ALTER TABLE public.produtos ALTER COLUMN preco TYPE NUMERIC USING preco::NUMERIC;
