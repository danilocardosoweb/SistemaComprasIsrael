-- Script para adicionar as colunas do carrossel 3D à tabela site_textos
-- Data: 22/05/2025
-- Autor: Danilo Cardoso

-- Adicionar as colunas para as imagens do carrossel 3D (versão simplificada)
ALTER TABLE site_textos ADD COLUMN IF NOT EXISTS banner_imagem_2 TEXT DEFAULT '/Image/Congresso_2025.png';
ALTER TABLE site_textos ADD COLUMN IF NOT EXISTS banner_imagem_3 TEXT DEFAULT '/Image/Congresso_2025.png';

-- Atualizar os registros existentes para definir os valores padrão
UPDATE site_textos SET banner_imagem_2 = '/Image/Congresso_2025.png' WHERE banner_imagem_2 IS NULL;
UPDATE site_textos SET banner_imagem_3 = '/Image/Congresso_2025.png' WHERE banner_imagem_3 IS NULL;

-- Verificar se existem registros na tabela e inserir um registro padrão se estiver vazia
INSERT INTO site_textos (
    banner_titulo, 
    banner_subtitulo, 
    banner_descricao, 
    banner_badge, 
    banner_badge_completo, 
    banner_local, 
    banner_data, 
    banner_botao_texto, 
    banner_imagem,
    banner_imagem_2,
    banner_imagem_3,
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
    '/Image/Congresso_2025.png',
    '/Image/Congresso_2025.png',
    '/Image/Congresso_2025.png',
    'Sistema de Reservas',
    'Congresso de Famílias 2025',
    'Facilitando o acesso aos produtos exclusivos.',
    'Facilitando o acesso aos produtos exclusivos.',
    '(19) 99165-9221',
    'contato@geracaoisrael.com.br',
    'Av. Thereza Ana Cecon Breda, 2065 - Jardim das Colinas, Hortolândia - SP',
    'Geração Israel. Todos os direitos reservados.'
WHERE NOT EXISTS (SELECT 1 FROM site_textos);

-- Comandos de ROLLBACK (se necessário)
/*
ALTER TABLE site_textos DROP COLUMN IF EXISTS banner_imagem_3;
ALTER TABLE site_textos DROP COLUMN IF EXISTS banner_imagem_2;
*/
