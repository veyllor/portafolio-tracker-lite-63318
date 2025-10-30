import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, TrendingUp } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDialog from "@/components/ProfileDialog";
import PortfolioSummary from "@/components/PortfolioSummary";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";
import DividendForm from "@/components/DividendForm";
import DividendList from "@/components/DividendList";
import HistoryList from "@/components/HistoryList";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dividends, setDividends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchAllData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (event === "SIGNED_IN") {
        fetchAllData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDividends = async () => {
    try {
      const { data, error } = await supabase
        .from("dividends")
        .select("*")
        .order("dividend_date", { ascending: false });

      if (error) throw error;
      setDividends(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dividendos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAllData = () => {
    fetchTransactions();
    fetchDividends();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Finanças</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileDialog />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="portfolio" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="portfolio">Carteira</TabsTrigger>
            <TabsTrigger value="buy">Compras</TabsTrigger>
            <TabsTrigger value="sell">Vendas</TabsTrigger>
            <TabsTrigger value="dividends">Dividendos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
            <PortfolioSummary transactions={transactions} dividends={dividends} />
          </TabsContent>

          <TabsContent value="buy" className="space-y-4">
            <TransactionForm type="buy" onSuccess={fetchAllData} />
            <TransactionList transactions={transactions} type="buy" onDelete={fetchAllData} />
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <TransactionForm type="sell" onSuccess={fetchAllData} />
            <TransactionList transactions={transactions} type="sell" onDelete={fetchAllData} />
          </TabsContent>

          <TabsContent value="dividends" className="space-y-4">
            <DividendForm onSuccess={fetchAllData} />
            <DividendList dividends={dividends} onDelete={fetchAllData} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoryList transactions={transactions} dividends={dividends} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
