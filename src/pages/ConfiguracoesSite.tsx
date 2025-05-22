import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, supabase } from "@/lib/supabase";

// Interface para os textos do site
interface TextosSite {
  id?: string;
  banner_titulo: string;
  banner_subtitulo: string;
  banner_descricao: string;
  banner_badge: string;
  banner_badge_completo: string;
  banner_local: string;
  banner_data: string;
  banner_botao_texto: string;
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
}

const ConfiguracoesSite = () => {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [textos, setTextos] = useState<TextosSite>({
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
  
  const { toast } = useToast();

  // Usar useEffect para carregar os textos quando o componente é montado
  useEffect(() => {
    carregarTextos();
  }, []);

  // Carregar textos do banco de dados
  const carregarTextos = async () => {
    setLoading(true);
    try {
      // Verificar se a tabela existe
      const { data: tableExists, error: checkError } = await supabase
        .from('site_textos')
        .select('id')
        .limit(1);
      
      if (checkError) {
        // Se houver erro ao verificar a tabela, provavelmente ela não existe
        console.log('A tabela site_textos pode não existir. Execute o script SQL para criá-la.');
        toast({
          title: "Tabela não encontrada",
          description: "A tabela de textos do site não foi encontrada. Entre em contato com o administrador para executar o script SQL.",
          variant: "destructive",
        });
        return;
      }
      
      // Se a tabela existir mas não tiver dados, inserir os dados padrão
      if (!tableExists || tableExists.length === 0) {
        await criarTabelaTextos();
      } else {
        // Carregar os textos existentes
        const { data, error } = await supabase
          .from('site_textos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setTextos(data[0]);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar textos:', error);
      toast({
        title: "Erro ao carregar textos",
        description: error.message || "Ocorreu um erro ao carregar os textos do site.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar tabela de textos se não existir
  const criarTabelaTextos = async () => {
    try {
      // Como não podemos criar a tabela diretamente via RPC, vamos apenas inserir os dados
      // A tabela deve ser criada manualmente no Supabase usando o script SQL fornecido
      console.log('Tentando inserir dados na tabela site_textos...');
      
      // Inserir dados padrão
      const { error: insertError } = await supabase
        .from('site_textos')
        .insert([textos]);
      
      if (insertError) throw insertError;
      
      // Carregar os dados recém-inseridos
      const { data, error } = await supabase
        .from('site_textos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setTextos(data[0]);
      }
    } catch (error: any) {
      console.error('Erro ao criar tabela de textos:', error);
      toast({
        title: "Erro ao configurar textos",
        description: error.message || "Ocorreu um erro ao configurar os textos do site.",
        variant: "destructive",
      });
    }
  };

  // Salvar textos no banco de dados
  const salvarTextos = async () => {
    setSalvando(true);
    try {
      if (textos.id) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('site_textos')
          .update({
            ...textos,
            updated_at: new Date().toISOString()
          })
          .eq('id', textos.id);
        
        if (error) throw error;
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from('site_textos')
          .insert([{
            ...textos,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
        
        // Recarregar para obter o ID
        await carregarTextos();
      }
      
      toast({
        title: "Textos salvos com sucesso",
        description: "Os textos do site foram atualizados.",
      });
    } catch (error: any) {
      console.error('Erro ao salvar textos:', error);
      toast({
        title: "Erro ao salvar textos",
        description: error.message || "Ocorreu um erro ao salvar os textos do site.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // Atualizar campo de texto
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTextos(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    carregarTextos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configurações do Site</h1>
          <p className="text-muted-foreground">Gerencie os textos e conteúdos exibidos na página inicial.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={carregarTextos}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recarregar
          </Button>
          <Button 
            onClick={salvarTextos}
            disabled={salvando || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs defaultValue="banner" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="banner">Banner do Congresso</TabsTrigger>
          <TabsTrigger value="pagina-inicial">Página Inicial</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
        </TabsList>
        
        {/* Banner do Congresso */}
        <TabsContent value="banner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Banner do Congresso Famílias 2025</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner_titulo">Título Completo</Label>
                  <Input
                    id="banner_titulo"
                    name="banner_titulo"
                    value={textos.banner_titulo}
                    onChange={handleInputChange}
                    placeholder="Congresso de Famílias 2025"
                  />
                  <p className="text-xs text-muted-foreground">Exibido quando o mouse passa sobre o banner</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="banner_subtitulo">Título Compacto</Label>
                  <Input
                    id="banner_subtitulo"
                    name="banner_subtitulo"
                    value={textos.banner_subtitulo}
                    onChange={handleInputChange}
                    placeholder="Famílias 2025"
                  />
                  <p className="text-xs text-muted-foreground">Exibido na versão compacta do banner</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="banner_descricao">Descrição</Label>
                <Textarea
                  id="banner_descricao"
                  name="banner_descricao"
                  value={textos.banner_descricao}
                  onChange={handleInputChange}
                  placeholder="Adquira produtos exclusivos do evento! Garanta sua reserva."
                  rows={2}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner_badge">Badge Compacto</Label>
                  <Input
                    id="banner_badge"
                    name="banner_badge"
                    value={textos.banner_badge}
                    onChange={handleInputChange}
                    placeholder="2025"
                  />
                  <p className="text-xs text-muted-foreground">Texto do badge na versão compacta</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="banner_badge_completo">Badge Completo</Label>
                  <Input
                    id="banner_badge_completo"
                    name="banner_badge_completo"
                    value={textos.banner_badge_completo}
                    onChange={handleInputChange}
                    placeholder="Evento Especial 2025"
                  />
                  <p className="text-xs text-muted-foreground">Texto do badge quando expandido</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner_data">Data/Mês</Label>
                  <Input
                    id="banner_data"
                    name="banner_data"
                    value={textos.banner_data}
                    onChange={handleInputChange}
                    placeholder="Maio"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="banner_local">Local</Label>
                  <Input
                    id="banner_local"
                    name="banner_local"
                    value={textos.banner_local}
                    onChange={handleInputChange}
                    placeholder="Igreja Vida Nova Hortolândia"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="banner_botao_texto">Texto do Botão</Label>
                <Input
                  id="banner_botao_texto"
                  name="banner_botao_texto"
                  value={textos.banner_botao_texto}
                  onChange={handleInputChange}
                  placeholder="Ver Produtos"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Página Inicial */}
        <TabsContent value="pagina-inicial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Textos da Página Inicial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pagina_inicial_titulo">Título Principal</Label>
                  <Input
                    id="pagina_inicial_titulo"
                    name="pagina_inicial_titulo"
                    value={textos.pagina_inicial_titulo}
                    onChange={handleInputChange}
                    placeholder="Sistema de Reservas"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pagina_inicial_subtitulo">Subtítulo</Label>
                  <Input
                    id="pagina_inicial_subtitulo"
                    name="pagina_inicial_subtitulo"
                    value={textos.pagina_inicial_subtitulo}
                    onChange={handleInputChange}
                    placeholder="Congresso de Famílias 2025"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pagina_inicial_descricao">Descrição</Label>
                <Textarea
                  id="pagina_inicial_descricao"
                  name="pagina_inicial_descricao"
                  value={textos.pagina_inicial_descricao}
                  onChange={handleInputChange}
                  placeholder="Facilitando o acesso aos produtos exclusivos."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Rodapé */}
        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Textos do Rodapé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footer_descricao">Descrição</Label>
                <Textarea
                  id="footer_descricao"
                  name="footer_descricao"
                  value={textos.footer_descricao}
                  onChange={handleInputChange}
                  placeholder="Facilitando o acesso aos produtos exclusivos."
                  rows={2}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="footer_contato_telefone">Telefone</Label>
                <Input
                  id="footer_contato_telefone"
                  name="footer_contato_telefone"
                  value={textos.footer_contato_telefone}
                  onChange={handleInputChange}
                  placeholder="(19) 99165-9221"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footer_contato_email">E-mail</Label>
                <Input
                  id="footer_contato_email"
                  name="footer_contato_email"
                  value={textos.footer_contato_email}
                  onChange={handleInputChange}
                  placeholder="contato@geracaoisrael.com.br"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footer_contato_endereco">Endereço</Label>
                <Textarea
                  id="footer_contato_endereco"
                  name="footer_contato_endereco"
                  value={textos.footer_contato_endereco}
                  onChange={handleInputChange}
                  placeholder="Av. Thereza Ana Cecon Breda, 2065 - Jardim das Colinas, Hortolândia - SP"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="footer_copyright">Texto de Copyright</Label>
                <Input
                  id="footer_copyright"
                  name="footer_copyright"
                  value={textos.footer_copyright}
                  onChange={handleInputChange}
                  placeholder="Geração Israel. Todos os direitos reservados."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesSite;
