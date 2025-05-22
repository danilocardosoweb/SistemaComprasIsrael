/**
 * Utilitário para formatar preços que podem ser strings ou números
 */

/**
 * Formata um preço que pode ser string ou número para exibição
 * @param preco - O preço a ser formatado (pode ser string ou número)
 * @param casasDecimais - Número de casas decimais (padrão: 2)
 * @returns String formatada do preço
 */
export function formatarPreco(preco: string | number, casasDecimais: number = 2): string {
  // Se for um número, formatar diretamente
  if (typeof preco === 'number') {
    return `R$ ${preco.toFixed(casasDecimais).replace('.', ',')}`;
  }
  
  // Se for uma string, verificar se é "Consulte Valores" ou um número em formato de string
  if (typeof preco === 'string') {
    // Se for "Consulte Valores" ou texto similar, retornar como está
    if (preco === 'Consulte Valores' || !preco.match(/^[\d.,]+$/)) {
      return preco;
    }
    
    // Tentar converter para número
    try {
      // Remover qualquer caractere não numérico exceto ponto e vírgula
      const precoLimpo = preco.replace(/[^\d.,]/g, '');
      
      // Substituir vírgula por ponto para conversão correta
      const precoNumerico = parseFloat(precoLimpo.replace(',', '.'));
      
      if (!isNaN(precoNumerico)) {
        return `R$ ${precoNumerico.toFixed(casasDecimais).replace('.', ',')}`;
      }
    } catch (e) {
      // Se houver erro na conversão, retornar o valor original
      console.error('Erro ao converter preço:', e);
    }
  }
  
  // Se não for possível formatar, retornar o valor original
  return preco;
}

/**
 * Calcula o subtotal para um item (preço unitário * quantidade)
 * @param precoUnitario - Preço unitário (pode ser string ou número)
 * @param quantidade - Quantidade do item
 * @returns Subtotal calculado ou 0 se o preço não for numérico
 */
export function calcularSubtotal(precoUnitario: string | number, quantidade: number): number {
  // Se for um número, calcular diretamente
  if (typeof precoUnitario === 'number') {
    return precoUnitario * quantidade;
  }
  
  // Se for uma string, tentar converter para número
  if (typeof precoUnitario === 'string') {
    // Se for "Consulte Valores" ou texto similar, retornar 0
    if (precoUnitario === 'Consulte Valores' || !precoUnitario.match(/^[\d.,]+$/)) {
      return 0;
    }
    
    try {
      // Remover qualquer caractere não numérico exceto ponto e vírgula
      const precoLimpo = precoUnitario.replace(/[^\d.,]/g, '');
      
      // Substituir vírgula por ponto para conversão correta
      const precoNumerico = parseFloat(precoLimpo.replace(',', '.'));
      
      if (!isNaN(precoNumerico)) {
        return precoNumerico * quantidade;
      }
    } catch (e) {
      console.error('Erro ao calcular subtotal:', e);
    }
  }
  
  return 0;
}

/**
 * Verifica se um preço é numérico
 * @param preco - Preço a ser verificado
 * @returns true se for numérico, false caso contrário
 */
export function isPrecoNumerico(preco: string | number): boolean {
  if (typeof preco === 'number') {
    return true;
  }
  
  if (typeof preco === 'string') {
    return preco !== 'Consulte Valores' && !!preco.match(/^[\d.,R$\s]+$/);
  }
  
  return false;
}

/**
 * Verifica se um preço é do tipo "Consulte Valores"
 * @param preco - Preço a ser verificado
 * @returns true se o preço for "Consulte Valores", false caso contrário
 */
export function isPrecoConsulta(preco: string | number): boolean {
  if (typeof preco === 'string') {
    return preco === 'Consulte Valores';
  }
  return false;
}

/**
 * Converte um preço para número se possível
 * @param preco - Preço a ser convertido
 * @returns Preço como número ou 0 se não for possível converter
 */
export function precoParaNumero(preco: string | number): number {
  // Se já for um número, retornar diretamente
  if (typeof preco === 'number') {
    return preco;
  }
  
  // Se for uma string, tentar converter para número
  if (typeof preco === 'string') {
    // Se for string vazia, retornar 0
    if (!preco || preco.trim() === '') {
      return 0;
    }
    
    // Se for "Consulte Valores" ou texto similar, retornar 0
    if (preco === 'Consulte Valores' || !preco.match(/^[\d.,R$\s]+$/)) {
      return 0;
    }
    
    try {
      // Remover qualquer caractere não numérico exceto ponto e vírgula
      const precoLimpo = preco.replace(/[^\d.,]/g, '');
      
      // Substituir vírgula por ponto para conversão correta
      const precoNumerico = parseFloat(precoLimpo.replace(',', '.'));
      
      if (!isNaN(precoNumerico)) {
        return precoNumerico;
      }
    } catch (e) {
      console.error('Erro ao converter preço para número:', e);
    }
    
    // Se chegou até aqui, não foi possível converter
    console.warn('Não foi possível converter o preço para número:', preco)
  }
  
  return 0;
}
