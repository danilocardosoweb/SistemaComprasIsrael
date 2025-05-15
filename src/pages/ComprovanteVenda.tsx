import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, Download, MessageCircle } from "lucide-react";
import { api, Venda, ItemVenda } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Star } from "lucide-react";

const ComprovanteVenda = () => {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const comprovanteRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const carregarVenda = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Carregar dados da venda
        const vendaData = await api.vendas.obter(id);
        setVenda(vendaData);
        
        // Carregar itens da venda
        const itensData = await api.vendas.obterItens(id);
        setItensVenda(itensData);
      } catch (error: any) {
        toast({
          title: "Erro ao carregar comprovante",
          description: error.message || "Ocorreu um erro ao carregar os dados da venda.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    carregarVenda();
  }, [id, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Esta é uma implementação simplificada
    // Em um ambiente de produção, você pode usar bibliotecas como jsPDF ou html2pdf
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O download de PDF será implementado em uma versão futura.",
    });
  };

  const handleShareWhatsApp = () => {
    // Criar uma mensagem com os detalhes da venda
    const clienteNome = venda?.cliente_nome || "Cliente";
    const dataVenda = venda?.data_venda ? formatarData(venda.data_venda) : "";
    const total = venda?.total.toFixed(2) || "0,00";
    
    const mensagem = `*Comprovante de Venda - Israel Sales*\n\n`+
      `*Cliente:* ${clienteNome}\n`+
      `*Data:* ${dataVenda}\n`+
      `*Total:* R$ ${total}\n`+
      `*Forma de Pagamento:* ${venda?.forma_pagamento === 'pix' ? 'PIX' : venda?.forma_pagamento === 'dinheiro' ? 'Dinheiro' : venda?.forma_pagamento === 'cartao' ? 'Cartão' : 'Não informado'}\n\n`+
      `*Itens:*\n${itensVenda.map(item => `- ${item.quantidade}x ${item.produto_nome} (R$ ${item.preco_unitario.toFixed(2)}) = R$ ${item.subtotal.toFixed(2)}`).join('\n')}\n\n`+
      `*Total da Venda:* R$ ${total}\n\n`+
      `Agradecemos pela sua compra!`;
    
    // Codificar a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // Abrir o WhatsApp com a mensagem
    window.open(`https://wa.me/?text=${mensagemCodificada}`, '_blank');
  };

  const formatarData = (dataString: string) => {
    try {
      return format(new Date(dataString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dataString;
    }
  };

  const calcularTotal = () => {
    return itensVenda.reduce((total, item) => total + item.subtotal, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="text-2xl font-bold mb-2">Carregando comprovante...</div>
          <div className="text-muted-foreground">Aguarde enquanto preparamos seu comprovante</div>
        </div>
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Venda não encontrada</div>
          <div className="text-muted-foreground mb-4">Não foi possível encontrar os dados desta venda</div>
          <Button onClick={() => navigate("/vendas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Vendas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate("/vendas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
          <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white border-green-500" onClick={handleShareWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>
      
      <div ref={comprovanteRef} className="bg-white p-8 rounded-lg shadow-lg print:shadow-none">
        {/* Cabeçalho do Comprovante */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <Star size={40} className="text-church-600" />
          </div>
          <h1 className="text-2xl font-bold">Israel Sales</h1>
          <p className="text-muted-foreground">Sistema de Gerenciamento de Vendas</p>
        </div>
        
        <Separator className="my-4" />
        
        {/* Informações da Venda */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Comprovante de Venda</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Código da Venda</p>
              <p className="font-medium">{venda.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium">{formatarData(venda.data_venda)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{venda.cliente_nome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
              <p className="font-medium">{venda.forma_pagamento === 'pix' ? 'PIX' : 
                venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                venda.forma_pagamento}</p>
            </div>
          </div>
        </div>
        
        {/* Itens da Venda */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Itens</h3>
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
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">R$ {venda.total.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <Separator className="my-4" />
        
        {/* Rodapé do Comprovante */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Este documento não possui valor fiscal</p>
          <p className="mt-1">Desenvolvido com ❤️ para comunidades religiosas</p>
          <p className="mt-1">Data de emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>
    </div>
  );
};

export default ComprovanteVenda;
