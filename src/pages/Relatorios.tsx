
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const Relatorios = () => {
  // Vendas por período data
  const vendasPorPeriodoData = [
    { name: 'Jan', vendas: 4000 },
    { name: 'Fev', vendas: 3000 },
    { name: 'Mar', vendas: 2000 },
    { name: 'Abr', vendas: 2780 },
    { name: 'Mai', vendas: 1890 },
    { name: 'Jun', vendas: 2390 },
    { name: 'Jul', vendas: 3490 },
    { name: 'Ago', vendas: 4200 },
    { name: 'Set', vendas: 5000 },
    { name: 'Out', vendas: 4500 },
    { name: 'Nov', vendas: 6100 },
    { name: 'Dez', vendas: 7500 },
  ];

  // Métodos de pagamento data
  const metodosPagamentoData = [
    { name: 'Dinheiro', value: 35 },
    { name: 'Cartão de Crédito', value: 40 },
    { name: 'Cartão de Débito', value: 15 },
    { name: 'PIX', value: 10 },
  ];

  // Produtos mais vendidos data
  const produtosMaisVendidosData = [
    { name: 'Bíblia Sagrada', vendas: 120 },
    { name: 'Livro Devocional', vendas: 85 },
    { name: 'CD Gospel', vendas: 60 },
    { name: 'DVD Pregação', vendas: 45 },
    { name: 'Crucifixo', vendas: 30 },
  ];

  // Produtos por categoria data
  const produtosPorCategoriaData = [
    { name: 'Livros', value: 45 },
    { name: 'Música', value: 25 },
    { name: 'Decoração', value: 20 },
    { name: 'Acessórios', value: 10 },
  ];

  // Estoque de produtos data
  const estoqueProdutosData = [
    { name: 'Bíblia Sagrada', quantidade: 50 },
    { name: 'Livro Devocional', quantidade: 35 },
    { name: 'CD Gospel', quantidade: 40 },
    { name: 'DVD Pregação', quantidade: 25 },
    { name: 'Crucifixo', quantidade: 20 },
  ];

  // Clientes frequentes data
  const clientesFrequentesData = [
    { name: 'Maria Silva', compras: 12 },
    { name: 'João Santos', compras: 8 },
    { name: 'Ana Oliveira', compras: 7 },
    { name: 'Pedro Costa', compras: 6 },
    { name: 'Lúcia Mendes', compras: 5 },
  ];

  // Novos clientes data
  const novosClientesData = [
    { name: 'Jan', clientes: 10 },
    { name: 'Fev', clientes: 8 },
    { name: 'Mar', clientes: 12 },
    { name: 'Abr', clientes: 6 },
    { name: 'Mai', clientes: 15 },
    { name: 'Jun', clientes: 7 },
  ];

  // Valor médio de compra data
  const valorMedioCompraData = [
    { name: 'Maria', valor: 120 },
    { name: 'João', valor: 85 },
    { name: 'Ana', valor: 95 },
    { name: 'Pedro', valor: 75 },
    { name: 'Lúcia', valor: 110 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">Visualize estatísticas e relatórios de vendas</p>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList className="mb-4">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vendas">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Período</CardTitle>
                <CardDescription>
                  Total de vendas nos últimos meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={vendasPorPeriodoData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`R$ ${value}`, 'Vendas']} />
                      <Area type="monotone" dataKey="vendas" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Método de Pagamento</CardTitle>
                <CardDescription>
                  Distribuição dos métodos de pagamento
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
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {metodosPagamentoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Histórico de Vendas</CardTitle>
                <CardDescription>
                  Tendências de vendas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
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
                      <Legend />
                      <Line type="monotone" dataKey="vendas" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
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
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={produtosMaisVendidosData}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 80,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`${value} unidades`, 'Vendidos']} />
                      <Bar dataKey="vendas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Produtos por Categoria</CardTitle>
                <CardDescription>
                  Distribuição de vendas por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={produtosPorCategoriaData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {produtosPorCategoriaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Estoque de Produtos</CardTitle>
                <CardDescription>
                  Quantidade em estoque por produto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={estoqueProdutosData}
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
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={clientesFrequentesData}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 80,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value) => [`${value} compras`, 'Total']} />
                      <Bar dataKey="compras" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Novos Clientes</CardTitle>
                <CardDescription>
                  Aquisição de clientes por período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={novosClientesData}
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
                      <Tooltip formatter={(value) => [`${value} clientes`, 'Novos']} />
                      <Line type="monotone" dataKey="clientes" stroke="#82ca9d" />
                    </LineChart>
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
    </div>
  );
};

export default Relatorios;
