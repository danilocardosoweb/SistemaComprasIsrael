import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ShoppingCart, Phone, User, Mail, Heart, ArrowRight, Check, Loader2, Users, X, ZoomIn, Calendar, MapPin, Star, Package, Mail as MailIcon, Globe, Briefcase, Plane, BookOpen, BookmarkCheck, Award, Gift, Coffee, Mic, GraduationCap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, Produto, Venda, StatusPagamento, StatusVenda, ItemVenda, GERACOES, supabase } from "@/lib/supabase";
import { formatarPreco, precoParaNumero, calcularSubtotal, isPrecoConsulta } from "@/utils/formatarPreco";
import { useNavigate } from "react-router-dom";

// Interface para os itens da reserva na página inicial
interface ItemReserva {
  produto: Produto;
  quantidade: number;
}

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

// Função para obter o estilo do ícone com base na categoria
const getCategoriaIconStyle = (categoria: string): string => {
  const categoriaLower = categoria.toLowerCase();
  
  // Cores específicas para cada categoria
  if (categoriaLower.includes('congresso')) return 'bg-gradient-to-br from-blue-500 to-blue-700';
  if (categoriaLower.includes('evento')) return 'bg-gradient-to-br from-pink-500 to-pink-700';
  if (categoriaLower.includes('viagem')) return 'bg-gradient-to-br from-cyan-500 to-cyan-700';
  if (categoriaLower.includes('encontro')) return 'bg-gradient-to-br from-green-500 to-green-700';
  if (categoriaLower.includes('escola')) return 'bg-gradient-to-br from-amber-500 to-amber-700';
  if (categoriaLower.includes('seminário') || categoriaLower.includes('seminario')) return 'bg-gradient-to-br from-indigo-500 to-indigo-700';
  if (categoriaLower.includes('produto')) return 'bg-gradient-to-br from-rose-500 to-rose-700';
  if (categoriaLower.includes('mentoria')) return 'bg-gradient-to-br from-violet-500 to-violet-700';
  if (categoriaLower.includes('conferência') || categoriaLower.includes('conferencia')) return 'bg-gradient-to-br from-orange-500 to-orange-700';
  if (categoriaLower.includes('camisa')) return 'bg-gradient-to-br from-emerald-500 to-emerald-700';
  
  // Cor padrão para outras categorias
  return 'bg-gradient-to-br from-purple-500 to-purple-700';
};

// Função para obter o ícone com base na categoria
const getCategoriaIcon = (categoria: string) => {
  const categoriaLower = categoria.toLowerCase();
  
  // Ícones específicos para cada categoria
  if (categoriaLower.includes('congresso')) return <Mic className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('evento')) return <Calendar className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('viagem')) return <Plane className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('encontro')) return <Users className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('escola')) return <BookOpen className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('seminário') || categoriaLower.includes('seminario')) return <GraduationCap className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('produto')) return <Package className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('mentoria')) return <Award className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('conferência') || categoriaLower.includes('conferencia')) return <Globe className="h-4 w-4 text-white" />;
  if (categoriaLower.includes('camisa')) return <Gift className="h-4 w-4 text-white" />;
  
  // Ícone padrão para outras categorias
  return <Package className="h-4 w-4 text-white" />;
};


const PaginaInicial = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTextos, setLoadingTextos] = useState(true);
  const [enviandoReserva, setEnviandoReserva] = useState(false);
  const [produtoReserva, setProdutoReserva] = useState<Produto | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todas");
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [mostrarQRCode, setMostrarQRCode] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mostrarManualReserva, setMostrarManualReserva] = useState(false);
  const [mostrarSelecionarProdutos, setMostrarSelecionarProdutos] = useState(false);
  const [showReservaDialog, setShowReservaDialog] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<ItemReserva[]>([]);
  const [formReserva, setFormReserva] = useState({
    nome: "",
    telefone: "",
    email: "",
    geracao: "",
    observacoes: "",
    comprovante: null as File | null,
  });
  
  // Textos configuráveis do site
  const [textosSite, setTextosSite] = useState<TextosSite>({
    banner_titulo: "Congresso de Famílias 2025",
    banner_subtitulo: "Famílias 2025",
    banner_descricao: "Adquira produtos exclusivos do evento! Garanta sua reserva.",
    banner_badge: "2025",
    banner_badge_completo: "Evento Especial 2025",
    banner_local: "Igreja Vida Nova Hortolândia",
    banner_data: "Maio",
    banner_botao_texto: "Ver Produtos",
    pagina_inicial_titulo: "Sistema de Reservas",
    pagina_inicial_subtitulo: "Congresso de Famílias 2025",
    pagina_inicial_descricao: "Facilitando o acesso aos produtos exclusivos.",
    footer_descricao: "Facilitando o acesso aos produtos exclusivos.",
    footer_contato_telefone: "(19) 99165-9221",
    footer_contato_email: "contato@geracaoisrael.com.br",
    footer_contato_endereco: "Av. Thereza Ana Cecon Breda, 2065 - Jardim das Colinas, Hortolândia - SP",
    footer_copyright: "Geração Israel. Todos os direitos reservados."
  });
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
  const produtosFiltrados = useMemo(() => produtos.filter(produto => 
    (categoriaAtiva === "todas" || produto.categoria === categoriaAtiva) &&
    (produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
     produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [produtos, categoriaAtiva, searchTerm]);

  // Carregar textos do site quando o componente for montado
  useEffect(() => {
    carregarTextosSite();
  }, []);

  // Carregar produtos ao montar o componente
  // Carregar textos do site
  const carregarTextosSite = async () => {
    setLoadingTextos(true);
    try {
      // Buscar os textos do site ordenados por data de atualização (mais recente primeiro)
      const { data, error } = await supabase
        .from('site_textos')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log('Textos do site carregados:', data[0]);
        setTextosSite(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar textos do site:', error);
    } finally {
      setLoadingTextos(false);
    }
  };

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

  const [showConsulteValoresDialog, setShowConsulteValoresDialog] = useState(false);
  const [produtoConsulta, setProdutoConsulta] = useState<Produto | null>(null);

  const handleReservaClick = (produto: Produto) => {
    // Verificar se o produto tem preço variável ("Consulte Valores")
    if (isPrecoConsulta(produto.preco)) {
      // Mostrar pop-up de alerta para produtos com preço variável
      setProdutoConsulta(produto);
      setShowConsulteValoresDialog(true);
    } else {
      // Continuar com o fluxo normal de reserva
      setProdutoReserva(produto);
      // Inicializar a lista de produtos selecionados com o produto atual
      setProdutosSelecionados([{ produto, quantidade: 1 }]);
      setShowReservaDialog(true);
    }
  };
  
  // Função para adicionar um produto à lista de produtos selecionados
  const adicionarProduto = (produto: Produto) => {
    // Verificar se o produto já está na lista
    const produtoExistente = produtosSelecionados.find(item => item.produto.id === produto.id);
    
    if (produtoExistente) {
      // Se o produto já existe, aumentar a quantidade
      setProdutosSelecionados(produtosSelecionados.map(item => 
        item.produto.id === produto.id 
          ? { ...item, quantidade: item.quantidade + 1 } 
          : item
      ));
    } else {
      // Se o produto não existe, adicionar à lista
      setProdutosSelecionados([...produtosSelecionados, { produto, quantidade: 1 }]);
    }
  };
  
  // Função para remover um produto da lista de produtos selecionados
  const removerProduto = (produtoId: string) => {
    setProdutosSelecionados(produtosSelecionados.filter(item => item.produto.id !== produtoId));
  };
  
  // Função para alterar a quantidade de um produto
  const alterarQuantidadeProduto = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerProduto(produtoId);
      return;
    }
    
    setProdutosSelecionados(produtosSelecionados.map(item => 
      item.produto.id === produtoId 
        ? { ...item, quantidade } 
        : item
    ));
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

  const handleEnviarReserva = () => {
    // Validar se há produtos selecionados
    if (produtosSelecionados.length === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Por favor, selecione pelo menos um produto para reservar.",
        variant: "destructive",
      });
      return;
    }
    
    // Validar campos obrigatórios
    if (!dadosReserva.nome || !dadosReserva.telefone || !dadosReserva.formaPagamento || !dadosReserva.geracao) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios (Nome, Telefone, Geração e Forma de Pagamento).",
        variant: "destructive",
      });
      return;
    }
    
    // Se a forma de pagamento for PIX, o comprovante é obrigatório
    if (dadosReserva.formaPagamento === "pix" && !dadosReserva.comprovantePagamento) {
      toast({
        title: "Comprovante obrigatório",
        description: "Para pagamento via PIX, é necessário anexar o comprovante de pagamento.",
        variant: "destructive",
      });
      return;
    }
    
    // Mostrar o diálogo de confirmação
    setMostrarConfirmacao(true);
  };

  // Função para processar a reserva após confirmação
  const processarReserva = async () => {
    if (produtosSelecionados.length === 0) return;
    
    try {
      setEnviandoReserva(true);
      setMostrarConfirmacao(false);
      
      // Verificar se todos os produtos têm estoque disponível
      const produtosSemEstoque = produtosSelecionados.filter(item => item.produto.estoque < item.quantidade);
      
      if (produtosSemEstoque.length > 0) {
        toast({
          title: "Produtos indisponíveis",
          description: `Desculpe, os seguintes produtos não têm estoque suficiente: ${produtosSemEstoque.map(item => item.produto.nome).join(", ")}`,
          variant: "destructive",
        });
        return;
      }
      
      // Não precisamos atualizar o estoque aqui, pois isso será feito pela API ao criar a venda

      // Calcular o valor total da reserva
      const valorTotal = produtosSelecionados.reduce(
        (total: number, item) => {
          // Usar a função precoParaNumero para garantir que o preço seja convertido corretamente
          const precoNumerico = precoParaNumero(item.produto.preco);
          return total + (precoNumerico * item.quantidade);
        }, 
        0
      );
      
      // Criar venda (reserva)
      const venda: Omit<Venda, 'id' | 'created_at'> = {
        cliente_nome: dadosReserva.nome,
        telefone: dadosReserva.telefone,
        email: dadosReserva.email,
        geracao: dadosReserva.geracao,
        observacoes: dadosReserva.observacoes,
        forma_pagamento: dadosReserva.formaPagamento,
        status_pagamento: "Pendente" as StatusPagamento,
        status: "Pendente" as StatusVenda,
        total: valorTotal,
        data_venda: new Date().toISOString(),
        tipo: "reserva"
      };
      
      // Preparar os itens da venda
      const itens = produtosSelecionados.map(item => {
        // Verificar se o preço é um número ou string
        const precoNumerico = typeof item.produto.preco === 'number' 
          ? item.produto.preco 
          : 0; // Se for "Consulte Valores", considerar como 0 para o cálculo
        
        return {
          produto_id: item.produto.id,
          produto_nome: item.produto.nome,
          quantidade: item.quantidade,
          preco_unitario: item.produto.preco,
          subtotal: precoNumerico * item.quantidade
        };
      });
      
      // Criar a venda no banco de dados
      const vendaResult = await api.vendas.criar(venda, itens);

      if (!vendaResult) {
        throw new Error("Erro ao criar reserva");
      }
      
      // Os itens já foram adicionados na criação da venda

      // Se tiver comprovante, fazer upload
      if (dadosReserva.comprovantePagamento) {
        try {
          // Fazer upload do comprovante
          const uploadResult = await api.vendas.uploadComprovante(dadosReserva.comprovantePagamento);
          
          if (uploadResult) {
            // Atualizar a venda com a URL do comprovante
            await api.vendas.atualizarComprovante(vendaResult.id, String(uploadResult));
          }
        } catch (error: any) {
          console.error("Erro ao fazer upload do comprovante:", error);
          // Não interromper o fluxo se o upload falhar
          toast({
            title: "Aviso",
            description: "Sua reserva foi registrada, mas houve um problema ao enviar o comprovante. Por favor, envie o comprovante por WhatsApp.",
            variant: "destructive",
          });
        }
      }

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
      
      await carregarProdutosAtualizados();
      
      // Exibir mensagem de sucesso
      toast({
        title: "Reserva realizada com sucesso",
        description: `Sua reserva foi registrada com sucesso! ID da reserva: ${String(vendaResult.id)}`,
        variant: "default",
      });

      // Fechar o diálogo e resetar o formulário
      setShowReservaDialog(false);
      setProdutosSelecionados([]);
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
      console.error("Erro ao processar reserva:", error);
      toast({
        title: "Erro ao processar reserva",
        description: error.message || "Ocorreu um erro ao processar sua reserva. Por favor, tente novamente.",
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
                <span className="hidden group-hover:inline">{textosSite.banner_badge_completo}</span>
                <span className="inline group-hover:hidden">{textosSite.banner_badge}</span>
              </div>
              <h2 className="text-sm md:text-base group-hover:text-2xl group-hover:md:text-3xl font-extrabold mb-1 group-hover:mb-2 text-white drop-shadow-lg transition-all duration-500">
                <span className="hidden group-hover:inline">{textosSite.banner_titulo.split(' ').map((word, index, array) => 
                  index === array.length - 2 ? <span key={index}><span className="text-yellow-300">{word}</span></span> : 
                  index === array.length - 1 ? <span key={index}> {word}</span> : 
                  <span key={index}>{word} </span>
                )}</span>
                <span className="inline group-hover:hidden">{textosSite.banner_subtitulo}</span>
              </h2>
              <p className="text-white/90 mb-1 group-hover:mb-4 max-w-lg text-[10px] md:text-xs group-hover:text-sm group-hover:md:text-base transition-all duration-500 line-clamp-1 group-hover:line-clamp-none">
                {textosSite.banner_descricao}
              </p>
              <div className="hidden group-hover:flex flex-wrap gap-2 group-hover:gap-3 justify-center md:justify-start transition-all duration-500">
                <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm">
                  <Calendar className="h-4 w-4 text-yellow-300 mr-2" />
                  <span>{textosSite.banner_data}</span>
                </div>
                <div 
                  className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm cursor-pointer hover:bg-white/30 transition-colors duration-300"
                  onClick={() => setMostrarMapa(true)}
                  title="Clique para ver no mapa"
                >
                  <MapPin className="h-4 w-4 text-yellow-300 mr-2" />
                  <span>{textosSite.banner_local}</span>
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
                    <span className="hidden group-hover:inline">{textosSite.banner_botao_texto}</span> <ArrowRight className="group-hover:ml-1 h-3 w-3" />
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
                  <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 text-transparent bg-clip-text">{textosSite.pagina_inicial_titulo}</span>
                  <span 
                    className="block mt-2 text-2xl md:text-3xl font-medium bg-gradient-to-r from-yellow-300 to-yellow-500 text-transparent bg-clip-text"
                  >{textosSite.pagina_inicial_subtitulo}</span>
                </h1>
              </div>
              
              {/* Parágrafo descritivo removido conforme solicitado */}
              
              {/* Botões removidos conforme solicitado */}
            </div>
            
            <div className="md:w-1/2 flex justify-center -mt-10 sm:mt-0">
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

      {/* Search and Filter Section - Design Moderno */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl shadow-md border-0 p-5 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Título da seção */}
          <div className="flex-shrink-0 hidden md:block">
            <div className="bg-purple-600 text-white p-3 rounded-full shadow-md">
              <Search className="h-5 w-5" />
            </div>
          </div>
          
          {/* Área de busca e filtros */}
          <div className="flex-grow w-full">
            <div className="bg-white rounded-xl shadow-sm p-2 flex flex-col md:flex-row items-center gap-3">
              {/* Campo de busca */}
              <div className="relative flex-grow w-full">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400">
                  <Search className="h-4 w-4" />
                </div>
                <Input
                  placeholder="Buscar produtos..."
                  className="pl-10 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 bg-gray-50 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Separador vertical */}
              <div className="hidden md:block h-8 w-px bg-gray-200"></div>
              
              {/* Filtro de categorias */}
              {categorias.length > 0 && (
                <div className="relative w-full md:w-auto md:min-w-[220px]">
                  <Select
                    value={categoriaAtiva}
                    onValueChange={setCategoriaAtiva}
                  >
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 h-11 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg font-medium text-purple-800">
                      <SelectValue placeholder="Filtrar por categoria" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-lg border-0 shadow-lg p-1">
                      <div className="p-2 border-b border-gray-100">
                        <div className="text-xs font-medium text-gray-500 mb-2 px-2">CATEGORIAS</div>
                        <SelectItem value="todas" className="rounded-md mb-1 font-medium bg-purple-50 hover:bg-purple-100 transition-colors">
                          Todas as categorias
                        </SelectItem>
                      </div>
                      <div className="p-2 grid gap-1">
                        {categorias.map((categoria) => (
                          <SelectItem 
                            key={categoria} 
                            value={categoria} 
                            className={`rounded-md font-medium ${categoriaAtiva === categoria ? 'bg-purple-100' : 'hover:bg-gray-50'} transition-colors`}
                          >
                            {categoria}
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
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
            <Card key={produto.id} className="overflow-hidden transition-all duration-300 hover:shadow-lg group border-0 shadow relative">
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
                  {formatarPreco(produto.preco)}
                </p>
                
                {produto.opcao_parcelamento && (
                  <p className="text-xs font-medium bg-purple-100 text-purple-700 inline-block px-2 py-0.5 rounded-full mt-1">
                    {produto.opcao_parcelamento === 'À vista' ? produto.opcao_parcelamento : `Em ${produto.opcao_parcelamento}`}
                  </p>
                )}
                
                {/* Descrição do produto - com formatação melhorada */}
                {limparDescricao(produto.descricao) && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-12 bg-purple-600 rounded"></div>
                      <h4 className="text-xs font-semibold text-purple-700">DESCRIÇÃO</h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 hover:line-clamp-none transition-all duration-300">
                      {limparDescricao(produto.descricao)}
                    </p>
                  </div>
                )}
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
      
      {/* Diálogo de Reserva */}
      <Dialog open={showReservaDialog} onOpenChange={setShowReservaDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>Reservar Produtos</DialogTitle>
            <DialogDescription>
              Selecione os produtos que deseja reservar e preencha seus dados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 overflow-y-auto pr-2 flex-grow">
            {/* Lista de produtos selecionados */}
            <div className="bg-gray-50 p-3 md:p-4 rounded-md border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-purple-800">Produtos selecionados</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Abrir um diálogo para selecionar mais produtos
                    const categoriasDisponiveis = [...new Set(produtos.map(p => p.categoria))].filter(Boolean);
                    setCategorias(categoriasDisponiveis);
                    setCategoriaAtiva("todas");
                    setSearchTerm("");
                    setMostrarSelecionarProdutos(true);
                  }}
                  className="text-xs"
                >
                  <Package className="mr-1 h-3 w-3" /> Adicionar mais produtos
                </Button>
              </div>
              
              {produtosSelecionados.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto selecionado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {produtosSelecionados.map((item) => (
                    <div key={item.produto.id} className="flex items-center gap-2 bg-white p-2 rounded-md border border-gray-200">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                        <img 
                          src={extrairUrlImagem(item.produto.descricao) || "/placeholder-image.jpg"} 
                          alt={item.produto.nome} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-image.jpg";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-medium text-xs md:text-sm mb-0.5" title={item.produto.nome}>
                          {item.produto.nome.length > 25 ? 
                            <>
                              <span className="inline-block w-full whitespace-normal break-words">{item.produto.nome}</span>
                            </> : 
                            item.produto.nome
                          }
                        </h4>
                        <p className="text-purple-600 font-bold text-xs md:text-sm">
                          {formatarPreco(item.produto.preco)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-0.5 md:space-x-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-5 w-5 md:h-6 md:w-6 rounded-full"
                          onClick={() => alterarQuantidadeProduto(item.produto.id, item.quantidade - 1)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                          <span className="sr-only">Diminuir</span>
                        </Button>
                        <span className="w-5 md:w-6 text-center text-xs md:text-sm">{item.quantidade}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-5 w-5 md:h-6 md:w-6 rounded-full"
                          onClick={() => {
                            // Converter a quantidade para número antes de somar
                            const quantidadeAtual = Number(item.quantidade);
                            alterarQuantidadeProduto(item.produto.id, quantidadeAtual + 1);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                          <span className="sr-only">Aumentar</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 md:h-6 md:w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removerProduto(item.produto.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          <span className="sr-only">Remover</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {produtosSelecionados.length > 0 && (
                <div className="mt-2 pt-2 md:mt-3 md:pt-3 border-t border-gray-200 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="ml-2 font-bold text-purple-700">
                      R$ {produtosSelecionados.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {produtosSelecionados.reduce((total, item) => total + item.quantidade, 0)} item(ns)
                  </div>
                </div>
              )}
            </div>
            
            {/* Formulário de Dados */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="font-medium text-gray-700">Seus dados</h3>
              
              <div className="grid gap-2 md:gap-3">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                    <div className="flex-1 mb-1 sm:mb-0">
                      <Input
                        id="comprovantePagamento"
                        name="comprovantePagamento"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        className="border-gray-300 text-xs md:text-sm w-full"
                      />
                    </div>
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
            
            {/* Alerta de Formas de Pagamento - Versão mais compacta */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-purple-600">
                  📌
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800">Atenção! Forma de Pagamento</h3>
                  <div className="mt-1 text-xs text-purple-700 space-y-1">
                    <p>Os pagamentos serão aceitos somente através das seguintes opções:</p>
                    <p className="flex items-center">✅ <span className="ml-1">PIX no nome da Igreja Vida Nova Hortolândia</span></p>
                    <p className="flex items-center">✅ <span className="ml-1">Maquininhas de cartão disponíveis dentro da igreja</span></p>
                    
                    <p className="mt-1">Após realizar o pagamento via PIX, envie o comprovante para:</p>
                    <p className="font-medium">📲 (19) 99165-9221 – Danilo Cardoso</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-3 sm:mt-4 bg-white pt-2 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setShowReservaDialog(false)} className="text-sm py-1 h-9 sm:h-10">Cancelar</Button>
            <Button 
              onClick={handleEnviarReserva} 
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 h-9 sm:h-10"
              disabled={enviandoReserva}
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

      {/* Diálogo para selecionar mais produtos */}
      <Dialog open={mostrarSelecionarProdutos} onOpenChange={setMostrarSelecionarProdutos}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Produtos</DialogTitle>
            <DialogDescription>
              Escolha os produtos que deseja adicionar à sua reserva.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Barra de pesquisa */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Categorias */}
            <div className="mb-4 overflow-x-auto pb-2">
              <div className="flex space-x-2">
                <Button
                  variant={categoriaAtiva === "todas" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoriaAtiva("todas")}
                  className="whitespace-nowrap"
                >
                  Todas as Categorias
                </Button>
                {categorias.map((categoria) => (
                  <Button
                    key={categoria}
                    variant={categoriaAtiva === categoria ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoriaAtiva(categoria)}
                    className="whitespace-nowrap"
                  >
                    {categoria}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Lista de produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {produtosFiltrados.map((produto) => {
                // Verificar se o produto já está selecionado
                const produtoSelecionado = produtosSelecionados.find(item => item.produto.id === produto.id);
                
                return (
                  <div 
                    key={produto.id} 
                    className={`flex items-center gap-3 p-3 rounded-md border ${produtoSelecionado ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="w-12 h-12 bg-white rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                      <img 
                        src={extrairUrlImagem(produto.descricao) || "/placeholder-image.jpg"} 
                        alt={produto.nome} 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-image.jpg";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-medium text-sm mb-0.5" title={produto.nome}>
                        {produto.nome.length > 30 ? 
                          <>
                            <span className="inline-block w-full whitespace-normal break-words">{produto.nome}</span>
                          </> : 
                          produto.nome
                        }
                      </h4>
                      <p className="text-purple-600 font-bold text-sm">
                        {typeof produto.preco === 'number' 
                          ? `R$ ${produto.preco.toFixed(2).replace('.', ',')}` 
                          : produto.preco}
                      </p>
                      <p className="text-xs text-gray-500">{produto.estoque} em estoque</p>
                    </div>
                    <div>
                      {produtoSelecionado ? (
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6 rounded-full"
                            onClick={() => alterarQuantidadeProduto(produto.id, produtoSelecionado.quantidade - 1)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                          </Button>
                          <span className="w-6 text-center text-sm">{produtoSelecionado.quantidade}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6 rounded-full"
                            onClick={() => alterarQuantidadeProduto(produto.id, produtoSelecionado.quantidade + 1)}
                            disabled={produtoSelecionado.quantidade >= produto.estoque}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={() => adicionarProduto(produto)}
                          disabled={produto.estoque <= 0}
                        >
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {produtosFiltrados.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setMostrarSelecionarProdutos(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => setMostrarSelecionarProdutos(false)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Concluir seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação da reserva */}
      <Dialog open={mostrarConfirmacao} onOpenChange={setMostrarConfirmacao}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Reserva</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Resumo da reserva */}
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <h3 className="font-medium text-purple-800 mb-2">Resumo da reserva:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {produtosSelecionados.map((item) => (
                  <div key={item.produto.id} className="flex justify-between text-sm">
                    <span>{item.quantidade}x {item.produto.nome}</span>
                    <span className="font-medium">
                      {formatarPreco(calcularSubtotal(item.produto.preco, item.quantidade))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-purple-200 flex justify-between font-bold text-purple-900">
                <span>Total:</span>
                <span>{formatarPreco(produtosSelecionados.reduce((total: number, item) => {
                  // Usar a função precoParaNumero para garantir que o preço seja convertido corretamente
                  const precoNumerico = precoParaNumero(item.produto.preco);
                  return total + (precoNumerico * item.quantidade);
                }, 0))}</span>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Atenção!</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Sua reserva será válida por <strong>48 horas</strong>. Após este período, os produtos serão liberados para venda.</p>
                    <p className="mt-2">Para retirar seus produtos, procure por <strong>Danilo Cardoso</strong> ou <strong>Tatiane Cardoso</strong> do Ministério De Casais com o comprovante de pagamento.</p>
                    <p className="mt-2">Envie o comprovante para o número: <strong>(19) 99165-9221</strong></p>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">Ao confirmar, você concorda com os termos da reserva e confirma que os dados informados estão corretos.</p>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => setMostrarConfirmacao(false)}>Cancelar</Button>
            <Button 
              onClick={processarReserva} 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={enviandoReserva}
            >
              {enviandoReserva ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>Sim, confirmar reserva</>
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

      {/* Manual de Como Reservar */}
      <Dialog open={mostrarManualReserva} onOpenChange={setMostrarManualReserva}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Manual de Reserva de Produtos
            </DialogTitle>
            <DialogDescription>
              Siga este passo a passo para realizar sua reserva com sucesso.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Passo 1 */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">1</Badge>
                Escolha o produto
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Na página inicial, você encontrará todos os produtos disponíveis para reserva.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Use a barra de pesquisa para encontrar produtos específicos</li>
                    <li>Filtre por categoria para visualizar produtos semelhantes</li>
                    <li>Verifique se o produto está em estoque (indicado na etiqueta verde)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Passo 2 */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">2</Badge>
                Clique em "Reservar Produto"
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ao encontrar o produto desejado, clique no botão roxo "Reservar Produto" localizado na parte inferior do card do produto.
                </p>
                <div className="bg-purple-100 dark:bg-purple-950/30 p-3 rounded-md">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Importante:</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">Certifique-se de que o produto está disponível em estoque antes de tentar reservá-lo.</p>
                </div>
              </div>
            </div>
            
            {/* Passo 3 */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">3</Badge>
                Preencha o formulário de reserva
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Preencha todos os campos obrigatórios do formulário de reserva:
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li><span className="font-medium">Nome completo:</span> Seu nome para identificação</li>
                    <li><span className="font-medium">Telefone:</span> Número para contato com DDD</li>
                    <li><span className="font-medium">E-mail:</span> Para envio da confirmação (opcional)</li>
                    <li><span className="font-medium">Geração:</span> Selecione sua geração ou grupo</li>
                    <li><span className="font-medium">Forma de pagamento:</span> PIX, Dinheiro ou Cartão</li>
                    <li><span className="font-medium">Comprovante:</span> Anexe o comprovante caso já tenha realizado o pagamento</li>
                    <li><span className="font-medium">Observações:</span> Informações adicionais (opcional)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Passo 4 */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">4</Badge>
                Realize o pagamento
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Se escolher PIX como forma de pagamento:
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Clique no botão "Gerar QR Code PIX" para visualizar o QR Code</li>
                    <li>Escaneie o QR Code com seu aplicativo bancário</li>
                    <li>Ou copie a chave PIX e cole no seu aplicativo</li>
                    <li>Realize o pagamento do valor exato do produto</li>
                    <li>Anexe o comprovante de pagamento no formulário</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Passo 5 */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">5</Badge>
                Confirme sua reserva
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Após preencher o formulário e anexar o comprovante (se aplicável):
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Clique no botão "Reservar"</li>
                    <li>Leia atentamente as instruções na tela de confirmação</li>
                    <li>Clique em "Sim, confirmar reserva" para finalizar</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Passo 6 */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Badge className="h-6 w-6 rounded-full flex items-center justify-center">6</Badge>
                Retirada do produto
              </h3>
              <div className="pl-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Após a confirmação da reserva:
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Sua reserva é válida por 48 horas</li>
                    <li>Procure Danilo Cardoso ou Tatiane Cardoso da Geração Israel</li>
                    <li>Apresente o comprovante de pagamento (se já não tiver enviado)</li>
                    <li>Retire seu produto no local combinado</li>
                  </ul>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-950/30 p-3 rounded-md mt-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Atenção:</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">Caso não retire o produto no prazo de 48 horas, sua reserva poderá ser cancelada e o produto disponibilizado para outros interessados.</p>
                </div>
              </div>
            </div>
            
            {/* Dúvidas */}
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-md mt-4">
              <h3 className="text-md font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Precisa de ajuda?
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Em caso de dúvidas, entre em contato pelo WhatsApp (19) 99165-9221 ou fale diretamente com Danilo Cardoso ou Tatiane Cardoso.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setMostrarManualReserva(false)}>Entendi</Button>
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
                {textosSite.footer_descricao}
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
                  <a href="#" onClick={(e) => { e.preventDefault(); setMostrarManualReserva(true); }} className="text-purple-200 hover:text-white transition-colors flex items-center justify-center md:justify-start">
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
                  <span>{textosSite.footer_contato_telefone}</span>
                </li>
                <li className="flex items-center justify-center md:justify-start">
                  <MailIcon className="h-4 w-4 mr-2 text-yellow-300" />
                  <span>{textosSite.footer_contato_email}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-purple-700 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-purple-300 mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} {textosSite.footer_copyright}
            </p>
            <p className="text-xs text-purple-400">
              Desenvolvido com ❤️ por <a href="https://github.com/danilocardosoweb" target="_blank" rel="noopener noreferrer" className="text-yellow-300 hover:underline">Danilo Cardoso</a>
            </p>
          </div>
        </div>
      </footer>

      {/* Diálogo de alerta para produtos com "Consulte Valores" */}
      <Dialog open={showConsulteValoresDialog} onOpenChange={setShowConsulteValoresDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-purple-700">
              Produto com Preço Variável
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-yellow-700 font-medium">Produto com preço sob consulta</p>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">{produtoConsulta?.nome}</h3>
              <p className="text-gray-600 mb-4">Este produto possui preço variável e não pode ser reservado diretamente pelo site.</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-700 mb-2">Como proceder:</h4>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Entre em contato com os líderes da Geração Israel</li>
                <li>Solicite informações sobre valores e disponibilidade</li>
                <li>Verifique as condições de pagamento e entrega</li>
              </ul>
            </div>
            
            <div className="text-center text-sm text-gray-500 mt-2">
              Para mais informações, procure Danilo Cardoso ou Tatiane Cardoso da Geração Israel.
            </div>
          </div>
          <DialogFooter className="flex justify-center">
            <Button onClick={() => setShowConsulteValoresDialog(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaginaInicial;
