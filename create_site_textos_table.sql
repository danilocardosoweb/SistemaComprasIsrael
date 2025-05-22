-- Função para criar a tabela site_textos se não existir
CREATE OR REPLACE FUNCTION create_site_textos_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se a tabela já existe
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'site_textos'
  ) THEN
    -- Criar a tabela
    CREATE TABLE public.site_textos (
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
    
    -- Criar política para permitir acesso a todos os usuários autenticados
    CREATE POLICY "Permitir acesso a usuários autenticados" ON public.site_textos
      FOR ALL
      TO authenticated
      USING (true);
      
    -- Criar política para permitir leitura pública
    CREATE POLICY "Permitir leitura pública" ON public.site_textos
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END;
$$;
