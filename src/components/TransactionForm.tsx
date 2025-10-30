import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TransactionFormProps {
  type: "buy" | "sell";
  onSuccess: () => void;
}

const TransactionForm = ({ type, onSuccess }: TransactionFormProps) => {
  const [stockCode, setStockCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const qty = parseInt(quantity);
      const price = parseFloat(pricePerShare);
      const totalValue = qty * price;

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        stock_code: stockCode.toUpperCase(),
        transaction_type: type,
        quantity: qty,
        price_per_share: price,
        total_value: totalValue,
        transaction_date: new Date(transactionDate).toISOString(),
        notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: type === "buy" ? "Compra registrada!" : "Venda registrada!",
        description: `${qty} ações de ${stockCode.toUpperCase()} por R$ ${totalValue.toFixed(2)}`,
      });

      // Reset form
      setStockCode("");
      setQuantity("");
      setPricePerShare("");
      setTransactionDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalValue = quantity && pricePerShare 
    ? (parseInt(quantity) * parseFloat(pricePerShare)).toFixed(2)
    : "0.00";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === "buy" ? "Registrar Compra" : "Registrar Venda"}</CardTitle>
        <CardDescription>
          Adicione uma nova {type === "buy" ? "compra" : "venda"} de ações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-date">Data</Label>
              <Input
                id="transaction-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stockCode">Código da Ação</Label>
              <Input
                id="stockCode"
                placeholder="Ex: PETR4"
                value={stockCode}
                onChange={(e) => setStockCode(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço por Ação</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="25.50"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor Total</Label>
            <div className="text-2xl font-bold">R$ {totalValue}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre esta transação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-1/2"
            variant={type === "buy" ? "default" : "destructive"}
          >
            {loading ? "Processando..." : type === "buy" ? "Registrar Compra" : "Registrar Venda"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;
