
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, Users, Calendar, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const Index = () => {
  const navigate = useNavigate();

  // Estados para armazenar os dados do dashboard
  const [stats, setStats] = useState([
    { title: "Vendas Hoje", value: "R$ 0,00", icon: ShoppingCart, change: "0%", trend: "up" },
    { title: "Produtos", value: "0", icon: Package, change: "0", trend: "up" },
    { title: "Clientes", value: "0", icon: Users, change: "0", trend: "up" },
    { title: "Este mês", value: "R$ 0,00", icon: Calendar, change: "0%", trend: "up" },
  ]);
  const [recentSales, setRecentSales] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);

  // Função para formatar valor em reais
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Função para formatar data relativa
  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const vendaDate = new Date(date);
    const diff = Math.floor((now.getTime() - vendaDate.getTime()) / 1000); // diferença em segundos

    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Buscar vendas de hoje
        const { data: vendasHoje } = await supabase
          .from('vendas_hoje')
          .select('*')
          .single();

        // Buscar total de produtos
        const { count: totalProdutos } = await supabase
          .from('produtos')
          .select('*', { count: 'exact' });

        // Buscar total de clientes
        const { count: totalClientes } = await supabase
          .from('clientes')
          .select('*', { count: 'exact' });

        // Buscar vendas do mês
        const { data: vendasMes } = await supabase
          .from('vendas_mes_atual')
          .select('*')
          .single();

        // Atualizar stats
        setStats([
          { 
            title: "Vendas Hoje", 
            value: formatCurrency(vendasHoje?.total || 0), 
            icon: ShoppingCart,
            change: `${vendasHoje?.variacao_percentual || 0}%`,
            trend: (vendasHoje?.variacao_percentual || 0) >= 0 ? "up" : "down"
          },
          { 
            title: "Produtos", 
            value: String(totalProdutos || 0), 
            icon: Package,
            change: "0",
            trend: "up"
          },
          { 
            title: "Clientes", 
            value: String(totalClientes || 0), 
            icon: Users,
            change: "0",
            trend: "up"
          },
          { 
            title: "Este mês", 
            value: formatCurrency(vendasMes?.total || 0), 
            icon: Calendar,
            change: `${vendasMes?.variacao_percentual || 0}%`,
            trend: (vendasMes?.variacao_percentual || 0) >= 0 ? "up" : "down"
          },
        ]);

        // Buscar vendas mensais para o gráfico
        const { data: vendasMensais } = await supabase
          .from('vendas_mensais')
          .select('*');

        if (vendasMensais) {
          const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          setMonthlySalesData(vendasMensais.map(venda => ({
            month: meses[new Date(venda.mes).getMonth()],
            vendas: Number(venda.total)
          })));
        }

        // Buscar formas de pagamento
        const { data: formasPagamento } = await supabase
          .from('formas_pagamento_stats')
          .select('*');

        if (formasPagamento) {
          setPaymentMethodData(formasPagamento.map(forma => ({
            name: forma.forma_pagamento,
            value: Number(forma.percentual)
          })));
        }

        // Buscar vendas recentes
        const { data: ultimasVendas } = await supabase
          .from('ultimas_vendas')
          .select('*');

        if (ultimasVendas) {
          setRecentSales(ultimasVendas.map(venda => ({
            product: venda.cliente_nome,
            price: formatCurrency(Number(venda.total)),
            customer: venda.forma_pagamento,
            time: formatRelativeTime(venda.data_venda)
          })));
        }
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Atualiza a cada minuto

    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Bem-vindo ao Sistema de Vendas da Igreja!</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/vendas/nova")}>Nova Venda</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-full p-2 ${
                  stat.title === "Vendas Hoje" 
                    ? "bg-church-100 text-church-700" 
                    : stat.title === "Produtos" 
                    ? "bg-blue-100 text-blue-700" 
                    : stat.title === "Clientes" 
                    ? "bg-green-100 text-green-700" 
                    : "bg-amber-100 text-amber-700"
                }`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {stat.trend === "up" ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
                )}
                <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-1">
                  vs. último período
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle>Visão Geral de Vendas</CardTitle>
              <CardDescription>
                Vendas dos últimos 12 meses
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlySalesData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${value}`, 'Vendas']} />
                  <Area type="monotone" dataKey="vendas" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle>Vendas Recentes</CardTitle>
              <CardDescription>
                Últimas transações realizadas
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/vendas")}>
              Ver todas
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentSales.map((sale, i) => (
                <div className="flex items-center justify-between" key={i}>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{sale.product}</p>
                    <p className="text-xs text-muted-foreground">{sale.customer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{sale.price}</div>
                    <div className="text-xs text-muted-foreground">{sale.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({name}) => name}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
