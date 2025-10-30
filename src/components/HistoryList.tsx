import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Transaction {
  id: string;
  stock_code: string;
  transaction_type: "buy" | "sell";
  quantity: number;
  price_per_share: number;
  total_value: number;
  transaction_date: string;
}

interface Dividend {
  stock_code: string;
  amount: number;
  dividend_date: string;
}

interface HistoryListProps {
  transactions: Transaction[];
  dividends: Dividend[];
}

interface ClosedPosition {
  stock_code: string;
  buyDate: Date;
  sellDate: Date;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyValue: number;
  sellValue: number;
  dividends: number;
  days: number;
  returnReais: number;
  returnPercent: number;
  monthlyReturn: number;
}

const HistoryList = ({ transactions, dividends }: HistoryListProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Build portfolio history using FIFO
  const calculateClosedPositions = (): ClosedPosition[] => {
    const closedPositions: ClosedPosition[] = [];
    const stockQueues: { [key: string]: Array<{ quantity: number; price: number; date: Date; totalValue: number }> } = {};

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    sortedTransactions.forEach(t => {
      const stock = t.stock_code;
      if (!stockQueues[stock]) {
        stockQueues[stock] = [];
      }

      if (t.transaction_type === "buy") {
        // Add to queue
        stockQueues[stock].push({
          quantity: t.quantity,
          price: t.price_per_share,
          date: new Date(t.transaction_date),
          totalValue: t.total_value
        });
      } else {
        // Sell - match with oldest buys (FIFO)
        let remainingSell = t.quantity;
        const sellDate = new Date(t.transaction_date);
        const sellPricePerShare = t.price_per_share;

        while (remainingSell > 0 && stockQueues[stock].length > 0) {
          const oldestBuy = stockQueues[stock][0];
          const matchedQuantity = Math.min(remainingSell, oldestBuy.quantity);

          // Calculate dividends for this position
          const buyDate = oldestBuy.date;
          const positionDividends = dividends
            .filter(d => 
              d.stock_code === stock && 
              new Date(d.dividend_date) >= buyDate && 
              new Date(d.dividend_date) <= sellDate
            )
            .reduce((sum, d) => sum + d.amount, 0);

          const buyValue = matchedQuantity * oldestBuy.price;
          const sellValue = matchedQuantity * sellPricePerShare;
          const days = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
          const returnReais = (sellValue + positionDividends) - buyValue;
          const returnPercent = (returnReais / buyValue) * 100;
          const months = days / 30;
          const monthlyReturn = months > 0 ? returnPercent / months : 0;

          closedPositions.push({
            stock_code: stock,
            buyDate: buyDate,
            sellDate: sellDate,
            quantity: matchedQuantity,
            buyPrice: oldestBuy.price,
            sellPrice: sellPricePerShare,
            buyValue: buyValue,
            sellValue: sellValue,
            dividends: positionDividends,
            days: days,
            returnReais: returnReais,
            returnPercent: returnPercent,
            monthlyReturn: monthlyReturn
          });

          oldestBuy.quantity -= matchedQuantity;
          if (oldestBuy.quantity === 0) {
            stockQueues[stock].shift();
          }
          remainingSell -= matchedQuantity;
        }
      }
    });

    return closedPositions.sort((a, b) => b.sellDate.getTime() - a.sellDate.getTime());
  };

  const closedPositions = calculateClosedPositions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Operações Encerradas</CardTitle>
      </CardHeader>
      <CardContent>
        {closedPositions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma operação encerrada ainda
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Data Compra</TableHead>
                  <TableHead className="text-right">Data Venda</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-right">Valor Compra</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">Dividendos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Retorno</TableHead>
                  <TableHead className="text-right">Retorno/Mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedPositions.map((position, index) => {
                  const isPositive = position.returnPercent >= 0;
                  const isMonthlyPositive = position.monthlyReturn >= 0;

                  return (
                    <TableRow key={`${position.stock_code}-${index}`}>
                      <TableCell className="font-semibold">{position.stock_code}</TableCell>
                      <TableCell className="text-right">{position.quantity}</TableCell>
                      <TableCell className="text-right">
                        {format(position.buyDate, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {format(position.sellDate, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">{position.days}</TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(position.buyValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(position.sellValue)}
                      </TableCell>
                      <TableCell className="text-right text-success font-semibold">
                        R$ {formatCurrency(position.dividends)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-semibold ${isPositive ? 'text-success' : 'text-loss'}`}>
                          {isPositive ? '+' : ''} R$ {formatCurrency(Math.abs(position.returnReais))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 font-semibold ${isPositive ? 'text-success' : 'text-loss'}`}>
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}{position.returnPercent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`font-semibold ${isMonthlyPositive ? 'text-success' : 'text-loss'}`}>
                          {isMonthlyPositive ? '+' : ''}{position.monthlyReturn.toFixed(2)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryList;
