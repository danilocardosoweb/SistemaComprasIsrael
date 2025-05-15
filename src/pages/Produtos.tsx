
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Search, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, Produto } from "@/lib/supabase";

// Tipo Produto já está definido no arquivo supabase.ts

const Produtos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [currentProduto, setCurrentProduto] = useState<Partial<Produto>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const filteredProdutos = produtos.filter(produto => 
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setCurrentProduto(produto);
      setIsEditing(true);
    } else {
      setCurrentProduto({});
      setIsEditing(false);
    }
    setShowDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!currentProduto.nome || !currentProduto.categoria || !currentProduto.preco) {
      toast({
        title: "Erro ao salvar",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingAction(true);
    
    try {
      if (isEditing && currentProduto.id) {
        // Atualizar produto existente
        await api.produtos.atualizar(currentProduto.id, currentProduto);
        
        // Atualizar a lista local
        setProdutos(produtos.map(p => 
          p.id === currentProduto.id ? { ...currentProduto as Produto } : p
        ));
        
        toast({
          title: "Produto atualizado",
          description: `O produto "${currentProduto.nome}" foi atualizado com sucesso.`,
        });
      } else {
        // Criar novo produto
        const novoProduto = {
          nome: currentProduto.nome || '',
          categoria: currentProduto.categoria || '',
          preco: currentProduto.preco || 0,
          estoque: currentProduto.estoque || 0,
          descricao: currentProduto.descricao || ''
        };
        
        const produtoCriado = await api.produtos.criar(novoProduto);
        
        // Adicionar à lista local
        setProdutos([...produtos, produtoCriado]);
        
        toast({
          title: "Produto adicionado",
          description: `O produto "${produtoCriado.nome}" foi adicionado com sucesso.`,
        });
      }
      
      setShowDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message || "Ocorreu um erro ao salvar o produto.",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      setLoadingAction(true);
      
      // Excluir do Supabase
      await api.produtos.excluir(id);
      
      // Atualizar lista local
      setProdutos(produtos.filter(p => p.id !== id));
      
      toast({
        title: "Produto removido",
        description: "O produto foi removido com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover produto",
        description: error.message || "Ocorreu um erro ao remover o produto.",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Produtos</h2>
          <p className="text-muted-foreground">Gerenciar produtos disponíveis para venda</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Produtos</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
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
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProdutos.length > 0 ? (
                filteredProdutos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.categoria}</TableCell>
                    <TableCell className="text-right">R$ {produto.preco.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{produto.estoque}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(produto)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(produto.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for adding/editing products */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize os detalhes do produto" : "Adicione um novo produto ao catálogo"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome do produto*</Label>
              <Input
                id="nome"
                value={currentProduto.nome || ""}
                onChange={(e) => setCurrentProduto({ ...currentProduto, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoria*</Label>
              <Input
                id="categoria"
                value={currentProduto.categoria || ""}
                onChange={(e) => setCurrentProduto({ ...currentProduto, categoria: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="preco">Preço (R$)*</Label>
                <Input
                  id="preco"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentProduto.preco || ""}
                  onChange={(e) => setCurrentProduto({ ...currentProduto, preco: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estoque">Estoque</Label>
                <Input
                  id="estoque"
                  type="number"
                  min="0"
                  value={currentProduto.estoque || ""}
                  onChange={(e) => setCurrentProduto({ ...currentProduto, estoque: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveProduct}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
