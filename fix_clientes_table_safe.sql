-- Remover tabela se existir
DROP TABLE IF EXISTS clientes CASCADE;

-- Criar tabela de clientes
CREATE TABLE clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    email text,
    telefone text,
    observacao text,
    geracao text CHECK (geracao IN ('Israel', 'Atos', 'Efraim', 'Zoe', 'José', 'Josué', 'Kairós', 'Zion', 'Samuel', 'Moriá')),
    lider_direto text,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_geracao ON clientes(geracao);
