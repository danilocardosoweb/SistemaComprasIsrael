-- Script para adicionar os campos de imagens do carrossel 3D à tabela site_textos
-- Data: 22/05/2025
-- Autor: Danilo Cardoso

-- Verificar se a tabela site_textos existe e criá-la se não existir
CREATE TABLE IF NOT EXISTS site_textos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_titulo TEXT DEFAULT 'Congresso de Famílias 2025',
    banner_subtitulo TEXT DEFAULT 'Famílias 2025',
    banner_descricao TEXT DEFAULT 'Adquira produtos exclusivos do evento! Garanta sua reserva.',
    banner_badge TEXT DEFAULT '2025',
    banner_badge_completo TEXT DEFAULT 'Evento Especial 2025',
    banner_local TEXT DEFAULT 'Igreja Vida Nova Hortolândia',
    banner_data TEXT DEFAULT 'Maio',
    banner_botao_texto TEXT DEFAULT 'Ver Produtos',
    pagina_inicial_titulo TEXT DEFAULT 'Sistema de Reservas',
    pagina_inicial_subtitulo TEXT DEFAULT 'Congresso de Famílias 2025',
    pagina_inicial_descricao TEXT DEFAULT 'Mais que reservas, experiências que conectam propósito e exclusividade.',
    footer_descricao TEXT DEFAULT 'Mais que reservas, experiências que conectam propósito e exclusividade.',
    footer_contato_telefone TEXT DEFAULT '(19) 99165-9221',
    footer_contato_email TEXT DEFAULT 'contato@geracaoisrael.com.br',
    footer_contato_endereco TEXT DEFAULT 'Av. Thereza Ana Cecon Breda, 2065 - Jardim das Colinas, Hortolândia - SP',
    footer_copyright TEXT DEFAULT 'Geração Israel. Todos os direitos reservados.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar as colunas para as imagens do carrossel 3D
ALTER TABLE site_textos ADD COLUMN IF NOT EXISTS banner_imagem TEXT DEFAULT '/Image/Congresso_2025.png';
ALTER TABLE site_textos ADD COLUMN IF NOT EXISTS banner_imagem_2 TEXT DEFAULT '/Image/Congresso_2025.png';
ALTER TABLE site_textos ADD COLUMN IF NOT EXISTS banner_imagem_3 TEXT DEFAULT '/Image/Congresso_2025.png';

-- Inserir um registro padrão se a tabela estiver vazia
INSERT INTO site_textos (banner_imagem, banner_imagem_2, banner_imagem_3)
SELECT '/Image/Congresso_2025.png', '/Image/Congresso_2025.png', '/Image/Congresso_2025.png'
WHERE NOT EXISTS (SELECT 1 FROM site_textos);

-- Atualizar os registros existentes para definir os valores padrão para as imagens
UPDATE site_textos SET banner_imagem = '/Image/Congresso_2025.png' WHERE banner_imagem IS NULL;
UPDATE site_textos SET banner_imagem_2 = '/Image/Congresso_2025.png' WHERE banner_imagem_2 IS NULL;
UPDATE site_textos SET banner_imagem_3 = '/Image/Congresso_2025.png' WHERE banner_imagem_3 IS NULL;

-- Configurar as políticas de segurança para a tabela
DO $$
BEGIN
    -- Habilitar RLS (Row Level Security) na tabela
    ALTER TABLE site_textos ENABLE ROW LEVEL SECURITY;
    
    -- Política para permitir SELECT para todos os usuários
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_textos' AND policyname = 'site_textos_select_policy'
    ) THEN
        CREATE POLICY site_textos_select_policy ON site_textos FOR SELECT USING (true);
    END IF;

    -- Política para permitir INSERT/UPDATE/DELETE apenas para usuários autenticados
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'site_textos' AND policyname = 'site_textos_modify_policy'
    ) THEN
        CREATE POLICY site_textos_modify_policy ON site_textos 
        FOR ALL 
        USING (auth.role() = 'authenticated');
    END IF;
END
$$;

-- Comandos de ROLLBACK (se necessário)
/*
ALTER TABLE site_textos DROP COLUMN IF EXISTS banner_imagem_3;
ALTER TABLE site_textos DROP COLUMN IF EXISTS banner_imagem_2;
ALTER TABLE site_textos DROP COLUMN IF EXISTS banner_imagem;
*/
