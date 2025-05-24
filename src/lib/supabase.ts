import { createClient } from '@supabase/supabase-js';
import { calcularSubtotal } from '@/utils/formatarPreco';

// Substitua estas variáveis pelas suas credenciais reais do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar o cliente do Supabase com configuração para renovação automática de tokens
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

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
  preco: number | string;
  preco_variavel?: boolean;
  estoque: number;
  descricao?: string;
  categoria?: string;
  imagem_url?: string;
  opcao_parcelamento?: string;
  descricao_parcelamento?: string;
  created_at: string;
};

export type StatusPagamento = 'Pendente' | 'Feito (pago)' | 'Cancelado' | 'Ofertado';

export type StatusReserva = 'Pendente' | 'Confirmada' | 'Cancelada';

export type StatusVenda = 'Pendente' | 'Finalizada' | 'Cancelada';

// Interface para os textos configuráveis do site
export interface TextosSite {
  id?: string;
  banner_titulo: string;
  banner_subtitulo: string;
  banner_descricao: string;
  banner_badge: string;
  banner_badge_completo: string;
  banner_local: string;
  banner_data: string;
  banner_botao_texto: string;
  banner_imagem: string;
  banner_imagem_2: string;
  banner_imagem_3: string;
  pagina_inicial_titulo: string;
  pagina_inicial_subtitulo: string;
  pagina_inicial_descricao: string;
  footer_descricao: string;
  footer_contato_telefone: string;
  footer_contato_email: string;
  footer_contato_endereco: string;
  footer_copyright: string;
  created_at?: string;
  updated_at?: string;
};

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
  retira_produto?: 'Reserva' | 'Entregue';
};

export type ItemVenda = {
  id: string;
  venda_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number | string; // Permitir tanto número quanto string ("Consulte Valores")
  subtotal: number;
};

// Funções de API para interagir com o Supabase
export const api = {
  site: {
    uploadBannerImagem: async (arquivo: File) => {
      try {
        // Usar o bucket banners do Supabase
        // IMPORTANTE: Este bucket deve ser criado manualmente no painel do Supabase
        // e configurado com acesso público de leitura
        const bucketName = 'banners';
        
        // Gerar um nome único para o arquivo
        const extensao = arquivo.name.split('.').pop() || 'png';
        const timestamp = Date.now();
        const nomeArquivo = `Congresso_2025_${timestamp}.${extensao}`;
        
        console.log(`Tentando fazer upload do arquivo ${nomeArquivo} para o bucket ${bucketName}`);
        
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
          
          // Se o erro for de permissão ou bucket não encontrado, usar uma abordagem alternativa
          if (error.message.includes('not found') || error.message.includes('security policy')) {
            console.log('Usando abordagem alternativa: base64 em vez de storage');
            
            // Converter o arquivo para base64 e salvar diretamente no banco
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(arquivo);
              reader.onload = () => {
                const base64data = reader.result;
                console.log('Arquivo convertido para base64 com sucesso');
                // Retornar a string base64 como URL
                resolve(base64data as string);
              };
              reader.onerror = () => {
                console.error('Erro ao converter arquivo para base64');
                resolve(null);
              };
            });
          }
          
          throw error;
        }
        
        // Obter a URL pública do arquivo
        const { data: urlData } = supabase
          .storage
          .from(bucketName)
          .getPublicUrl(nomeArquivo);
        
        // Verificar se a URL foi gerada corretamente
        if (!urlData || !urlData.publicUrl) {
          console.error('Erro ao gerar URL pública para o arquivo');
          throw new Error('Não foi possível gerar a URL pública da imagem');
        }
        
        console.log('Upload da imagem do banner bem-sucedido:', urlData.publicUrl);
        return urlData.publicUrl;
      } catch (error) {
        console.error('Erro ao fazer upload da imagem do banner:', error);
        // Retornar null em caso de erro para não interromper o fluxo principal
        return null;
      }
    },
  },
  // Textos do site
  siteTextos: {
    listar: async () => {
      const { data, error } = await supabase
        .from('site_textos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TextosSite[];
    },
    
    obter: async (id: string) => {
      const { data, error } = await supabase
        .from('site_textos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as TextosSite;
    },
    
    criar: async (textos: Omit<TextosSite, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('site_textos')
        .insert([{
          ...textos,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      return data[0] as TextosSite;
    },
    
    atualizar: async (id: string, textos: Partial<TextosSite>) => {
      const { data, error } = await supabase
        .from('site_textos')
        .update({
          ...textos,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0] as TextosSite;
    },
    
    criarTabela: async () => {
      const { data, error } = await supabase.rpc('create_site_textos_table');
      
      if (error) throw error;
      return data;
    }
  },
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
    
    listar: async (dataInicial?: string, dataFinal?: string) => {
      let query = supabase
        .from('vendas')
        .select('*')
        .eq('tipo', 'reserva');
      
      // Aplicar filtros de data se fornecidos
      if (dataInicial) {
        query = query.gte('data_venda', dataInicial);
      }
      
      if (dataFinal) {
        // Adicionar 1 dia à data final para incluir todo o último dia
        const dataFinalObj = new Date(dataFinal);
        dataFinalObj.setDate(dataFinalObj.getDate() + 1);
        const dataFinalAjustada = dataFinalObj.toISOString().split('T')[0];
        query = query.lt('data_venda', dataFinalAjustada);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
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
    },
    
    // Obter uma venda específica pelo ID
    obter: async (id: string) => {
      console.log(`Obtendo venda com ID: ${id}`);
      
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Erro ao obter venda:', error);
        throw error;
      }
      
      console.log('Venda obtida com sucesso:', data);
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
        // Usar diretamente o bucket padrão do Supabase
        // IMPORTANTE: Este bucket deve ser criado manualmente no painel do Supabase
        // e configurado com acesso público de leitura
        const bucketName = 'comprovantes';
        
        // Gerar um nome único para o arquivo
        const extensao = arquivo.name.split('.').pop() || 'jpg';
        const timestamp = Date.now();
        const nomeArquivo = `comprovante_${timestamp}.${extensao}`;
        
        console.log(`Tentando fazer upload do arquivo ${nomeArquivo} para o bucket ${bucketName}`);
        
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
          
          // Se o erro for de permissão ou bucket não encontrado, usar uma abordagem alternativa
          if (error.message.includes('not found') || error.message.includes('security policy')) {
            console.log('Usando abordagem alternativa: base64 em vez de storage');
            
            // Converter o arquivo para base64 e salvar diretamente no banco
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(arquivo);
              reader.onload = () => {
                const base64data = reader.result;
                console.log('Arquivo convertido para base64 com sucesso');
                // Retornar a string base64 como URL
                resolve(base64data as string);
              };
              reader.onerror = () => {
                console.error('Erro ao converter arquivo para base64');
                resolve(null);
              };
            });
          }
          
          throw error;
        }
        
        // Obter a URL pública do arquivo
        const { data: urlData } = supabase
          .storage
          .from(bucketName)
          .getPublicUrl(nomeArquivo);
        
        // Verificar se a URL foi gerada corretamente
        if (!urlData || !urlData.publicUrl) {
          console.error('Erro ao gerar URL pública para o arquivo');
          throw new Error('Não foi possível gerar a URL pública do comprovante');
        }
        
        console.log('Upload de comprovante bem-sucedido:', urlData.publicUrl);
        return urlData.publicUrl;
      } catch (error) {
        console.error('Erro ao fazer upload do comprovante:', error);
        // Retornar null em caso de erro para não interromper o fluxo principal
        return null;
      }
    },

    atualizar: async (id: string, venda: Partial<Venda>) => {
      console.log('Atualizando venda com ID:', id, 'Dados:', JSON.stringify(venda, null, 2));
      
      // Verificar se a venda existe antes de atualizar
      const { data: vendaExistente, error: erroConsulta } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (erroConsulta) {
        console.error('Erro ao consultar venda existente:', erroConsulta);
        throw erroConsulta;
      }
      
      console.log('Venda existente:', JSON.stringify(vendaExistente, null, 2));
      
      // Preparar os dados para atualização
      const dadosAtualizacao = {
        ...venda,
        // Se o status_pagamento for Feito (pago), a venda é Finalizada
        // Se o status_pagamento for Cancelado, a venda é Cancelada
        status: venda.status_pagamento === 'Feito (pago)' 
          ? 'Finalizada' 
          : venda.status_pagamento === 'Cancelado'
          ? 'Cancelada'
          : vendaExistente.status || 'Pendente'
      };
      
      console.log('Dados de atualização:', JSON.stringify(dadosAtualizacao, null, 2));
      
      // Executar a atualização
      const { data, error } = await supabase
        .from('vendas')
        .update(dadosAtualizacao)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Erro ao atualizar venda:', error);
        throw error;
      }
      
      console.log('Venda atualizada com sucesso:', JSON.stringify(data[0], null, 2));
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
    
    // Função específica para atualizar o comprovante de uma venda
    atualizarComprovante: async (id: string, comprovanteUrl: string) => {
      console.log(`Atualizando comprovante da venda ${id} com URL: ${comprovanteUrl}`);
      
      // Atualização direta usando RPC para garantir que o comprovante seja salvo
      const { data, error } = await supabase
        .rpc('atualizar_comprovante_venda', { 
          venda_id: id, 
          url_comprovante: comprovanteUrl 
        });
      
      // Se o RPC falhar (pode não estar configurado), usar o método padrão
      if (error) {
        console.warn('Erro ao usar RPC para atualizar comprovante, tentando método alternativo:', error);
        
        // Método alternativo: atualização direta na tabela
        const { data: updateData, error: updateError } = await supabase
          .from('vendas')
          .update({ 
            comprovante_url: comprovanteUrl,
            status_pagamento: 'Feito (pago)',
            status: 'Finalizada'
          })
          .eq('id', id)
          .select();
        
        if (updateError) {
          console.error('Erro ao atualizar comprovante:', updateError);
          throw updateError;
        }
        
        console.log('Comprovante atualizado com sucesso (método alternativo):', updateData);
        return updateData[0] as Venda;
      }
      
      console.log('Comprovante atualizado com sucesso (RPC):', data);
      return data as Venda;
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
      // Garantir que o subtotal seja calculado corretamente
      const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
      const itemComSubtotalCorreto = {
        ...item,
        subtotal: subtotalCalculado
      };
      
      // Inserir o novo item
      const { data, error } = await supabase
        .from('itens_venda')
        .insert([{ ...itemComSubtotalCorreto, venda_id: vendaId }])
        .select();
      
      if (error) throw error;
      
      // Buscar todos os itens da venda para recalcular o total
      const { data: itensVenda, error: erroItens } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', vendaId);
      
      if (erroItens) throw erroItens;
      
      // Calcular o novo total somando todos os subtotais
      const novoTotal = itensVenda.reduce((total, item) => {
        // Converter subtotal para número se for string
        const subtotal = typeof item.subtotal === 'string' 
          ? parseFloat(item.subtotal.replace(/[^\d.,]/g, '').replace(',', '.')) 
          : item.subtotal;
          
        return total + (isNaN(subtotal) ? 0 : subtotal);
      }, 0);
      
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
