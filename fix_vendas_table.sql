-- Primeiro, vamos fazer backup dos dados existentes
CREATE TABLE IF NOT EXISTS vendas_backup AS
SELECT * FROM vendas;

-- Agora, vamos dropar a tabela vendas e suas dependências
DROP TABLE IF EXISTS vendas CASCADE;

-- Recriar a tabela vendas com a coluna status_pagamento
CREATE TABLE vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NULL,
    cliente_nome TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    forma_pagamento TEXT NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'Pendente',
    comprovante_url TEXT NULL,
    data_venda TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- Restaurar os dados do backup, definindo status_pagamento como 'Pendente' para registros existentes
INSERT INTO vendas (
    id, 
    cliente_id, 
    cliente_nome, 
    total, 
    forma_pagamento, 
    status_pagamento,
    comprovante_url, 
    data_venda, 
    created_at
)
SELECT 
    id, 
    cliente_id, 
    cliente_nome, 
    total, 
    forma_pagamento, 
    'Pendente' as status_pagamento,
    comprovante_url, 
    data_venda, 
    created_at
FROM vendas_backup;

-- Recriar as views
DROP VIEW IF EXISTS vendas_hoje CASCADE;
CREATE VIEW vendas_hoje AS
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
DROP VIEW IF EXISTS vendas_mes_atual CASCADE;
CREATE VIEW vendas_mes_atual AS
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

-- View para vendas mensais
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

-- Opcional: Dropar a tabela de backup após confirmar que tudo está ok
-- DROP TABLE vendas_backup;
