import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Wallet, Activity, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  transaction_type: "buy" | "sell";
  quantity: number;
  total_value: number;
  stock_code: string;
  price_per_share: number;
  transaction_date: string;
}

interface Dividend {
  stock_code: string;
  amount: number;
  dividend_date: string;
}

interface PortfolioSummaryProps {
  transactions: Transaction[];
  dividends: Dividend[];
}

interface StockData {
  currentPrice: number;
  loading: boolean;
}

const PortfolioSummary = ({ transactions, dividends }: PortfolioSummaryProps) => {
  const [stockPrices, setStockPrices] = useState<{ [key: string]: StockData }>({});

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate portfolio by stock
  const portfolio: { [key: string]: { quantity: number; avgPrice: number; totalInvested: number; firstPurchaseDate: Date | null; totalDividends: number } } = {};
  
  transactions.forEach(t => {
    if (!portfolio[t.stock_code]) {
      portfolio[t.stock_code] = { quantity: 0, avgPrice: 0, totalInvested: 0, firstPurchaseDate: null, totalDividends: 0 };
    }
    
    if (t.transaction_type === "buy") {
      const currentTotal = portfolio[t.stock_code].quantity * portfolio[t.stock_code].avgPrice;
      const newTotal = currentTotal + t.total_value;
      portfolio[t.stock_code].quantity += t.quantity;
      portfolio[t.stock_code].avgPrice = newTotal / portfolio[t.stock_code].quantity;
      portfolio[t.stock_code].totalInvested += t.total_value;
      
      const transactionDate = new Date(t.transaction_date);
      if (!portfolio[t.stock_code].firstPurchaseDate || transactionDate < portfolio[t.stock_code].firstPurchaseDate!) {
        portfolio[t.stock_code].firstPurchaseDate = transactionDate;
      }
    } else {
      portfolio[t.stock_code].quantity -= t.quantity;
    }
  });

  // Add dividends to portfolio
  dividends.forEach(d => {
    if (portfolio[d.stock_code]) {
      portfolio[d.stock_code].totalDividends += d.amount;
    }
  });

  const activeStocks = Object.entries(portfolio).filter(([_, data]) => data.quantity > 0);

  // Fetch current prices for all active stocks using Brapi API
  useEffect(() => {
    const fetchPrices = async () => {
      if (activeStocks.length === 0) return;

      const newPrices: { [key: string]: StockData } = {};
      
      for (const [stockCode] of activeStocks) {
        newPrices[stockCode] = { currentPrice: 0, loading: true };
      }
      setStockPrices(newPrices);

      // Fetch all stock prices from Brapi API
      const tickers = activeStocks.map(([code]) => code).join(',');
      
      try {
        const response = await fetch(`https://brapi.dev/api/quote/${tickers}`);
        
        if (!response.ok) {
          throw new Error("Erro ao buscar cotações");
        }

        const data = await response.json();
        
        if (data.results) {
          const updatedPrices: { [key: string]: StockData } = {};
          
          data.results.forEach((stock: any) => {
            updatedPrices[stock.symbol] = {
              currentPrice: stock.regularMarketPrice || 0,
              loading: false
            };
          });

          setStockPrices(updatedPrices);
        }
      } catch (error) {
        // On error, mark all as failed
        const errorPrices: { [key: string]: StockData } = {};
        for (const [stockCode] of activeStocks) {
          errorPrices[stockCode] = { currentPrice: 0, loading: false };
        }
        setStockPrices(errorPrices);
      }
    };

    fetchPrices();
  }, [transactions]);

  const calculateReturn = (avgPrice: number, currentPrice: number, dividends: number, quantity: number) => {
    if (currentPrice === 0) return 0;
    const totalInvested = avgPrice * quantity;
    const currentValue = currentPrice * quantity;
    return ((currentValue + dividends - totalInvested) / totalInvested) * 100;
  };

  const calculateCurrentValue = (quantity: number, currentPrice: number) => {
    return quantity * currentPrice;
  };

  const calculateMonthlyReturn = (firstPurchaseDate: Date | null, currentReturn: number) => {
    if (!firstPurchaseDate) return 0;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - firstPurchaseDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = diffDays / 30;
    
    if (diffMonths === 0) return 0;
    return currentReturn / diffMonths;
  };

  const calculateResultInReais = (quantity: number, avgPrice: number, currentPrice: number, dividends: number) => {
    const totalInvested = quantity * avgPrice;
    const currentValue = quantity * currentPrice;
    return (currentValue + dividends) - totalInvested;
  };

  // Calculate total portfolio value and return (including dividends)
  const totalCurrentValue = activeStocks.reduce((sum, [code, data]) => {
    const stockPrice = stockPrices[code];
    if (!stockPrice || stockPrice.loading) return sum;
    return sum + calculateCurrentValue(data.quantity, stockPrice.currentPrice) + data.totalDividends;
  }, 0);

  const totalPortfolioInvested = activeStocks.reduce((sum, [_, data]) => {
    return sum + data.totalInvested;
  }, 0);

  const portfolioReturn = totalPortfolioInvested > 0 
    ? ((totalCurrentValue - totalPortfolioInvested) / totalPortfolioInvested) * 100 
    : 0;

  const isPortfolioPositive = portfolioReturn >= 0;
  const allPricesLoaded = activeStocks.every(([code]) => {
    const price = stockPrices[code];
    return price && !price.loading;
  });

  return (
    <div className="space-y-4">
      {/* Portfolio Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital Investido</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {formatCurrency(totalPortfolioInvested)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital Atual</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {allPricesLoaded ? (
              <div className="text-2xl font-bold">R$ {formatCurrency(totalCurrentValue)}</div>
            ) : (
              <Skeleton className="h-8 w-32" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
            {isPortfolioPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-loss" />
            )}
          </CardHeader>
          <CardContent>
            {allPricesLoaded ? (
              <>
                <div className={`text-2xl font-bold ${isPortfolioPositive ? 'text-success' : 'text-loss'}`}>
                  {isPortfolioPositive ? '+' : ''}{portfolioReturn.toFixed(2)}%
                </div>
                <p className={`text-xs ${isPortfolioPositive ? 'text-success' : 'text-loss'}`}>
                  {isPortfolioPositive ? '+' : '-'} R$ {formatCurrency(Math.abs(totalCurrentValue - totalPortfolioInvested))}
                </p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {activeStocks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Você ainda não possui ações em carteira
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Preço Médio</TableHead>
                    <TableHead className="text-right">Cotação Atual</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">Dividendos</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead className="text-right">Retorno</TableHead>
                    <TableHead className="text-right">Retorno/Mês</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeStocks.map(([code, data]) => {
                    const stockPrice = stockPrices[code];
                    const isLoading = !stockPrice || stockPrice.loading;
                    const currentPrice = stockPrice?.currentPrice || 0;
                    const returnPercent = calculateReturn(data.avgPrice, currentPrice, data.totalDividends, data.quantity);
                    const currentValue = calculateCurrentValue(data.quantity, currentPrice);
                    const resultInReais = calculateResultInReais(data.quantity, data.avgPrice, currentPrice, data.totalDividends);
                    const monthlyReturn = calculateMonthlyReturn(data.firstPurchaseDate, returnPercent);
                    const isPositive = returnPercent >= 0;
                    const isMonthlyPositive = monthlyReturn >= 0;
                    const isResultPositive = resultInReais >= 0;

                    return (
                      <TableRow key={code}>
                        <TableCell className="font-semibold">{code}</TableCell>
                        <TableCell className="text-right">{data.quantity}</TableCell>
                        <TableCell className="text-right">R$ {formatCurrency(data.avgPrice)}</TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <Skeleton className="h-5 w-20 ml-auto" />
                          ) : (
                            `R$ ${formatCurrency(currentPrice)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {isLoading ? (
                            <Skeleton className="h-5 w-24 ml-auto" />
                          ) : (
                            `R$ ${formatCurrency(currentValue)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right text-success font-semibold">
                          R$ {formatCurrency(data.totalDividends)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <Skeleton className="h-5 w-24 ml-auto" />
                          ) : (
                            <div className={`font-semibold ${isResultPositive ? 'text-success' : 'text-loss'}`}>
                              {isResultPositive ? '+' : ''} R$ {formatCurrency(Math.abs(resultInReais))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <Skeleton className="h-5 w-20 ml-auto" />
                          ) : (
                            <div className={`flex items-center justify-end gap-1 font-semibold ${isPositive ? 'text-success' : 'text-loss'}`}>
                              {isPositive ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span>
                                {isPositive ? '+' : ''}{returnPercent.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLoading ? (
                            <Skeleton className="h-5 w-20 ml-auto" />
                          ) : (
                            <div className={`font-semibold ${isMonthlyPositive ? 'text-success' : 'text-loss'}`}>
                              {isMonthlyPositive ? '+' : ''}{monthlyReturn.toFixed(2)}%
                            </div>
                          )}
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
    </div>
  );
};

export default PortfolioSummary;
