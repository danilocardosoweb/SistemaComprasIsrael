
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Search, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, Cliente, Geracao, GERACOES } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Partial<Cliente>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const filteredClientes = clientes.filter(cliente => 
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setCurrentCliente(cliente);
      setIsEditing(true);
    } else {
      setCurrentCliente({});
      setIsEditing(false);
    }
    setShowDialog(true);
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const data = await api.clientes.listar();
      setClientes(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message || "Ocorreu um erro ao carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCliente = async () => {
    if (!currentCliente.nome) {
      toast({
        title: "Erro ao salvar",
        description: "Por favor, preencha o nome do cliente.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (isEditing && currentCliente.id) {
        await api.clientes.atualizar(currentCliente.id, currentCliente);
        toast({
          title: "Cliente atualizado",
          description: `O cliente "${currentCliente.nome}" foi atualizado com sucesso.`,
        });
      } else {
        await api.clientes.criar(currentCliente as Omit<Cliente, 'id' | 'created_at'>);
        toast({
          title: "Cliente adicionado",
          description: `O cliente "${currentCliente.nome}" foi adicionado com sucesso.`,
        });
      }
      carregarClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message || "Ocorreu um erro ao salvar o cliente.",
        variant: "destructive",
      });
      return;
    }
    
    setShowDialog(false);
  };

  const handleDeleteCliente = async (id: string) => {
    try {
      await api.clientes.excluir(id);
      toast({
        title: "Cliente removido",
        description: "O cliente foi removido com sucesso.",
      });
      carregarClientes();
    } catch (error: any) {
      toast({
        title: "Erro ao remover cliente",
        description: error.message || "Ocorreu um erro ao remover o cliente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">Gerenciar clientes da igreja</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lista de Clientes</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
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
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Observação</TableHead>
                <TableHead className="hidden md:table-cell">Geração</TableHead>
                <TableHead className="hidden md:table-cell">Líder Direto</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Carregando clientes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClientes.length > 0 ? (
                filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{cliente.telefone}</TableCell>
                    <TableCell className="hidden md:table-cell">{cliente.observacao}</TableCell>
                    <TableCell className="hidden md:table-cell">{cliente.geracao}</TableCell>
                    <TableCell className="hidden md:table-cell">{cliente.lider_direto}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cliente)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCliente(cliente.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for adding/editing clients */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize as informações do cliente" : "Adicione um novo cliente ao sistema"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome*</Label>
              <Input
                id="nome"
                value={currentCliente.nome || ""}
                onChange={(e) => setCurrentCliente({ ...currentCliente, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={currentCliente.email || ""}
                onChange={(e) => setCurrentCliente({ ...currentCliente, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={currentCliente.telefone || ""}
                onChange={(e) => setCurrentCliente({ ...currentCliente, telefone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observacao">Observação</Label>
              <Input
                id="observacao"
                value={currentCliente.observacao || ""}
                onChange={(e) => setCurrentCliente({ ...currentCliente, observacao: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="geracao">Geração</Label>
              <Select
                value={currentCliente.geracao || ""}
                onValueChange={(value) => setCurrentCliente({ ...currentCliente, geracao: value as Geracao })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a geração" />
                </SelectTrigger>
                <SelectContent>
                  {GERACOES.map((geracao) => (
                    <SelectItem key={geracao} value={geracao}>
                      {geracao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lider_direto">Líder Direto</Label>
              <Input
                id="lider_direto"
                value={currentCliente.lider_direto || ""}
                onChange={(e) => setCurrentCliente({ ...currentCliente, lider_direto: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveCliente}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
