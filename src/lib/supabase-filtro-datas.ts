// Função corrigida para o filtro de datas
// Substitua esta função pela existente no arquivo supabase.ts
// na seção api.vendas.listar

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
        // Configurar para o início do dia (00:00:00)
        const dataInicialObj = new Date(dataInicial);
        
        // Garantir que a data seja tratada como data local, não UTC
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
        dataFinalObj.setDate(dataFinalObj.getDate() + 1);
        
        // Garantir que a data seja tratada como data local, não UTC
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
