import { createClient } from '@supabase/supabase-js';

// Substitua estas variáveis pelas suas credenciais reais do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para as tabelas do Supabase
export type Geracao = string;

// Lista de gerações disponíveis na igreja
export const GERACOES = [
  'Atos',
  'Efraim',
  'Israel',
  'José',
  'Josué',
  'Kairós',
  'Levi',
  'Moriá',
  'Rafah',
  'Samuel',
  'Zion',
  'Zoe',
  'Prs. Noboyuki e Samara',
  'Vida Nova Amanda',
  'Vida Nova Socorro',
  'Outras igrejas',
  'Não tenho Geração'
];

export type Cliente = {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  observacao?: string;
  geracao?: Geracao;
  lider_direto?: string;
  created_at: string;
};

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  descricao?: string;
  categoria?: string;
  imagem_url?: string;
  created_at: string;
};

export type StatusPagamento = 'Pendente' | 'Feito (pago)' | 'Cancelado' | 'Ofertado';

export type StatusReserva = 'Pendente' | 'Confirmada' | 'Cancelada';

export type StatusVenda = 'Pendente' | 'Finalizada' | 'Cancelada';

export type Venda = {
  id: string;
  cliente_id?: string | null;
  cliente_nome: string;
  telefone?: string;
  total: number;
  valor_original?: number;
  forma_pagamento: string;
  status_pagamento: StatusPagamento;
  status: StatusVenda;
  comprovante_url?: string | null;
  data_venda: string;
  created_at: string;
  email?: string;
  geracao?: string;
  observacoes?: string;
  tipo?: 'venda' | 'reserva';
};

export type ItemVenda = {
  id: string;
  venda_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

// Funções de API para interagir com o Supabase
export const api = {
  // Reservas
  reservas: {
    criar: async (dadosReserva: {
      nome: string;
      telefone: string;
      email?: string;
      geracao?: string;
      observacoes?: string;
      produto_id: string;
      produto_nome: string;
      preco_unitario: number;
      quantidade: number;
      forma_pagamento?: string;
    }) => {
      // A verificação de estoque agora é feita na função atualizarEstoque
      // com lógica específica para reservas
      
      // Criar a venda (reserva)
      const venda: Omit<Venda, 'id' | 'created_at'> = {
        cliente_nome: dadosReserva.nome,
        telefone: dadosReserva.telefone,
        email: dadosReserva.email,
        geracao: dadosReserva.geracao,
        observacoes: dadosReserva.observacoes,
        total: dadosReserva.preco_unitario * dadosReserva.quantidade,
        forma_pagamento: dadosReserva.forma_pagamento || 'Pendente',
        status_pagamento: 'Pendente',
        status: 'Pendente',
        data_venda: new Date().toISOString(),
        tipo: 'reserva'
      };
      
      // Criar o item da venda
      const item: Omit<ItemVenda, 'id' | 'venda_id'> = {
        produto_id: dadosReserva.produto_id,
        produto_nome: dadosReserva.produto_nome,
        quantidade: dadosReserva.quantidade,
        preco_unitario: dadosReserva.preco_unitario,
        subtotal: dadosReserva.preco_unitario * dadosReserva.quantidade
      };
      
      // Usar a função existente para criar a venda e os itens
      const novaReserva = await api.vendas.criar(venda, [item]);
      
      return novaReserva;
    },
    
    listar: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('tipo', 'reserva')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Venda[];
    },
    
    confirmar: async (id: string) => {
      const { data, error } = await supabase
        .from('vendas')
        .update({
          status_pagamento: 'Feito (pago)',
          status: 'Finalizada'
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0] as Venda;
    },
    
    cancelar: async (id: string) => {
      // Primeiro, obtemos os itens da reserva
      const { data: itens, error: erroItens } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', id);
      
      if (erroItens) throw erroItens;
      
      // Atualizar o status da reserva
      const { data, error } = await supabase
        .from('vendas')
        .update({
          status_pagamento: 'Cancelado',
          status: 'Cancelada'
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // Restaurar o estoque dos produtos
      for (const item of itens) {
        try {
          // Devolver a quantidade ao estoque (valor negativo)
          await api.produtos.atualizarEstoque(item.produto_id, -item.quantidade);
        } catch (erro) {
          console.error('Erro ao restaurar estoque:', erro);
        }
      }
      
      return data[0] as Venda;
    }
  },
  
  // Clientes
  clientes: {
    listar: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Cliente[];
    },
    
    obter: async (id: string) => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Cliente;
    },
    
    criar: async (cliente: Omit<Cliente, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select();
      
      if (error) throw error;
      return data[0] as Cliente;
    },
    
    atualizar: async (id: string, cliente: Partial<Cliente>) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0] as Cliente;
    },
    
    excluir: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  },
  
  // Produtos
  produtos: {
    listar: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Produto[];
    },
    
    obter: async (id: string) => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Produto;
    },
    
    criar: async (produto: Omit<Produto, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('produtos')
        .insert([produto])
        .select();
      
      if (error) throw error;
      return data[0] as Produto;
    },
    
    atualizar: async (id: string, produto: Partial<Produto>) => {
      const { data, error } = await supabase
        .from('produtos')
        .update(produto)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0] as Produto;
    },
    
    excluir: async (id: string) => {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },
    
    atualizarEstoque: async (id: string, quantidade: number, tipoOperacao: 'reserva' | 'venda' = 'venda') => {
      // Primeiro, obtemos o produto atual
      const { data: produto, error: erroConsulta } = await supabase
        .from('produtos')
        .select('estoque')
        .eq('id', id)
        .single();
      
      if (erroConsulta) throw erroConsulta;
      
      // Depois, calculamos o novo estoque
      const estoqueAtual = (produto as Produto).estoque;
      const novoEstoque = estoqueAtual - quantidade;
      
      // Verificação rigorosa para impedir estoque negativo
      if (novoEstoque < 0) {
        throw new Error(`Estoque insuficiente para ${tipoOperacao}. Disponível: ${estoqueAtual}, Solicitado: ${quantidade}`);
      }
      
      // Atualiza o estoque no banco de dados
      const { data, error } = await supabase
        .from('produtos')
        .update({ estoque: novoEstoque })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0] as Produto;
    }
  },
  
  // Vendas
  vendas: {
    listar: async () => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('data_venda', { ascending: false });
      
      if (error) throw error;
      return data as Venda[];
    },
    
    obter: async (id: string) => {
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Venda;
    },
    
    obterItens: async (vendaId: string) => {
      const { data, error } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', vendaId);
      
      if (error) throw error;
      return data as ItemVenda[];
    },
    
    criar: async (
      venda: Omit<Venda, 'id' | 'created_at'>, 
      itens: Omit<ItemVenda, 'id' | 'venda_id'>[]
    ) => {
      // Criar uma lista para armazenar os produtos e seus estoques atuais
      const produtosVerificados: {id: string; estoqueAtual: number; quantidade: number}[] = [];
      
      // PRIMEIRO: Verificar e reservar o estoque para todos os itens
      for (const item of itens) {
        try {
          const tipoOperacao = venda.tipo === 'reserva' ? 'reserva' : 'venda';
          
          // Obter o produto com bloqueio para atualização (usando o parâmetro select para minimizar dados)
          const { data: produto, error: erroConsulta } = await supabase
            .from('produtos')
            .select('id, estoque')
            .eq('id', item.produto_id)
            .single();
          
          if (erroConsulta) throw erroConsulta;
          
          const estoqueAtual = (produto as Produto).estoque;
          
          // Verificação de estoque com base no tipo de operação
          if (tipoOperacao === 'venda' && estoqueAtual < item.quantidade) {
            throw new Error(`Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${item.quantidade}`);
          } else if (tipoOperacao === 'reserva' && estoqueAtual < item.quantidade) {
            throw new Error(`Estoque insuficiente para reserva. Disponível: ${estoqueAtual}, Solicitado: ${item.quantidade}`);
          }
          
          // Armazenar o produto e seu estoque para atualização posterior
          produtosVerificados.push({
            id: item.produto_id,
            estoqueAtual,
            quantidade: item.quantidade
          });
        } catch (erro) {
          console.error('Erro ao verificar estoque:', erro);
          throw erro;
        }
      }
      
      try {
        // SEGUNDO: Criar a venda
        const { data, error } = await supabase
          .from('vendas')
          .insert([venda])
          .select();
        
        if (error) throw error;
        
        const vendaId = data[0].id;
        
        // TERCEIRO: Inserir os itens da venda
        const itensComVendaId = itens.map(item => ({
          ...item,
          venda_id: vendaId
        }));
        
        const { error: erroItens } = await supabase
          .from('itens_venda')
          .insert(itensComVendaId);
        
        if (erroItens) throw erroItens;
        
        // QUARTO: Atualizar o estoque dos produtos
        for (const produtoVerificado of produtosVerificados) {
          const novoEstoque = produtoVerificado.estoqueAtual - produtoVerificado.quantidade;
          
          // Atualiza o estoque diretamente, sem chamar a função atualizarEstoque
          // que faria uma nova verificação
          const { error: erroAtualizacao } = await supabase
            .from('produtos')
            .update({ estoque: novoEstoque })
            .eq('id', produtoVerificado.id);
          
          if (erroAtualizacao) throw erroAtualizacao;
        }
        
        return data[0] as Venda;
      } catch (erro) {
        console.error('Erro ao processar venda:', erro);
        throw erro;
      }
    },
    
    uploadComprovante: async (arquivo: File) => {
      try {
        // Primeiro, verificar se o bucket existe
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Erro ao listar buckets:', bucketsError);
          // Tentar usar um bucket padrão se não conseguir listar
        }
        
        const bucketExists = buckets?.some(bucket => bucket.name === 'comprovantes');
        let bucketName = 'comprovantes';
        
        // Se o bucket não existir, tentar criá-lo
        if (!bucketExists) {
          try {
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
              public: true,
              fileSizeLimit: 10485760, // 10MB
            });
            
            if (createError) {
              console.error('Erro ao criar bucket comprovantes:', createError);
              // Tentar usar um bucket alternativo
              bucketName = 'public';
              console.log('Tentando usar bucket alternativo:', bucketName);
            } else {
              console.log('Bucket "comprovantes" criado com sucesso');
            }
          } catch (createError) {
            console.error('Exceção ao criar bucket:', createError);
            // Tentar usar um bucket alternativo
            bucketName = 'public';
            console.log('Tentando usar bucket alternativo após exceção:', bucketName);
          }
        }
        
        // Gerar um nome único para o arquivo
        const extensao = arquivo.name.split('.').pop() || 'jpg';
        const nomeArquivo = `comprovante_${Date.now()}.${extensao}`;
        
        // Fazer upload do arquivo
        const { data, error } = await supabase
          .storage
          .from(bucketName)
          .upload(nomeArquivo, arquivo, {
            cacheControl: '3600',
            upsert: true // Substituir se já existir
          });
        
        if (error) {
          console.error(`Erro ao fazer upload para o bucket ${bucketName}:`, error);
          throw error;
        }
        
        // Obter a URL pública do arquivo
        const { data: urlData } = supabase
          .storage
          .from(bucketName)
          .getPublicUrl(nomeArquivo);
        
        console.log('Upload de comprovante bem-sucedido:', urlData.publicUrl);
        return urlData.publicUrl;
      } catch (error) {
        console.error('Erro ao fazer upload do comprovante:', error);
        // Retornar null em caso de erro para não interromper o fluxo principal
        return null;
      }
    },

    atualizar: async (id: string, venda: Partial<Venda>) => {
      const { data, error } = await supabase
        .from('vendas')
        .update({
          ...venda,
          // Se o status_pagamento for Feito (pago), a venda é Finalizada
          // Se o status_pagamento for Cancelado, a venda é Cancelada
          status: venda.status_pagamento === 'Feito (pago)' 
            ? 'Finalizada' 
            : venda.status_pagamento === 'Cancelado'
            ? 'Cancelada'
            : 'Pendente'
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0] as Venda;
    },
    
    adicionarItens: async (itens: Omit<ItemVenda, 'id'>[]) => {
      const { data, error } = await supabase
        .from('itens_venda')
        .insert(itens)
        .select();
      
      if (error) throw error;
      return data as ItemVenda[];
    },
    
    excluir: async (id: string) => {
      // Primeiro, excluímos os itens relacionados à venda
      const { error: erroItens } = await supabase
        .from('itens_venda')
        .delete()
        .eq('venda_id', id);
      
      if (erroItens) throw erroItens;
      
      // Depois, excluímos a venda
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },
    
    // Remover um item específico de uma venda
    removerItem: async (itemId: string) => {
      // Primeiro, obtemos o item para saber a quantidade e o produto_id
      const { data: item, error: erroConsulta } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (erroConsulta) throw erroConsulta;
      
      // Excluir o item
      const { error } = await supabase
        .from('itens_venda')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Atualizar o total da venda
      const { data: venda, error: erroVenda } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', item.venda_id)
        .single();
      
      if (erroVenda) throw erroVenda;
      
      // Calcular o novo total
      const novoTotal = venda.total - item.subtotal;
      
      // Atualizar a venda com o novo total
      const { error: erroAtualizacao } = await supabase
        .from('vendas')
        .update({ total: novoTotal })
        .eq('id', item.venda_id);
      
      if (erroAtualizacao) throw erroAtualizacao;
      
      // Restaurar o estoque do produto
      try {
        // Aqui estamos adicionando a quantidade de volta ao estoque (por isso o valor negativo)
        await api.produtos.atualizarEstoque(item.produto_id, -item.quantidade);
      } catch (erro) {
        console.error('Erro ao restaurar estoque:', erro);
        throw erro;
      }
      
      return { itemRemovido: item, novoTotal };
    },
    
    // Adicionar um novo item a uma venda existente
    adicionarItem: async (vendaId: string, item: Omit<ItemVenda, 'id' | 'venda_id'>) => {
      // Inserir o novo item
      const { data, error } = await supabase
        .from('itens_venda')
        .insert([{ ...item, venda_id: vendaId }])
        .select();
      
      if (error) throw error;
      
      // Atualizar o total da venda
      const { data: venda, error: erroVenda } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', vendaId)
        .single();
      
      if (erroVenda) throw erroVenda;
      
      // Calcular o novo total
      const novoTotal = venda.total + item.subtotal;
      
      // Atualizar a venda com o novo total
      const { error: erroAtualizacao } = await supabase
        .from('vendas')
        .update({ total: novoTotal })
        .eq('id', vendaId);
      
      if (erroAtualizacao) throw erroAtualizacao;
      
      // Atualizar o estoque do produto
      try {
        await api.produtos.atualizarEstoque(item.produto_id, item.quantidade);
      } catch (erro) {
        console.error('Erro ao atualizar estoque:', erro);
        throw erro;
      }
      
      return { itemAdicionado: data[0], novoTotal };
    }
  }
};
