import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatarPreco, precoParaNumero, calcularSubtotal } from "@/utils/formatarPreco";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, Download, MessageCircle, Phone } from "lucide-react";
import { api, Venda, ItemVenda } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import html2pdf from 'html2pdf.js';

const ComprovanteVenda = () => {
  const { id } = useParams<{ id: string }>();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState("");
  const [pdfGerado, setPdfGerado] = useState(false);
  const [anexarPdf, setAnexarPdf] = useState(true);
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
          title: "Erro ao carregar comprovante de reserva",
          description: error.message || "Ocorreu um erro ao carregar os dados da reserva.",
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

  // Função para gerar o PDF sem fazer download
  const handleGeneratePDF = async (): Promise<void> => {
    if (!comprovanteRef.current) return Promise.reject('Elemento do comprovante não encontrado');
    
    // Configurações do PDF
    const options = {
      margin: [10, 10, 10, 10],
      filename: `Comprovante_Venda_${venda.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Criar uma cópia do elemento para não afetar a visualização
    const element = comprovanteRef.current.cloneNode(true) as HTMLElement;
    
    // Adicionar estilos específicos para o PDF
    element.style.padding = '15px';
    element.style.backgroundColor = 'white';
    
    // Gerar o PDF sem fazer download
    return new Promise((resolve, reject) => {
      html2pdf()
        .set(options)
        .from(element)
        .outputPdf()
        .then(() => {
          setPdfGerado(true);
          resolve();
        })
        .catch((error) => {
          console.error('Erro ao gerar PDF:', error);
          reject(error);
        });
    });
  };

  // Função para baixar o PDF
  const handleDownloadPDF = () => {
    if (!comprovanteRef.current) return;
    
    // Mostrar toast de carregamento
    toast({
      title: "Gerando comprovante",
      description: "Aguarde enquanto preparamos o seu comprovante...",
    });
    
    // Configurações do PDF
    const options = {
      margin: [10, 10, 10, 10],
      filename: `Comprovante_Venda_${venda.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Criar uma cópia do elemento para não afetar a visualização
    const element = comprovanteRef.current.cloneNode(true) as HTMLElement;
    
    // Adicionar estilos específicos para o PDF
    element.style.padding = '15px';
    element.style.backgroundColor = 'white';
    
    // Gerar o PDF
    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => {
        setPdfGerado(true);
        toast({
          title: "Comprovante de reserva gerado",
          description: "O PDF foi baixado para o seu dispositivo.",
        });
      })
      .catch((error) => {
        console.error('Erro ao gerar PDF:', error);
        toast({
          title: "Erro ao gerar comprovante",
          description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
          variant: "destructive",
        });
      });
  };

  const handleShareWhatsApp = () => {
    // Se tiver telefone na venda, preenche automaticamente
    if (venda?.telefone) {
      setWhatsappNumber(venda.telefone);
    }
    
    // Definir mensagem personalizada padrão
    setMensagemPersonalizada("Olá! Segue o comprovante da sua compra. Agradecemos a preferência!");
    
    // Verificar se o PDF já foi gerado
    if (!pdfGerado) {
      toast({
        title: "Gerando PDF",
        description: "Estamos gerando o PDF para anexar à mensagem...",
      });
      
      // Gerar o PDF primeiro
      handleGeneratePDF().then(() => {
        setPdfGerado(true);
        // Abrir o diálogo para confirmar ou digitar o número
        setShowWhatsAppDialog(true);
      }).catch(error => {
        console.error('Erro ao gerar PDF para WhatsApp:', error);
        toast({
          title: "Erro ao gerar PDF",
          description: "Não foi possível gerar o PDF para anexar. Tente novamente.",
          variant: "destructive",
        });
      });
    } else {
      // Se o PDF já foi gerado, apenas abrir o diálogo
      setShowWhatsAppDialog(true);
    }
  };

  const enviarWhatsApp = () => {
    // Validar o número de telefone
    let numeroFormatado = whatsappNumber.replace(/\D/g, '');
    
    // Verificar se o número tem o comprimento correto
    if (numeroFormatado.length < 10 || numeroFormatado.length > 13) {
      toast({
        title: "Número inválido",
        description: "Por favor, insira um número de telefone válido com DDD.",
        variant: "destructive",
      });
      return;
    }
    
    // Adicionar o código do país se não tiver
    if (numeroFormatado.length === 11 || numeroFormatado.length === 10) {
      numeroFormatado = `55${numeroFormatado}`;
    }
    
    // Formatar dados para a mensagem
    const clienteNome = venda?.cliente_nome || "Cliente";
    const dataVenda = venda?.data_venda ? formatarData(venda.data_venda) : "Data não disponível";
    const totalFormatado = formatarPreco(venda?.total || 0).replace('R$ ', '');
    
    // Criar mensagem formatada para WhatsApp
    const mensagem = `*COMPROVANTE DE VENDA - MINISTÉRIO DE CASAIS*\n\n`+
      `📅 *Data:* ${dataVenda}\n`+
      `👤 *Cliente:* ${clienteNome}\n`+
      `📱 *Telefone:* ${venda?.telefone || "Não informado"}\n`+
      `💰 *Forma de Pagamento:* ${venda?.forma_pagamento === 'pix' ? 'PIX' : venda?.forma_pagamento === 'dinheiro' ? 'Dinheiro' : venda?.forma_pagamento === 'cartao' ? 'Cartão' : 'Não informado'}\n`+
      `📋 *Status:* ${venda?.status_pagamento}\n\n`+
      `*ITENS ADQUIRIDOS:*\n${itensVenda.map((item, index) => {
      const precoUnitFormatado = formatarPreco(item.preco_unitario).replace('R$ ', '');
      // Recalcular o subtotal para garantir que esteja correto
      const subtotalCalculado = calcularSubtotal(item.preco_unitario, item.quantidade);
      const subtotalFormatado = formatarPreco(subtotalCalculado).replace('R$ ', '');
      return `${index + 1}. ${item.quantidade}x ${item.produto_nome}\n   Preço: R$ ${precoUnitFormatado} | Subtotal: R$ ${subtotalFormatado}`;
    }).join('\n\n')}\n\n`+
      `💲 *TOTAL DA VENDA: R$ ${totalFormatado}*\n\n`+
      `*Código da Venda:* ${venda?.id}\n\n`;
    
    // Adicionar link do comprovante se disponível
    let mensagemFinal = mensagem;
    if (venda?.comprovante_url) {
      mensagemFinal += `📎 *Link do Comprovante:*\n${venda.comprovante_url}\n\n`;
    }
    
    // Adicionar mensagem personalizada se existir
    if (mensagemPersonalizada.trim()) {
      mensagemFinal = `${mensagemPersonalizada}\n\n${mensagemFinal}`;
    }
    
    // Adicionar instrução para anexar PDF se a opção estiver marcada
    if (anexarPdf && pdfGerado) {
      mensagemFinal += `\n\n📄 *Anexe o PDF do comprovante de reserva que você baixou anteriormente*\n`;
    }
    
    mensagemFinal += `✨ *Agradecemos pela sua reserva!* ✨\n\n`;
    mensagemFinal += `_Ministério de Casais - Sistema de Gerenciamento de Reservas_\n`;
    mensagemFinal += `_${format(new Date(), 'dd/MM/yyyy HH:mm')}_`;
    
    // Codificar a mensagem para URL (usando encodeURI para maior compatibilidade)
    const mensagemCodificada = encodeURIComponent(mensagemFinal);
    
    try {
      setEnviandoWhatsApp(true);
      
      // Se a opção de anexar PDF estiver marcada e o PDF ainda não foi baixado, baixar primeiro
      if (anexarPdf && !pdfGerado) {
        handleDownloadPDF();
        toast({
          title: "PDF do comprovante gerado",
          description: "Após o download do PDF, você poderá anexá-lo na mensagem do WhatsApp.",
        });
      }
      
      // Usar API direta do WhatsApp para dispositivos móveis e desktop
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${numeroFormatado}&text=${mensagemCodificada}`;
      
      // Abrir em nova janela
      window.open(whatsappUrl, '_blank');
      
      // Fechar o diálogo
      setShowWhatsAppDialog(false);
      
      toast({
        title: "Redirecionando para o WhatsApp",
        description: anexarPdf ? "Anexe o PDF que foi baixado na mensagem do WhatsApp." : "Aguarde enquanto o aplicativo do WhatsApp é aberto.",
      });
    } catch (error) {
      console.error("Erro ao abrir WhatsApp:", error);
      toast({
        title: "Erro ao enviar comprovante",
        description: "Não foi possível abrir o WhatsApp. Verifique o número e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      return format(new Date(dataString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dataString;
    }
  };

  const calcularTotal = () => {
    return itensVenda.reduce((total: number, item) => {
      // Converter o subtotal para número antes de somar
      const subtotalNumerico = precoParaNumero(item.subtotal);
      return total + subtotalNumerico;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="text-2xl font-bold mb-2">Carregando comprovante de reserva...</div>
          <div className="text-muted-foreground">Aguarde enquanto preparamos seu comprovante</div>
        </div>
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Reserva não encontrada</div>
          <div className="text-muted-foreground mb-4">Não foi possível encontrar a reserva solicitada</div>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 print:p-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Baixar Comprovante
          </Button>
          <Button variant="outline" className="bg-green-500 hover:bg-green-600 text-white border-green-500" onClick={handleShareWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Enviar por WhatsApp
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
            <img 
              src="/Image/Logo_Sim_Lema.png" 
              alt="Logo Ministério de Casais" 
              className="h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold">Ministério de Casais</h1>
          <p className="text-muted-foreground">Sistema de Gerenciamento de Reservas</p>
          <div className="mt-2 text-sm text-muted-foreground">
            <p>Vida Nova Hortolândia</p>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Informações da Venda */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Comprovante de Reserva</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Código da Reserva</p>
              <p className="font-medium">{venda.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="font-medium">{formatarPreco(venda.total)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{venda.cliente_nome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{venda.telefone || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
              <p className="font-medium">{venda.forma_pagamento === 'pix' ? 'PIX' : 
                venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                venda.forma_pagamento}</p>
            </div>
          </div>
          
          {/* Comprovante de Pagamento */}
          {venda.comprovante_url && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Comprovante de Pagamento</h3>
              <div className="border rounded-md p-3 bg-gray-50">
                <div className="flex flex-col items-center">
                  <img 
                    src={venda.comprovante_url} 
                    alt="Comprovante de Pagamento" 
                    className="max-h-48 object-contain rounded-md border border-gray-200 mb-2"
                  />
                  <a 
                    href={venda.comprovante_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Visualizar comprovante em tamanho original
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Itens da Venda */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Itens Reservados</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço Unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
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
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">Valor Total</TableCell>
                <TableCell className="text-right font-bold">{formatarPreco(venda.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <Separator className="my-4" />
        
        {/* Rodapé do Comprovante */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Este documento não possui valor fiscal</p>
          <div className="mt-2 border-t pt-2">
            <p>Agradecemos pela sua reserva!</p>
            <p className="mt-1">Desenvolvido com ❤️ por Danilo Cardoso</p>
            <p className="mt-1">Data de emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
      </div>
      
      {/* Diálogo para enviar por WhatsApp */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar comprovante de reserva por WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="whatsappNumber" className="text-right">
                Número
              </Label>
              <div className="col-span-3">
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                    +55
                  </span>
                  <Input
                    id="whatsappNumber"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="(DDD) 99999-9999"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="mensagemPersonalizada">
                Mensagem personalizada
              </Label>
              <textarea
                id="mensagemPersonalizada"
                value={mensagemPersonalizada}
                onChange={(e) => setMensagemPersonalizada(e.target.value)}
                placeholder="Digite uma mensagem personalizada para o cliente..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anexarPdf"
                checked={anexarPdf}
                onChange={(e) => setAnexarPdf(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="anexarPdf" className="text-sm font-normal">
                Incluir instruções para anexar comprovante
              </Label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {anexarPdf ? 
                "O comprovante será baixado automaticamente e você receberá instruções para anexá-lo no WhatsApp." : 
                "Apenas o texto do comprovante de reserva será enviado por WhatsApp."}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={enviarWhatsApp} 
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={!whatsappNumber.trim() || enviandoWhatsApp}
            >
              {enviandoWhatsApp ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComprovanteVenda;
