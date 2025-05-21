import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, MoreHorizontal, Eye, Loader2, FileDown, Trash2, Edit, Save, X, MinusCircle, Download, ExternalLink, FileX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, Venda as SupabaseVenda, ItemVenda, StatusPagamento, StatusVenda, Produto, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

// Interface para exibição na interface
type VendaExibicao = {
  id: string;
  cliente_id?: string;
  cliente: string;
  data: string;
  total: number;
  status: StatusVenda;
  produtos: number;
  itens?: ItemVenda[];
  forma_pagamento?: string;
  status_pagamento: StatusPagamento;
  geracao?: string;
  comprovante_url?: string | null;
};

const Vendas = () => {
  const [vendas, setVendas] = useState<VendaExibicao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
    return itens.reduce((total, item) => total + item.subtotal, 0);
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
  
  // Carregar vendas do Supabase ao montar o componente
  useEffect(() => {
    const carregarVendas = async () => {
      try {
        setLoading(true);
        const vendasSupabase = await api.vendas.listar();
        
        // Converter para o formato de exibição
        const vendasFormatadas: VendaExibicao[] = vendasSupabase.map(venda => ({
          id: venda.id,
          cliente_id: venda.cliente_id || undefined,
          cliente: venda.cliente_nome,
          data: format(new Date(venda.data_venda), 'dd/MM/yyyy'),
          total: venda.total,
          status: venda.status_pagamento === 'Pendente' ? 'Pendente' : 'Finalizada',
          status_pagamento: venda.status_pagamento,
          produtos: 0, // Será atualizado ao carregar os detalhes
          forma_pagamento: venda.forma_pagamento,
          comprovante_url: venda.comprovante_url
        }));
        
        setVendas(vendasFormatadas);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar vendas",
          description: error.message || "Ocorreu um erro ao carregar as vendas.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    carregarVendas();
  }, [toast]);

  const filteredVendas = vendas.filter(venda => 
    venda.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venda.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShowDetails = async (venda: VendaExibicao) => {
    setSelectedVenda(venda);
    setShowDetails(true);
    setLoadingDetalhes(true);
    
    try {
      // Carregar os detalhes completos da venda
      const vendaCompleta = await api.vendas.obter(venda.id);
      
      // Carregar os itens da venda
      const itens = await api.vendas.obterItens(venda.id);
      setItensVenda(itens);
      
      // Atualizar a venda selecionada com todos os detalhes
      setSelectedVenda(prev => {
        if (prev) {
          return { 
            ...prev, 
            produtos: itens.length,
            comprovante_url: vendaCompleta.comprovante_url,
            forma_pagamento: vendaCompleta.forma_pagamento,
            status_pagamento: vendaCompleta.status_pagamento
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
      setItensVenda(itens);
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
      const novoItem = {
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        quantidade,
        preco_unitario: produtoSelecionado.preco,
        subtotal: produtoSelecionado.preco * quantidade
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
          `${item.quantidade}x ${item.produto_nome} (R$ ${item.preco_unitario.toFixed(2)})`
        ).join(', ') || '';
        
        return {
          'Código': venda.id,
          'Cliente': venda.cliente,
          'Geração': venda.geracao || 'Não informado',
          'Data': venda.data,
          'Total (R$)': venda.total.toFixed(2),
          'Status': venda.status,
          'Status Pagamento': venda.status_pagamento,
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
          dadosItens.push({
            'Código Venda': venda.id,
            'Cliente': venda.cliente,
            'Data Venda': venda.data,
            'Produto': item.produto_nome,
            'Quantidade': item.quantidade,
            'Preço Unitário (R$)': item.preco_unitario.toFixed(2),
            'Subtotal (R$)': item.subtotal.toFixed(2),
            'Status da Venda': venda.status,
            'Status Pagamento': venda.status_pagamento,
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
          'Preço (R$)': produto.preco.toFixed(2),
          'Estoque Atual': produto.estoque,
          'Valor em Estoque (R$)': (produto.preco * produto.estoque).toFixed(2),
          'Descrição': produto.descricao || ''
        };
      });
      
      // Ordenar produtos por estoque (do menor para o maior)
      dadosInventario.sort((a, b) => a['Estoque Atual'] - b['Estoque Atual']);
      
      // Preparar dados para o Excel - Planilha de Resumo
      const resumoVendas = {
        'Total de Vendas': vendasCompletas.length,
        'Valor Total (R$)': vendasCompletas.reduce((acc, venda) => acc + venda.total, 0).toFixed(2),
        'Vendas Pendentes': vendasCompletas.filter(v => v.status === 'Pendente').length,
        'Vendas Finalizadas': vendasCompletas.filter(v => v.status === 'Finalizada').length,
        'Total de Produtos em Estoque': todosProdutos.reduce((acc, produto) => acc + produto.estoque, 0),
        'Valor Total em Estoque (R$)': todosProdutos.reduce((acc, produto) => acc + (produto.preco * produto.estoque), 0).toFixed(2),
        'Data do Relatório': format(new Date(), 'dd/MM/yyyy')
      };
      
      // Criar workbook com múltiplas planilhas
      const wb = XLSX.utils.book_new();
      
      // Adicionar planilha de Resumo
      const wsResumo = XLSX.utils.json_to_sheet([resumoVendas]);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
      
      // Adicionar planilha de Vendas
      const wsVendas = XLSX.utils.json_to_sheet(dadosVendas);
      XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas");
      
      // Adicionar planilha de Itens
      const wsItens = XLSX.utils.json_to_sheet(dadosItens);
      XLSX.utils.book_append_sheet(wb, wsItens, "Itens Detalhados");
      
      // Adicionar planilha de Inventário de Produtos
      const wsInventario = XLSX.utils.json_to_sheet(dadosInventario);
      XLSX.utils.book_append_sheet(wb, wsInventario, "Inventário de Produtos");
      
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
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou código da venda..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Venda #{selectedVenda?.id}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{selectedVenda?.cliente}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{selectedVenda?.data}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`${selectedVenda && getStatusColor(selectedVenda.status)} mt-1`}>
                  {selectedVenda?.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-medium">R$ {selectedVenda?.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                <Select
                  value={selectedVenda?.forma_pagamento || ''}
                  onValueChange={(value: string) => handleFormaPagamentoChange(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Forma de Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status do Pagamento</p>
                <Select
                  value={selectedVenda?.status_pagamento}
                  onValueChange={(value: StatusPagamento) => handleStatusPagamentoChange(value)}
                >
                  <SelectTrigger className="w-[180px]">
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
              
              {/* Comprovante de Pagamento */}
              <div className="col-span-2 mt-2">
                <p className="text-sm text-muted-foreground mb-1">Comprovante de Pagamento</p>
                {selectedVenda?.comprovante_url ? (
                  <div className="border rounded-md p-3 bg-gray-50">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative group cursor-pointer">
                        <img 
                          src={selectedVenda.comprovante_url} 
                          alt="Comprovante de Pagamento" 
                          className="h-40 object-contain rounded-md border border-gray-200 hover:border-primary transition-all"
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 rounded-md transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Search className="h-6 w-6 text-gray-700" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-center sm:items-start">
                        <p className="text-sm">Comprovante anexado em: {selectedVenda.data}</p>
                        <div className="flex gap-2">
                          <a 
                            href={selectedVenda.comprovante_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Abrir em nova aba
                          </a>
                          <a 
                            href={selectedVenda.comprovante_url} 
                            download
                            className="flex items-center gap-1 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/90 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Baixar
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-md p-4 bg-muted/50 flex flex-col items-center justify-center text-center">
                    <FileX className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum comprovante de pagamento anexado</p>
                    {selectedVenda?.status_pagamento === 'Pendente' && (
                      <p className="text-xs text-muted-foreground mt-1">O cliente ainda não enviou o comprovante de pagamento</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Itens vendidos</p>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensVenda.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {item.subtotal.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
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
                <p className="font-medium">R$ {vendaEmEdicao?.total.toFixed(2)}</p>
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
                      {itensVenda.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.produto_nome}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                          <TableCell className="text-right">R$ {item.subtotal.toFixed(2)}</TableCell>
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
                      ))}
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
                          {produto.nome} - R$ {produto.preco.toFixed(2)}
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
