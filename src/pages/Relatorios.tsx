import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import { api } from "@/lib/supabase";
import { Venda, ItemVenda, Produto } from "@/lib/supabase";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarPreco, precoParaNumero } from "@/utils/formatarPreco";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  
  // Estados para os dados dos gráficos
  const [vendasPorPeriodoData, setVendasPorPeriodoData] = useState<any[]>([]);
  const [metodosPagamentoData, setMetodosPagamentoData] = useState<any[]>([]);
  const [produtosMaisVendidosData, setProdutosMaisVendidosData] = useState<any[]>([]);
  const [estoqueProdutosData, setEstoqueProdutosData] = useState<any[]>([]);
  const [novosClientesData, setNovosClientesData] = useState<any[]>([]);
  const [clientesFrequentesData, setClientesFrequentesData] = useState<any[]>([]);
  const [valorMedioCompraData, setValorMedioCompraData] = useState<any[]>([]);
  const [vendasPorGeracaoData, setVendasPorGeracaoData] = useState<any[]>([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Função para carregar todos os dados necessários
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar vendas
      const vendasData = await api.vendas.listar();
      setVendas(vendasData);
      
      // Carregar produtos
      const produtosData = await api.produtos.listar();
      setProdutos(produtosData);
      
      // Carregar itens de todas as vendas
      const todosItens: ItemVenda[] = [];
      for (const venda of vendasData) {
        const itens = await api.vendas.obterItens(venda.id);
        todosItens.push(...itens);
      }
      setItensVenda(todosItens);
      
      // Processar dados para os gráficos
      processarDados(vendasData, todosItens, produtosData);
      
      setLoading(false);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + (error.message || "Ocorreu um erro ao carregar os dados dos relatórios."));
      setLoading(false);
    }
  };
  
  // Função para processar os dados e gerar os gráficos
  const processarDados = (vendas: Venda[], itens: ItemVenda[], produtos: Produto[]) => {
    // 1. Vendas por período (últimos 12 meses)
    processarVendasPorPeriodo(vendas);
    
    // 2. Métodos de pagamento
    processarMetodosPagamento(vendas);
    
    // 3. Produtos mais vendidos
    processarProdutosMaisVendidos(itens);
    
    // 4. Estoque de produtos
    processarEstoqueProdutos(produtos);
    
    // 5. Clientes frequentes
    processarClientesFrequentes(vendas);
    
    // 6. Valor médio de compra
    processarValorMedioCompra(vendas);
    
    // 7. Vendas por geração
    processarVendasPorGeracao(vendas);
  };
  
  // Processar vendas por período (últimos 12 meses)
  const processarVendasPorPeriodo = (vendas: Venda[]) => {
    // Criar um array com os últimos 12 meses
    const hoje = new Date();
    const ultimosMeses = eachMonthOfInterval({
      start: subMonths(hoje, 11),
      end: hoje
    });
    
    // Inicializar o array de dados com os meses
    const dadosMensais = ultimosMeses.map(data => ({
      name: format(data, 'MMM', { locale: ptBR }),
      vendas: 0,
      mes: format(data, 'MM'),
      ano: format(data, 'yyyy')
    }));
    
    // Somar as vendas por mês
    vendas.forEach(venda => {
      const dataVenda = parseISO(venda.data_venda);
      const mesVenda = format(dataVenda, 'MM');
      const anoVenda = format(dataVenda, 'yyyy');
      
      const indiceMes = dadosMensais.findIndex(
        item => item.mes === mesVenda && item.ano === anoVenda
      );
      
      if (indiceMes !== -1) {
        // Converter o total para número antes de somar
        dadosMensais[indiceMes].vendas += precoParaNumero(venda.total);
      }
    });
    
    setVendasPorPeriodoData(dadosMensais);
  };
  
  // Processar métodos de pagamento
  const processarMetodosPagamento = (vendas: Venda[]) => {
    const metodos: Record<string, number> = {
      'Dinheiro': 0,
      'Cartão de Crédito': 0,
      'Cartão de Débito': 0,
      'PIX': 0
    };
    
    vendas.forEach(venda => {
      const metodo = venda.forma_pagamento === 'pix' ? 'PIX' :
                    venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' :
                    venda.forma_pagamento === 'cartao_credito' ? 'Cartão de Crédito' :
                    venda.forma_pagamento === 'cartao_debito' ? 'Cartão de Débito' :
                    venda.forma_pagamento === 'cartao' ? 'Cartão' :
                    'Outros';
      
      if (metodos[metodo] !== undefined) {
        metodos[metodo] += 1;
      } else {
        metodos[metodo] = 1;
      }
    });
    
    const dadosMetodos = Object.entries(metodos)
      .filter(([_, value]) => value > 0) // Remover métodos sem vendas
      .map(([name, value]) => ({
        name,
        value
      }));
    
    setMetodosPagamentoData(dadosMetodos);
  };
  
  // Processar produtos mais vendidos
  const processarProdutosMaisVendidos = (itens: ItemVenda[]) => {
    // Agrupar por produto e somar quantidades
    const produtosVendidos: Record<string, { nome: string, quantidade: number }> = {};
    
    itens.forEach(item => {
      if (!produtosVendidos[item.produto_id]) {
        produtosVendidos[item.produto_id] = {
          nome: item.produto_nome,
          quantidade: 0
        };
      }
      produtosVendidos[item.produto_id].quantidade += item.quantidade;
    });
    
    // Converter para array e ordenar por quantidade
    const produtosArray = Object.values(produtosVendidos)
      .map(p => ({ name: p.nome, vendas: p.quantidade }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 5); // Pegar os 5 mais vendidos
    
    setProdutosMaisVendidosData(produtosArray);
  };
  
  // Processar estoque de produtos
  const processarEstoqueProdutos = (produtos: Produto[]) => {
    // Ordenar por estoque (menor para maior)
    const produtosEstoque = [...produtos]
      .sort((a, b) => a.estoque - b.estoque)
      .slice(0, 5) // Pegar os 5 com menor estoque
      .map(p => ({
        name: p.nome,
        quantidade: p.estoque
      }));
    
    setEstoqueProdutosData(produtosEstoque);
  };
  
  // Processar clientes frequentes
  const processarClientesFrequentes = (vendas: Venda[]) => {
    // Agrupar vendas por cliente
    const clientesVendas: Record<string, { nome: string, compras: number, total: number }> = {};
    
    vendas.forEach(venda => {
      if (!venda.cliente_nome) return;
      
      if (!clientesVendas[venda.cliente_nome]) {
        clientesVendas[venda.cliente_nome] = {
          nome: venda.cliente_nome,
          compras: 0,
          total: 0
        };
      }
      
      clientesVendas[venda.cliente_nome].compras += 1;
      // Converter o total para número antes de somar
      clientesVendas[venda.cliente_nome].total += precoParaNumero(venda.total);
    });
    
    // Converter para array e ordenar por número de compras
    const clientesArray = Object.values(clientesVendas)
      .sort((a, b) => b.compras - a.compras)
      .slice(0, 5) // Pegar os 5 clientes mais frequentes
      .map(c => ({
        name: c.nome,
        compras: c.compras
      }));
    
    setClientesFrequentesData(clientesArray);
  };
  
  // Processar valor médio de compra
  const processarValorMedioCompra = (vendas: Venda[]) => {
    // Agrupar vendas por cliente e calcular média
    const clientesValores: Record<string, { nome: string, total: number, compras: number }> = {};
    
    vendas.forEach(venda => {
      if (!venda.cliente_nome) return;
      
      if (!clientesValores[venda.cliente_nome]) {
        clientesValores[venda.cliente_nome] = {
          nome: venda.cliente_nome,
          total: 0,
          compras: 0
        };
      }
      
      // Converter o total para número antes de somar
      clientesValores[venda.cliente_nome].total += precoParaNumero(venda.total);
      clientesValores[venda.cliente_nome].compras += 1;
    });
    
    // Calcular média e ordenar
    const clientesArray = Object.values(clientesValores)
      .map(c => ({
        name: c.nome,
        valor: Math.round(c.total / c.compras)
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5); // Pegar os 5 com maior valor médio
    
    setValorMedioCompraData(clientesArray);
  };
  
  // Processar vendas por geração
  const processarVendasPorGeracao = async (vendas: Venda[]) => {
    // Precisamos buscar os clientes para obter as gerações
    try {
      // Inicializar um objeto para armazenar as vendas por geração
      const vendasPorGeracao: Record<string, number> = {};
      
      // Para cada venda, buscar o cliente e sua geração
      for (const venda of vendas) {
        if (venda.cliente_id) {
          try {
            const cliente = await api.clientes.obter(venda.cliente_id);
            const geracao = cliente.geracao || 'Não informado';
            
            // Somar o valor da venda na geração correspondente
            if (vendasPorGeracao[geracao]) {
              vendasPorGeracao[geracao] += venda.total;
            } else {
              vendasPorGeracao[geracao] = venda.total;
            }
          } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            // Se não conseguir buscar o cliente, adicionar na categoria 'Não informado'
            if (vendasPorGeracao['Não informado']) {
              vendasPorGeracao['Não informado'] += venda.total;
            } else {
              vendasPorGeracao['Não informado'] = venda.total;
            }
          }
        } else {
          // Se a venda não tiver cliente_id, adicionar na categoria 'Não informado'
          if (vendasPorGeracao['Não informado']) {
            vendasPorGeracao['Não informado'] += venda.total;
          } else {
            vendasPorGeracao['Não informado'] = venda.total;
          }
        }
      }
      
      // Converter o objeto em um array para o gráfico
      const dadosGrafico = Object.entries(vendasPorGeracao)
        .map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2))
        }))
        .sort((a, b) => b.value - a.value); // Ordenar do maior para o menor
      
      setVendasPorGeracaoData(dadosGrafico);
    } catch (error) {
      console.error('Erro ao processar vendas por geração:', error);
      setVendasPorGeracaoData([]);
    }
  };
  
  // Carregar dados ao montar o componente
  useEffect(() => {
    carregarDados();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">Visualize estatísticas e relatórios de vendas</p>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Carregando dados...</span>
        </div>
      ) : (
        <Tabs defaultValue="vendas">
          <TabsList className="mb-4">
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vendas">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Vendas por Período</CardTitle>
                  <CardDescription>
                    Últimos 12 meses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={vendasPorPeriodoData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`R$ ${value}`, 'Vendas']} />
                        <Area type="monotone" dataKey="vendas" stroke="#8884d8" fill="#8884d8" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pagamento</CardTitle>
                  <CardDescription>
                    Distribuição por forma de pagamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metodosPagamentoData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => {
                            const percentNumber = Number(percent);
                            return `${name}: ${(percentNumber * 100).toFixed(0)}%`;
                          }}
                        >
                          {metodosPagamentoData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`R$ ${value}`, 'Total']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Geração</CardTitle>
                  <CardDescription>
                    Distribuição de vendas por geração
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={vendasPorGeracaoData}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 150,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`R$ ${value}`, 'Total']} />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="produtos">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                  <CardDescription>
                    Top produtos por quantidade vendida
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={produtosMaisVendidosData}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 200,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={200}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`${value} unidades`, 'Vendidos']} />
                        <Bar dataKey="vendas" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Estoque de Produtos</CardTitle>
                  <CardDescription>
                    Produtos com menor estoque
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={estoqueProdutosData}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 200,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={200}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`${value} unidades`, 'Em estoque']} />
                        <Bar dataKey="quantidade" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="clientes">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Clientes Mais Frequentes</CardTitle>
                  <CardDescription>
                    Top clientes por número de compras
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={clientesFrequentesData}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 200,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={200}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [`${value} compras`, 'Total']} />
                        <Bar dataKey="compras" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Valor Médio de Compra</CardTitle>
                  <CardDescription>
                    Valor médio de compra por cliente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={valorMedioCompraData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`R$ ${value}`, 'Valor Médio']} />
                        <Bar dataKey="valor" fill="#FF8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Relatorios;
