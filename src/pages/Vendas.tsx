import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarPreco, calcularSubtotal, isPrecoNumerico, precoParaNumero } from "@/utils/formatarPreco";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Search, MoreHorizontal, Eye, Loader2, FileDown, Trash2, Edit, Save, X, MinusCircle, Download, ExternalLink, FileX, User, Calendar, CreditCard, Banknote, AlertCircle, CheckCircle, Package, MessageSquare, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, Venda as SupabaseVenda, ItemVenda, StatusPagamento, StatusVenda, Produto, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import * as XLSX from 'xlsx';

// Interface para exibição na interface
type VendaExibicao = {
  id: string;
  cliente_id?: string;
  cliente: string;
  data: string;
  data_original?: string; // Campo adicional para armazenar a data original para ordenação
  total: number;
  status: StatusVenda;
  produtos: number;
  itens?: ItemVenda[];
  forma_pagamento?: string;
  status_pagamento: StatusPagamento;
  geracao?: string;
  comprovante_url?: string | null;
  retira_produto?: 'Reserva' | 'Entregue';
  observacoes?: string;
};

const Vendas = () => {
  const [vendas, setVendas] = useState<VendaExibicao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  
  // Estados para filtro de datas
  const dataAtual = new Date();
  const data30DiasAtras = subDays(dataAtual, 30);
  const [dataInicial, setDataInicial] = useState<string>(format(data30DiasAtras, 'yyyy-MM-dd'));
  const [dataFinal, setDataFinal] = useState<string>(format(dataAtual, 'yyyy-MM-dd'));
  const [selectedVenda, setSelectedVenda] = useState<VendaExibicao | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [excluindoVenda, setExcluindoVenda] = useState(false);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<string | null>(null);
  const [confirmacaoExclusaoAberta, setConfirmacaoExclusaoAberta] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [vendaEmEdicao, setVendaEmEdicao] = useState<VendaExibicao | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [removendoItem, setRemovendoItem] = useState<string | null>(null);
  const [senhaOfertaDialogAberto, setSenhaOfertaDialogAberto] = useState(false);
  const [senhaOferta, setSenhaOferta] = useState("");
  const [alterandoStatusPagamento, setAlterandoStatusPagamento] = useState(false);
  const [novoStatusPagamentoPendente, setNovoStatusPagamentoPendente] = useState<StatusPagamento | null>(null);
  
  // Função para calcular o total dos itens de uma venda
  const calcularTotalItens = (itens: ItemVenda[]): number => {
    return itens.reduce((total: number, item) => {
      // Converter o subtotal para número antes de somar
      const subtotalNumerico = precoParaNumero(item.subtotal);
      return total + subtotalNumerico;
    }, 0);
  };


  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Carregar produtos para a edição de vendas
  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        const produtosData = await api.produtos.listar();
        setProdutos(produtosData);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar produtos",
          description: error.message || "Ocorreu um erro ao carregar os produtos.",
          variant: "destructive",
        });
      }
    };
    
    carregarProdutos();
  }, [toast]);
  
  // Função para carregar vendas com filtros de data
  const carregarVendas = async () => {
    try {
      setLoading(true);
      // Converter as datas para o formato correto
      console.log('Aplicando filtro de datas:', { dataInicial, dataFinal });
      const vendasSupabase = await api.vendas.listar(dataInicial, dataFinal);
      
      // Converter para o formato de exibição
      const vendasFormatadas: VendaExibicao[] = vendasSupabase.map(venda => ({
        id: venda.id,
        cliente_id: venda.cliente_id || undefined,
        cliente: venda.cliente_nome,
        data: format(new Date(venda.data_venda), 'dd/MM/yyyy HH:mm'),
        data_original: venda.data_venda, // Guardar a data original para ordenação
        total: venda.total,
        status: venda.status_pagamento === 'Pendente' ? 'Pendente' : 'Finalizada',
        status_pagamento: venda.status_pagamento,
        produtos: 0, // Será atualizado ao carregar os detalhes
        forma_pagamento: venda.forma_pagamento,
        comprovante_url: venda.comprovante_url
      }));
      
      // Ordenar vendas da mais recente para a mais antiga
      const vendasOrdenadas = [...vendasFormatadas].sort((a, b) => {
        const dataA = new Date(a.data_original).getTime();
        const dataB = new Date(b.data_original).getTime();
        return dataB - dataA; // Ordem decrescente (mais recente primeiro)
      });
      
      setVendas(vendasOrdenadas);
      
      // Criar uma função para formatar a data final corretamente
      const formatarDataFinalExibicao = (dataStr: string) => {
        // Criar uma cópia da data para não afetar o estado original
        const dataObj = new Date(dataStr);
        // Configurar para o final do dia (23:59:59)
        dataObj.setHours(23, 59, 59);
        return format(dataObj, 'dd/MM/yyyy');
      };
      
      // Exibir mensagem de feedback sobre o filtro aplicado
      if (vendasFormatadas.length === 0) {
        toast({
          title: "Nenhuma venda encontrada",
          description: `Não foram encontradas vendas no período de ${format(new Date(dataInicial), 'dd/MM/yyyy')} a ${formatarDataFinalExibicao(dataFinal)}`,
          variant: "default",
        });
      } else {
        toast({
          title: `${vendasFormatadas.length} venda(s) encontrada(s)`,
          description: `Filtro aplicado: ${format(new Date(dataInicial), 'dd/MM/yyyy')} a ${formatarDataFinalExibicao(dataFinal)}`,
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar vendas:', error);
      toast({
        title: "Erro ao carregar vendas",
        description: error.message || "Ocorreu um erro ao carregar as vendas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar vendas quando o componente montar ou quando os filtros de data mudarem
  useEffect(() => {
    carregarVendas();
  }, [dataInicial, dataFinal, toast]);

  // Filtrar vendas com base no termo de busca e no filtro de status
  const filteredVendas = useMemo(() => {
    return vendas.filter(venda => {
      // Filtrar por termo de busca (cliente ou código)
      const matchesSearchTerm = searchTerm === "" || 
        venda.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venda.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtrar por status
      const matchesStatus = statusFilter === "todos" || venda.status === statusFilter;
      
      // Retornar apenas as vendas que correspondem a ambos os filtros
      return matchesSearchTerm && matchesStatus;
    });
  }, [vendas, searchTerm, statusFilter]);

  const handleShowDetails = async (venda: VendaExibicao) => {
    setSelectedVenda(venda);
    setShowDetails(true);
    setLoadingDetalhes(true);
    
    try {
      // Carregar os itens da venda
      const itens = await api.vendas.obterItens(venda.id);
      
      // Corrigir os subtotais dos itens
      const itensCorrigidos = itens.map(item => {
        // Recalcular o subtotal para garantir que esteja correto
        const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
        
        // Se o subtotal calculado for diferente do armazenado, usar o calculado
        if (subtotalCalculado !== item.subtotal) {
          console.log(`Corrigindo subtotal do item ${item.produto_nome}:`, {
            subtotalArmazenado: item.subtotal,
            subtotalCalculado,
            precoUnitario: item.preco_unitario,
            quantidade: item.quantidade
          });
          return { ...item, subtotal: subtotalCalculado };
        }
        
        return item;
      });
      
      setItensVenda(itensCorrigidos);
      
      // Atualizar a venda selecionada com os detalhes
      setSelectedVenda(prev => {
        if (prev) {
          return { 
            ...prev, 
            produtos: itensCorrigidos.length
          };
        }
        return prev;
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message || "Ocorreu um erro ao carregar os detalhes da venda.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetalhes(false);
    }
  };
  
  // Iniciar modo de edição da venda
  const handleEditarVenda = async (venda: VendaExibicao) => {
    setVendaEmEdicao(venda);
    setLoadingDetalhes(true);
    
    try {
      // Carregar os itens da venda
      const itens = await api.vendas.obterItens(venda.id);
      
      // Garantir que os subtotais estejam calculados corretamente
      const itensComSubtotalCorrigido = itens.map(item => {
        // Recalcular o subtotal para garantir que esteja correto
        const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
        
        // Se o subtotal calculado for diferente do armazenado, usar o calculado
        if (subtotalCalculado !== item.subtotal) {
          console.log(`Corrigindo subtotal do item ${item.produto_nome}:`, {
            subtotalArmazenado: item.subtotal,
            subtotalCalculado,
            precoUnitario: item.preco_unitario,
            quantidade: item.quantidade
          });
          return { ...item, subtotal: subtotalCalculado };
        }
        
        return item;
      });
      
      setItensVenda(itensComSubtotalCorrigido);
      setModoEdicao(true);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes para edição",
        description: error.message || "Ocorreu um erro ao carregar os detalhes da venda para edição.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetalhes(false);
    }
  };
  
  // Adicionar novo item à venda em edição
  const handleAdicionarItem = async () => {
    if (!vendaEmEdicao || !selectedProdutoId || quantidade <= 0) {
      toast({
        title: "Erro ao adicionar produto",
        description: "Selecione um produto e quantidade válida.",
        variant: "destructive",
      });
      return;
    }
    
    const produtoSelecionado = produtos.find(p => p.id === selectedProdutoId);
    if (!produtoSelecionado) return;
    
    try {
      setSalvandoEdicao(true);
      
      // Preparar o novo item
      // Garantir que o preço unitário seja tratado corretamente
      const precoUnitario = produtoSelecionado.preco;
      
      // Calcular o subtotal usando a função utilitária
      const subtotalCalculado = calcularSubtotal(precoUnitario, quantidade);
      
      console.log('Adicionando item com:', { 
        preco: precoUnitario, 
        quantidade, 
        subtotalCalculado 
      });
      
      const novoItem = {
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        quantidade,
        preco_unitario: precoUnitario,
        subtotal: subtotalCalculado
      };
      
      // Adicionar o item à venda
      const resultado = await api.vendas.adicionarItem(vendaEmEdicao.id, novoItem);
      
      // Atualizar a lista de itens
      setItensVenda(prev => [...prev, resultado.itemAdicionado]);
      
      // Atualizar o total da venda
      setVendaEmEdicao(prev => {
        if (prev) {
          return { ...prev, total: resultado.novoTotal };
        }
        return prev;
      });
      
      // Limpar os campos
      setSelectedProdutoId("");
      setQuantidade(1);
      
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado à venda com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar produto",
        description: error.message || "Ocorreu um erro ao adicionar o produto à venda.",
        variant: "destructive",
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };
  
  // Remover item da venda em edição
  const handleRemoverItem = async (itemId: string) => {
    if (!vendaEmEdicao) return;
    
    try {
      setRemovendoItem(itemId);
      
      // Remover o item da venda
      const resultado = await api.vendas.removerItem(itemId);
      
      // Atualizar a lista de itens
      setItensVenda(prev => prev.filter(item => item.id !== itemId));
      
      // Atualizar o total da venda
      setVendaEmEdicao(prev => {
        if (prev) {
          return { ...prev, total: resultado.novoTotal };
        }
        return prev;
      });
      
      toast({
        title: "Produto removido",
        description: "O produto foi removido da venda com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover produto",
        description: error.message || "Ocorreu um erro ao remover o produto da venda.",
        variant: "destructive",
      });
    } finally {
      setRemovendoItem(null);
    }
  };
  
  // Finalizar edição da venda
  const handleFinalizarEdicao = () => {
    // Atualizar a venda na lista
    setVendas(prev => prev.map(v => v.id === vendaEmEdicao?.id ? { ...v, total: vendaEmEdicao.total } : v));
    
    // Limpar o estado de edição
    setModoEdicao(false);
    setVendaEmEdicao(null);
    setItensVenda([]);
    
    toast({
      title: "Venda atualizada",
      description: "A venda foi atualizada com sucesso.",
    });
  };

  // Verificar senha para status "Ofertado"
  const verificarSenhaOferta = () => {
    if (senhaOferta === "@Master12") {
      setSenhaOfertaDialogAberto(false);
      setSenhaOferta("");
      // Continuar com a alteração do status para "Ofertado"
      if (novoStatusPagamentoPendente) {
        atualizarStatusPagamento(novoStatusPagamentoPendente);
        setNovoStatusPagamentoPendente(null);
      }
    } else {
      toast({
        title: "Senha incorreta",
        description: "A senha informada não é válida para alterar o status para Ofertado.",
        variant: "destructive",
      });
    }
  };
  
  const handleStatusPagamentoChange = async (novoStatus: StatusPagamento) => {
    if (!selectedVenda) return;
    
    // Se o status for "Ofertado", solicitar senha
    if (novoStatus === "Ofertado") {
      setNovoStatusPagamentoPendente(novoStatus);
      setSenhaOfertaDialogAberto(true);
      return;
    }
    
    // Para outros status, continuar normalmente
    atualizarStatusPagamento(novoStatus);
  };
  
  const atualizarStatusPagamento = async (novoStatus: StatusPagamento) => {
    if (!selectedVenda) return;
    
    try {
      setAlterandoStatusPagamento(true);
      
      // Obter os dados atuais da venda para garantir que temos as informações mais recentes
      const { data: vendaAtual, error: erroConsulta } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', selectedVenda.id)
        .single();
      
      if (erroConsulta) throw erroConsulta;
      
      let dadosAtualizacao: any = {
        status_pagamento: novoStatus
      };
      
      // Caso 1: Mudando para "Ofertado" - salvar valor original e zerar total
      if (novoStatus === "Ofertado") {
        dadosAtualizacao.valor_original = vendaAtual.total;
        dadosAtualizacao.total = 0;
      }
      // Caso 2: Saindo de "Ofertado" - restaurar valor original
      else if (selectedVenda.status_pagamento === "Ofertado" && vendaAtual.valor_original !== null) {
        dadosAtualizacao.total = vendaAtual.valor_original;
        // Limpar o campo valor_original
        dadosAtualizacao.valor_original = null;
      }
      
      // Atualizar o status de pagamento e o total no banco de dados
      await api.vendas.atualizar(selectedVenda.id, dadosAtualizacao);
      
      // Calcular o novo total baseado na mudança de status
      let novoTotal = selectedVenda.total;
      if (novoStatus === "Ofertado") {
        novoTotal = 0;
      } else if (selectedVenda.status_pagamento === "Ofertado") {
        // Restaurar o valor original se estiver saindo do status "Ofertado"
        novoTotal = vendaAtual.valor_original || calcularTotalItens(itensVenda);
      }
      
      // Atualizar o estado local
      setSelectedVenda(prev => {
        if (prev) {
          const novoStatusVenda = novoStatus === 'Pendente' ? 'Pendente' : 'Finalizada';
          return { 
            ...prev, 
            status_pagamento: novoStatus, 
            status: novoStatusVenda,
            total: novoTotal
          };
        }
        return prev;
      });

      // Atualizar a lista de vendas
      const vendasAtualizadas = vendas.map(v => {
        if (v.id === selectedVenda.id) {
          const novoStatusVenda: StatusVenda = novoStatus === 'Pendente' ? 'Pendente' : 'Finalizada';
          return { 
            ...v, 
            status_pagamento: novoStatus, 
            status: novoStatusVenda,
            total: novoTotal
          };
        }
        return v;
      });
      setVendas(vendasAtualizadas);

      toast({
        title: "Status de pagamento atualizado",
        description: `O status de pagamento foi atualizado para ${novoStatus}${novoStatus === "Ofertado" ? " e o valor da venda foi zerado" : ""}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status de pagamento.",
        variant: "destructive",
      });
    } finally {
      setAlterandoStatusPagamento(false);
    }
  };

  const handleFormaPagamentoChange = async (novaForma: string) => {
    if (!selectedVenda) return;

    try {
      // Atualizar a forma de pagamento no banco de dados
      await api.vendas.atualizar(selectedVenda.id, {
        forma_pagamento: novaForma
      });

      // Atualizar o estado local
      setSelectedVenda(prev => {
        if (prev) {
          return { ...prev, forma_pagamento: novaForma };
        }
        return prev;
      });

      // Atualizar a lista de vendas
      const vendasAtualizadas = vendas.map(v => {
        if (v.id === selectedVenda.id) {
          return { 
            ...v, 
            forma_pagamento: novaForma
          };
        }
        return v;
      });
      setVendas(vendasAtualizadas);

      toast({
        title: "Forma de pagamento atualizada",
        description: `A forma de pagamento foi atualizada para ${novaForma === 'pix' ? 'PIX' : novaForma === 'dinheiro' ? 'Dinheiro' : 'Cartão'}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar forma de pagamento",
        description: error.message || "Ocorreu um erro ao atualizar a forma de pagamento.",
        variant: "destructive",
      });
    }
  };

  // Função para atualizar o status de retirada do produto
  const handleRetiraProdutoChange = async (novoStatus: 'Reserva' | 'Entregue') => {
    if (!selectedVenda) return;
    
    try {
      // Atualizar o estado local primeiro para feedback imediato
      setSelectedVenda({
        ...selectedVenda,
        retira_produto: novoStatus
      });
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('vendas')
        .update({ retira_produto: novoStatus })
        .eq('id', selectedVenda.id);
      
      if (error) throw error;
      
      // Atualizar a lista de vendas
      setVendas(vendas.map(venda => 
        venda.id === selectedVenda.id 
          ? { ...venda, retira_produto: novoStatus } 
          : venda
      ));
      
      toast({
        title: "Status de retirada atualizado",
        description: `O status de retirada foi alterado para "${novoStatus}".`,
      });
    } catch (error: any) {
      console.error("Erro ao atualizar status de retirada:", error);
      toast({
        title: "Erro ao atualizar status de retirada",
        description: error.message || "Ocorreu um erro ao atualizar o status de retirada.",
        variant: "destructive",
      });
      
      // Reverter alteração local em caso de erro
      if (selectedVenda) {
        setSelectedVenda({
          ...selectedVenda,
          retira_produto: selectedVenda.retira_produto
        });
      }
    }
  };
  
  // Função para lidar com a exclusão de uma venda
  const handleExcluirVenda = async () => {
    if (!vendaParaExcluir) return;
    
    try {
      setExcluindoVenda(true);
      
      // Chamar a API para excluir a venda
      await api.vendas.excluir(vendaParaExcluir);
      
      // Atualizar a lista de vendas (removendo a venda excluída)
      setVendas(vendas.filter(v => v.id !== vendaParaExcluir));
      
      // Fechar o diálogo de confirmação
      setConfirmacaoExclusaoAberta(false);
      
      // Limpar o ID da venda para excluir
      setVendaParaExcluir(null);
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Venda excluída",
        description: "A venda foi excluída com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir venda",
        description: error.message || "Ocorreu um erro ao excluir a venda.",
        variant: "destructive",
      });
    } finally {
      setExcluindoVenda(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Finalizada":
        return "bg-green-100 text-green-800";
      case "Pendente":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const exportarParaExcel = async () => {
    try {
      setLoading(true);
      toast({
        title: "Gerando relatório",
        description: "Aguarde enquanto preparamos seu relatório...",
      });
      
      // Buscar todas as vendas com seus itens e informações dos clientes
      const vendasCompletas = await Promise.all(
        vendas.map(async (venda) => {
          const itens = await api.vendas.obterItens(venda.id);
          
          // Buscar informações do cliente se tiver cliente_id
          let clienteInfo = { geracao: '' };
          if (venda.cliente_id) {
            try {
              const cliente = await api.clientes.obter(venda.cliente_id);
              clienteInfo = { geracao: cliente.geracao || '' };
            } catch (error) {
              console.error('Erro ao buscar cliente:', error);
            }
          }
          
          return {
            ...venda,
            itens,
            geracao: clienteInfo.geracao
          };
        })
      );
      
      // Buscar todos os produtos para a aba de inventário
      const todosProdutos = await api.produtos.listar();
      
      // Preparar dados para o Excel - Planilha de Vendas
      const dadosVendas = vendasCompletas.map(venda => {
        // Criar uma lista formatada dos produtos da venda
        const produtosLista = venda.itens?.map(item => 
          `${item.quantidade}x ${item.produto_nome} (${formatarPreco(item.preco_unitario)})`
        ).join(', ') || '';
        
        return {
          'Código': venda.id,
          'Cliente': venda.cliente,
          'Geração': venda.geracao || 'Não informado',
          'Data': venda.data,
          'Total (R$)': venda.total.toFixed(2),
          'Status': venda.status,
          'Status Pagamento': venda.status_pagamento,
          'Status de Entrega': venda.retira_produto === 'Reserva' ? 'Reserva' : 
                           venda.retira_produto === 'Entregue' ? 'Entregue' : 
                           venda.retira_produto || 'Não informado',
          'Forma Pagamento': venda.forma_pagamento === 'pix' ? 'PIX' : 
                           venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                           venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                           venda.forma_pagamento || 'Não informado',
          'Quantidade de Produtos': venda.itens?.length || 0,
          'Produtos': produtosLista
        };
      });
      
      // Preparar dados para o Excel - Planilha de Itens Detalhados
      const dadosItens = [];
      vendasCompletas.forEach(venda => {
        venda.itens?.forEach(item => {
          // Recalcular o subtotal para garantir que esteja correto
          const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
          
          // Usar o subtotal calculado em vez do armazenado
          dadosItens.push({
            'Código Venda': venda.id,
            'Cliente': venda.cliente,
            'Data Venda': venda.data,
            'Produto': item.produto_nome,
            'Quantidade': item.quantidade,
            'Preço Unitário (R$)': isPrecoNumerico(item.preco_unitario) ? precoParaNumero(item.preco_unitario).toFixed(2) : item.preco_unitario,
            'Subtotal (R$)': subtotalCalculado.toFixed(2),
            'Status da Venda': venda.status,
            'Status Pagamento': venda.status_pagamento,
            'Status de Entrega': venda.retira_produto === 'Reserva' ? 'Reserva' : 
                             venda.retira_produto === 'Entregue' ? 'Entregue' : 
                             venda.retira_produto || 'Não informado',
            'Forma Pagamento': venda.forma_pagamento === 'pix' ? 'PIX' : 
                             venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                             venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                             venda.forma_pagamento || 'Não informado'
          });
        });
      });
      
      // Preparar dados para o Excel - Planilha de Inventário de Produtos
      const dadosInventario = todosProdutos.map(produto => {
        return {
          'Código': produto.id,
          'Produto': produto.nome,
          'Categoria': produto.categoria || 'Não categorizado',
          'Preço (R$)': isPrecoNumerico(produto.preco) ? precoParaNumero(produto.preco).toFixed(2) : produto.preco,
          'Estoque Atual': produto.estoque,
          'Valor em Estoque (R$)': isPrecoNumerico(produto.preco) ? calcularSubtotal(produto.preco, produto.estoque).toFixed(2) : 'N/A',
          'Descrição': produto.descricao || ''
        };
      });
      
      // Ordenar produtos por categoria e depois por nome
      dadosInventario.sort((a, b) => {
        // Primeiro ordenar por categoria
        if (a['Categoria'] !== b['Categoria']) {
          return a['Categoria'].localeCompare(b['Categoria']);
        }
        // Se a categoria for a mesma, ordenar por nome do produto
        return a['Produto'].localeCompare(b['Produto']);
      });
      
      // Preparar dados para o Excel - Planilha de Resumo
      const resumoVendas = {
        'Total de Vendas': vendasCompletas.length,
        'Valor Total (R$)': vendasCompletas.reduce((acc, venda) => acc + venda.total, 0).toFixed(2),
        'Vendas Pendentes': vendasCompletas.filter(v => v.status === 'Pendente').length,
        'Vendas Finalizadas': vendasCompletas.filter(v => v.status === 'Finalizada').length,
        'Total de Produtos em Estoque': todosProdutos.reduce((acc, produto) => acc + produto.estoque, 0),
        'Valor Total em Estoque (R$)': todosProdutos.reduce((acc, produto) => acc + (precoParaNumero(produto.preco) * produto.estoque), 0).toFixed(2),
        'Data do Relatório': format(new Date(), 'dd/MM/yyyy')
      };
      
      // Preparar dados para o Excel - Planilha de Resumo por Produto
      // Primeiro, vamos agrupar todos os itens vendidos por produto
      interface ProdutoVendido {
        id: string;
        nome: string;
        categoria: string;
        quantidade: number;
        valorTotal: number;
      }
      
      const produtosVendidos: Record<string, ProdutoVendido> = {};
      vendasCompletas.forEach(venda => {
        venda.itens?.forEach(item => {
          const produtoId = item.produto_id;
          const produtoNome = item.produto_nome;
          const categoria = todosProdutos.find(p => p.id === produtoId)?.categoria || 'Não categorizado';
          
          if (!produtosVendidos[produtoId]) {
            produtosVendidos[produtoId] = {
              id: produtoId,
              nome: produtoNome,
              categoria: categoria,
              quantidade: 0,
              valorTotal: 0
            };
          }
          
          produtosVendidos[produtoId].quantidade += item.quantidade;
          produtosVendidos[produtoId].valorTotal += calcularSubtotal(item.preco_unitario, item.quantidade);
        });
      });
      
      // Converter para array e ordenar por categoria e depois por nome
      const dadosResumoProdutos = Object.values(produtosVendidos).map((produto: ProdutoVendido) => {
        return {
          'Código': produto.id,
          'Produto': produto.nome,
          'Categoria': produto.categoria,
          'Quantidade Vendida': produto.quantidade,
          'Valor Total (R$)': produto.valorTotal.toFixed(2)
        };
      });
      
      // Ordenar por categoria e depois por nome do produto
      dadosResumoProdutos.sort((a, b) => {
        if (a['Categoria'] !== b['Categoria']) {
          return a['Categoria'].localeCompare(b['Categoria']);
        }
        return a['Produto'].localeCompare(b['Produto']);
      });
      
      // Preparar dados para o Excel - Resumo por Categoria
      // Agrupar vendas por categoria
      interface DadosCategoria {
        quantidade: number;
        valor: number;
      }
      
      const vendasPorCategoria: Record<string, DadosCategoria> = {};
      vendasCompletas.forEach(venda => {
        venda.itens?.forEach(item => {
          const produtoId = item.produto_id;
          const categoria = todosProdutos.find(p => p.id === produtoId)?.categoria || 'Não categorizado';
          
          if (!vendasPorCategoria[categoria]) {
            vendasPorCategoria[categoria] = {
              quantidade: 0,
              valor: 0
            };
          }
          
          vendasPorCategoria[categoria].quantidade += item.quantidade;
          vendasPorCategoria[categoria].valor += calcularSubtotal(item.preco_unitario, item.quantidade);
        });
      });
      
      // Converter para array
      const dadosResumoPorCategoria = Object.entries(vendasPorCategoria).map(([categoria, dados]: [string, DadosCategoria]) => {
        return {
          'Categoria': categoria,
          'Quantidade de Itens': dados.quantidade,
          'Valor Total (R$)': dados.valor.toFixed(2),
          'Percentual do Total (%)': ((dados.valor / vendasCompletas.reduce((acc, venda) => acc + venda.total, 0)) * 100).toFixed(2)
        };
      });
      
      // Ordenar por valor total (do maior para o menor)
      dadosResumoPorCategoria.sort((a, b) => parseFloat(b['Valor Total (R$)']) - parseFloat(a['Valor Total (R$)']));
      
      // Preparar dados para o Excel - Inventário por Categoria
      // Agrupar produtos por categoria
      // Reutilizando a interface DadosCategoria definida anteriormente
      const inventarioPorCategoria: Record<string, DadosCategoria> = {};
      todosProdutos.forEach(produto => {
        const categoria = produto.categoria || 'Não categorizado';
        
        if (!inventarioPorCategoria[categoria]) {
          inventarioPorCategoria[categoria] = {
            quantidade: 0,
            valor: 0
          };
        }
        
        inventarioPorCategoria[categoria].quantidade += produto.estoque;
        inventarioPorCategoria[categoria].valor += isPrecoNumerico(produto.preco) ? 
          calcularSubtotal(produto.preco, produto.estoque) : 0;
      });
      
      // Converter para array
      const dadosInventarioPorCategoria = Object.entries(inventarioPorCategoria).map(([categoria, dados]: [string, DadosCategoria]) => {
        return {
          'Categoria': categoria,
          'Quantidade em Estoque': dados.quantidade,
          'Valor em Estoque (R$)': dados.valor.toFixed(2),
          'Percentual do Estoque (%)': ((dados.valor / todosProdutos.reduce((acc, produto) => 
            acc + (isPrecoNumerico(produto.preco) ? calcularSubtotal(produto.preco, produto.estoque) : 0), 0)) * 100).toFixed(2)
        };
      });
      
      // Ordenar por valor em estoque (do maior para o menor)
      dadosInventarioPorCategoria.sort((a, b) => parseFloat(b['Valor em Estoque (R$)']) - parseFloat(a['Valor em Estoque (R$)']));
      
      // Criar workbook com múltiplas planilhas
      const wb = XLSX.utils.book_new();
      
      // Adicionar planilha de Resumo Geral
      const wsResumo = XLSX.utils.json_to_sheet([resumoVendas]);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Geral");
      
      // Adicionar planilha de Resumo por Categoria
      const wsResumoPorCategoria = XLSX.utils.json_to_sheet(dadosResumoPorCategoria);
      XLSX.utils.book_append_sheet(wb, wsResumoPorCategoria, "Resumo por Categoria");
      
      // Adicionar planilha de Resumo por Produto
      const wsResumoPorProduto = XLSX.utils.json_to_sheet(dadosResumoProdutos);
      XLSX.utils.book_append_sheet(wb, wsResumoPorProduto, "Resumo por Produto");
      
      // Adicionar planilha de Vendas
      const wsVendas = XLSX.utils.json_to_sheet(dadosVendas);
      XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");
      
      // Adicionar planilha de Itens
      const wsItens = XLSX.utils.json_to_sheet(dadosItens);
      XLSX.utils.book_append_sheet(wb, wsItens, "Itens Detalhados");
      
      // Adicionar planilha de Inventário de Produtos
      const wsInventario = XLSX.utils.json_to_sheet(dadosInventario);
      XLSX.utils.book_append_sheet(wb, wsInventario, "Inventário de Produtos");
      
      // Adicionar planilha de Inventário por Categoria
      const wsInventarioPorCategoria = XLSX.utils.json_to_sheet(dadosInventarioPorCategoria);
      XLSX.utils.book_append_sheet(wb, wsInventarioPorCategoria, "Inventário por Categoria");
      
      // Gerar nome do arquivo com data atual
      const dataAtual = format(new Date(), 'dd-MM-yyyy');
      const nomeArquivo = `Relatório_Vendas_${dataAtual}.xlsx`;
      
      // Exportar o arquivo
      XLSX.writeFile(wb, nomeArquivo);
      
      toast({
        title: "Relatório gerado com sucesso",
        description: `O arquivo ${nomeArquivo} foi baixado para o seu computador.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Ocorreu um erro ao gerar o relatório de vendas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vendas</h2>
          <p className="text-muted-foreground">Gerenciar e registrar vendas de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarParaExcel} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </>
            )}
          </Button>
          <Button onClick={() => navigate("/vendas/nova")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Histórico de Vendas</CardTitle>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-full sm:w-auto sm:flex-1 min-w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por cliente ou código da venda..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-wrap items-end gap-4 border-t pt-4">
              <div className="flex flex-col">
                <Label htmlFor="data-inicial" className="mb-2 text-sm font-medium">Data Inicial</Label>
                <Input
                  id="data-inicial"
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              
              <div className="flex flex-col">
                <Label htmlFor="data-final" className="mb-2 text-sm font-medium">Data Final</Label>
                <Input
                  id="data-final"
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              
              <Button 
                variant="outline"
                onClick={carregarVendas}
                className="h-10 px-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Filtrando...
                  </>
                ) : (
                  'Filtrar'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Carregando vendas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredVendas.length > 0 ? (
                filteredVendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-medium">{venda.id.substring(0, 8)}</TableCell>
                    <TableCell>{venda.cliente}</TableCell>
                    <TableCell>{venda.data}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(venda.status)} hover:${getStatusColor(venda.status)}`}>
                        {venda.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">R$ {venda.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShowDetails(venda)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditarVenda(venda)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar venda
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/vendas/${venda.id}/comprovante`}>Gerar comprovante</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setVendaParaExcluir(venda.id);
                              setConfirmacaoExclusaoAberta(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deletar venda
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma venda encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for viewing sale details */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-5 w-5 text-primary" />
              Detalhes da Venda #{selectedVenda?.id}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 overflow-y-auto pr-2 my-2 pb-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
            {/* Seção de informações principais */}
            {/* Informações do cliente e da venda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border border-muted-foreground/20">
              <div className="md:col-span-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Informações do Cliente</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 bg-white p-3 rounded-md shadow-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedVenda?.cliente}</p>
                  </div>
                  {selectedVenda?.geracao && (
                    <div>
                      <p className="text-xs text-muted-foreground">Geração</p>
                      <p className="font-medium">{selectedVenda.geracao}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Data da Venda</p>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm mt-1">
                  <p className="font-medium">{selectedVenda?.data}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Forma de Pagamento</p>
                </div>
                <Select
                  value={selectedVenda?.forma_pagamento || ''}
                  onValueChange={(value: string) => handleFormaPagamentoChange(value)}
                >
                  <SelectTrigger className="w-full bg-white shadow-sm">
                    <SelectValue placeholder="Forma de Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Total</p>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm mt-1">
                  <p className="font-medium text-lg">R$ {selectedVenda?.total.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Status da Venda</p>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm mt-1 flex items-center">
                  <Badge className={`${selectedVenda && getStatusColor(selectedVenda.status)}`}>
                    {selectedVenda?.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Status do Pagamento</p>
                </div>
                <Select
                  value={selectedVenda?.status_pagamento}
                  onValueChange={(value: StatusPagamento) => handleStatusPagamentoChange(value)}
                >
                  <SelectTrigger className="w-full bg-white shadow-sm">
                    <SelectValue placeholder="Status do Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Feito (pago)">Feito (pago)</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                    <SelectItem value="Ofertado">Ofertado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Status de Entrega</p>
                </div>
                <Select
                  value={selectedVenda?.retira_produto || 'Reserva'}
                  onValueChange={(value: 'Reserva' | 'Entregue') => handleRetiraProdutoChange(value)}
                >
                  <SelectTrigger className="w-full bg-white shadow-sm">
                    <SelectValue placeholder="Status de Entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reserva">Reserva</SelectItem>
                    <SelectItem value="Entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
            </div>
            
            {/* Seção de Observações */}
            <div className="mt-6 bg-muted/30 p-4 rounded-lg border border-muted-foreground/20">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-primary">Observações do Cliente</p>
              </div>
              <div className="border rounded-md p-4 bg-white shadow-sm">
                {selectedVenda?.observacoes ? (
                  <p className="text-sm">{selectedVenda.observacoes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada</p>
                )}
              </div>
            </div>
            
            {/* Seção de Itens Vendidos */}
            <div className="mt-6 bg-muted/30 p-4 rounded-lg border border-muted-foreground/20">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-primary">Itens da Venda</p>
              </div>
              
              {loadingDetalhes ? (
                <div className="bg-white p-8 rounded-md text-center shadow-sm">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground">Carregando itens da venda...</p>
                </div>
              ) : itensVenda.length > 0 ? (
                <div className="border rounded-md overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Produto</TableHead>
                        <TableHead className="text-right font-semibold">Qtd</TableHead>
                        <TableHead className="text-right font-semibold">Preço Unit.</TableHead>
                        <TableHead className="text-right font-semibold">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensVenda.map((item) => {
                        // Recalcular o subtotal para garantir que esteja correto
                        const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
                        
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{item.produto_nome}</TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">{formatarPreco(item.preco_unitario)}</TableCell>
                            <TableCell className="text-right font-medium">{formatarPreco(subtotalCalculado)}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/20 border-t-2">
                        <TableCell colSpan={3} className="text-right font-semibold">Total:</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatarPreco(selectedVenda?.total || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-md text-center shadow-sm">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum item encontrado para esta venda.
                  </p>
                </div>
              )}
            </div>
            
            {/* Seção de Comprovante de Pagamento */}
            <div className="mt-6 bg-muted/30 p-4 rounded-lg border border-muted-foreground/20">
              <div className="flex items-center gap-2 mb-3">
                <FileDown className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-primary">Comprovante de Pagamento</p>
              </div>
              
              {selectedVenda?.comprovante_url ? (
                <div className="border rounded-md p-4 bg-white shadow-sm">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative group cursor-pointer">
                      <img 
                        src={selectedVenda.comprovante_url} 
                        alt="Comprovante de Pagamento" 
                        className="h-48 object-contain rounded-md border border-gray-200 hover:border-primary transition-all"
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 rounded-md transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Search className="h-6 w-6 text-gray-700" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 items-center md:items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Comprovante anexado em:</p>
                        <p className="font-medium">{selectedVenda.data}</p>
                      </div>
                      <div className="flex gap-3">
                        <a 
                          href={selectedVenda.comprovante_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir em nova aba
                        </a>
                        <a 
                          href={selectedVenda.comprovante_url} 
                          download
                          className="flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Baixar
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed rounded-md p-6 bg-white shadow-sm flex flex-col items-center justify-center text-center">
                  <FileX className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">Nenhum comprovante de pagamento anexado</p>
                  {selectedVenda?.status_pagamento === 'Pendente' && (
                    <p className="text-sm text-muted-foreground mt-2">O cliente ainda não enviou o comprovante de pagamento</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t mt-2 flex justify-end">
            <Button onClick={() => setShowDetails(false)} className="px-6">
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para excluir venda */}
      <Dialog open={confirmacaoExclusaoAberta} onOpenChange={setConfirmacaoExclusaoAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Atenção:</strong> Esta ação <span className="text-destructive font-medium">NÃO</span> restaurará automaticamente o estoque dos produtos vendidos.
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmacaoExclusaoAberta(false)}
              disabled={excluindoVenda}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluirVenda}
              disabled={excluindoVenda}
            >
              {excluindoVenda ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir venda'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para editar venda */}
      <Dialog open={modoEdicao} onOpenChange={(open) => !salvandoEdicao && setModoEdicao(open)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Venda #{vendaEmEdicao?.id}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{vendaEmEdicao?.cliente}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{vendaEmEdicao?.data}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`${vendaEmEdicao && getStatusColor(vendaEmEdicao.status)} mt-1`}>
                  {vendaEmEdicao?.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-medium">{formatarPreco(vendaEmEdicao?.total)}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-4">Itens da venda</p>
              
              {loadingDetalhes ? (
                <div className="bg-accent/30 p-4 rounded-md text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Carregando itens da venda...</p>
                </div>
              ) : itensVenda.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensVenda.map((item) => {
                        // Recalcular o subtotal para garantir que esteja correto
                        const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">{formatarPreco(item.preco_unitario)}</TableCell>
                            <TableCell className="text-right">{formatarPreco(subtotalCalculado)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoverItem(item.id)}
                                disabled={removendoItem === item.id}
                              >
                                {removendoItem === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MinusCircle className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="bg-accent/30 p-4 rounded-md text-center">
                  <p className="text-muted-foreground">
                    Nenhum item encontrado para esta venda.
                  </p>
                </div>
              )}
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-4">Adicionar novo item</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="produto">Produto</Label>
                  <Select value={selectedProdutoId} onValueChange={setSelectedProdutoId}>
                    <SelectTrigger id="produto">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map(produto => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.nome} - {formatarPreco(produto.preco)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleAdicionarItem}
                    disabled={!selectedProdutoId || quantidade <= 0 || salvandoEdicao}
                    className="w-full"
                  >
                    {salvandoEdicao ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Produto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModoEdicao(false)} disabled={salvandoEdicao}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleFinalizarEdicao} disabled={salvandoEdicao}>
              <Save className="mr-2 h-4 w-4" />
              Concluir Edição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para inserir senha ao alterar para status "Ofertado" */}
      <Dialog open={senhaOfertaDialogAberto} onOpenChange={(open) => !alterandoStatusPagamento && setSenhaOfertaDialogAberto(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Autenticação Necessária</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              Para alterar o status de pagamento para "Ofertado", é necessário inserir a senha de administrador.
              Este status irá zerar o valor total da venda.              
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="senha-oferta">Senha</Label>
              <Input 
                id="senha-oferta" 
                type="password" 
                value={senhaOferta}
                onChange={(e) => setSenhaOferta(e.target.value)}
                placeholder="Digite a senha de administrador"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSenhaOfertaDialogAberto(false);
                setSenhaOferta("");
                setNovoStatusPagamentoPendente(null);
              }}
              disabled={alterandoStatusPagamento}
            >
              Cancelar
            </Button>
            <Button
              onClick={verificarSenhaOferta}
              disabled={!senhaOferta || alterandoStatusPagamento}
            >
              {alterandoStatusPagamento ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendas;
