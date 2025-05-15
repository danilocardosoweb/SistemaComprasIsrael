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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Eye, Loader2, FileDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, Venda as SupabaseVenda, ItemVenda, StatusPagamento, StatusVenda } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

// Interface para exibição na interface
type VendaExibicao = {
  id: string;
  cliente: string;
  data: string;
  total: number;
  status: StatusVenda;
  produtos: number;
  itens?: ItemVenda[];
  forma_pagamento?: string;
  status_pagamento: StatusPagamento;
};

const Vendas = () => {
  const [vendas, setVendas] = useState<VendaExibicao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenda, setSelectedVenda] = useState<VendaExibicao | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Carregar vendas do Supabase ao montar o componente
  useEffect(() => {
    const carregarVendas = async () => {
      try {
        setLoading(true);
        const vendasSupabase = await api.vendas.listar();
        
        // Converter para o formato de exibição
        const vendasFormatadas: VendaExibicao[] = vendasSupabase.map(venda => ({
          id: venda.id,
          cliente: venda.cliente_nome,
          data: format(new Date(venda.data_venda), 'dd/MM/yyyy'),
          total: venda.total,
          status: venda.status_pagamento === 'Pendente' ? 'Pendente' : 'Finalizada',
          status_pagamento: venda.status_pagamento,
          produtos: 0, // Será atualizado ao carregar os detalhes
          forma_pagamento: venda.forma_pagamento
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
      // Carregar os itens da venda
      const itens = await api.vendas.obterItens(venda.id);
      setItensVenda(itens);
      
      // Atualizar a quantidade de produtos na venda selecionada
      setSelectedVenda(prev => {
        if (prev) {
          return { ...prev, produtos: itens.length };
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

  const handleStatusPagamentoChange = async (novoStatus: StatusPagamento) => {
    if (!selectedVenda) return;

    try {
      // Atualizar o status de pagamento no banco de dados
      await api.vendas.atualizar(selectedVenda.id, {
        status_pagamento: novoStatus
      });

      // Atualizar o estado local
      setSelectedVenda(prev => {
        if (prev) {
          const novoStatusVenda = novoStatus === 'Pendente' ? 'Pendente' : 'Finalizada';
          return { ...prev, status_pagamento: novoStatus, status: novoStatusVenda };
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
            status: novoStatusVenda
          };
        }
        return v;
      });
      setVendas(vendasAtualizadas);

      toast({
        title: "Status de pagamento atualizado",
        description: `O status de pagamento foi atualizado para ${novoStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status de pagamento.",
        variant: "destructive",
      });
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
      
      // Buscar todas as vendas com seus itens
      const vendasCompletas = await Promise.all(
        vendas.map(async (venda) => {
          const itens = await api.vendas.obterItens(venda.id);
          return {
            ...venda,
            itens
          };
        })
      );
      
      // Preparar dados para o Excel - Planilha de Vendas
      const dadosVendas = vendasCompletas.map(venda => {
        // Criar uma lista formatada dos produtos da venda
        const produtosLista = venda.itens?.map(item => 
          `${item.quantidade}x ${item.produto_nome} (R$ ${item.preco_unitario.toFixed(2)})`
        ).join(', ') || '';
        
        return {
          'Código': venda.id,
          'Cliente': venda.cliente,
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
      
      // Preparar dados para o Excel - Planilha de Resumo
      const resumoVendas = {
        'Total de Vendas': vendasCompletas.length,
        'Valor Total (R$)': vendasCompletas.reduce((acc, venda) => acc + venda.total, 0).toFixed(2),
        'Vendas Pendentes': vendasCompletas.filter(v => v.status === 'Pendente').length,
        'Vendas Finalizadas': vendasCompletas.filter(v => v.status === 'Finalizada').length,
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
                          <DropdownMenuItem asChild>
                            <Link to={`/vendas/${venda.id}/comprovante`}>Gerar comprovante</Link>
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
                <p className="font-medium">
                  {selectedVenda?.forma_pagamento === 'pix' ? 'PIX' : 
                   selectedVenda?.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                   selectedVenda?.forma_pagamento === 'cartao' ? 'Cartão' : 
                   selectedVenda?.forma_pagamento || 'Não informado'}
                </p>
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
                    <SelectItem value="Feito">Feito</SelectItem>
                    <SelectItem value="Realizado">Realizado</SelectItem>
                  </SelectContent>
                </Select>
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
    </div>
  );
};

export default Vendas;
