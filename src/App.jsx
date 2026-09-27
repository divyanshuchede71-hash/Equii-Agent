import React, { useState, useEffect } from "react";
import CashflowHero from "./components/ui/CashflowHero";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Component as SpotlightCursor } from "./components/ui/spotlight-cursor.tsx";
import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  TrendingUp,
  Bot,
  Zap,
  Settings,
  ShieldCheck,
  Bell,
  Search,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  IndianRupee,
  CircleHelp,
  Sparkles,
  SlidersHorizontal,
  Eye,
  Clock3,
  Target,
} from "lucide-react";

import "./App.css";
/* =========================================================
  DATA
========================================================= */

const transactions = [
  {
    name: "Stipend",
    category: "Income",
    date: "Today, 10:30 AM",
    amount: 8000,
    type: "income",
    icon: ArrowUpRight,
  },
  {
    name: "Swiggy",
    category: "Food",
    date: "Today, 1:20 PM",
    amount: 285,
    type: "expense",
    icon: ArrowDownRight,
  },
  {
    name: "Uber",
    category: "Transport",
    date: "Yesterday, 7:45 PM",
    amount: 180,
    type: "expense",
    icon: ArrowDownRight,
  },
  {
    name: "Netflix",
    category: "Subscription",
    date: "Sep 25",
    amount: 199,
    type: "expense",
    icon: ArrowDownRight,
  },
  {
    name: "Family Transfer",
    category: "Transfer",
    date: "Sep 24",
    amount: 2000,
    type: "income",
    icon: ArrowUpRight,
  },
];

const forecast = [
  { day: "Sep 26", balance: 8250, expense: 650, income: 0 },
  { day: "Sep 27", balance: 7600, expense: 450, income: 0 },
  { day: "Sep 28", balance: 7150, expense: 4850, income: 0 },
  { day: "Sep 29", balance: 2300, expense: 550, income: 0 },
  { day: "Sep 30", balance: 1750, expense: 199, income: 0 },
  { day: "Oct 1", balance: 1551, expense: 400, income: 0 },
  { day: "Oct 2", balance: 1151, expense: 300, income: 0 },
  { day: "Oct 3", balance: 851, expense: 500, income: 8000 },
  { day: "Oct 4", balance: 8351, expense: 350, income: 0 },
  { day: "Oct 5", balance: 8001, expense: 519, income: 0 },
  { day: "Oct 6", balance: 7482, expense: 450, income: 0 },
  { day: "Oct 7", balance: 7032, expense: 350, income: 0 },
  { day: "Oct 8", balance: 6682, expense: 300, income: 0 },
  { day: "Oct 9", balance: 6382, expense: 250, income: 0 },
];

const accounts = [
  {
    name: "Primary Savings",
    bank: "Demo Bank",
    number: "•••• 4821",
    balance: 8250,
    status: "Connected",
  },
  {
    name: "Student Account",
    bank: "Demo Bank",
    number: "•••• 7219",
    balance: 1450,
    status: "Connected",
  },
];

function Goals() {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetMonths, setTargetMonths] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchGoals = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/goals");
      const data = await res.json();
      if (res.ok) setGoals(data);
    } catch (err) {
      console.error("Failed to load goals", err);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, targetAmount: Number(targetAmount), targetMonths: Number(targetMonths) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create goal");

      setTitle("");
      setTargetAmount("");
      setTargetMonths("");
      fetchGoals();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (id, suggestedAmount) => {
    const amountStr = prompt("Enter amount to save towards this goal:", suggestedAmount);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      if (res.ok) fetchGoals();
    } catch (err) {
      console.error("Deposit failed", err);
    }
  };

  return (
    <>
      <TopBar title="Savings Goals" />

      <div className="page-intro">
        <div>
          <h2>Targeted savings plan</h2>
          <p>Set financial goals and let Guardian calculate your monthly requirement.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "20px" }}>
        <h3>Create a New Goal</h3>
        {error && <p style={{ color: "var(--red)", fontSize: "12px", marginTop: "6px" }}>{error}</p>}
        
        <form onSubmit={handleCreateGoal} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "12px", marginTop: "14px", alignItems: "center" }}>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Goal Title (e.g., Buy a Laptop)"
            style={{ padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
            required 
          />
          <input 
            type="number" 
            value={targetAmount} 
            onChange={(e) => setTargetAmount(e.target.value)} 
            placeholder="Target Amount (₹)"
            style={{ padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
            required 
          />
          <input 
            type="number" 
            value={targetMonths} 
            onChange={(e) => setTargetMonths(e.target.value)} 
            placeholder="Months (e.g., 10)"
            style={{ padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
            required 
          />
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Creating..." : "Add Goal"}
          </button>
        </form>
      </section>

      <div className="accounts-list">
        {goals.map((goal) => {
          const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
          return (
            <div className="account-card" key={goal.id} style={{ flexDirection: "column", alignItems: "stretch", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>{goal.status}</span>
                  <h3 style={{ fontSize: "16px", marginTop: "2px" }}>{goal.title}</h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "18px" }}>₹{goal.savedAmount.toLocaleString("en-IN")}</strong>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}> / ₹{goal.targetAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="quota-bar">
                <div className="quota-progress" style={{ width: `${progress}%` }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
                <span>Required Rate: <strong>₹{goal.monthlyContribution.toLocaleString("en-IN")} / month</strong> ({goal.targetMonths} mos)</span>
                <button className="secondary-button" style={{ padding: "6px 12px" }} onClick={() => handleDeposit(goal.id, goal.monthlyContribution)}>
                  Contribute Savings
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
function CashTracker() {
  const [cashSummary, setCashSummary] = useState({ cashBalance: 0, spent: 0, income: 0, safetyBuffer: 3500 });
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("expense"); // 'income' or 'expense'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCashSummary = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/cash/summary");
      const data = await res.json();
      if (res.ok) setCashSummary(data);
    } catch (err) {
      console.error("Failed to load cash summary", err);
    }
  };

  React.useEffect(() => {
    fetchCashSummary();
  }, []);

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;
    setLoading(true);
    setMessage("");

    const endpoint = type === "income" ? "http://localhost:5000/api/cash/add" : "http://localhost:5000/api/cash/expense";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          description: description || (type === "income" ? "Cash Income" : "Cash Expense"),
          category: type === "income" ? "Income" : "Other"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process cash transaction");

      setMessage(type === "income" ? "Cash added successfully!" : "Cash expense recorded!");
      setAmount("");
      setDescription("");
      fetchCashSummary();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ marginTop: "20px" }}>
      <div className="card-header">
        <div>
          <h3>Physical Cash & Pocket Money Tracker</h3>
          <p>Track cash on hand and manual expenditures for automated forecasting.</p>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: "10px" }}>
        <div className="stat-card">
          <div className="stat-content">
            <span>Cash on Hand</span>
            <strong>₹{cashSummary.cashBalance?.toLocaleString("en-IN") || 0}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span>Month Cash Spent</span>
            <strong className="amount-expense">-₹{cashSummary.spent?.toLocaleString("en-IN") || 0}</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span>Month Cash Income</span>
            <strong className="amount-income">+₹{cashSummary.income?.toLocaleString("en-IN") || 0}</strong>
          </div>
        </div>
      </div>

      {message && <p style={{ fontSize: "12px", color: "var(--blue-light)", marginTop: "10px" }}>{message}</p>}

      <form onSubmit={handleCashSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: "10px", marginTop: "16px", alignItems: "center" }}>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value)}
          style={{ padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
        >
          <option value="expense">Cash Expense (-)</option>
          <option value="income">Cash Income (+)</option>
        </select>

        <input 
          type="text" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Description (e.g., Canteen, Auto fare)"
          style={{ padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
        />

        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          placeholder="Amount (₹)"
          style={{ padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
          required 
        />

        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Saving..." : "Add Entry"}
        </button>
      </form>
    </section>
  );
}
/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ page, setPage }) {
  const menu = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: WalletCards,
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: ArrowLeftRight,
    },
    {
      id: "forecast",
      label: "Cashflow Forecast",
      icon: TrendingUp,
    },
    {
  id: "goals",
  label: "Savings Goals",
  icon: Target, // Make sure to import Target from "lucide-react"
    },
    {
      id: "guardian",
      label: "AI Guardian",
      icon: Bot,
    },
    {
      id: "actions",
      label: "Actions",
      icon: Zap,
    },
    
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={25} />
        </div>

        <div>
          <div className="brand-title">EQUII</div>
          <div className="brand-subtitle"></div>
        </div>
      </div>

      <div className="sidebar-section-title">WORKSPACE</div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          className={`nav-item ${
            page === "settings" ? "active" : ""
          }`}
          onClick={() => setPage("settings")}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>

        <div className="profile">
          <div className="avatar">D</div>

          <div>
            <div className="profile-name">Divyanshu</div>
            <div className="profile-role">Student Account</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   TOP BAR
========================================================= */

function TopBar({ title }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>AI-powered personal cashflow protection</p>
      </div>

      <div className="topbar-actions">
        <button className="icon-button">
          <Search size={19} />
        </button>

        <button className="icon-button notification">
          <Bell size={19} />
          <span />
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  type = "blue",
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${type}`}>
        <Icon size={21} />
      </div>

      <div className="stat-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({ setPage }) {
  return (
    <>
      <TopBar title="Dashboard" />

      <div className="welcome">
        <div>
          <h2>Hello</h2>
          <p>Here is your current financial overview.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => setPage("guardian")}
        >
          <Bot size={17} />
          Ask AI Guardian
        </button>
      </div>

      <div className="alert-card">
        <div className="alert-icon">
          <AlertTriangle size={22} />
        </div>

        <div className="alert-content">
          <strong>Potential cash shortfall detected</strong>
          <p>
            Your stipend appears to be delayed. Based on your upcoming
            expenses, your balance could fall below your safety buffer.
          </p>
        </div>

        <button onClick={() => setPage("forecast")}>
          View prediction
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Safe to spend"
          value="₹2,450"
          description="Available after protection"
          icon={WalletCards}
          type="blue"
        />

        <StatCard
          title="Total balance"
          value="₹9,700"
          description="Across 2 accounts"
          icon={IndianRupee}
          type="green"
        />

        <StatCard
          title="Cash runway"
          value="9 days"
          description="At current spending pace"
          icon={Clock3}
          type="purple"
        />

        <StatCard
          title="Shortfall risk"
          value="Medium"
          description="Based on next 14 days"
          icon={AlertTriangle}
          type="orange"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card forecast-preview">
          <div className="card-header">
            <div>
              <h3>14-day cashflow forecast</h3>
              <p>Projected balance after expected income and expenses</p>
            </div>

            <button
              className="text-button"
              onClick={() => setPage("forecast")}
            >
              View full forecast
              <ChevronRight size={16} />
            </button>
          </div>

          <ForecastBars />
        </section>

        <section className="card guardian-preview">
          <div className="guardian-heading">
            <div className="ai-icon">
              <Bot size={21} />
            </div>

            <div>
              <h3>AI Guardian</h3>
              <span>Monitoring your cashflow</span>
            </div>

            <span className="online-dot" />
          </div>

          <div className="guardian-message">
            <Sparkles size={17} />

            <p>
              Your spending is currently manageable, but hostel rent
              arrives before your expected stipend.
            </p>
          </div>

          <button
            className="guardian-button"
            onClick={() => setPage("guardian")}
          >
            Ask Guardian
            <ChevronRight size={16} />
          </button>
        </section>
      </div>

      <div className="section-heading">
        <div>
          <h2>Recent activity</h2>
          <p>Your latest financial transactions</p>
        </div>

        <button
          className="text-button"
          onClick={() => setPage("transactions")}
        >
          View all
          <ChevronRight size={16} />
        </button>
      </div>

      <TransactionTable compact />
    </>
  );
}

/* =========================================================
   FORECAST BARS
========================================================= */
function ForecastBars() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/forecast?days=10")
      .then((res) => res.json())
      .then((result) => {
        if (result && result.data) {
          setData(result.data);
        }
      })
      .catch((err) => console.error("Failed to load forecast graph", err));
  }, []);

  if (!data.length) {
    return <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "12px" }}>Loading forecast trend...</div>;
  }

  const maxBalance = Math.max(...data.map(d => d.balance), 10000);
  const width = 600;
  const height = 160;
  const padding = 20;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (item.balance / maxBalance) * (height - padding * 2);
    return { x, y, ...item };
  });

  const pathString = points.reduce((acc, pt, idx) => (
    idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
  ), "");

  const areaString = `${pathString} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "180px", overflow: "visible" }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border)" strokeDasharray="4" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border)" strokeDasharray="4" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" />

        <path d={areaString} fill="url(#lineGradient)" />
        <path d={pathString} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((pt, index) => (
          <g key={index}>
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="4.5" 
              fill={pt.balance < 3500 ? "#f97316" : "#3b82f6"} 
              stroke="var(--card)" 
              strokeWidth="2" 
            />
            {index % 2 === 0 && (
              <text x={pt.x} y={height - 2} fill="var(--text-muted)" fontSize="10" textAnchor="middle">
                {pt.day.split(" ")[0]}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
/* =========================================================
   ACCOUNTS
========================================================= */

function Accounts() {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <>
      <TopBar title="Accounts" />

      <div className="page-intro">
        <div>
          <h2>Connected accounts</h2>
          <p>
            Manage your connected accounts and see where your money is held.
          </p>
        </div>

        <button className="primary-button">
          <Plus size={17} />
          Add account
        </button>
      </div>

      <div className="stats-grid three">
        <StatCard
          title="Total available balance"
          value={`₹${total.toLocaleString("en-IN")}`}
          description="Across connected accounts"
          icon={WalletCards}
          type="blue"
        />

        <StatCard
          title="Connected accounts"
          value="2"
          description="Both synced recently"
          icon={RefreshCw}
          type="green"
        />

        <StatCard
          title="Safe to spend"
          value="₹2,450"
          description="Protected spending amount"
          icon={ShieldCheck}
          type="purple"
        />
      </div>

      <div className="security-banner">
        <ShieldCheck size={23} />

        <div>
          <strong>Your accounts are protected</strong>
          <p>
            Connections are read-only. Cashflow Guardian cannot move your
            money.
          </p>
        </div>

        <CheckCircle2 size={20} />
      </div>

      <div className="section-heading">
        <div>
          <h2>Your accounts</h2>
          <p>Connected financial accounts</p>
        </div>

        <button className="secondary-button">
          <RefreshCw size={16} />
          Sync accounts
        </button>
      </div>

      <div className="accounts-list">
        {accounts.map((account) => (
          <div className="account-card" key={account.number}>
            <div className="bank-icon">
              <WalletCards size={24} />
            </div>

            <div className="account-info">
              <span>{account.bank}</span>
              <h3>{account.name}</h3>
              <p>{account.number}</p>
            </div>

            <div className="account-balance">
              <span>Available balance</span>
              <strong>
                ₹{account.balance.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="account-status">
              <CheckCircle2 size={15} />
              {account.status}
            </div>

            <button className="icon-button">
              <ChevronRight size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* =========================================================
   TRANSACTIONS
========================================================= */

// function TransactionTable({ compact = false }) {
//   const [data, setData] = useState([]);
//   const [editingTransaction, setEditingTransaction] = useState(null);

//   // Fetch real transactions from backend
//   const fetchTransactions = async () => {
//     try {
//       const res = await fetch("http://localhost:5000/api/transactions");
//       const result = await res.json();
//       if (res.ok) {
//         setData(compact ? result.transactions.slice(0, 4) : result.transactions);
//       }
//     } catch (err) {
//       console.error("Failed to load transactions", err);
//     }
//   };

//   React.useEffect(() => {
//     fetchTransactions();
//   }, [compact]);

//   return (
//     <>
//       <div className="transaction-table">
//         <div className="transaction-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr" }}>
//           <span>Transaction</span>
//           <span>Category</span>
//           <span>Date</span>
//           <span>Amount</span>
//           <span>Action</span>
//         </div>

//         {data.map((transaction) => {
//           const Icon = transaction.icon || ArrowDownRight;

//           return (
//             <div className="transaction-row" key={transaction.id || transaction.name + transaction.date} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr" }}>
//               <div className="transaction-name">
//                 <div className={`transaction-icon ${transaction.type === "income" ? "income" : "expense"}`}>
//                   <Icon size={17} />
//                 </div>
//                 <div>
//                   <strong>{transaction.name}</strong>
//                   <small>{transaction.description || transaction.category}</small>
//                 </div>
//               </div>

//               <span className="category-pill">{transaction.category}</span>
//               <span className="transaction-date">{transaction.date}</span>

//               <strong className={transaction.type === "income" ? "amount-income" : "amount-expense"}>
//                 {transaction.type === "income" ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
//               </strong>

//               <button 
//                 className="secondary-button" 
//                 style={{ padding: "4px 8px", fontSize: "11px" }}
//                 onClick={() => setEditingTransaction(transaction)}
//               >
//                 Edit
//               </button>
//             </div>
//           );
//         })}
//       </div>

//       {editingTransaction && (
//         <EditTransactionModal 
//           transaction={editingTransaction} 
//           onClose={() => setEditingTransaction(null)} 
//           onUpdated={fetchTransactions} 
//         />
//       )}
//     </>
//   );


// function Transactions() {
//   // Add state to control the visibility of the upload modal
//   const [showUpload, setShowUpload] = useState(false);

//   return (
//     <>
//       <TopBar title="Transactions" />
//       <CashTracker />
      
//       <div className="page-intro">
//         <div>
//           <h2>All transactions</h2>
//           <p>Automatically categorized financial activity.</p>
//         </div>

//         {/* Wrap buttons in a flex container so they sit side-by-side */}
//         <div style={{ display: "flex", gap: "10px" }}>
//           <button className="secondary-button" onClick={() => setShowUpload(true)}>
//             <Plus size={16} />
//             Import CSV
//           </button>
          
//           <button className="secondary-button">
//             <SlidersHorizontal size={16} />
//             Filters
//           </button>
//         </div>
//       </div>

//       {/* Render the modal when the button is clicked */}
//       {showUpload && (
//         <CSVUploadModal 
//           onClose={() => setShowUpload(false)} 
//           onUploadComplete={(msg) => {
//             alert(msg);
//             window.location.reload(); 
//           }} 
//         />
//       )}

//       <div className="transaction-summary">
//         <div>
//           <span>Total income</span>
//           <strong className="amount-income">+₹10,000</strong>
//         </div>

//         <div>
//           <span>Total expenses</span>
//           <strong className="amount-expense">-₹1,113</strong>
//         </div>

//         <div>
//           <span>Transactions</span>
//           <strong>24</strong>
//         </div>

//         <div>
//           <span>Auto categorized</span>
//           <strong>96%</strong>
//         </div>
//       </div>

//       <section className="card">
//         <div className="card-header">
//           <div>
//             <h3>Recent transactions</h3>
//             <p>Your latest account activity</p>
//           </div>

//           <button className="secondary-button">
//             <RefreshCw size={15} />
//             Sync
//           </button>
//         </div>

//         <TransactionTable />
//       </section>
//     </>
//   );
// }
/* =========================================================
   TRANSACTIONS
========================================================= */

function TransactionTable({ compact = false, filters = {} }) {
  const [data, setData] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const fetchTransactions = async () => {
    try {
      const query = new URLSearchParams();
      if (filters.type) query.append("type", filters.type);
      if (filters.category) query.append("category", filters.category);
      if (filters.search) query.append("search", filters.search);

      const res = await fetch(`http://localhost:5000/api/transactions?${query.toString()}`);
      const result = await res.json();
      
      if (res.ok) {
        setData(compact ? result.transactions.slice(0, 4) : result.transactions);
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
    }
  };

  React.useEffect(() => {
    fetchTransactions();
  }, [compact, filters]); 

  return (
    <>
      <div className="transaction-table">
        <div className="transaction-head" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr" }}>
          <span>Transaction</span>
          <span>Category</span>
          <span>Date</span>
          <span>Amount</span>
          <span>Action</span>
        </div>

        {data.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No transactions found matching your filters.
          </div>
        ) : (
          data.map((transaction) => {
            const Icon = transaction.icon || ArrowDownRight;

            return (
              <div className="transaction-row" key={transaction.id || transaction.name + transaction.date} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 0.5fr" }}>
                <div className="transaction-name">
                  <div className={`transaction-icon ${transaction.type === "income" ? "income" : "expense"}`}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <strong>{transaction.name}</strong>
                    <small>{transaction.description || transaction.category}</small>
                  </div>
                </div>

                <span className="category-pill">{transaction.category}</span>
                <span className="transaction-date">{new Date(transaction.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>

                <strong className={transaction.type === "income" ? "amount-income" : "amount-expense"}>
                  {transaction.type === "income" ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
                </strong>

                <button 
                  className="secondary-button" 
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  onClick={() => setEditingTransaction(transaction)}
                >
                  Edit
                </button>
              </div>
            );
          })
        )}
      </div>

      {editingTransaction && (
        <EditTransactionModal 
          transaction={editingTransaction} 
          onClose={() => setEditingTransaction(null)} 
          onUpdated={fetchTransactions} 
        />
      )}
    </>
  );
}

function Transactions() {
  const [showUpload, setShowUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: "", type: "", category: "" });

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: "", type: "", category: "" });
  };

  return (
    <>
      <TopBar title="Transactions" />
      
      <div className="page-intro" style={{ marginTop: "20px" }}>
        <div>
          <h2>All transactions</h2>
          <p>Automatically categorized financial activity.</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="secondary-button" onClick={() => setShowUpload(true)}>
            <Plus size={16} />
            Import CSV
          </button>
          
          <button 
            className="secondary-button" 
            style={{ background: showFilters ? "var(--blue)" : "var(--card)", color: showFilters ? "white" : "var(--text)" }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ padding: "16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", background: "#0d1524" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "var(--text-muted)" }} />
            <input 
              type="text" 
              placeholder="Search by name or description..." 
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              style={{ width: "100%", padding: "10px 10px 10px 36px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
            />
          </div>

          <select 
            value={filters.type} 
            onChange={(e) => updateFilter("type", e.target.value)}
            style={{ padding: "10px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
          >
            <option value="">All Types</option>
            <option value="income">Income (+)</option>
            <option value="expense">Expense (-)</option>
          </select>

          <select 
            value={filters.category} 
            onChange={(e) => updateFilter("category", e.target.value)}
            style={{ padding: "10px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white" }}
          >
            <option value="">All Categories</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Housing">Housing</option>
            <option value="Subscription">Subscription</option>
            <option value="Education">Education</option>
            <option value="Income">Income</option>
            <option value="Transfer">Transfer</option>
            <option value="Other">Other</option>
          </select>

          {(filters.search || filters.type || filters.category) && (
            <button className="text-button" onClick={clearFilters} style={{ color: "var(--red-light)" }}>
              Clear
            </button>
          )}
        </div>
      )}

      <section className="card">
        <TransactionTable filters={filters} />
      </section>
    </>
  );
}
// function EditTransactionModal({ transaction, onClose, onUpdated }) {
//   const [category, setCategory] = useState(transaction.category);
//   const [name, setName] = useState(transaction.name);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const categories = ["Food", "Transport", "Subscription", "Housing", "Education", "Transfer", "Income", "Other"];

//   const handleUpdate = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     try {
//       const res = await fetch(`http://localhost:5000/api/transactions/${transaction.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           ...transaction,
//           name,
//           category
//         })
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to update transaction");

//       onUpdated();
//       onClose();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ background: "rgba(0,0,0,0.7)", position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
//       <div className="card" style={{ width: "400px", padding: "24px" }}>
//         <h3>Edit Transaction</h3>
//         <p>Correct AI categorization or details manually.</p>

//         {error && <p style={{ color: "var(--red)", fontSize: "12px", marginTop: "8px" }}>{error}</p>}

//         <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
//           <div>
//             <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Transaction Name</label>
//             <input 
//               type="text" 
//               value={name} 
//               onChange={(e) => setName(e.target.value)} 
//               style={{ width: "100%", padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white", marginTop: "4px" }}
//               required 
//             />
//           </div>

//           <div>
//             <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Category (Override AI)</label>
//             <select 
//               value={category} 
//               onChange={(e) => setCategory(e.target.value)}
//               style={{ width: "100%", padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white", marginTop: "4px" }}
//             >
//               {categories.map((cat) => (
//                 <option key={cat} value={cat}>{cat}</option>
//               ))}
//             </select>
//           </div>

//           <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
//             <button type="button" className="secondary-button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
//             <button type="submit" className="primary-button" style={{ flex: 1 }} disabled={loading}>
//               {loading ? "Saving..." : "Save Changes"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
function EditTransactionModal({ transaction, onClose, onUpdated }) {
  const [date, setDate] = useState(transaction.date.split("T")[0]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" style={{ background: "rgba(0,0,0,0.7)", position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="card" style={{ width: "350px", padding: "24px" }}>
        <h3>Edit: {transaction.name}</h3>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>Change the expected date to simulate delays.</p>
        <form onSubmit={handleUpdate}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", padding: "10px", background: "#0d1524", border: "1px solid var(--border)", borderRadius: "8px", color: "white", marginBottom: "16px" }} />
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="secondary-button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="primary-button" style={{ flex: 1 }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   FORECAST
========================================================= */
/* =========================================================
   FORECAST (Fully Dynamic & Data-Driven)
========================================================= */

function Forecast() {
  const [period, setPeriod] = useState(14);
  const [data, setData] = useState([]);
  const [risk, setRisk] = useState({ minimumBalance: 0, level: "Low" });
  const [finances, setFinances] = useState({ starting: 0, buffer: 3500 });

  React.useEffect(() => {
    fetch(`http://localhost:5000/api/forecast?days=${period}`)
      .then((res) => res.json())
      .then((result) => {
        if (result && result.data) {
          setData(result.data);
          setRisk(result.risk || { minimumBalance: 0, level: "Low" });
          setFinances({
            starting: result.startingBalance || 0,
            buffer: result.safetyBuffer || 3500
          });
        }
      })
      .catch((err) => console.error("Failed to load forecast data", err));
  }, [period]);

  // Dynamic Calculations
  const safeToSpend = Math.max(0, finances.starting - finances.buffer);
  const endingBalance = data.length ? data[data.length - 1].balance : 0;
  const isTrendingDown = endingBalance < finances.starting;
  
  const maxBalance = data.length > 0 ? Math.max(...data.map((d) => d.balance), finances.buffer + 2000) : 10000;
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingY = 20;

  const points = data.map((item, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
    const y = height - paddingY - (item.balance / maxBalance) * (height - paddingY * 2);
    return { x, y, ...item };
  });

  const pathString = points.length
    ? points.reduce((acc, pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), "")
    : "";

  const areaString = points.length
    ? `${pathString} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`
    : "";

  // Dynamic Risk Messaging
  let riskMessage = "Your financial trajectory is stable and remains above the safety buffer.";
  if (risk.level === "Medium") riskMessage = "Warning: Your balance is projected to approach or temporarily dip below your safety buffer.";
  if (risk.level === "High") riskMessage = "Critical: A severe cash shortfall is detected in this period. Immediate action recommended.";

  // Dynamic AI Explanation
  const aiExplanation = isTrendingDown 
    ? `Your forecast is trending downwards because your calculated daily burn rate and upcoming expenses exceed your expected income for the next ${period} days.`
    : `Your forecast is stable or growing. Your expected income successfully covers your daily burn rate over the next ${period} days.`;

  return (
    <>
      <TopBar title="Cashflow Forecast" />

      <div className="page-intro">
        <div>
          <h2>Predictive cashflow</h2>
          <p>Live projection based on your current balance and spending habits.</p>
        </div>

        <div className="period-switch">
          <button className={period === 7 ? "selected" : ""} onClick={() => setPeriod(7)}>
            7 days
          </button>
          <button className={period === 14 ? "selected" : ""} onClick={() => setPeriod(14)}>
            14 days
          </button>
          <button className="icon-button" onClick={() => setPeriod(period)}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Projected balance"
          value={`₹${endingBalance.toLocaleString("en-IN")}`}
          description="End of forecast period"
          icon={TrendingUp}
          type={isTrendingDown ? "orange" : "green"}
        />
        <StatCard
          title="Minimum balance"
          value={`₹${risk.minimumBalance.toLocaleString("en-IN")}`}
          description="Lowest projected point"
          icon={AlertTriangle}
          type={risk.level === "Low" ? "green" : risk.level === "Medium" ? "orange" : "red"}
        />
        <StatCard
          title="Safe to spend"
          value={`₹${safeToSpend.toLocaleString("en-IN")}`}
          description="Available before hitting buffer"
          icon={ShieldCheck}
          type="blue"
        />
        <StatCard
          title="Forecast confidence"
          value={period === 14 ? "87%" : "94%"}
          description="Based on logged transactions"
          icon={Sparkles}
          type="purple"
        />
      </div>

      <section className="card large-forecast">
        <div className="card-header">
          <div>
            <h3>Projected balance trajectory</h3>
            <p>Live calculation for the next {period} days</p>
          </div>

          <div className="legend">
            <span>
              <i className="legend-blue" style={{ background: "var(--blue)", width: 10, height: 10, borderRadius: 3, display: "inline-block" }} />
              Balance
            </span>
            <span>
              <i className="legend-red" style={{ background: "var(--orange)", width: 10, height: 10, borderRadius: 3, display: "inline-block" }} />
              Safety buffer (₹{finances.buffer.toLocaleString("en-IN")})
            </span>
          </div>
        </div>

        <div style={{ width: "100%", overflowX: "auto", paddingTop: "20px" }}>
          {data.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Analyzing financial data...</div>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "240px", overflow: "visible" }}>
              <defs>
                <linearGradient id="largeLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={risk.level === "High" ? "#ef4444" : "#3b82f6"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={risk.level === "High" ? "#ef4444" : "#3b82f6"} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines & Y-Axis */}
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="var(--border)" strokeDasharray="4" />
              <text x={paddingX - 10} y={paddingY + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">₹{maxBalance >= 10000 ? (maxBalance/1000).toFixed(0) + "k" : maxBalance}</text>

              <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="var(--border)" strokeDasharray="4" />
              <text x={paddingX - 10} y={height / 2 + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">₹{(maxBalance/2000).toFixed(0)}k</text>

              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="var(--border)" />
              <text x={paddingX - 10} y={height - paddingY + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">₹0</text>

              {/* Buffer Line */}
              {maxBalance > finances.buffer && (
                <line 
                  x1={paddingX} 
                  y1={height - paddingY - (finances.buffer / maxBalance) * (height - paddingY * 2)} 
                  x2={width - paddingX} 
                  y2={height - paddingY - (finances.buffer / maxBalance) * (height - paddingY * 2)} 
                  stroke="var(--orange)" 
                  strokeDasharray="6" 
                  strokeOpacity="0.5"
                />
              )}

              {/* Chart Path and Area */}
              <path d={areaString} fill="url(#largeLineGradient)" />
              <path d={pathString} fill="none" stroke={risk.level === "High" ? "var(--red)" : "#3b82f6"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Points & X-Axis Labels */}
              {points.map((pt, index) => (
                <g key={index}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill={pt.balance < finances.buffer ? "var(--red)" : (pt.balance < finances.buffer + 1000 ? "var(--orange)" : "#3b82f6")}
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                  {(period === 7 || index % 2 === 0) && (
                    <text x={pt.x} y={height} fill="var(--text-muted)" fontSize="11" textAnchor="middle">
                      {pt.day.split(" ")[0]}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>
      </section>

      <div className="two-column">
        <section className="risk-card">
          <div className="risk-header">
            <div className="risk-symbol" style={{ color: risk.level === "Low" ? "var(--green-light)" : "var(--yellow)" }}>
              <AlertTriangle size={21} />
            </div>
            <div>
              <span>Shortfall risk</span>
              <h3 style={{ color: risk.level === "High" ? "var(--red)" : "inherit" }}>{risk.level} risk detected</h3>
            </div>
          </div>
          <p>{riskMessage}</p>
          <div className="risk-list">
            <div>
              <span>Minimum projected balance</span>
              <strong style={{ color: risk.minimumBalance < finances.buffer ? "var(--red)" : "inherit"}}>
                ₹{risk.minimumBalance.toLocaleString("en-IN")}
              </strong>
            </div>
            <div>
              <span>Safety buffer</span>
              <strong>₹{finances.buffer.toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </section>

        <section className="ai-card">
          <div className="ai-card-title">
            <div className="ai-icon">
              <Bot size={21} />
            </div>
            <div>
              <span>AI Guardian</span>
              <h3>Why is the forecast doing this?</h3>
            </div>
          </div>
          <p>{aiExplanation}</p>
          <button className="secondary-button" onClick={() => window.scrollTo(0, 0)}>
            <CircleHelp size={16} />
            Ask Guardian for advice
          </button>
        </section>
      </div>
    </>
  );
}


/* =========================================================
   AI GUARDIAN
========================================================= */

function Guardian() {
  const [messages, setMessages] = useState([
    { sender: "guardian", text: "Hello! I'm your AI Guardian. Ask me anything about your cashflow, savings, or risk levels." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    
    // 1. Instantly update UI with user message
    const updatedWithUser = [...messages, { sender: "user", text: userText }];
    setMessages(updatedWithUser);
    setLoading(true);

    // 2. Generate intelligent response instantly
    let replyText = "Your cashflow is stable, but keep an eye on upcoming hostel rent before your stipend arrives.";
    const lower = userText.toLowerCase();
    if (lower.includes("balance") || lower.includes("money")) {
      replyText = "Your total connected balance is currently ₹9,700 with a safe-to-spend limit of ₹2,450.";
    } else if (lower.includes("risk") || lower.includes("shortfall")) {
      replyText = "Current shortfall risk is Medium based on your upcoming 14-day forecast.";
    } else if (lower.includes("prediction") || lower.includes("forecast") || lower.includes("laptop")) {
      replyText = "Your 14-day forecast shows a temporary dip on Sep 28 due to hostel rent before your stipend arrives on Oct 3.";
    }

    // 3. Simulate a natural typing delay, then clear loading and show reply
    setTimeout(() => {
      setMessages([...updatedWithUser, { sender: "guardian", text: replyText }]);
      setLoading(false);
    }, 500);

    // 4. Background Firebase sync (non-blocking, won't freeze UI if offline/unconfigured)
    try {
      addDoc(collection(db, "guardian_chats"), {
        sender: "user",
        text: userText,
        createdAt: serverTimestamp()
      }).catch(() => {});

      addDoc(collection(db, "guardian_chats"), {
        sender: "guardian",
        text: replyText,
        createdAt: serverTimestamp()
      }).catch(() => {});
    } catch (err) {
      // Ignore background sync errors
    }
  };

  return (
    <>
      <TopBar title="AI Guardian" />

      <div className="guardian-page">
        <div className="guardian-hero">
          <div className="guardian-big-icon">
            <Bot size={36} />
          </div>
          <div>
            <div className="guardian-status"><span />Guardian is monitoring</div>
            <h2>Your financial co-pilot</h2>
            <p>Instant cashflow assistance and risk analysis.</p>
          </div>
        </div>

        <section className="card conversation">
          {messages.map((msg, idx) => (
            <div key={idx} className={`conversation-message ${msg.sender}`}>
              {msg.sender === "guardian" && (
                <div className="message-avatar"><Bot size={17} /></div>
              )}
              <div>
                <span>{msg.sender === "guardian" ? "AI Guardian" : "You"}</span>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="conversation-message guardian">
              <div className="message-avatar"><Bot size={17} /></div>
              <div>
                <span>AI Guardian</span>
                <p style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Guardian is typing...</p>
              </div>
            </div>
          )}

          <form onSubmit={sendMessage} className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your Guardian anything..."
            />
            <button type="submit">
              <ArrowUpRight size={18} />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
/* =========================================================
   ACTIONS
========================================================= */

function Actions() {
  return (
    <>
      <TopBar title="Actions" />

      <div className="page-intro">
        <div>
          <h2>Protection actions</h2>
          <p>Actions suggested by your AI Guardian.</p>
        </div>
      </div>

      <div className="action-alert">
        <div className="alert-icon">
          <Zap size={21} />
        </div>

        <div>
          <strong>Guardian recommends protecting ₹1,500</strong>
          <p>
            Your current forecast has a temporary cashflow gap before
            your stipend arrives.
          </p>
        </div>
      </div>

      <div className="action-grid">
        <ActionCard
          icon={Clock3}
          title="Delay ₹1,000 purchase"
          description="Move a discretionary purchase beyond the shortfall period."
          impact="+₹1,000 buffer"
        />

        <ActionCard
          icon={ArrowDownRight}
          title="Reduce food spending"
          description="Keep food spending ₹500 below your recent weekly average."
          impact="+₹500 buffer"
        />

        <ActionCard
          icon={CalendarDays}
          title="Review subscriptions"
          description="Review upcoming recurring payments before the stipend."
          impact="₹318 upcoming"
        />
      </div>
    </>
  );
}

// function ActionCard({ id, icon: Icon, title, description, impact, onActionTaken }) {
//   const [loading, setLoading] = useState(false);

//   const handleExecute = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`http://localhost:5000/api/actions/${id}/execute`, {
//         method: "POST"
//       });
//       const data = await res.json();
//       if (res.ok) {
//         alert(data.message);
//         if (onActionTaken) onActionTaken();
//       }
//     } catch (err) {
//       console.error("Execution failed", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="action-card">
//       <div className="action-icon">
//         <Icon size={21} />
//       </div>

//       <h3>{title}</h3>
//       <p>{description}</p>
//       <div className="action-impact">{impact}</div>

//       <button className="primary-button" onClick={handleExecute} disabled={loading}>
//         {loading ? "Executing..." : "Take action"}
//         <ArrowUpRight size={16} />
//       </button>
//     </div>
//   );
// }
// function CSVUploadModal({ onClose, onUploadComplete }) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
    
//     setLoading(true);
//     setError("");

//     const reader = new FileReader();
//     reader.onload = async (event) => {
//       try {
//         const text = event.target.result;
//         const rows = text.split("\n").filter(row => row.trim().length > 0);
        
//         // Assuming CSV format: Date, Name, Amount, Type (income/expense)
//         // Skip header row
//         const parsedTransactions = rows.slice(1).map(row => {
//           const [date, name, amount, type] = row.split(",").map(val => val?.trim() || "");
//           return { date, name, amount: parseFloat(amount), type: type.toLowerCase() };
//         }).filter(tx => !isNaN(tx.amount) && tx.name);

//         const res = await fetch("http://localhost:5000/api/transactions/bulk", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ transactions: parsedTransactions })
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error);

//         onUploadComplete(data.message);
//         onClose();
//       } catch (err) {
//         setError(err.message || "Failed to parse or upload CSV.");
//       } finally {
//         setLoading(false);
//       }
//     };
//     reader.readAsText(file);
//   };

//   return (
//     <div style={{ background: "rgba(0,0,0,0.7)", position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
//       <div className="card" style={{ width: "400px", padding: "24px", textAlign: "center" }}>
//         <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px", color: "var(--blue-light)" }}>
//           <TrendingUp size={32} />
//         </div>
//         <h3>Upload Bank Statement</h3>
//         <p style={{ marginTop: "8px", fontSize: "12.5px", color: "var(--text-secondary)" }}>
//           Upload a CSV file containing your transactions. The AI Guardian will automatically categorize them.
//         </p>
//         <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
//           Expected format: <code>Date, Description, Amount, Type (income/expense)</code>
//         </p>

//         {error && <p style={{ color: "var(--red)", fontSize: "12px", marginTop: "12px" }}>{error}</p>}

//         <div style={{ marginTop: "20px" }}>
//           <label className="primary-button" style={{ display: "block", cursor: "pointer", textAlign: "center" }}>
//             {loading ? "Processing..." : "Select CSV File"}
//             <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileUpload} disabled={loading} />
//           </label>
//           <button type="button" className="text-button" onClick={onClose} style={{ marginTop: "12px", width: "100%", justifyContent: "center" }} disabled={loading}>
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
function ActionCard({ id, icon: Icon, title, description, impact, onActionTaken }) {
  const handleFeedback = async (type) => {
    const endpoint = type === 'accept' ? `/api/actions/${id}/execute` : `/api/learning/feedback`;
    const body = type === 'accept' ? null : JSON.stringify({ actionId: id, feedbackType: type });

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const data = await res.json();
      alert(data.message); // This will show the "Learning Cycle Triggered" message!
      if (onActionTaken) onActionTaken();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="action-card">
      <div className="action-icon"><Icon size={21} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="action-impact">{impact}</div>
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button className="primary-button" onClick={() => handleFeedback('accept')} style={{ flex: 1 }}>Accept</button>
        <button className="secondary-button" onClick={() => handleFeedback('reject')} style={{ flex: 1 }}>Reject</button>
      </div>
    </div>
  );
}
function CSVUploadModal({ onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a CSV file");
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split('\n').slice(1); // Skip header
      
      const parsedData = rows.filter(row => row.trim()).map(row => {
        const [date, name, amount, type] = row.split(',');
        return { date: date.trim(), name: name.trim(), amount: Number(amount), type: type.trim() };
      });

      try {
        // Send to backend (You will need a /api/transactions/bulk endpoint in server.js)
        const res = await fetch("http://localhost:5000/api/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: parsedData })
        });
        const data = await res.json();
        onUploadComplete(`Imported successfully! Ignored ${data.duplicates} duplicates.`);
        onClose();
      } catch (err) {
        alert("Upload failed.");
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" style={{ background: "rgba(0,0,0,0.7)", position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div className="card" style={{ width: "400px", padding: "24px" }}>
        <h3>Import Transactions</h3>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>Upload a CSV file. The AI will auto-categorize and filter out duplicates.</p>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="secondary-button" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="primary-button" onClick={handleUpload} disabled={loading} style={{ flex: 1 }}>{loading ? "Processing..." : "Import"}</button>
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />

      <div className="page-intro">
        <div>
          <h2>Preferences</h2>
          <p>Control how Cashflow Guardian monitors your finances.</p>
        </div>
      </div>

      <div className="settings-list">
        <SettingRow
          title="Cashflow alerts"
          description="Receive alerts when your projected balance approaches the safety buffer."
          enabled
        />

        <SettingRow
          title="Daily spending notifications"
          description="Get a daily summary of spending and remaining safe-to-spend amount."
          enabled
        />

        <SettingRow
          title="Learning from feedback"
          description="Allow Guardian to improve recommendations from your actions."
          enabled
        />

        <SettingRow
          title="Automatic categorization"
          description="Automatically categorize incoming transactions."
          enabled
        />

        <SettingRow
          title="Protective action suggestions"
          description="Show actions when a potential shortfall is detected."
          enabled
        />
      </div>
    </>
  );
}

function SettingRow({ title, description, enabled }) {
  const [active, setActive] = useState(enabled);

  return (
    <div className="setting-row">
      <div className="setting-icon">
        <Settings size={19} />
      </div>

      <div className="setting-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <button
        className={`toggle ${active ? "on" : ""}`}
        onClick={() => setActive(!active)}
      >
        <span />
      </button>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */
export default function App() {
  const [showHero, setShowHero] = useState(true);
  const [page, setPage] = useState("dashboard");

if (showHero) {
    return <CashflowHero onEnter={() => setShowHero(false)} />;
  }

  const renderPage = () => {
    switch (page) {
      case "accounts":
        return <Accounts />;

      case "transactions":
        return <Transactions />;

      case "forecast":
        return <Forecast />;
     
        case "goals": // <--- Add this case right here!
        return <Goals />;
    
      case "guardian":
        return <Guardian />;

      case "actions":
        return <Actions />;

      case "settings":
        return <SettingsPage />;

      case "dashboard":
      default:
        return <Dashboard setPage={setPage} />;
    }
  };

  return (
    <div className="app">
      <SpotlightCursor config={{ color: "#3b82f6", radius: 250, brightness: 0.15 }} />
      <Sidebar page={page} setPage={setPage} />

      <main className="main">
        <div className="content">{renderPage()}</div>
      </main>
    </div>
  );
}

const API = "http://localhost:5000/api/cash";

async function getCashSummary() {
  const response = await fetch(`${API}/summary`);
  return response.json();
}

async function addCash(amount) {
  const response = await fetch(`${API}/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount })
  });

  return response.json();
}

async function addCashExpense(
  amount,
  category,
  description
) {
  const response = await fetch(`${API}/expense`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount,
      category,
      description
    })
  });

  return response.json();
}

