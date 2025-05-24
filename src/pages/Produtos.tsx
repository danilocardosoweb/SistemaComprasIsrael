
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Search, Trash2, Loader2, Image, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, Produto, supabase } from "@/lib/supabase";
import { formatarPreco } from "@/utils/formatarPreco";

// Tipo Produto já está definido no arquivo supabase.ts

// Lista de categorias disponíveis
const CATEGORIAS = [
  'Congresso',
  'Evento',
  'Viagem',
  'Encontros',
  'Escola',
  'Seminário',
  'Produto',
  'Mentoria',
  'Conferência'
];

// Opções de parcelamento
const OPCOES_PARCELAMENTO = [
  'À vista',
  '2x',
  '3x',
  '4x',
  '5x',
  '6x',
  '7x',
  '8x',
  '9x',
  '10x',
  '12x'
];

const Produtos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todos");
  const [showDialog, setShowDialog] = useState(false);
  const [currentProduto, setCurrentProduto] = useState<Partial<Produto>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string>("");
  const [imagemPreview, setImagemPreview] = useState<string>("");
  const { toast } = useToast();

  const filteredProdutos = produtos.filter(produto => {
    // Filtro por texto de busca
    const matchesSearch = 
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por categoria
    const matchesCategoria = categoriaFiltro === "todos" || produto.categoria === categoriaFiltro;
    
    return matchesSearch && matchesCategoria;
  });

  // Função para extrair a URL da imagem da descrição
  const extrairUrlImagem = (descricao?: string): string => {
    if (!descricao) return "";
    
    const match = descricao.match(/\[IMG_URL\](https?:\/\/[^\s]+)/);
    return match ? match[1] : "";
  };
  
  // Função para limpar a descrição, removendo a URL da imagem
  const limparDescricao = (descricao?: string): string => {
    if (!descricao) return "";
    
    // Remove o prefixo [IMG_URL] e a URL que segue até o próximo espaço
    return descricao.replace(/\[IMG_URL\]https?:\/\/[^\s]+\s*/, "").trim();
  };

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setCurrentProduto(produto);
      setIsEditing(true);
      
      // Extrair a URL da imagem da descrição
      const urlImagem = extrairUrlImagem(produto.descricao);
      if (urlImagem) {
        setImagemUrl(urlImagem);
        setImagemPreview(urlImagem);
      } else {
        setImagemUrl("");
        setImagemPreview("");
      }
    } else {
      setCurrentProduto({});
      setIsEditing(false);
      setImagemUrl("");
      setImagemPreview("");
    }
    setShowDialog(true);
  };

  const handleImagemUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImagemUrl(url);
    
    // Atualizar preview se a URL for válida
    if (url && isValidUrl(url)) {
      setImagemPreview(url);
    } else {
      setImagemPreview("");
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const removerImagem = () => {
    setImagemUrl("");
    setImagemPreview("");
    if (isEditing) {
      setCurrentProduto({ ...currentProduto, imagem_url: undefined });
    }
  };

  const handleSaveProduct = async () => {
    // Validação diferente para produtos com preço variável
    if (!currentProduto.nome || !currentProduto.categoria || 
        (!currentProduto.preco_variavel && !currentProduto.preco)) {
      toast({
        title: "Erro ao salvar",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingAction(true);
    
    try {
      // Usar a URL da imagem se disponível e armazená-la na descrição com um prefixo especial
      // Formato: [IMG_URL]https://exemplo.com/imagem.jpg
      let descricao = currentProduto.descricao || '';
      
      // Se temos uma URL de imagem válida, vamos armazená-la na descrição
      if (imagemUrl && isValidUrl(imagemUrl)) {
        // Remover qualquer URL de imagem anterior da descrição
        descricao = descricao.replace(/\[IMG_URL\].*?(\s|$)/, '');
        // Adicionar a nova URL com o prefixo
        descricao = `[IMG_URL]${imagemUrl} ${descricao}`.trim();
      }
      
      if (isEditing && currentProduto.id) {
        // Atualizar produto existente
        const produtoAtualizado = {
          ...currentProduto,
          preco: currentProduto.preco_variavel ? "Consulte Valores" : (currentProduto.preco === "" ? 0 : currentProduto.preco),
          descricao
        };
        
        await api.produtos.atualizar(currentProduto.id, produtoAtualizado);
        
        // Atualizar a lista local
        setProdutos(produtos.map(p => 
          p.id === currentProduto.id ? { ...produtoAtualizado as Produto } : p
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
          preco: currentProduto.preco_variavel ? "Consulte Valores" : (currentProduto.preco === "" ? 0 : currentProduto.preco),
          preco_variavel: currentProduto.preco_variavel || false,
          estoque: currentProduto.estoque || 0,
          descricao: descricao,
          opcao_parcelamento: currentProduto.opcao_parcelamento || null,
          descricao_parcelamento: currentProduto.descricao_parcelamento || null
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
      setImagemUrl("");
      setImagemPreview("");
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
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={categoriaFiltro}
                onValueChange={setCategoriaFiltro}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  {CATEGORIAS.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
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
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={extrairUrlImagem(produto.descricao)} alt={produto.nome} />
                        <AvatarFallback>{produto.nome.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.categoria}</TableCell>
                    <TableCell className="text-right">
                      {formatarPreco(produto.preco)}
                    </TableCell>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize os detalhes do produto" : "Adicione um novo produto ao catálogo"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3 overflow-y-auto pr-2 flex-grow">
            <div className="grid gap-1.5">
              <Label htmlFor="imagem_url" className="flex items-center gap-2 text-sm">
                <Image className="h-4 w-4" />
                URL da imagem do produto
              </Label>
              <Input
                id="imagem_url"
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={imagemUrl}
                onChange={handleImagemUrlChange}
                className="h-9"
              />
              
              {imagemPreview && (
                <div className="relative mt-2 border rounded-md p-2">
                  <img
                    src={imagemPreview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removerImagem}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Cole a URL de uma imagem da web. A imagem deve estar hospedada em um site público.
              </div>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="nome" className="text-sm">Nome do produto*</Label>
              <Input
                id="nome"
                value={currentProduto.nome || ""}
                onChange={(e) => setCurrentProduto({ ...currentProduto, nome: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="categoria" className="text-sm">Categoria*</Label>
              <Select
                value={currentProduto.categoria || ""}
                onValueChange={(value) => setCurrentProduto({ ...currentProduto, categoria: value })}
              >
                <SelectTrigger id="categoria" className="h-9">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="preco" className="text-sm">Preço (R$)*</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="preco_variavel"
                      checked={currentProduto.preco_variavel || false}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setCurrentProduto({
                          ...currentProduto,
                          preco_variavel: isChecked,
                          preco: isChecked ? "Consulte Valores" : ""
                        });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                    />
                    <Label htmlFor="preco_variavel" className="text-xs">Consulte Valores</Label>
                  </div>
                </div>
                {!currentProduto.preco_variavel ? (
                  <Input
                    id="preco"
                    type="number"
                    min="0"
                    step="0.01"
                    value={typeof currentProduto.preco === 'number' ? currentProduto.preco : (currentProduto.preco === "" ? "" : 0)}
                    onChange={(e) => {
                      const valor = e.target.value === "" ? "" : parseFloat(e.target.value);
                      setCurrentProduto({ ...currentProduto, preco: valor });
                    }}
                    className="h-9"
                  />
                ) : (
                  <div className="h-9 flex items-center px-3 border rounded-md bg-gray-100 text-gray-500">
                    Consulte Valores
                  </div>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="estoque" className="text-sm">Estoque</Label>
                <Input
                  id="estoque"
                  type="number"
                  min="0"
                  value={currentProduto.estoque || ""}
                  onChange={(e) => setCurrentProduto({ ...currentProduto, estoque: parseInt(e.target.value) })}
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="opcao_parcelamento" className="text-sm">Opção de Parcelamento</Label>
              <Select
                value={currentProduto.opcao_parcelamento || ""}
                onValueChange={(value) => setCurrentProduto({ ...currentProduto, opcao_parcelamento: value })}
              >
                <SelectTrigger id="opcao_parcelamento" className="h-9">
                  <SelectValue placeholder="Selecione uma opção de parcelamento" />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_PARCELAMENTO.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="descricao_parcelamento" className="text-sm">Descrição do Parcelamento</Label>
              <Textarea
                id="descricao_parcelamento"
                value={currentProduto.descricao_parcelamento || ""}
                onChange={(e) => setCurrentProduto({ ...currentProduto, descricao_parcelamento: e.target.value })}
                className="min-h-[80px] resize-vertical"
                placeholder="Informe detalhes sobre o parcelamento, formas de pagamento, etc."
              />
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="descricao" className="text-sm">Descrição</Label>
              <Textarea
                id="descricao"
                value={limparDescricao(currentProduto.descricao || "")}
                onChange={(e) => {
                  // Preservar a URL da imagem ao atualizar a descrição
                  const urlImagem = extrairUrlImagem(currentProduto.descricao || "");
                  const novaDescricao = e.target.value;
                  
                  // Se temos uma URL de imagem, vamos mantê-la no início da descrição
                  const descricaoCompleta = urlImagem ? `[IMG_URL]${urlImagem} ${novaDescricao}` : novaDescricao;
                  
                  setCurrentProduto({ ...currentProduto, descricao: descricaoCompleta });
                }}
                className="min-h-[100px] resize-vertical"
                placeholder="Digite a descrição do produto aqui..."
              />
            </div>
          </div>
          <DialogFooter className="mt-4 pt-2 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveProduct}
              disabled={loadingAction}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loadingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
