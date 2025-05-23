// Correção para o filtro de datas no arquivo supabase.ts
// Instruções para correção:
// 1. Localize a função api.vendas.listar no arquivo supabase.ts
// 2. Substitua a implementação atual pela implementação abaixo

/*
listar: async (dataInicial?: string, dataFinal?: string) => {
  try {
    // Iniciar a consulta básica
    let query = supabase
      .from('vendas')
      .select('*');
    
    // Aplicar filtros de data se fornecidos
    if (dataInicial) {
      try {
        // Converter para o formato ISO para garantir compatibilidade
        const dataInicialObj = new Date(dataInicial);
        // Garantir que estamos usando a data local, não UTC
        const dataInicialFormatada = dataInicialObj.toISOString().split('T')[0];
        
        // Usar o formato ISO para garantir compatibilidade com o banco
        query = query.gte('data_venda', dataInicialFormatada);
        console.log('Data inicial formatada:', dataInicialFormatada);
      } catch (erro) {
        console.error('Erro ao processar data inicial:', erro);
      }
    }
    
    if (dataFinal) {
      try {
        // Converter para o formato ISO para garantir compatibilidade
        const dataFinalObj = new Date(dataFinal);
        
        // Adicionar um dia para incluir todo o dia final
        // Isso é necessário porque a data final deve incluir todo o dia até 23:59:59
        dataFinalObj.setDate(dataFinalObj.getDate() + 1);
        
        // Garantir que estamos usando a data local, não UTC
        const dataFinalFormatada = dataFinalObj.toISOString().split('T')[0];
        
        // Usar o formato ISO para garantir compatibilidade com o banco
        query = query.lt('data_venda', dataFinalFormatada);
        console.log('Data final formatada:', dataFinalFormatada);
      } catch (erro) {
        console.error('Erro ao processar data final:', erro);
      }
    }
    
    // Adicionar log para depuração
    console.log('Filtro de datas aplicado:', { dataInicial, dataFinal });
    
    // Executar a consulta
    const { data, error } = await query.order('data_venda', { ascending: false });
    
    if (error) throw error;
    
    // Log para verificar os resultados
    console.log(`Encontradas ${data?.length || 0} vendas com o filtro de datas`);
    
    return data as Venda[];
  } catch (erro) {
    console.error('Erro ao listar vendas com filtro de datas:', erro);
    throw erro;
  }
}
*/
