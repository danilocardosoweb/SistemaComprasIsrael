import { createClient } from '@supabase/supabase-js';

// Substitua estas variáveis pelas suas credenciais reais do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para as tabelas do Supabase
export type Geracao = string;

export const GERACOES = [
  'Israel',
  'Atos',
  'Efraim',
  'Zoe',
  'José',
  'Josué',
  'Kairós',
  'Zion',
  'Samuel',
  'Moriá'
] as const;

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
  created_at: string;
};

export type StatusPagamento = 'Pendente' | 'Feito' | 'Realizado';

export type StatusVenda = 'Pendente' | 'Finalizada' | 'Cancelada';

export type Venda = {
  id: string;
  cliente_id?: string | null;
  cliente_nome: string;
  telefone?: string;
  total: number;
  forma_pagamento: string;
  status_pagamento: StatusPagamento;
  status: StatusVenda;
  comprovante_url?: string | null;
  data_venda: string;
  created_at: string;
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
    
    atualizarEstoque: async (id: string, quantidade: number) => {
      // Primeiro, obtemos o produto atual
      const { data: produto, error: erroConsulta } = await supabase
        .from('produtos')
        .select('estoque')
        .eq('id', id)
        .single();
      
      if (erroConsulta) throw erroConsulta;
      
      // Depois, atualizamos o estoque
      const novoEstoque = (produto as Produto).estoque - quantidade;
      
      if (novoEstoque < 0) {
        throw new Error('Estoque insuficiente');
      }
      
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
      // Iniciamos uma transação
      const { data, error } = await supabase
        .from('vendas')
        .insert([venda])
        .select();
      
      if (error) throw error;
      
      const vendaId = data[0].id;
      
      // Inserimos os itens da venda
      const itensComVendaId = itens.map(item => ({
        ...item,
        venda_id: vendaId
      }));
      
      const { error: erroItens } = await supabase
        .from('itens_venda')
        .insert(itensComVendaId);
      
      if (erroItens) throw erroItens;
      
      // Atualizamos o estoque dos produtos
      for (const item of itens) {
        try {
          await api.produtos.atualizarEstoque(item.produto_id, item.quantidade);
        } catch (erro) {
          console.error('Erro ao atualizar estoque:', erro);
          throw erro;
        }
      }
      
      return data[0] as Venda;
    },
    
    uploadComprovante: async (arquivo: File) => {
      const nomeArquivo = `comprovantes/${Date.now()}_${arquivo.name}`;
      
      const { data, error } = await supabase
        .storage
        .from('vendas')
        .upload(nomeArquivo, arquivo);
      
      if (error) throw error;
      
      // Obtém a URL pública do arquivo
      const { data: urlData } = supabase
        .storage
        .from('vendas')
        .getPublicUrl(nomeArquivo);
      
      return urlData.publicUrl;
    },

    atualizar: async (id: string, venda: Partial<Venda>) => {
      const { data, error } = await supabase
        .from('vendas')
        .update({
          ...venda,
          // Se o status_pagamento for Feito ou Realizado, a venda é Finalizada
          status: venda.status_pagamento === 'Feito' || venda.status_pagamento === 'Realizado' 
            ? 'Finalizada' 
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
    }
  }
};
