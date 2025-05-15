DO $$ 
BEGIN
    /* Adicionar coluna status se não existir */
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'vendas' AND column_name = 'status') THEN
        ALTER TABLE vendas 
        ADD COLUMN status TEXT CHECK (status IN ('Pendente', 'Finalizada', 'Cancelada')) 
        DEFAULT 'Pendente';
    END IF;

    /* Atualizar status baseado no status_pagamento */
    UPDATE vendas 
    SET status = CASE 
        WHEN status_pagamento IN ('Feito', 'Realizado') THEN 'Finalizada'
        ELSE 'Pendente'
    END
    WHERE status IS NULL;
END $$;
