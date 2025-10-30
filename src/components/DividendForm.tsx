import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DividendFormProps {
  onSuccess: () => void;
}

const DividendForm = ({ onSuccess }: DividendFormProps) => {
  const [stockCode, setStockCode] = useState("");
  const [amount, setAmount] = useState("");
  const [dividendDate, setDividendDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("dividends").insert({
        user_id: user.id,
        stock_code: stockCode.toUpperCase(),
        amount: parseFloat(amount),
        dividend_date: new Date(dividendDate).toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Dividendo registrado",
        description: `Dividendo de ${stockCode.toUpperCase()} registrado com sucesso!`,
      });

      setStockCode("");
      setAmount("");
      setDividendDate(format(new Date(), "yyyy-MM-dd"));
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar dividendo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Dividendo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dividend-date">Data</Label>
              <Input
                id="dividend-date"
                type="date"
                value={dividendDate}
                onChange={(e) => setDividendDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dividend-stock">Ativo</Label>
              <Input
                id="dividend-stock"
                placeholder="Ex: PETR4"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dividend-amount">Valor (R$)</Label>
              <Input
                id="dividend-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-1/2 bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {loading ? "Registrando..." : "Registrar Dividendo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DividendForm;
