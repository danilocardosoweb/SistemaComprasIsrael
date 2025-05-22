-- Script para adicionar o campo descricao_parcelamento à tabela produtos
-- Execute este script no painel SQL do Supabase

-- Adicionar a coluna descricao_parcelamento se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' 
    AND column_name = 'descricao_parcelamento'
  ) THEN
    ALTER TABLE public.produtos 
    ADD COLUMN descricao_parcelamento TEXT;
  END IF;
END
$$;

-- Script de rollback (caso necessário)
-- ALTER TABLE public.produtos DROP COLUMN IF EXISTS descricao_parcelamento;
