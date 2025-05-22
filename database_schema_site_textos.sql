-- Script para criar a tabela site_textos
-- Execute este script no painel SQL do Supabase

-- Criar a tabela site_textos se não existir
CREATE TABLE IF NOT EXISTS public.site_textos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banner_titulo TEXT NOT NULL,
  banner_subtitulo TEXT NOT NULL,
  banner_descricao TEXT NOT NULL,
  banner_badge TEXT NOT NULL,
  banner_badge_completo TEXT NOT NULL,
  banner_local TEXT NOT NULL,
  banner_data TEXT NOT NULL,
  banner_botao_texto TEXT NOT NULL,
  pagina_inicial_titulo TEXT NOT NULL,
  pagina_inicial_subtitulo TEXT NOT NULL,
  pagina_inicial_descricao TEXT NOT NULL,
  footer_descricao TEXT NOT NULL,
  footer_contato_telefone TEXT NOT NULL,
  footer_contato_email TEXT NOT NULL,
  footer_contato_endereco TEXT NOT NULL,
  footer_copyright TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.site_textos ENABLE ROW LEVEL SECURITY;

-- Verificar e criar política para permitir acesso a todos os usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_textos' 
    AND policyname = 'Permitir acesso a usuários autenticados'
  ) THEN
    CREATE POLICY "Permitir acesso a usuários autenticados" ON public.site_textos
      FOR ALL
      TO authenticated
      USING (true);
  END IF;
END
$$;
  
-- Verificar e criar política para permitir leitura pública
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_textos' 
    AND policyname = 'Permitir leitura pública'
  ) THEN
    CREATE POLICY "Permitir leitura pública" ON public.site_textos
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END
$$;

-- Inserir dados padrão se a tabela estiver vazia
INSERT INTO public.site_textos (
  banner_titulo,
  banner_subtitulo,
  banner_descricao,
  banner_badge,
  banner_badge_completo,
  banner_local,
  banner_data,
  banner_botao_texto,
  pagina_inicial_titulo,
  pagina_inicial_subtitulo,
  pagina_inicial_descricao,
  footer_descricao,
  footer_contato_telefone,
  footer_contato_email,
  footer_contato_endereco,
  footer_copyright
)
SELECT
  'Congresso de Famílias 2025',
  'Famílias 2025',
  'Adquira produtos exclusivos do evento! Garanta sua reserva.',
  '2025',
  'Evento Especial 2025',
  'Igreja Vida Nova Hortolândia',
  'Maio',
  'Ver Produtos',
  'Sistema de Reservas',
  'Congresso de Famílias 2025',
  'Facilitando o acesso aos produtos exclusivos.',
  'Facilitando o acesso aos produtos exclusivos.',
  '(19) 99165-9221',
  'contato@geracaoisrael.com.br',
  'Av. Thereza Ana Cecon Breda, 2065 - Jardim das Colinas, Hortolândia - SP',
  'Geração Israel. Todos os direitos reservados.'
WHERE
  NOT EXISTS (SELECT 1 FROM public.site_textos LIMIT 1);

-- Script de rollback (caso necessário)
-- DROP TABLE IF EXISTS public.site_textos;
