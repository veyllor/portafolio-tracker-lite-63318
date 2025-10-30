import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  stock_code: string;
  transaction_type: "buy" | "sell";
  quantity: number;
  price_per_share: number;
  total_value: number;
  transaction_date: string;
  notes?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  type: "buy" | "sell";
  onDelete?: () => void;
}

const TransactionList = ({ transactions, type, onDelete }: TransactionListProps) => {
  const { toast } = useToast();
  const filteredTransactions = transactions.filter(t => t.transaction_type === type);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "A transação foi removida com sucesso",
      });

      if (onDelete) onDelete();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de {type === "buy" ? "Compras" : "Vendas"}</CardTitle>
        <CardDescription>
          {filteredTransactions.length} {type === "buy" ? "compras" : "vendas"} registradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma {type === "buy" ? "compra" : "venda"} registrada ainda
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-semibold">{transaction.stock_code}</TableCell>
                    <TableCell className="text-right">{transaction.quantity}</TableCell>
                    <TableCell className="text-right">
                      {format(new Date(transaction.transaction_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {formatCurrency(transaction.total_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionList;
