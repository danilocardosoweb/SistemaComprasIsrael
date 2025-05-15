-- Esquema do Banco de Dados - Divino Vendas App
-- Este arquivo contém os comandos SQL para criar as tabelas no Supabase

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para facilitar buscas por nome de cliente
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    estoque INTEGER NOT NULL DEFAULT 0,
    descricao TEXT,
    categoria TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para facilitar buscas em produtos
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (nome);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria);

-- Tabela de vendas
DROP TABLE IF EXISTS vendas CASCADE;
CREATE TABLE vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NULL, -- Explicitamente permitindo NULL
    cliente_nome TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    forma_pagamento TEXT NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'Pendente', -- Status do pagamento: Feito, Pendente, Realizado
    comprovante_url TEXT NULL, -- Explicitamente permitindo NULL
    data_venda TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- Views para o Dashboard

-- View para vendas do dia atual
CREATE OR REPLACE VIEW vendas_hoje AS
WITH vendas_diarias AS (
    SELECT 
        DATE(data_venda) as data,
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as quantidade
    FROM vendas
    WHERE DATE(data_venda) >= CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(data_venda)
)
SELECT 
    COALESCE(hoje.total, 0) as total,
    COALESCE(hoje.quantidade, 0) as quantidade,
    CASE 
        WHEN COALESCE(ontem.total, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(hoje.total, 0) - COALESCE(ontem.total, 0)) / COALESCE(ontem.total, 1) * 100)::numeric, 2)
    END as variacao_percentual
FROM (
    SELECT total, quantidade
    FROM vendas_diarias
    WHERE data = CURRENT_DATE
) hoje
LEFT JOIN (
    SELECT total
    FROM vendas_diarias
    WHERE data = CURRENT_DATE - INTERVAL '1 day'
) ontem ON true;

-- View para vendas do mês atual
CREATE OR REPLACE VIEW vendas_mes_atual AS
WITH vendas_mensais AS (
    SELECT 
        DATE_TRUNC('month', data_venda) as mes,
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as quantidade
    FROM vendas
    WHERE DATE_TRUNC('month', data_venda) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    GROUP BY DATE_TRUNC('month', data_venda)
)
SELECT 
    COALESCE(atual.total, 0) as total,
    COALESCE(atual.quantidade, 0) as quantidade,
    CASE 
        WHEN COALESCE(anterior.total, 0) = 0 THEN 0
        ELSE ROUND(((COALESCE(atual.total, 0) - COALESCE(anterior.total, 0)) / COALESCE(anterior.total, 1) * 100)::numeric, 2)
    END as variacao_percentual
FROM (
    SELECT total, quantidade
    FROM vendas_mensais
    WHERE mes = DATE_TRUNC('month', CURRENT_DATE)
) atual
LEFT JOIN (
    SELECT total
    FROM vendas_mensais
    WHERE mes = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
) anterior ON true;

-- View para vendas por mês (últimos 12 meses)
DROP VIEW IF EXISTS vendas_mensais CASCADE;
CREATE VIEW vendas_mensais AS
SELECT 
    DATE_TRUNC('month', data_venda) as mes,
    COALESCE(SUM(total), 0) as total,
    COUNT(*) as quantidade
FROM vendas
WHERE data_venda >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', data_venda)
ORDER BY mes;

-- View para formas de pagamento
DROP VIEW IF EXISTS formas_pagamento_stats CASCADE;
CREATE VIEW formas_pagamento_stats AS
SELECT 
    forma_pagamento,
    COUNT(*) as quantidade,
    ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM vendas), 0) * 100)::numeric, 2) as percentual
FROM vendas
WHERE DATE_TRUNC('month', data_venda) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY forma_pagamento;

-- View para status de pagamento
DROP VIEW IF EXISTS status_pagamento_stats CASCADE;
CREATE VIEW status_pagamento_stats AS
SELECT 
    status_pagamento,
    COUNT(*) as quantidade,
    ROUND((COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM vendas), 0) * 100)::numeric, 2) as percentual
FROM vendas
WHERE DATE_TRUNC('month', data_venda) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY status_pagamento;

-- View para produtos mais vendidos
DROP VIEW IF EXISTS produtos_mais_vendidos CASCADE;
CREATE VIEW produtos_mais_vendidos AS
SELECT 
    p.nome as produto_nome,
    SUM(iv.quantidade) as quantidade_total,
    SUM(iv.subtotal) as valor_total
FROM itens_venda iv
JOIN produtos p ON p.id = iv.produto_id
JOIN vendas v ON v.id = iv.venda_id
WHERE DATE_TRUNC('month', v.data_venda) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.nome
ORDER BY quantidade_total DESC
LIMIT 5;

-- View para últimas vendas
DROP VIEW IF EXISTS ultimas_vendas CASCADE;
CREATE VIEW ultimas_vendas AS
SELECT 
    v.id,
    v.cliente_nome,
    v.total,
    v.data_venda,
    v.forma_pagamento,
    v.status_pagamento
FROM vendas v
ORDER BY v.data_venda DESC
LIMIT 10;

-- Índices para facilitar buscas em vendas
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas (data_venda DESC);

-- Tabela de itens de venda
CREATE TABLE IF NOT EXISTS itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL,
    produto_id UUID,
    produto_nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
);

-- Índices para facilitar buscas em itens de venda
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON itens_venda (produto_id);

-- Remover o trigger existente se ele já existir
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_apos_venda ON itens_venda;

-- Remover a função existente se ela já existir
DROP FUNCTION IF EXISTS atualizar_estoque_apos_venda();

-- Trigger para atualizar o estoque quando um item de venda for inserido
CREATE OR REPLACE FUNCTION atualizar_estoque_apos_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o estoque do produto
    UPDATE produtos
    SET estoque = estoque - NEW.quantidade
    WHERE id = NEW.produto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_estoque_apos_venda
AFTER INSERT ON itens_venda
FOR EACH ROW
EXECUTE FUNCTION atualizar_estoque_apos_venda();

-- Comandos para rollback (caso seja necessário reverter as alterações)
/*
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_apos_venda ON itens_venda;
DROP FUNCTION IF EXISTS atualizar_estoque_apos_venda();
DROP TABLE IF EXISTS itens_venda;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS clientes;
*/
