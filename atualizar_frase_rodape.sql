-- Atualizar a frase no banco de dados
UPDATE site_textos
SET 
  pagina_inicial_descricao = 'Mais que reservas, experiências que conectam propósito e exclusividade.',
  footer_descricao = 'Mais que reservas, experiências que conectam propósito e exclusividade.',
  updated_at = NOW()
WHERE id IS NOT NULL;

-- Verificar se a atualização foi bem-sucedida
SELECT id, pagina_inicial_descricao, footer_descricao, updated_at
FROM site_textos
ORDER BY updated_at DESC
LIMIT 1;
