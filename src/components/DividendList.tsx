import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Dividend {
  id: string;
  stock_code: string;
  amount: number;
  dividend_date: string;
}

interface DividendListProps {
  dividends: Dividend[];
  onDelete?: () => void;
}

const DividendList = ({ dividends, onDelete }: DividendListProps) => {
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("dividends")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Dividendo excluído",
        description: "O dividendo foi removido com sucesso",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Dividendos</CardTitle>
      </CardHeader>
      <CardContent>
        {dividends.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum dividendo registrado
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dividends.map((dividend) => (
                  <TableRow key={dividend.id}>
                    <TableCell>
                      {format(new Date(dividend.dividend_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {dividend.stock_code}
                    </TableCell>
                    <TableCell className="text-right text-success font-semibold">
                      R$ {formatCurrency(dividend.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dividend.id)}
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

export default DividendList;
