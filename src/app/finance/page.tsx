"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  description: string | null;
  date: string;
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
}

interface FinanceData {
  transactions: Transaction[];
  budgets: Budget[];
  spendingByCategory: Record<string, number>;
}

const EXPENSE_CATEGORIES = ["groceries", "dining", "transport", "entertainment", "health", "utilities", "shopping", "personal", "other"];
const INCOME_CATEGORIES = ["salary", "freelance", "gift", "investment", "other"];

function CategoryBar({ category, spent, budget }: { category: string; spent: number; budget: number }) {
  const pct = Math.min(100, (spent / budget) * 100);
  const over = spent > budget;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="capitalize">{category}</span>
        <span className={over ? "text-destructive font-medium" : "text-muted-foreground"}>
          ₹{spent.toFixed(0)} / ₹{budget.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : pct > 80 ? "bg-yellow-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"transactions" | "budgets">("transactions");

  // Add transaction form
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [txnAmount, setTxnAmount] = useState("");
  const [txnType, setTxnType] = useState<"expense" | "income">("expense");
  const [txnCategory, setTxnCategory] = useState("other");
  const [txnDesc, setTxnDesc] = useState("");
  const [savingTxn, setSavingTxn] = useState(false);

  // Add budget form
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState("groceries");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skills/finance?days=${days}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSavingTxn(true);
    try {
      const res = await fetch("/api/skills/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(txnAmount), type: txnType, category: txnCategory, description: txnDesc || null }),
      });
      if (!res.ok) throw new Error("Failed");
      setTxnAmount(""); setTxnDesc(""); setShowAddTxn(false);
      toast.success("Transaction added");
      fetchData();
    } catch { toast.error("Failed"); }
    finally { setSavingTxn(false); }
  }

  async function handleDeleteTransaction(id: string) {
    await fetch("/api/skills/finance", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchData();
  }

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    setSavingBudget(true);
    try {
      const res = await fetch("/api/skills/finance/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: budgetCategory, amount: parseFloat(budgetAmount) }),
      });
      if (!res.ok) throw new Error("Failed");
      setBudgetAmount(""); setShowAddBudget(false);
      toast.success("Budget set");
      fetchData();
    } catch { toast.error("Failed"); }
    finally { setSavingBudget(false); }
  }

  const totalSpent = data?.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalEarned = data?.transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) ?? 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Extracted from chats + manual entries</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Spent ({days}d)</p>
            <p className="text-2xl font-bold mt-1">₹{totalSpent.toFixed(0)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Earned ({days}d)</p>
            <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">₹{totalEarned.toFixed(0)}</p>
          </div>
        </div>

        {/* Filter + Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {["transactions", "budgets"].map((t) => (
              <button key={t} onClick={() => setTab(t as typeof tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${days === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : tab === "transactions" ? (
          <>
            {/* Budget bars (inline summary) */}
            {data && data.budgets.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h2 className="text-sm font-semibold">Budget status</h2>
                {data.budgets.map((b) => (
                  <CategoryBar key={b.id} category={b.category} spent={data.spendingByCategory[b.category] ?? 0} budget={b.amount} />
                ))}
              </div>
            )}

            {/* Transaction list + add button */}
            <div className="space-y-2">
              {data?.transactions.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <p className="text-muted-foreground text-sm">No transactions yet. Tell Ziggy what you spent (e.g. &quot;spent ₹450 on groceries&quot;) and it will appear here.</p>
                </div>
              ) : data?.transactions.map((t) => (
                <div key={t.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.type === "income" ? "bg-green-500" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{t.category}</p>
                    {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${t.type === "income" ? "text-green-600 dark:text-green-400" : ""}`}>
                    {t.type === "income" ? "+" : "-"}₹{t.amount.toFixed(0)}
                  </span>
                  <button onClick={() => handleDeleteTransaction(t.id)} className="text-muted-foreground hover:text-destructive transition-colors text-xs shrink-0">×</button>
                </div>
              ))}
            </div>

            <button onClick={() => setShowAddTxn(!showAddTxn)}
              className="w-full py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              + Add transaction manually
            </button>

            {showAddTxn && (
              <form onSubmit={handleAddTransaction} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  <input type="number" placeholder="Amount (₹)" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} required min="0.01" step="0.01"
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <select value={txnType} onChange={(e) => { setTxnType(e.target.value as "expense" | "income"); setTxnCategory("other"); }}
                    className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <select value={txnCategory} onChange={(e) => setTxnCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {(txnType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input type="text" placeholder="Description (optional)" value={txnDesc} onChange={(e) => setTxnDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddTxn(false)} className="flex-1 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
                  <button type="submit" disabled={savingTxn || !txnAmount} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {savingTxn ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          /* Budgets tab */
          <>
            <div className="space-y-2">
              {data?.budgets.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <p className="text-muted-foreground text-sm">No budgets set. Add a budget to track spending limits per category.</p>
                </div>
              ) : data?.budgets.map((b) => (
                <div key={b.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{b.category}</p>
                    <p className="text-xs text-muted-foreground">{b.period}</p>
                  </div>
                  <span className="text-sm font-semibold">₹{b.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setShowAddBudget(!showAddBudget)}
              className="w-full py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              + Set budget
            </button>

            {showAddBudget && (
              <form onSubmit={handleAddBudget} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" placeholder="Monthly budget (₹)" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} required min="1"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddBudget(false)} className="flex-1 py-2 rounded-md border border-input text-sm hover:bg-muted transition-colors">Cancel</button>
                  <button type="submit" disabled={savingBudget || !budgetAmount} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {savingBudget ? "Saving..." : "Set budget"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
