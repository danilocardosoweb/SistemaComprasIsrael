import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, FileUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api, Produto, ItemVenda as SupabaseItemVenda, Cliente, StatusPagamento, GERACOES } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";

// Tipo ItemVenda para uso interno
type ItemVenda = {
  produto: Produto;
  quantidade: number;
};

const NovaVenda = () => {
  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [geracao, setGeracao] = useState<string>("");
  const [showCadastroCliente, setShowCadastroCliente] = useState(false);
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [formaPagamento, setFormaPagamento] = useState<string>("pix");
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>("Pendente");
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Função para cadastrar cliente
  const handleCadastrarCliente = async () => {
    if (!cliente.trim() || !telefone.trim()) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCadastrandoCliente(true);
      const novoCliente = await api.clientes.criar({
        nome: cliente,
        telefone,
        geracao: geracao || undefined,
      });

      toast({
        title: "Cliente cadastrado",
        description: "Cliente cadastrado com sucesso!",
      });

      // Limpar os campos do formulário
      setCliente("");
      setTelefone("");
      setGeracao("");
      setShowCadastroCliente(false);
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message || "Ocorreu um erro ao cadastrar o cliente.",
        variant: "destructive",
      });
    } finally {
      setCadastrandoCliente(false);
    }
  };
  
  // Carregar produtos ao montar o componente
  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        setLoading(true);
        const data = await api.produtos.listar();
        setProdutos(data);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar produtos",
          description: error.message || "Ocorreu um erro ao carregar os produtos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    carregarProdutos();
  }, [toast]);

  const handleAddItem = () => {
    if (!selectedProdutoId || quantidade <= 0) {
      toast({
        title: "Erro ao adicionar produto",
        description: "Selecione um produto e quantidade válida.",
        variant: "destructive",
      });
      return;
    }

    const produtoSelecionado = produtos.find(p => p.id === selectedProdutoId);
    
    if (!produtoSelecionado) return;
    
    // Verificar se o produto já está na lista
    const itemExistente = itensVenda.find(item => item.produto.id === selectedProdutoId);
    
    if (itemExistente) {
      setItensVenda(itensVenda.map(item => 
        item.produto.id === selectedProdutoId 
          ? { ...item, quantidade: item.quantidade + quantidade } 
          : item
      ));
    } else {
      setItensVenda([...itensVenda, { produto: produtoSelecionado, quantidade }]);
    }
    
    // Limpar campos
    setSelectedProdutoId("");
    setQuantidade(1);
  };

  const handleRemoveItem = (id: string) => {
    setItensVenda(itensVenda.filter(item => item.produto.id !== id));
  };

  const calcularTotal = () => {
    return itensVenda.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  };

  const handleComprovanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setComprovante(file);
    
    // Gerar preview se for imagem
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprovantePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setComprovantePreview("");
    }
  };

  const handleFinalizarVenda = async () => {
    if (itensVenda.length === 0) {
      toast({
        title: "Erro ao finalizar venda",
        description: "Adicione pelo menos um produto à venda.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSalvandoVenda(true);
      
      // Preparar itens da venda para o formato esperado pela API
      const itensParaAPI = itensVenda.map(item => ({
        produto_id: item.produto.id,
        produto_nome: item.produto.nome,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco,
        subtotal: item.produto.preco * item.quantidade
      }));
      
      // Criar venda com os itens
      const { data: novaVenda } = await api.vendas.criar(
        {
          data_venda: format(new Date(), 'yyyy-MM-dd'),
          cliente_id: null,
          cliente_nome: cliente,
          telefone: telefone,
          total: calcularTotal(),
          forma_pagamento: formaPagamento,
          status_pagamento: statusPagamento,
          status: statusPagamento === 'Feito (pago)' ? 'Finalizada' : statusPagamento === 'Cancelado' ? 'Cancelada' : 'Pendente'
        },
        itensParaAPI
      );
      
      if (!novaVenda) {
        toast({
          title: "Erro ao criar venda",
          description: "Não foi possível criar a venda.",
          variant: "destructive",
        });
        return;
      }
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Venda finalizada",
        description: "Venda finalizada com sucesso!",
      });
      
      // Redirecionar para a página de vendas
      navigate("/vendas");
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar venda",
        description: error.message || "Ocorreu um erro ao finalizar a venda.",
        variant: "destructive",
      });
    } finally {
      setSalvandoVenda(false);
    }
  };

  const removerComprovante = () => {
    setComprovante(null);
    setComprovantePreview("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Nova Venda</h2>
        <p className="text-muted-foreground">Registrar uma nova venda de produtos</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cliente">Nome do Cliente</Label>
                <div className="flex gap-2">
                  <Input 
                    id="cliente" 
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nome do cliente"
                    className="flex-1"
                  />
                  <Button onClick={() => setShowCadastroCliente(true)}>
                    Cadastrar Cliente
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="produto">Produto</Label>
                  <Select value={selectedProdutoId} onValueChange={setSelectedProdutoId}>
                    <SelectTrigger>
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
                    onChange={(e) => setQuantidade(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
              
              <div>
                {itensVenda.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Qtd.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensVenda.map((item) => (
                        <TableRow key={item.produto.id}>
                          <TableCell>{item.produto.nome}</TableCell>
                          <TableCell className="text-right">R$ {item.produto.preco.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">R$ {(item.produto.preco * item.quantidade).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.produto.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                        <TableCell className="text-right font-bold">R$ {calcularTotal().toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10 text-muted-foreground border rounded-md">
                    Nenhum produto adicionado à venda.
                  </div>
                )}
              </div>

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="statusPagamento">Status do Pagamento</Label>
                  <Select value={statusPagamento} onValueChange={(value: StatusPagamento) => setStatusPagamento(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status do pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Feito (pago)">Feito (pago)</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="comprovante">Comprovante de Pagamento (Opcional)</Label>
                <div className="border-2 border-dashed border-input rounded-md p-4">
                  {!comprovante ? (
                    <div className="text-center">
                      <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arraste e solte um arquivo aqui ou clique para selecionar
                      </p>
                      <Input
                        id="comprovante"
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.txt,.doc,.docx"
                        onChange={handleComprovanteChange}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById("comprovante")?.click()}
                      >
                        Selecionar Arquivo
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      {comprovantePreview ? (
                        <div className="mb-2">
                          <img 
                            src={comprovantePreview} 
                            alt="Comprovante de pagamento" 
                            className="max-h-36 mx-auto rounded-md"
                          />
                        </div>
                      ) : (
                        <div className="mb-2">
                          <FileUp className="h-8 w-8 mx-auto text-primary" />
                        </div>
                      )}
                      <p className="text-sm font-medium mb-2">
                        {comprovante.name}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={removerComprovante}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: imagens, PDF, TXT, DOC, DOCX
                </p>
              </div>
              
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => navigate("/vendas")}>Cancelar</Button>
                <Button 
                  onClick={handleFinalizarVenda} 
                  disabled={salvandoVenda}
                >
                  {salvandoVenda ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    'Finalizar Venda'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Cadastro de Cliente */}
      <Dialog open={showCadastroCliente} onOpenChange={setShowCadastroCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cadastroNome">Nome do Cliente</Label>
              <Input
                id="cadastroNome"
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cadastroTelefone">Telefone</Label>
              <Input
                id="cadastroTelefone"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cadastroGeracao">Geração</Label>
              <Select value={geracao} onValueChange={setGeracao}>
                <SelectTrigger id="cadastroGeracao">
                  <SelectValue placeholder="Selecione a geração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma</SelectItem>
                  {GERACOES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCadastroCliente(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCadastrarCliente}
              disabled={cadastrandoCliente}
            >
              {cadastrandoCliente ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NovaVenda;