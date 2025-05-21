import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ShoppingCart, Phone, User, Mail, Heart, ArrowRight, Check, Loader2, Users, X, ZoomIn, Calendar, MapPin, Star, Package, Mail as MailIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, Produto, GERACOES } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

// Função para extrair a URL da imagem da descrição
const extrairUrlImagem = (descricao?: string): string => {
  if (!descricao) return "";
  
  const match = descricao.match(/\[IMG_URL\](https?:\/\/[^\s]+)/);
  return match ? match[1] : "";
};


const PaginaInicial = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [showReservaDialog, setShowReservaDialog] = useState(false);
  const [enviandoReserva, setEnviandoReserva] = useState(false);
  // Estado para controlar a visualização 
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [mostrarQRCode, setMostrarQRCode] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  // Estado para controlar o pop-up de confirmação da reserva
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [dadosReserva, setDadosReserva] = useState({
    nome: "",
    telefone: "",
    email: "",
    geracao: "",
    formaPagamento: "",
    comprovantePagamento: null as File | null,
    observacoes: ""
  });
  // CNPJ para pagamento PIX
  const cnpjPix = "44.319.844/0001-75";
  const [mostrarQRCodePix, setMostrarQRCodePix] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Filtrar produtos com base na categoria e termo de busca
  const produtosFiltrados = produtos.filter(produto => 
    (categoriaAtiva === "todas" || produto.categoria === categoriaAtiva) &&
    (produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
     produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Carregar produtos ao montar o componente
  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        setLoading(true);
        const data = await api.produtos.listar();
        setProdutos(data);
        
        // Extrair categorias únicas
        const todasCategorias = [...new Set(data.map(p => p.categoria))].filter(Boolean);
        setCategorias(todasCategorias);
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

  const handleReservaClick = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setShowReservaDialog(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDadosReserva(prev => ({ ...prev, [name]: value }));
    
    // Se o campo for formaPagamento e o valor for pix, exibe o QR Code
    if (name === "formaPagamento" && value === "pix") {
      setMostrarQRCodePix(true);
    } else if (name === "formaPagamento" && value !== "pix") {
      setMostrarQRCodePix(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Verificar se o arquivo é uma imagem ou PDF
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        // Verificar se o tamanho do arquivo é menor que 5MB
        if (file.size <= 5 * 1024 * 1024) {
          setDadosReserva(prev => ({ ...prev, comprovantePagamento: file }));
        } else {
          toast({
            title: "Arquivo muito grande",
            description: "O comprovante deve ter no máximo 5MB.",
            variant: "destructive",
          });
          e.target.value = '';
        }
      } else {
        toast({
          title: "Formato inválido",
          description: "O comprovante deve ser uma imagem (JPG, PNG) ou PDF.",
          variant: "destructive",
        });
        e.target.value = '';
      }
    }
  };

  const handleEnviarReserva = async () => {
    if (!dadosReserva.nome || !dadosReserva.telefone || !dadosReserva.geracao || !dadosReserva.formaPagamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha seu nome, telefone, geração e forma de pagamento para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se o comprovante de pagamento foi anexado para pagamentos PIX
    if (dadosReserva.formaPagamento === 'pix' && !dadosReserva.comprovantePagamento) {
      toast({
        title: "Comprovante obrigatório",
        description: "Por favor, anexe o comprovante de pagamento para pagamentos via PIX.",
        variant: "destructive",
      });
      return;
    }

    if (!produtoSelecionado) {
      toast({
        title: "Erro na reserva",
        description: "Não foi possível identificar o produto selecionado.",
        variant: "destructive",
      });
      return;
    }

    // Mostrar pop-up de confirmação em vez de enviar imediatamente
    setMostrarConfirmacao(true);
  };

  // Função para processar a reserva após confirmação
  const processarReserva = async () => {
    setMostrarConfirmacao(false);
    setEnviandoReserva(true);

    try {
      // Preparar os dados para a API
      const dadosAPI: any = {
        nome: dadosReserva.nome,
        telefone: dadosReserva.telefone,
        email: dadosReserva.email || undefined,
        geracao: dadosReserva.geracao,  // Agora é obrigatório
        forma_pagamento: dadosReserva.formaPagamento, // Campo obrigatório de forma de pagamento
        observacoes: dadosReserva.observacoes || undefined,
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        preco_unitario: produtoSelecionado.preco,
        quantidade: 1 // Por padrão, reservamos apenas 1 unidade
      };
      
      // Registrar a reserva no banco de dados
      await api.reservas.criar(dadosAPI);
      
      toast({
        title: "Reserva realizada com sucesso!",
        description: "Seu produto foi reservado. Entraremos em contato para confirmar o pagamento.",
      });
      
      // Recarregar a lista de produtos para atualizar o estoque
      const carregarProdutosAtualizados = async () => {
        try {
          const data = await api.produtos.listar();
          setProdutos(data);
          
          // Extrair categorias únicas
          const todasCategorias = [...new Set(data.map(p => p.categoria))].filter(Boolean);
          setCategorias(todasCategorias);
        } catch (error: any) {
          console.error("Erro ao recarregar produtos:", error);
        }
      };
      
      carregarProdutosAtualizados();
      
      setShowReservaDialog(false);
      setDadosReserva({
        nome: "",
        telefone: "",
        email: "",
        geracao: "",
        formaPagamento: "",
        comprovantePagamento: null,
        observacoes: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro ao solicitar reserva",
        description: error.message || "Ocorreu um erro ao solicitar a reserva.",
        variant: "destructive",
      });
    } finally {
      setEnviandoReserva(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header com navegação e botão de login */}
      <header className="bg-purple-900 text-white py-3 px-4 md:px-6 lg:px-8 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/Image/Logo_Sim_Branco.png" 
              alt="Logo Rede de Casais" 
              className="h-8 w-auto" 
            />
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg">Rede de Casais</span>
              <span className="text-xs text-purple-200">Sistema de gerenciamento de Reservas</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-purple-800 hidden md:flex"
              onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
            >
              Produtos
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-purple-800 hidden md:flex"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            >
              Categorias
            </Button>
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300"
              onClick={() => navigate('/login')}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Área de Vendas
            </Button>
          </div>
        </div>
      </header>
      
      {/* Banner do Congresso 2025 - Versão ultra-compacta com expansão ao passar o mouse */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-800 to-purple-600 shadow-md border-b-2 border-yellow-400 transition-all duration-500 ease-in-out hover:py-4 group cursor-pointer">
        <div className="absolute inset-0 bg-purple-900/30 backdrop-blur-sm z-10"></div>
        
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-1 md:py-2 group-hover:py-6 md:group-hover:py-8 transition-all duration-500 relative z-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3 group-hover:gap-6">
            <div className="md:w-1/2 space-y-1 md:space-y-2 group-hover:space-y-4 text-center md:text-left transition-all duration-500">
              <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-400 text-purple-900 font-bold text-xs mb-1 group-hover:mb-2 animate-pulse">
                <Star className="mr-0.5 h-3 w-3 group-hover:h-4 group-hover:w-4 group-hover:mr-1" />
                <span className="hidden group-hover:inline">Evento Especial 2025</span>
                <span className="inline group-hover:hidden">2025</span>
              </div>
              <h2 className="text-sm md:text-base group-hover:text-2xl group-hover:md:text-3xl font-extrabold mb-1 group-hover:mb-2 text-white drop-shadow-lg transition-all duration-500">
                <span className="hidden group-hover:inline">Congresso de <span className="text-yellow-300">Famílias</span> 2025</span>
                <span className="inline group-hover:hidden"><span className="text-yellow-300">Famílias</span> 2025</span>
              </h2>
              <p className="text-white/90 mb-1 group-hover:mb-4 max-w-lg text-[10px] md:text-xs group-hover:text-sm group-hover:md:text-base transition-all duration-500 line-clamp-1 group-hover:line-clamp-none">
                Adquira produtos exclusivos do evento! Garanta sua reserva.
              </p>
              <div className="hidden group-hover:flex flex-wrap gap-2 group-hover:gap-3 justify-center md:justify-start transition-all duration-500">
                <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm">
                  <Calendar className="h-4 w-4 text-yellow-300 mr-2" />
                  <span>Maio</span>
                </div>
                <div 
                  className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm cursor-pointer hover:bg-white/30 transition-colors duration-300"
                  onClick={() => setMostrarMapa(true)}
                  title="Clique para ver no mapa"
                >
                  <MapPin className="h-4 w-4 text-yellow-300 mr-2" />
                  <span>Igreja Batista Vida Nova</span>
                </div>
              </div>
            </div>
            
            <div className="md:w-1/2 relative">
              <div className="relative rounded-lg group-hover:rounded-xl overflow-hidden transform transition-all group-hover:scale-110 duration-500 shadow-md group-hover:shadow-lg border border-white/20 group-hover:border-2 max-w-[120px] md:max-w-[150px] group-hover:max-w-xs mx-auto">
                <img 
                  src="/Image/Congresso_2025.png" 
                  alt="Congresso Famílias 2025" 
                  className="w-full h-auto object-cover cursor-pointer"
                  onClick={() => setMostrarQRCode(true)}
                  title="Clique para ver o QR Code"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-900/90 to-transparent p-1 group-hover:p-3 text-center">
                  <Button 
                    onClick={() => window.scrollTo({top: document.getElementById('produtos')?.offsetTop || 0, behavior: 'smooth'})} 
                    className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold text-[10px] group-hover:text-sm py-0 group-hover:py-1 h-6 group-hover:h-8 min-w-0 px-2 group-hover:px-3"
                    size="sm"
                  >
                    <span className="hidden group-hover:inline">Ver Produtos</span> <ArrowRight className="group-hover:ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Elementos decorativos - visíveis apenas no hover */}
              <div className="hidden group-hover:block absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full opacity-70 animate-pulse"></div>
              <div className="hidden group-hover:block absolute -bottom-1 -left-1 w-4 h-4 bg-purple-500 rounded-full opacity-70 animate-ping"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hero Section com imagem de fundo e efeito parallax */}
      <div className="relative bg-gradient-to-r from-purple-900 to-purple-950 text-white overflow-hidden">
        {/* Padrão decorativo de fundo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJ3aGl0ZSIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMiIvPjwvZz48L3N2Zz4=')] bg-repeat" style={{backgroundSize: '30px 30px'}}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="md:w-1/2 space-y-6 text-center md:text-left">
              <div>
                <span className="inline-block bg-purple-600 bg-opacity-50 text-white px-4 py-1 rounded-full text-sm font-medium mb-4 shadow-sm">
                  Vida Nova Hortolândia
                </span>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white drop-shadow-md">
                  Sistema de Reservas <br />
                  <span className="text-yellow-300 font-extrabold">Rede de Casais</span>
                </h1>
              </div>
              
              <p className="text-lg md:text-xl text-white max-w-xl bg-purple-950/50 p-3 rounded-md shadow-lg font-semibold border-l-4 border-yellow-300">
                Conheça nossa seleção de produtos e faça sua reserva de forma simples e rápida.
              </p>
              
              {/* Botões removidos conforme solicitado */}
            </div>
            
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-56 h-56 md:w-72 md:h-72 bg-purple-300 bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden shadow-2xl border-4 border-purple-300/30">
                <div className="absolute inset-2 rounded-full overflow-hidden bg-white flex items-center justify-center border border-purple-400/30">
                  {/* Logo da Rede de Casais */}
                  <img 
                    src="/Image/Logo_Sim_Lema.png" 
                    alt="Logo Rede de Casais" 
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      // Fallback para o texto SIM caso a imagem não carregue
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement.innerHTML = '<div class="text-6xl font-extrabold text-black drop-shadow-lg">SIM</div>';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ondulação decorativa na parte inferior */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
            <path fill="#ffffff" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Elemento de abas de categorias removido conforme solicitado */}
        </div>
      </div>

      {/* Products Grid */}
      <div id="produtos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {loading ? (
          // Loading Skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))
        ) : produtosFiltrados.length > 0 ? (
          produtosFiltrados.map((produto) => (
            <Card key={produto.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg group border-0 shadow">
              <div className="relative">
                {/* Imagem do produto */}
                <div className="h-60 bg-gray-100 relative overflow-hidden">
                  {extrairUrlImagem(produto.descricao) ? (
                    <div 
                      className="w-full h-full cursor-pointer relative group"
                      onClick={() => setImagemAmpliada(extrairUrlImagem(produto.descricao))}
                    >
                      <img 
                        src={extrairUrlImagem(produto.descricao)} 
                        alt={produto.nome}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="text-white bg-purple-700 bg-opacity-70 p-1 rounded-full h-8 w-8" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 text-gray-500">
                      <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center mb-2">
                        <span className="text-3xl font-light">{produto.nome.charAt(0)}</span>
                      </div>
                      <span className="text-sm">Sem imagem</span>
                    </div>
                  )}
                </div>
                
                {/* Badge de estoque */}
                <div className="absolute top-2 right-2">
                  {produto.estoque > 0 ? (
                    <Badge className="bg-green-500 text-white font-medium px-2 py-1 rounded-md">
                      Em estoque: {produto.estoque}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white font-medium px-2 py-1 rounded-md">
                      Esgotado
                    </Badge>
                  )}
                </div>
                
                {/* Logo da família (simulado) */}
                <div className="absolute top-2 left-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <CardTitle className="text-lg font-bold">{produto.nome}</CardTitle>
                </div>
                
                <Badge variant="outline" className="text-xs mb-2">
                  {produto.categoria}
                </Badge>
                
                <p className="text-2xl font-bold text-purple-700 mt-2">
                  R$ {produto.preco.toFixed(2).replace('.', ',')}
                </p>
              </CardContent>
              
              <CardFooter className="px-4 pb-4 pt-0">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2"
                  disabled={produto.estoque <= 0}
                  onClick={() => handleReservaClick(produto)}
                >
                  Reservar Produto
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar sua busca ou filtros para encontrar o que procura.
            </p>
          </div>
        )}
      </div>

      {/* Diálogo para exibir imagem ampliada */}
      <Dialog open={!!imagemAmpliada} onOpenChange={() => setImagemAmpliada(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          <div className="relative">
            <img 
              src={imagemAmpliada || ''} 
              alt="Imagem ampliada" 
              className="w-full h-auto rounded-lg shadow-2xl" 
            />
            <Button 
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-auto" 
              size="icon"
              onClick={() => setImagemAmpliada(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para QR Code */}
      <Dialog open={mostrarQRCode} onOpenChange={setMostrarQRCode}>
        <DialogContent className="max-w-md p-4 bg-white">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-purple-900">QR Code - Congresso Famílias 2025</DialogTitle>
            <DialogDescription className="text-center text-purple-700">
              Escaneie o QR Code para mais informações sobre o evento
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <div className="relative rounded-lg overflow-hidden shadow-lg border-2 border-purple-200 p-2 bg-white">
              <img 
                src="/Image/QR code.png" 
                alt="QR Code Congresso Famílias 2025" 
                className="w-full max-w-[250px] h-auto" 
              />
            </div>
          </div>
          <DialogFooter className="flex justify-center sm:justify-center">
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setMostrarQRCode(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reserva Dialog */}
      <Dialog open={showReservaDialog} onOpenChange={setShowReservaDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-800">Reservar Produto</DialogTitle>
            <DialogDescription>
              Preencha seus dados para reservar "{produtoSelecionado?.nome}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-6 py-4">
            {/* Informações do Produto */}
            <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 w-16 h-16 bg-white rounded-md overflow-hidden border">
                {extrairUrlImagem(produtoSelecionado?.descricao) ? (
                  <img 
                    src={extrairUrlImagem(produtoSelecionado?.descricao)} 
                    alt={produtoSelecionado?.nome}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="text-xl font-light">{produtoSelecionado?.nome?.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-medium">{produtoSelecionado?.nome}</h3>
                <p className="text-purple-700 font-bold">R$ {produtoSelecionado?.preco.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
            
            {/* Formulário de Dados */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Seus dados</h3>
              
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nome" className="flex items-center text-sm font-medium">
                    <User className="mr-2 h-4 w-4 text-purple-600" />
                    Nome completo *
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={dadosReserva.nome}
                    onChange={handleInputChange}
                    placeholder="Seu nome completo"
                    className="border-gray-300"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="telefone" className="flex items-center text-sm font-medium">
                      <Phone className="mr-2 h-4 w-4 text-purple-600" />
                      Telefone *
                    </Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      value={dadosReserva.telefone}
                      onChange={handleInputChange}
                      placeholder="(00) 00000-0000"
                      className="border-gray-300"
                    />
                  </div>
                  
                  <div className="grid gap-1.5">
                    <Label htmlFor="geracao" className="flex items-center text-sm font-medium">
                      <Users className="mr-2 h-4 w-4 text-purple-600" />
                      Geração *
                    </Label>
                    <Select 
                      value={dadosReserva.geracao} 
                      onValueChange={(value) => setDadosReserva({...dadosReserva, geracao: value})}
                    >
                      <SelectTrigger id="geracao" className="border-gray-300">
                        <SelectValue placeholder="Selecione sua geração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhuma">Nenhuma</SelectItem>
                        {GERACOES.map((geracao) => (
                          <SelectItem key={geracao} value={geracao}>{geracao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-1.5">
                  <Label htmlFor="formaPagamento" className="flex items-center text-sm font-medium">
                    <ShoppingCart className="mr-2 h-4 w-4 text-purple-600" />
                    Forma de Pagamento *
                  </Label>
                  <Select 
                    value={dadosReserva.formaPagamento} 
                    onValueChange={(value) => {
                      setDadosReserva(prev => ({ ...prev, formaPagamento: value }));
                      if (value === "pix") {
                        setMostrarQRCodePix(true);
                      } else {
                        setMostrarQRCodePix(false);
                      }
                    }}
                  >
                    <SelectTrigger id="formaPagamento" className="border-gray-300">
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão de Crédito/Débito</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {mostrarQRCodePix && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-md border border-purple-200">
                      <div className="flex flex-col items-center">
                        <h3 className="text-sm font-semibold text-purple-800 mb-1">QR Code para pagamento PIX</h3>
                        <div className="bg-white p-2 rounded-md shadow-sm mb-2">
                          <img 
                            src="/Image/QR Code_VidaNova.jpg" 
                            alt="QR Code PIX" 
                            className="w-48 h-48 object-contain"
                            onClick={() => window.open("/Image/QR Code_VidaNova.jpg", "_blank")}
                          />
                        </div>
                        <div className="w-full">
                          <p className="text-xs text-gray-600 mb-1">CNPJ (clique para copiar):</p>
                          <div 
                            className="flex items-center justify-between bg-white p-2 rounded border border-gray-300 cursor-pointer"
                            onClick={() => {
                              navigator.clipboard.writeText(cnpjPix);
                              toast({
                                title: "CNPJ copiado!",
                                description: "O CNPJ foi copiado para a área de transferência.",
                              });
                            }}
                          >
                            <span className="text-sm font-medium">{cnpjPix}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid gap-1.5">
                  <Label htmlFor="comprovantePagamento" className="flex items-center text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-purple-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Comprovante de Pagamento {dadosReserva.formaPagamento === 'pix' && '*'}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="comprovantePagamento"
                      name="comprovantePagamento"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="border-gray-300 flex-1"
                    />
                    {dadosReserva.comprovantePagamento && (
                      <div className="text-xs text-green-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Arquivo selecionado
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Aceita imagens (JPG, PNG) ou PDF. Máx: 5MB.</p>
                </div>
                
                <div className="grid gap-1.5">
                  <Label htmlFor="email" className="flex items-center text-sm font-medium">
                    <Mail className="mr-2 h-4 w-4 text-purple-600" />
                    E-mail (opcional)
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    value={dadosReserva.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    className="border-gray-300"
                  />
                </div>
                
                <div className="grid gap-1.5">
                  <Label htmlFor="observacoes" className="text-sm font-medium">Observações (opcional)</Label>
                  <Textarea
                    id="observacoes"
                    name="observacoes"
                    value={dadosReserva.observacoes}
                    onChange={handleInputChange}
                    placeholder="Alguma observação sobre sua reserva?"
                    rows={2}
                    className="border-gray-300"
                  />
                </div>
              </div>
            </div>
            
            {/* Alerta de Formas de Pagamento */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-purple-600">
                  📌
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800">Atenção! Forma de Pagamento</h3>
                  <div className="mt-2 text-sm text-purple-700 space-y-1">
                    <p>Os pagamentos serão aceitos somente através das seguintes opções:</p>
                    <p className="flex items-center">✅ <span className="ml-1">PIX no nome da Igreja Batista Vida Nova Hortolândia</span></p>
                    <p className="flex items-center">✅ <span className="ml-1">Maquininhas de cartão disponíveis dentro da igreja</span></p>
                    
                    <p className="mt-2">Após realizar o pagamento via PIX, envie o comprovante para o número:</p>
                    <p className="font-medium">📲 (19) 99165-9221 – Danilo Cardoso</p>
                    
                    <p className="mt-2">A confirmação do pagamento é essencial para validar sua compra.</p>
                    <p>Agradecemos a compreensão e confiança!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sticky bottom-0 bg-white pt-2 border-t">
            <Button variant="outline" onClick={() => setShowReservaDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleEnviarReserva} 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={enviandoReserva}
              size="lg"
            >
              {enviandoReserva ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Reserva
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação da reserva */}
      <Dialog open={mostrarConfirmacao} onOpenChange={setMostrarConfirmacao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-800">Confirmar Reserva</DialogTitle>
            <DialogDescription className="text-purple-700">
              Você está prestes a reservar o produto. Para retirar, procure Danilo Cardoso ou Tatiane Cardoso da Geração Israel com o comprovante de pagamento.              
            </DialogDescription>
          </DialogHeader>
          <div className="bg-purple-50 border border-purple-200 rounded-md p-4 my-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-purple-600">
                📌
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-purple-800">Informações importantes:</h3>
                <div className="mt-2 text-sm text-purple-700 space-y-1">
                  <p>1. Sua reserva será válida por 48 horas.</p>
                  <p>2. Após o pagamento, envie o comprovante para: (19) 99165-9221.</p>
                  <p>3. Caso não efetue o pagamento no prazo, sua reserva será cancelada automaticamente.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setMostrarConfirmacao(false)}>Cancelar</Button>
            <Button 
              onClick={processarReserva} 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={enviandoReserva}
            >
              {enviandoReserva ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Sim, confirmar reserva
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de QR Code */}
      <Dialog open={mostrarQRCode} onOpenChange={setMostrarQRCode}>
        <DialogContent className="sm:max-w-md bg-gradient-to-b from-purple-50 to-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold text-purple-800">QR Code do Evento</DialogTitle>
            <DialogDescription className="text-purple-700">
              Escaneie o QR Code para mais informações sobre o Congresso de Famílias 2025.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-6">
            <div className="bg-white p-4 rounded-xl shadow-md border-2 border-yellow-300 transform transition-transform hover:scale-105 duration-300">
              <img 
                src="/Image/QR code.png" 
                alt="QR Code do Evento" 
                className="w-64 h-64 object-contain"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between border-t pt-3">
            <div className="flex items-center text-sm text-purple-600 mb-3 sm:mb-0">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Maio de 2025</span>
            </div>
            <Button 
              type="button" 
              className="bg-purple-600 hover:bg-purple-700 text-white" 
              onClick={() => setMostrarQRCode(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal do Mapa */}
      <Dialog open={mostrarMapa} onOpenChange={setMostrarMapa}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Localização do Evento</DialogTitle>
            <DialogDescription>
              Av. Thereza Ana Cecon Breda, 2065 - Jardim das Colinas, Hortolândia - SP, 13183-255
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-2 h-[400px] w-full">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3675.9935869341897!2d-47.2145611!3d-22.8723693!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c8c0a8e5e8ee3b%3A0x7f1d67c9c5eaf7ac!2sAv.%20Thereza%20Ana%20Cecon%20Breda%2C%202065%20-%20Jardim%20das%20Colinas%2C%20Hortol%C3%A2ndia%20-%20SP%2C%2013183-255!5e0!3m2!1spt-BR!2sbr!4v1621609838000!5m2!1spt-BR!2sbr" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa da localização"
            ></iframe>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => window.open('https://maps.google.com/?q=Av.+Thereza+Ana+Cecon+Breda,+2065+-+Jardim+das+Colinas,+Hortol%C3%A2ndia+-+SP,+13183-255', '_blank')}
            >
              Abrir no Google Maps
            </Button>
            <Button type="button" variant="secondary" onClick={() => setMostrarMapa(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-16 bg-gradient-to-r from-purple-900 to-purple-800 text-white py-10 rounded-t-lg shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Coluna 1 - Logo e Informações */}
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center mb-4">
                <img 
                  src="/Image/logo_Sem_Fundo.png" 
                  alt="Logo Geração Israel" 
                  className="h-12 w-auto mr-2" 
                />
                <div>
                  <h3 className="font-bold text-lg">Geração Israel</h3>
                  <p className="text-xs text-purple-200">Sistema de Reservas</p>
                </div>
              </div>
              <p className="text-sm text-purple-200 text-center md:text-left mb-4">
                Facilitando o acesso aos produtos exclusivos da Geração Israel para toda a comunidade.
              </p>
              <div className="flex space-x-3">
                <a href="https://www.instagram.com/geracaoisrael" target="_blank" rel="noopener noreferrer" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              </div>
            </div>

            {/* Coluna 2 - Links Rápidos */}
            <div className="text-center md:text-left">
              <h3 className="font-bold text-lg mb-4 border-b border-purple-700 pb-2">Links Rápidos</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#produtos" className="text-purple-200 hover:text-white transition-colors flex items-center justify-center md:justify-start">
                    <Package className="h-4 w-4 mr-2" /> Produtos
                  </a>
                </li>
                <li>
                  <a href="#" onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})} className="text-purple-200 hover:text-white transition-colors flex items-center justify-center md:justify-start">
                    <ShoppingCart className="h-4 w-4 mr-2" /> Como Reservar
                  </a>
                </li>
                <li>
                  <a href="#" onClick={() => setMostrarQRCode(true)} className="text-purple-200 hover:text-white transition-colors flex items-center justify-center md:justify-start">
                    <Calendar className="h-4 w-4 mr-2" /> Eventos
                  </a>
                </li>
                <li>
                  <a href="#" onClick={() => setMostrarMapa(true)} className="text-purple-200 hover:text-white transition-colors flex items-center justify-center md:justify-start">
                    <MapPin className="h-4 w-4 mr-2" /> Localização
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3 - Contato */}
            <div className="text-center md:text-left">
              <h3 className="font-bold text-lg mb-4 border-b border-purple-700 pb-2">Contato</h3>
              <ul className="space-y-3">
                <li className="flex items-center justify-center md:justify-start">
                  <Phone className="h-4 w-4 mr-2 text-yellow-300" />
                  <span>(19) 99165-9221</span>
                </li>
                <li className="flex items-center justify-center md:justify-start">
                  <MailIcon className="h-4 w-4 mr-2 text-yellow-300" />
                  <span>contato@geracaoisrael.com.br</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-purple-700 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-purple-300 mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} Geração Israel. Todos os direitos reservados.
            </p>
            <p className="text-xs text-purple-400">
              Desenvolvido com ❤️ por <a href="https://github.com/danilocardosoweb" target="_blank" rel="noopener noreferrer" className="text-yellow-300 hover:underline">Danilo Cardoso</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PaginaInicial;
