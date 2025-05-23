import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = 'https://xyzcompany.supabase.co';
const supabaseKey = 'seu_supabase_key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function atualizarFraseRodape() {
  try {
    // Atualizar a frase no banco de dados
    const { data, error } = await supabase
      .from('site_textos')
      .update({
        pagina_inicial_descricao: 'Mais que reservas, experiências que conectam propósito e exclusividade.',
        footer_descricao: 'Mais que reservas, experiências que conectam propósito e exclusividade.'
      })
      .eq('id', '1'); // Assumindo que o ID do registro é 1

    if (error) {
      console.error('Erro ao atualizar a frase:', error);
    } else {
      console.log('Frase atualizada com sucesso!', data);
    }
  } catch (error) {
    console.error('Erro na execução:', error);
  }
}

atualizarFraseRodape();
