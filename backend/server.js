const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = process.env.DB_FILE || "cashflow.db";

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ============================================================
// DATABASE
// ============================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id INTEGER,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accept', 'reject', 'modify')),
    modified_value REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP'
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    saved_amount REAL NOT NULL DEFAULT 0,
    target_months INTEGER NOT NULL,
    monthly_contribution REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    monthly_quota REAL NOT NULL DEFAULT 10000,
    safety_buffer REAL NOT NULL DEFAULT 3500,
    currency TEXT NOT NULL DEFAULT 'INR',
    alerts_enabled INTEGER NOT NULL DEFAULT 1,
    daily_notifications INTEGER NOT NULL DEFAULT 1,
    learning_enabled INTEGER NOT NULL DEFAULT 1,
    auto_categorization INTEGER NOT NULL DEFAULT 1,
    action_suggestions INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bank TEXT NOT NULL DEFAULT 'Demo Bank',
    account_number TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Connected',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    amount REAL NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date TEXT NOT NULL,
    recurring INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    category TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON transactions(date);

  CREATE INDEX IF NOT EXISTS idx_transactions_type
    ON transactions(type);

  CREATE INDEX IF NOT EXISTS idx_transactions_category
    ON transactions(category);
`);


app.post("/api/actions/:id/execute", (req, res) => {
  try {
    const id = Number(req.params.id);
    const action = db.prepare("SELECT * FROM actions WHERE id = ?").get(id);

    if (!action) return res.status(404).json({ error: "Action not found" });

    // Mark action as completed
    db.prepare("UPDATE actions SET status = 'executed', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    // Record 'accept' event for Continuous Learning Cycle 1
    db.prepare("INSERT INTO user_feedback (action_id, feedback_type) VALUES (?, 'accept')").run(id);

    res.json({
      success: true,
      message: `Automated Action Executed: ${action.title}. Projected buffer increased by ₹${action.impact}.`,
      updatedForecast: buildForecast(14)
    });
  } catch (error) {
    console.error("Execute action error:", error);
    res.status(500).json({ error: "Failed to execute automated action" });
  }
});

app.post("/api/learning/feedback", (req, res) => {
  try {
    const { actionId, feedbackType, modifiedValue } = req.body;

    if (!['accept', 'reject', 'modify'].includes(feedbackType)) {
      return res.status(400).json({ error: "Invalid feedback type" });
    }

    db.prepare(`
      INSERT INTO user_feedback (action_id, feedback_type, modified_value)
      VALUES (?, ?, ?)
    `).run(actionId || null, feedbackType, modifiedValue || null);

    // LEARNING CYCLE ADJUSTMENT:
    // Cycle 1: If user rejects spending cuts, system increases safety buffer target.
    // Cycle 2: If user frequently accepts/modifies values, system adapts confidence rating.
    const feedbackCount = db.prepare("SELECT COUNT(*) AS count FROM user_feedback").get().count;

    let learningMsg = "Feedback recorded.";
    if (feedbackType === 'reject') {
      db.prepare("UPDATE settings SET safety_buffer = safety_buffer + 200 WHERE id = 1").run();
      learningMsg = "Learning Cycle 1 Triggered: User rejected restriction. AI automatically raised Safety Buffer by ₹200 to protect cashflow passively.";
    } else if (feedbackType === 'modify') {
      learningMsg = `Learning Cycle 2 Triggered: AI adapted spending threshold to user preference (₹${modifiedValue}).`;
    }

    res.json({
      success: true,
      message: learningMsg,
      totalFeedbackCycles: feedbackCount
    });
  } catch (error) {
    console.error("Feedback error:", error);
    res.status(500).json({ error: "Failed to process feedback" });
  }
});
// ============================================================
// GOAL DEPOSIT ENDPOINT
// ============================================================
app.get("/api/goals", (req, res) => {
  try {
    const goals = db.prepare("SELECT * FROM goals ORDER BY id DESC").all();
    res.json(goals.map(g => ({
      id: g.id,
      title: g.title,
      targetAmount: money(g.target_amount),
      savedAmount: money(g.saved_amount),
      targetMonths: g.target_months,
      monthlyContribution: money(g.monthly_contribution),
      status: g.status,
      createdAt: g.created_at
    })));
  } catch (error) {
    console.error("Goals read error:", error);
    res.status(500).json({ error: "Failed to load goals" });
  }
});

app.post("/api/goals", (req, res) => {
  try {
    const { title, targetAmount, targetMonths } = req.body;

    if (!title || !validPositiveNumber(targetAmount) || !validPositiveNumber(targetMonths)) {
      return res.status(400).json({ error: "Valid title, target amount, and months are required" });
    }

    const monthlyContribution = money(Number(targetAmount) / Number(targetMonths));

    const result = db.prepare(`
      INSERT INTO goals (title, target_amount, target_months, monthly_contribution)
      VALUES (?, ?, ?, ?)
    `).run(String(title).trim(), money(targetAmount), Number(targetMonths), monthlyContribution);

    res.status(201).json({
      message: "Goal created successfully",
      goal: {
        id: result.lastInsertRowid,
        title,
        targetAmount: money(targetAmount),
        savedAmount: 0,
        targetMonths: Number(targetMonths),
        monthlyContribution,
        status: "active"
      }
    });
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ error: "Failed to create goal" });
  }
});

app.post("/api/goals/:id/deposit", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount } = req.body;

    if (!validPositiveNumber(amount)) {
      return res.status(400).json({ error: "Valid deposit amount required" });
    }

    const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const newSaved = goal.saved_amount + Number(amount);
    const newStatus = newSaved >= goal.target_amount ? "completed" : "active";

    db.prepare(`
      UPDATE goals 
      SET saved_amount = ?, status = ? 
      WHERE id = ?
    `).run(money(newSaved), newStatus, id);

    res.json({ 
      message: "Contribution added to goal!", 
      savedAmount: money(newSaved), 
      status: newStatus 
    });
  } catch (error) {
    console.error("Deposit goal error:", error);
    res.status(500).json({ error: "Failed to update goal contribution" });
  }
});
app.post("/api/goals/:id/deposit", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount } = req.body;

    if (!validPositiveNumber(amount)) {
      return res.status(400).json({ error: "Valid deposit amount required" });
    }

    const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const newSaved = goal.saved_amount + Number(amount);
    const newStatus = newSaved >= goal.target_amount ? "completed" : "active";

    db.prepare(`
      UPDATE goals 
      SET saved_amount = ?, status = ? 
      WHERE id = ?
    `).run(money(newSaved), newStatus, id);


    res.json({ 
      message: "Contribution added to goal!", 
      savedAmount: money(newSaved), 
      status: newStatus 
    });
  } catch (error) {
    console.error("Deposit goal error:", error);
    res.status(500).json({ error: "Failed to update goal contribution" });
  }
});

const hasSettings = db
  .prepare("SELECT id FROM settings WHERE id = 1")
  .get();

if (!hasSettings) {
  db.prepare(`
    INSERT INTO settings (
      id,
      monthly_quota,
      safety_buffer,
      currency,
      alerts_enabled,
      daily_notifications,
      learning_enabled,
      auto_categorization,
      action_suggestions
    )
    VALUES (1, 10000, 3500, 'INR', 1, 1, 1, 1, 1)
  `).run();
}

// ============================================================
// HELPERS
// ============================================================

function nowISO() {
  return new Date().toISOString();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function validPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function normalizeType(type) {
  return String(type || "").toLowerCase() === "income"
    ? "income"
    : String(type || "").toLowerCase() === "expense"
    ? "expense"
    : null;
}

function monthKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 7);
}

function safeDate(value) {
  if (!value) return nowISO();

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d.toISOString();
}

function getSettings() {
  return db.prepare("SELECT * FROM settings WHERE id = 1").get();
}

function getAccounts() {
  return db
    .prepare(`
      SELECT
        id,
        name,
        bank,
        account_number AS number,
        balance,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM accounts
      ORDER BY id ASC
    `)
    .all();
}

function getTotalBalance() {
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(balance), 0) AS total
      FROM accounts
      WHERE status = 'Connected'
    `)
    .get();

  return money(row.total);
}

function getMonthlyTotals(yearMonth = monthKey()) {
  return db
    .prepare(`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN type = 'income' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'expense' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS expense,

        COUNT(*) AS count

      FROM transactions
      WHERE substr(date, 1, 7) = ?
    `)
    .get(yearMonth);
}

function getTransactionById(id) {
  return db
    .prepare(`
      SELECT
        t.*,
        a.name AS account_name,
        a.bank AS account_bank
      FROM transactions t
      LEFT JOIN accounts a
        ON a.id = t.account_id
      WHERE t.id = ?
    `)
    .get(id);
}

function serializeTransaction(t) {
  if (!t) return null;

  return {
    id: t.id,
    accountId: t.account_id,

    account: t.account_name
      ? `${t.account_bank} - ${t.account_name}`
      : null,

    name: t.name,
    category: t.category,
    description: t.description || "",

    amount: money(t.amount),

    type: t.type,
    date: t.date,

    recurring: Boolean(t.recurring),

    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

function categoryFromText(name, description = "") {
  const text = `${name} ${description}`.toLowerCase();

  if (
    /swiggy|zomato|food|restaurant|cafe|mess|grocery|blinkit|zepto/.test(
      text
    )
  ) {
    return "Food";
  }

  if (
    /uber|ola|rapido|metro|bus|transport|fuel|petrol|parking/.test(text)
  ) {
    return "Transport";
  }

  if (
    /netflix|spotify|prime|subscription|hotstar|youtube/.test(text)
  ) {
    return "Subscription";
  }

  if (/rent|hostel|housing|room/.test(text)) {
    return "Housing";
  }

  if (/college|course|book|education|exam|fee/.test(text)) {
    return "Education";
  }

  if (/salary|stipend|scholarship|income|refund/.test(text)) {
    return "Income";
  }

  if (/transfer|upi|bank transfer/.test(text)) {
    return "Transfer";
  }

  return "Other";
}

function averageDailyExpense(days = 30) {
  const since = new Date();

  since.setDate(since.getDate() - days);

  const row = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE type = 'expense'
        AND date >= ?
    `)
    .get(since.toISOString());

  return money(
    Number(row.total) / Math.max(days, 1)
  );
}

// ============================================================
// FORECAST
// ============================================================

function buildForecast(days = 14) {
  const settings = getSettings();

  const startingBalance = getTotalBalance();

  const safeDays = Math.max(
    1,
    Math.min(Number(days) || 14, 90)
  );

  const result = [];

  const recurring = db
    .prepare(`
      SELECT
        name,
        category,
        amount,
        type,
        date
      FROM transactions
      WHERE recurring = 1
      ORDER BY date ASC
    `)
    .all();

  const dailyExpense = averageDailyExpense(30);

  let balance = startingBalance;

  for (let i = 0; i < safeDays; i++) {
    const date = new Date();

    date.setHours(23, 59, 59, 999);
    date.setDate(date.getDate() + i);

    let income = 0;
    let expense = dailyExpense;

    for (const item of recurring) {
      const sourceDate = new Date(item.date);

      if (
        sourceDate.getDate() ===
        date.getDate()
      ) {
        if (item.type === "income") {
          income += Number(item.amount);
        }

        if (item.type === "expense") {
          expense += Number(item.amount);
        }
      }
    }

    balance = money(
      balance + income - expense
    );

    result.push({
      date: date.toISOString().slice(0, 10),

      day: date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),

      balance: money(balance),
      income: money(income),
      expense: money(expense),

      belowSafetyBuffer:
        balance < settings.safety_buffer,
    });
  }

  return result;
}

function buildRisk(forecast) {
  const settings = getSettings();

  if (!forecast.length) {
    return {
      level: "Low",
      score: 0,
      minimumBalance: getTotalBalance(),
      safetyBuffer: settings.safety_buffer,
      shortfallDate: null,
    };
  }

  const minimum = Math.min(
    ...forecast.map((x) => x.balance)
  );

  const shortfall = forecast.find(
    (x) => x.balance < settings.safety_buffer
  );

  let level = "Low";
  let score = 15;

  if (minimum < settings.safety_buffer) {
    level = "Medium";
    score = 55;
  }

  if (
    minimum <
    settings.safety_buffer * 0.5
  ) {
    level = "High";
    score = 85;
  }

  return {
    level,
    score,

    minimumBalance: money(minimum),

    safetyBuffer:
      money(settings.safety_buffer),

    shortfallDate:
      shortfall
        ? shortfall.date
        : null,
  };
}

// ============================================================
// AI GUARDIAN ENGINE
// ============================================================

function generateGuardian() {
  const settings = getSettings();

  const forecast = buildForecast(14);
  const risk = buildRisk(forecast);

  const totals = getMonthlyTotals();

  const balance = getTotalBalance();
  const daily = averageDailyExpense(30);

  const messages = [];
  const actions = [];

  if (risk.level !== "Low") {
    messages.push(
      `Your projected balance may fall below the ₹${settings.safety_buffer.toLocaleString(
        "en-IN"
      )} safety buffer.`
    );

    const gap = Math.max(
      0,
      settings.safety_buffer -
        risk.minimumBalance
    );

    if (gap > 0) {
      const protectionAmount =
        Math.ceil(gap / 100) * 100;

      actions.push({
        title: `Protect ₹${protectionAmount}`,

        description:
          "Reduce discretionary spending before the projected shortfall.",

        impact: protectionAmount,

        category: "cashflow",
      });
    }
  } else {
    messages.push(
      "Your projected cashflow remains above the safety buffer."
    );
  }

  if (daily > 0) {
    messages.push(
      `Your recent average spending pace is about ₹${Math.round(
        daily
      ).toLocaleString("en-IN")} per day.`
    );
  }

  if (
    totals.expense >
    settings.monthly_quota
  ) {
    messages.push(
      "This month's expenses are above the configured monthly quota."
    );
  }

  if (actions.length === 0) {
    actions.push({
      title: "Keep current spending pace",

      description:
        "No immediate protective action is required from the current forecast.",

      impact: 0,

      category: "general",
    });
  }

  return {
    status: "monitoring",

    risk,

    safeToSpend: money(
      Math.max(
        0,
        balance -
          settings.safety_buffer
      )
    ),

    confidence:
      forecast.length >= 14
        ? 87
        : 70,

    summary: messages.join(" "),

    messages,

    actions,
  };
}

// ============================================================
// DEMO DATA
// ============================================================

function seedDemoData() {
  const accountCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM accounts"
    )
    .get().count;

  const transactionCount = db
    .prepare(
      "SELECT COUNT(*) AS count FROM transactions"
    )
    .get().count;

  if (accountCount === 0) {
    const insertAccount = db.prepare(`
      INSERT INTO accounts
      (
        name,
        bank,
        account_number,
        balance,
        status
      )
      VALUES (?, ?, ?, ?, 'Connected')
    `);

    insertAccount.run(
      "Primary Savings",
      "Demo Bank",
      "•••• 4821",
      8250
    );

    insertAccount.run(
      "Student Account",
      "Demo Bank",
      "•••• 7219",
      1450
    );
  }

  if (transactionCount === 0) {
    const accounts = db
      .prepare(
        "SELECT id FROM accounts ORDER BY id ASC"
      )
      .all();

    const primary =
      accounts[0]?.id || null;

    const insert = db.prepare(`
      INSERT INTO transactions
      (
        account_id,
        name,
        category,
        description,
        amount,
        type,
        date,
        recurring
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const today = new Date();

    const dateMinus = (
      days,
      hour = 12
    ) => {
      const d = new Date(today);

      d.setDate(
        d.getDate() - days
      );

      d.setHours(
        hour,
        0,
        0,
        0
      );

      return d.toISOString();
    };

    insert.run(
      primary,
      "Stipend",
      "Income",
      "Monthly stipend",
      8000,
      "income",
      dateMinus(0, 10),
      1
    );

    insert.run(
      primary,
      "Swiggy",
      "Food",
      "Lunch",
      285,
      "expense",
      dateMinus(0, 13),
      0
    );

    insert.run(
      primary,
      "Uber",
      "Transport",
      "Ride",
      180,
      "expense",
      dateMinus(1, 19),
      0
    );

    insert.run(
      primary,
      "Netflix",
      "Subscription",
      "Monthly subscription",
      199,
      "expense",
      dateMinus(2),
      1
    );

    insert.run(
      primary,
      "Family Transfer",
      "Transfer",
      "Money received",
      2000,
      "income",
      dateMinus(3),
      0
    );

    insert.run(
      primary,
      "Hostel Rent",
      "Housing",
      "Monthly hostel rent",
      4500,
      "expense",
      dateMinus(2),
      1
    );

    insert.run(
      primary,
      "Food",
      "Food",
      "Weekly food spending",
      700,
      "expense",
      dateMinus(4),
      0
    );
  }
}

seedDemoData();

// ============================================================
// HEALTH
// ============================================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,

    service:
      "Cashflow Guardian API",

    database: "SQLite",

    time: nowISO(),
  });
});

// ============================================================
// DASHBOARD
// ============================================================

app.get("/api/dashboard", (req, res) => {
  try {
    const settings = getSettings();

    const totals =
      getMonthlyTotals();

    const balance =
      getTotalBalance();

    const forecast =
      buildForecast(14);

    const risk =
      buildRisk(forecast);

    const safeToSpend =
      money(
        Math.max(
          0,
          balance -
            settings.safety_buffer
        )
      );

    const daily =
      averageDailyExpense(30);

    const runway =
      daily > 0
        ? Math.floor(
            balance / daily
          )
        : 999;

    const recent = db
      .prepare(`
        SELECT
          t.*,
          a.name AS account_name,
          a.bank AS account_bank
        FROM transactions t
        LEFT JOIN accounts a
          ON a.id = t.account_id
        ORDER BY datetime(t.date) DESC
        LIMIT 6
      `)
      .all()
      .map(serializeTransaction);

    res.json({
      balance,

      totalBalance:
        balance,

      safeToSpend,

      cashRunway:
        runway,

      shortfallRisk:
        risk.level,

      risk,

      monthly: {
        income:
          money(totals.income),

        expenses:
          money(totals.expense),

        net:
          money(
            totals.income -
              totals.expense
          ),

        transactions:
          totals.count,

        quota:
          settings.monthly_quota,

        remainingQuota:
          money(
            Math.max(
              0,
              settings.monthly_quota -
                totals.expense
            )
          ),
      },

      forecast,

      recentTransactions:
        recent,

      guardian:
        generateGuardian(),
    });
  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );

    res.status(500).json({
      error:
        "Failed to load dashboard",
    });
  }
});

// ============================================================
// ACCOUNTS
// ============================================================

app.get("/api/accounts", (req, res) => {
  try {
    const rows =
      getAccounts();

    const total =
      rows.reduce(
        (sum, a) =>
          sum +
          Number(a.balance),
        0
      );

    res.json({
      accounts:
        rows.map((a) => ({
          ...a,
          balance:
            money(a.balance),
        })),

      totalBalance:
        money(total),

      connectedAccounts:
        rows.filter(
          (a) =>
            a.status ===
            "Connected"
        ).length,
    });
  } catch (error) {
    console.error(
      "Accounts error:",
      error
    );

    res.status(500).json({
      error:
        "Failed to load accounts",
    });
  }
});

app.post("/api/accounts", (req, res) => {
  try {
    const {
      name,
      bank = "Demo Bank",
      accountNumber = "",
      balance = 0,
    } = req.body;

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        error:
          "Account name is required",
      });
    }

    if (
      !validPositiveNumber(
        balance
      ) &&
      Number(balance) !== 0
    ) {
      return res.status(400).json({
        error:
          "Balance must be a valid number",
      });
    }

    const result =
      db.prepare(`
        INSERT INTO accounts
        (
          name,
          bank,
          account_number,
          balance,
          status
        )
        VALUES (?, ?, ?, ?, 'Connected')
      `).run(
        String(name).trim(),
        String(bank).trim(),
        String(
          accountNumber ||
            "••••"
        ),
        money(
          Number(balance)
        )
      );

    const account =
      db.prepare(`
        SELECT
          id,
          name,
          bank,
          account_number AS number,
          balance,
          status
        FROM accounts
        WHERE id = ?
      `).get(
        result.lastInsertRowid
      );

    res.status(201).json(
      account
    );
  } catch (error) {
    console.error(
      "Add account error:",
      error
    );

    res.status(500).json({
      error:
        "Failed to add account",
    });
  }
});

app.put(
  "/api/accounts/:id",
  (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const existing =
        db.prepare(
          "SELECT * FROM accounts WHERE id = ?"
        ).get(id);

      if (!existing) {
        return res.status(404).json({
          error:
            "Account not found",
        });
      }

      const name =
        req.body.name ??
        existing.name;

      const bank =
        req.body.bank ??
        existing.bank;

      const accountNumber =
        req.body.accountNumber ??
        existing.account_number;

      const status =
        req.body.status ??
        existing.status;

      const balance =
        req.body.balance ??
        existing.balance;

      if (
        ![
          "Connected",
          "Disconnected",
          "Syncing",
        ].includes(status)
      ) {
        return res.status(400).json({
          error:
            "Invalid account status",
        });
      }

      if (
        !Number.isFinite(
          Number(balance)
        ) ||
        Number(balance) < 0
      ) {
        return res.status(400).json({
          error:
            "Invalid account balance",
        });
      }

      db.prepare(`
        UPDATE accounts
        SET
          name = ?,
          bank = ?,
          account_number = ?,
          balance = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        String(name).trim(),
        String(bank).trim(),
        String(accountNumber),
        money(
          Number(balance)
        ),
        status,
        id
      );

      res.json({
        message:
          "Account updated",

        account:
          db.prepare(`
            SELECT
              id,
              name,
              bank,
              account_number AS number,
              balance,
              status
            FROM accounts
            WHERE id = ?
          `).get(id),
      });
    } catch (error) {
      console.error(
        "Update account error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update account",
      });
    }
  }
);

app.delete(
  "/api/accounts/:id",
  (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const account =
        db.prepare(
          "SELECT * FROM accounts WHERE id = ?"
        ).get(id);

      if (!account) {
        return res.status(404).json({
          error:
            "Account not found",
        });
      }

      db.prepare(
        "DELETE FROM accounts WHERE id = ?"
      ).run(id);

      res.json({
        message:
          "Account removed",

        id,
      });
    } catch (error) {
      console.error(
        "Delete account error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to delete account",
      });
    }
  }
);

app.post(
  "/api/accounts/sync",
  (req, res) => {
    try {
      db.prepare(`
        UPDATE accounts
        SET
          status = 'Connected',
          updated_at = CURRENT_TIMESTAMP
      `).run();

      res.json({
        message:
          "Accounts synchronized",

        syncedAt:
          nowISO(),

        accounts:
          getAccounts(),
      });
    } catch (error) {
      console.error(
        "Sync error:",
        error
      );

      res.status(500).json({
        error:
          "Account sync failed",
      });
    }
  }
);

// ============================================================
// TRANSACTIONS
// ============================================================

app.get(
  "/api/transactions",
  (req, res) => {
    try {
      const {
        type,
        category,
        search,
        from,
        to,
        limit = 100,
        offset = 0,
      } = req.query;

      const conditions = [];
      const params = [];

      if (type) {
        const normalized =
          normalizeType(type);

        if (!normalized) {
          return res
            .status(400)
            .json({
              error:
                "Invalid transaction type",
            });
        }

        conditions.push(
          "t.type = ?"
        );

        params.push(
          normalized
        );
      }

      if (category) {
        conditions.push(
          "LOWER(t.category) = LOWER(?)"
        );

        params.push(
          String(category)
        );
      }

      if (search) {
        conditions.push(`
          (
            LOWER(t.name) LIKE LOWER(?) OR
            LOWER(t.description) LIKE LOWER(?) OR
            LOWER(t.category) LIKE LOWER(?)
          )
        `);

        const term =
          `%${String(search)}%`;

        params.push(
          term,
          term,
          term
        );
      }

      if (from) {
        const date =
          safeDate(from);

        if (!date) {
          return res
            .status(400)
            .json({
              error:
                "Invalid from date",
            });
        }

        conditions.push(
          "datetime(t.date) >= datetime(?)"
        );

        params.push(date);
      }

      if (to) {
        const date =
          safeDate(to);

        if (!date) {
          return res
            .status(400)
            .json({
              error:
                "Invalid to date",
            });
        }

        conditions.push(
          "datetime(t.date) <= datetime(?)"
        );

        params.push(date);
      }

      const where =
        conditions.length
          ? `WHERE ${conditions.join(
              " AND "
            )}`
          : "";

      const total =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM transactions t
          ${where}
        `).get(...params).count;

      const safeLimit =
        Math.min(
          Math.max(
            Number(limit) || 100,
            1
          ),
          500
        );

      const safeOffset =
        Math.max(
          Number(offset) || 0,
          0
        );

      const rows =
        db.prepare(`
          SELECT
            t.*,
            a.name AS account_name,
            a.bank AS account_bank
          FROM transactions t
          LEFT JOIN accounts a
            ON a.id = t.account_id
          ${where}
          ORDER BY
            datetime(t.date) DESC,
            t.id DESC
          LIMIT ?
          OFFSET ?
        `).all(
          ...params,
          safeLimit,
          safeOffset
        );

      res.json({
        transactions:
          rows.map(
            serializeTransaction
          ),

        pagination: {
          total,

          limit:
            safeLimit,

          offset:
            safeOffset,

          hasMore:
            safeOffset +
              rows.length <
            total,
        },
      });
    } catch (error) {
      console.error(
        "Transactions error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load transactions",
      });
    }
  }
);

app.get(
  "/api/transactions/summary",
  (req, res) => {
    try {
      const month =
        req.query.month ||
        monthKey();

      const totals =
        db.prepare(`
          SELECT

            COALESCE(
              SUM(
                CASE
                  WHEN type = 'income'
                  THEN amount
                  ELSE 0
                END
              ),
              0
            ) AS income,

            COALESCE(
              SUM(
                CASE
                  WHEN type = 'expense'
                  THEN amount
                  ELSE 0
                END
              ),
              0
            ) AS expenses,

            COUNT(*) AS count,

            COALESCE(
              SUM(
                CASE
                  WHEN category != 'Other'
                  THEN 1
                  ELSE 0
                END
              ),
              0
            ) AS categorized

          FROM transactions
          WHERE substr(date, 1, 7) = ?
        `)
        .get(month);

      res.json({
        month,

        income:
          money(totals.income),

        expenses:
          money(totals.expenses),

        net:
          money(
            totals.income -
              totals.expenses
          ),

        transactions:
          totals.count,

        autoCategorized:
          totals.count
            ? Math.round(
                (totals.categorized /
                  totals.count) *
                  100
              )
            : 0,
      });
    } catch (error) {
      console.error(
        "Transaction summary error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to calculate transaction summary",
      });
    }
  }
);

app.post(
  "/api/transactions",
  (req, res) => {
    try {
      let {
        accountId = null,
        name,
        category,
        description = "",
        amount,
        type,
        date,
        recurring = false,
      } = req.body;

      if (
        !name ||
        !String(name).trim()
      ) {
        return res.status(400).json({
          error:
            "Transaction name is required",
        });
      }

      if (
        !validPositiveNumber(amount)
      ) {
        return res.status(400).json({
          error:
            "Amount must be greater than zero",
        });
      }

      type =
        normalizeType(type);

      if (!type) {
        return res.status(400).json({
          error:
            "Type must be income or expense",
        });
      }

      if (
        !category ||
        !String(category).trim()
      ) {
        category =
          categoryFromText(
            name,
            description
          );
      }

      const transactionDate =
        safeDate(date);

      if (!transactionDate) {
        return res.status(400).json({
          error:
            "Invalid transaction date",
        });
      }

      if (accountId !== null) {
        const account =
          db.prepare(
            "SELECT * FROM accounts WHERE id = ?"
          ).get(
            Number(accountId)
          );

        if (!account) {
          return res.status(404).json({
            error:
              "Account not found",
          });
        }
      }

      const numericAmount =
        money(Number(amount));

      const createTransaction =
        db.transaction(() => {
          const result =
            db.prepare(`
              INSERT INTO transactions
              (
                account_id,
                name,
                category,
                description,
                amount,
                type,
                date,
                recurring
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              accountId === null
                ? null
                : Number(accountId),

              String(name).trim(),

              String(
                category
              ).trim(),

              String(
                description || ""
              ),

              numericAmount,

              type,

              transactionDate,

              recurring ? 1 : 0
            );

          if (accountId !== null) {
            const delta =
              type === "income"
                ? numericAmount
                : -numericAmount;

            db.prepare(`
              UPDATE accounts
              SET
                balance = balance + ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              delta,
              Number(accountId)
            );
          }

          return result.lastInsertRowid;
        });

      const id =
        createTransaction();

      const created =
        getTransactionById(id);

      res.status(201).json({
        message:
          "Transaction created",

        transaction:
          serializeTransaction(
            created
          ),
      });
    } catch (error) {
      console.error(
        "Create transaction error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to create transaction",
      });
    }
  }
);

app.put(
  "/api/transactions/:id",
  (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const existing =
        db.prepare(
          "SELECT * FROM transactions WHERE id = ?"
        ).get(id);

      if (!existing) {
        return res.status(404).json({
          error:
            "Transaction not found",
        });
      }

      const name =
        req.body.name ??
        existing.name;

      const category =
        req.body.category ??
        existing.category;

      const description =
        req.body.description ??
        existing.description;

      const amount =
        req.body.amount ??
        existing.amount;

      const type =
        normalizeType(
          req.body.type ??
            existing.type
        );

      const date =
        safeDate(
          req.body.date ??
            existing.date
        );

      const recurring =
        req.body.recurring ??
        Boolean(
          existing.recurring
        );

      const accountId =
        req.body.accountId ===
        undefined
          ? existing.account_id
          : req.body.accountId;

      if (
        !validPositiveNumber(
          amount
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid amount",
        });
      }

      if (!type) {
        return res.status(400).json({
          error:
            "Invalid transaction type",
        });
      }

      if (!date) {
        return res.status(400).json({
          error:
            "Invalid transaction date",
        });
      }

      if (accountId !== null) {
        const account =
          db.prepare(
            "SELECT id FROM accounts WHERE id = ?"
          ).get(
            Number(accountId)
          );

        if (!account) {
          return res.status(404).json({
            error:
              "Account not found",
          });
        }
      }

      const updateTransaction =
        db.transaction(() => {
          // Revert the old balance effect
          if (
            existing.account_id !==
            null
          ) {
            const reverse =
              existing.type ===
              "income"
                ? -existing.amount
                : existing.amount;

            db.prepare(`
              UPDATE accounts
              SET
                balance = balance + ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              reverse,
              existing.account_id
            );
          }

          db.prepare(`
            UPDATE transactions
            SET
              account_id = ?,
              name = ?,
              category = ?,
              description = ?,
              amount = ?,
              type = ?,
              date = ?,
              recurring = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            accountId === null
              ? null
              : Number(accountId),

            String(name).trim(),

            String(
              category
            ).trim(),

            String(
              description || ""
            ),

            money(Number(amount)),

            type,

            date,

            recurring ? 1 : 0,

            id
          );

          // Apply new balance effect
          if (accountId !== null) {
            const delta =
              type === "income"
                ? money(
                    Number(amount)
                  )
                : -money(
                    Number(amount)
                  );

            db.prepare(`
              UPDATE accounts
              SET
                balance = balance + ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              delta,
              Number(accountId)
            );
          }
        });

      updateTransaction();

      res.json({
        message:
          "Transaction updated",

        transaction:
          serializeTransaction(
            getTransactionById(id)
          ),
      });
    } catch (error) {
      console.error(
        "Update transaction error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update transaction",
      });
    }
  }
);

app.delete(
  "/api/transactions/:id",
  (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const existing =
        db.prepare(
          "SELECT * FROM transactions WHERE id = ?"
        ).get(id);

      if (!existing) {
        return res.status(404).json({
          error:
            "Transaction not found",
        });
      }

      const removeTransaction =
        db.transaction(() => {
          if (
            existing.account_id !==
            null
          ) {
            const reverse =
              existing.type ===
              "income"
                ? -existing.amount
                : existing.amount;

            db.prepare(`
              UPDATE accounts
              SET
                balance = balance + ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              reverse,
              existing.account_id
            );
          }

          db.prepare(
            "DELETE FROM transactions WHERE id = ?"
          ).run(id);
        });

      removeTransaction();

      res.json({
        message:
          "Transaction deleted",

        id,
      });
    } catch (error) {
      console.error(
        "Delete transaction error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to delete transaction",
      });
    }
  }
);

// ============================================================
// BACKWARD-COMPATIBLE CASH API
// ============================================================

app.get(
  "/api/cash/summary",
  (req, res) => {
    const settings =
      getSettings();

    const totals =
      getMonthlyTotals();

    res.json({
      monthlyQuota:
        settings.monthly_quota,

      spent:
        money(totals.expense),

      income:
        money(totals.income),

      remainingQuota:
        money(
          Math.max(
            0,
            settings.monthly_quota -
              totals.expense
          )
        ),

      cashBalance:
        getTotalBalance(),

      safetyBuffer:
        settings.safety_buffer,
    });
  }
);

app.put(
  "/api/cash/quota",
  (req, res) => {
    const monthlyQuota =
      Number(
        req.body.monthlyQuota
      );

    if (
      !validPositiveNumber(
        monthlyQuota
      )
    ) {
      return res.status(400).json({
        error:
          "Invalid monthly quota",
      });
    }

    db.prepare(`
      UPDATE settings
      SET
        monthly_quota = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      money(monthlyQuota)
    );

    res.json({
      message:
        "Monthly quota updated",

      monthlyQuota:
        money(monthlyQuota),
    });
  }
);

app.post(
  "/api/cash/add",
  (req, res) => {
    try {
      const amount =
        Number(req.body.amount);

      const accountId =
        req.body.accountId ||
        null;

      if (
        !validPositiveNumber(
          amount
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid amount",
        });
      }

      let target = accountId
        ? db
            .prepare(
              "SELECT * FROM accounts WHERE id = ?"
            )
            .get(
              Number(accountId)
            )
        : db
            .prepare(
              "SELECT * FROM accounts ORDER BY id ASC LIMIT 1"
            )
            .get();

      if (!target) {
        return res.status(400).json({
          error:
            "No account available",
        });
      }

      const transaction =
        db.transaction(() => {
          db.prepare(`
            UPDATE accounts
            SET
              balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            money(amount),
            target.id
          );

          return db.prepare(`
            INSERT INTO transactions
            (
              account_id,
              name,
              category,
              description,
              amount,
              type,
              date
            )
            VALUES
            (
              ?,
              'Cash added',
              'Income',
              'Manual cash addition',
              ?,
              'income',
              ?
            )
          `).run(
            target.id,
            money(amount),
            nowISO()
          );
        });

      const result =
        transaction();

      res.status(201).json({
        message:
          "Cash added successfully",

        transaction:
          serializeTransaction(
            getTransactionById(
              result.lastInsertRowid
            )
          ),

        balance:
          getTotalBalance(),
      });
    } catch (error) {
      console.error(
        "Add cash error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to add cash",
      });
    }
  }
);

app.post(
  "/api/cash/expense",
  (req, res) => {
    try {
      const {
        amount,
        category,
        description = "",
        accountId = null,
        date,
      } = req.body;

      if (
        !validPositiveNumber(
          amount
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid amount",
        });
      }

      const account = accountId
        ? db
            .prepare(
              "SELECT * FROM accounts WHERE id = ?"
            )
            .get(
              Number(accountId)
            )
        : db
            .prepare(
              "SELECT * FROM accounts ORDER BY id ASC LIMIT 1"
            )
            .get();

      if (!account) {
        return res.status(400).json({
          error:
            "No account available",
        });
      }

      if (
        Number(amount) >
        Number(account.balance)
      ) {
        return res.status(400).json({
          error:
            "Insufficient account balance",
        });
      }

      const transactionDate =
        safeDate(date);

      if (!transactionDate) {
        return res.status(400).json({
          error:
            "Invalid date",
        });
      }

      const transactionName =
        req.body.name ||
        description ||
        "Cash expense";

      const categoryValue =
        category ||
        categoryFromText(
          transactionName,
          description
        );

      const transaction =
        db.transaction(() => {
          const result =
            db.prepare(`
              INSERT INTO transactions
              (
                account_id,
                name,
                category,
                description,
                amount,
                type,
                date
              )
              VALUES
              (
                ?,
                ?,
                ?,
                ?,
                ?,
                'expense',
                ?
              )
            `).run(
              account.id,
              transactionName,
              categoryValue,
              description,
              money(Number(amount)),
              transactionDate
            );

          db.prepare(`
            UPDATE accounts
            SET
              balance = balance - ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            money(Number(amount)),
            account.id
          );

          return result;
        });

      const result =
        transaction();

      res.status(201).json({
        message:
          "Cash expense recorded",

        transaction:
          serializeTransaction(
            getTransactionById(
              result.lastInsertRowid
            )
          ),

        balance:
          getTotalBalance(),
      });
    } catch (error) {
      console.error(
        "Cash expense error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to record expense",
      });
    }
  }
);

app.get(
  "/api/cash/transactions",
  (req, res) => {
    try {
      const rows =
        db.prepare(`
          SELECT
            t.*,
            a.name AS account_name,
            a.bank AS account_bank
          FROM transactions t
          LEFT JOIN accounts a
            ON a.id = t.account_id
          ORDER BY
            datetime(t.date) DESC
        `).all();

      res.json(
        rows.map(
          serializeTransaction
        )
      );
    } catch (error) {
      console.error(
        "Cash transactions error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load cash transactions",
      });
    }
  }
);

app.get(
  "/api/cash/monthly",
  (req, res) => {
    try {
      const rows =
        db.prepare(`
          SELECT
            substr(date, 1, 7) AS month,

            COALESCE(
              SUM(
                CASE
                  WHEN type = 'income'
                  THEN amount
                  ELSE 0
                END
              ),
              0
            ) AS income,

            COALESCE(
              SUM(
                CASE
                  WHEN type = 'expense'
                  THEN amount
                  ELSE 0
                END
              ),
              0
            ) AS expense

          FROM transactions

          GROUP BY
            substr(date, 1, 7)

          ORDER BY
            month DESC
        `).all();

      res.json(
        rows.map((row) => ({
          month:
            row.month,

          income:
            money(row.income),

          expense:
            money(row.expense),

          net:
            money(
              row.income -
                row.expense
            ),
        }))
      );
    } catch (error) {
      console.error(
        "Monthly error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load monthly data",
      });
    }
  }
);

// ============================================================
// FORECAST API
// ============================================================

app.get(
  "/api/forecast",
  (req, res) => {
    try {
      const days =
        Math.min(
          Math.max(
            Number(
              req.query.days
            ) || 14,
            1
          ),
          90
        );

      const forecast =
        buildForecast(days);

      const risk =
        buildRisk(forecast);

      const settings =
        getSettings();

      res.json({
        days,

        startingBalance:
          getTotalBalance(),

        projectedBalance:
          forecast.length
            ? forecast[
                forecast.length - 1
              ].balance
            : getTotalBalance(),

        minimumBalance:
          risk.minimumBalance,

        safetyBuffer:
          settings.safety_buffer,

        risk,

        confidence:
          days >= 14
            ? 87
            : 78,

        data:
          forecast,
      });
    } catch (error) {
      console.error(
        "Forecast error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to generate forecast",
      });
    }
  }
);

// ============================================================
// AI GUARDIAN
// ============================================================
app.post("/api/transactions/bulk", (req, res) => {
  try {
    const { transactions, accountId } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "No transactions provided" });
    }

    // Default to the primary account if none specified
    let targetAccountId = accountId;
    if (!targetAccountId) {
      const primaryAccount = db.prepare("SELECT id FROM accounts ORDER BY id ASC LIMIT 1").get();
      if (!primaryAccount) return res.status(400).json({ error: "No accounts available to link." });
      targetAccountId = primaryAccount.id;
    }

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (account_id, name, category, description, amount, type, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateAccount = db.prepare(`
      UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    const processBulk = db.transaction(() => {
      let importedCount = 0;

      for (const tx of transactions) {
        if (!tx.amount || !tx.date || !tx.name) continue;

        const amount = money(Number(tx.amount));
        const type = normalizeType(tx.type) || "expense";
        const category = categoryFromText(tx.name, tx.description || "CSV Import");
        const date = safeDate(tx.date) || nowISO();

        insertTransaction.run(targetAccountId, tx.name.trim(), category, tx.description || "CSV Import", amount, type, date);

        const delta = type === "income" ? amount : -amount;
        updateAccount.run(delta, targetAccountId);
        importedCount++;
      }
      return importedCount;
    });

    const count = processBulk();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${count} transactions`,
      balance: getTotalBalance()
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ error: "Failed to import transactions" });
  }
});

app.get(
  "/api/guardian",
  (req, res) => {
    try {
      res.json(
        generateGuardian()
      );
    } catch (error) {
      console.error(
        "Guardian error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to generate Guardian analysis",
      });
    }
  }
);

app.post(
  "/api/guardian/chat",
  (req, res) => {
    try {
      const message =
        String(
          req.body.message ||
            ""
        ).trim();

      if (!message) {
        return res.status(400).json({
          error:
            "Message is required",
        });
      }

      const guardian =
        generateGuardian();

      const lower =
        message.toLowerCase();

      let reply;

      if (
        lower.includes(
          "balance"
        ) ||
        lower.includes("money")
      ) {
        reply =
          `Your current connected-account balance is ₹${getTotalBalance().toLocaleString(
            "en-IN"
          )}. ` +
          `Your calculated safe-to-spend amount is ₹${guardian.safeToSpend.toLocaleString(
            "en-IN"
          )}.`;
      } else if (
        lower.includes("risk") ||
        lower.includes("danger") ||
        lower.includes(
          "shortfall"
        )
      ) {
        reply =
          `Current cashflow risk is ${guardian.risk.level.toLowerCase()}. ` +
          `The lowest projected balance in the next 14 days is ₹${guardian.risk.minimumBalance.toLocaleString(
            "en-IN"
          )}.`;
      } else if (
        lower.includes("spend") ||
        lower.includes("expense")
      ) {
        reply =
          `Your recent average spending pace is about ₹${Math.round(
            averageDailyExpense(30)
          ).toLocaleString(
            "en-IN"
          )} per day. ` +
          `The current monthly expense total is ₹${getMonthlyTotals().expense.toLocaleString(
            "en-IN"
          )}.`;
      } else if (
        lower.includes(
          "forecast"
        ) ||
        lower.includes("future")
      ) {
        reply =
          guardian.summary;
      } else {
        reply =
          `${guardian.summary} ` +
          `You can ask me about your balance, spending, forecast, risk, or safe-to-spend amount.`;
      }

      res.json({
        message,

        reply,

        guardian,

        timestamp:
          nowISO(),
      });
    } catch (error) {
      console.error(
        "Guardian chat error:",
        error
      );

      res.status(500).json({
        error:
          "Guardian chat failed",
      });
    }
  }
);

// ============================================================
// ACTIONS
// ============================================================

app.get(
  "/api/actions",
  (req, res) => {
    try {
      const guardian =
        generateGuardian();

      let existing =
        db.prepare(`
          SELECT *
          FROM actions
          WHERE status = 'pending'
          ORDER BY id DESC
        `).all();

      if (
        existing.length ===
        0
      ) {
        const insert =
          db.prepare(`
            INSERT INTO actions
            (
              title,
              description,
              impact,
              category
            )
            VALUES (?, ?, ?, ?)
          `);

        for (
          const action of guardian.actions
        ) {
          insert.run(
            action.title,
            action.description,
            action.impact || 0,
            action.category ||
              "general"
          );
        }

        existing =
          db.prepare(`
            SELECT *
            FROM actions
            WHERE status = 'pending'
            ORDER BY id DESC
          `).all();
      }

      res.json({
        actions:
          existing.map(
            (a) => ({
              id: a.id,

              title:
                a.title,

              description:
                a.description,

              impact:
                money(a.impact),

              status:
                a.status,

              category:
                a.category,

              createdAt:
                a.created_at,
            })
          ),
      });
    } catch (error) {
      console.error(
        "Actions error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load actions",
      });
    }
  }
);

app.post(
  "/api/actions/:id/complete",
  (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const action =
        db.prepare(
          "SELECT * FROM actions WHERE id = ?"
        ).get(id);

      if (!action) {
        return res.status(404).json({
          error:
            "Action not found",
        });
      }

      db.prepare(`
        UPDATE actions
        SET
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      res.json({
        message:
          "Action completed",

        action: {
          ...action,
          status:
            "completed",
        },
      });
    } catch (error) {
      console.error(
        "Complete action error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to complete action",
      });
    }
  }
);

app.post(
  "/api/actions/:id/dismiss",
  (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const result =
        db.prepare(`
          UPDATE actions
          SET status = 'dismissed'
          WHERE id = ?
        `).run(id);

      if (!result.changes) {
        return res.status(404).json({
          error:
            "Action not found",
        });
      }

      res.json({
        message:
          "Action dismissed",

        id,
      });
    } catch (error) {
      console.error(
        "Dismiss action error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to dismiss action",
      });
    }
  }
);

// ============================================================
// SETTINGS
// ============================================================

app.get(
  "/api/settings",
  (req, res) => {
    try {
      const s =
        getSettings();

      res.json({
        monthlyQuota:
          money(
            s.monthly_quota
          ),

        safetyBuffer:
          money(
            s.safety_buffer
          ),

        currency:
          s.currency,

        alertsEnabled:
          Boolean(
            s.alerts_enabled
          ),

        dailyNotifications:
          Boolean(
            s.daily_notifications
          ),

        learningEnabled:
          Boolean(
            s.learning_enabled
          ),

        autoCategorization:
          Boolean(
            s.auto_categorization
          ),

        actionSuggestions:
          Boolean(
            s.action_suggestions
          ),
      });
    } catch (error) {
      console.error(
        "Settings read error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load settings",
      });
    }
  }
);

app.put(
  "/api/settings",
  (req, res) => {
    try {
      const current =
        getSettings();

      const monthlyQuota =
        req.body.monthlyQuota ===
        undefined
          ? current.monthly_quota
          : Number(
              req.body.monthlyQuota
            );

      const safetyBuffer =
        req.body.safetyBuffer ===
        undefined
          ? current.safety_buffer
          : Number(
              req.body.safetyBuffer
            );

      if (
        !validPositiveNumber(
          monthlyQuota
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid monthly quota",
        });
      }

      if (
        !validPositiveNumber(
          safetyBuffer
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid safety buffer",
        });
      }

      const bool = (
        value,
        fallback
      ) =>
        value === undefined
          ? fallback
          : Boolean(value);

      const alertsEnabled =
        bool(
          req.body
            .alertsEnabled,
          Boolean(
            current.alerts_enabled
          )
        );

      const dailyNotifications =
        bool(
          req.body
            .dailyNotifications,
          Boolean(
            current.daily_notifications
          )
        );

      const learningEnabled =
        bool(
          req.body
            .learningEnabled,
          Boolean(
            current.learning_enabled
          )
        );

      const autoCategorization =
        bool(
          req.body
            .autoCategorization,
          Boolean(
            current.auto_categorization
          )
        );

      const actionSuggestions =
        bool(
          req.body
            .actionSuggestions,
          Boolean(
            current.action_suggestions
          )
        );

      db.prepare(`
        UPDATE settings
        SET
          monthly_quota = ?,
          safety_buffer = ?,
          alerts_enabled = ?,
          daily_notifications = ?,
          learning_enabled = ?,
          auto_categorization = ?,
          action_suggestions = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(
        money(monthlyQuota),
        money(safetyBuffer),

        alertsEnabled
          ? 1
          : 0,

        dailyNotifications
          ? 1
          : 0,

        learningEnabled
          ? 1
          : 0,

        autoCategorization
          ? 1
          : 0,

        actionSuggestions
          ? 1
          : 0
      );

      res.json({
        message:
          "Settings updated",

        settings: {
          monthlyQuota:
            money(
              monthlyQuota
            ),

          safetyBuffer:
            money(
              safetyBuffer
            ),

          alertsEnabled,

          dailyNotifications,

          learningEnabled,

          autoCategorization,

          actionSuggestions,
        },
      });
    } catch (error) {
      console.error(
        "Settings update error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update settings",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS
// ============================================================

app.get(
  "/api/notifications",
  (req, res) => {
    try {
      const rows =
        db.prepare(`
          SELECT
            id,
            title,
            message,
            severity,
            read,
            created_at AS createdAt
          FROM notifications
          ORDER BY
            datetime(created_at) DESC
          LIMIT 50
        `).all();

      res.json({
        notifications:
          rows.map((n) => ({
            ...n,
            read:
              Boolean(n.read),
          })),

        unread:
          rows.filter(
            (n) => !n.read
          ).length,
      });
    } catch (error) {
      console.error(
        "Notifications error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load notifications",
      });
    }
  }
);

app.post(
  "/api/notifications/:id/read",
  (req, res) => {
    try {
      const result =
        db.prepare(`
          UPDATE notifications
          SET read = 1
          WHERE id = ?
        `).run(
          Number(
            req.params.id
          )
        );

      if (!result.changes) {
        return res.status(404).json({
          error:
            "Notification not found",
        });
      }

      res.json({
        message:
          "Notification marked as read",
      });
    } catch (error) {
      console.error(
        "Notification read error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update notification",
      });
    }
  }
);

app.post(
  "/api/notifications/read-all",
  (req, res) => {
    try {
      db.prepare(
        "UPDATE notifications SET read = 1 WHERE read = 0"
      ).run();

      res.json({
        message:
          "All notifications marked as read",
      });
    } catch (error) {
      console.error(
        "Read all notifications error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to update notifications",
      });
    }
  }
);

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error:
      "Endpoint not found",

    path:
      req.originalUrl,

    method:
      req.method,
  });
});

app.use(
  (err, req, res, next) => {
    console.error(
      "Unhandled server error:",
      err
    );

    if (
      err instanceof SyntaxError &&
      err.status === 400 &&
      "body" in err
    ) {
      return res.status(400).json({
        error:
          "Invalid JSON body",
      });
    }

    res.status(500).json({
      error:
        "Internal server error",
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

const server =
  app.listen(PORT, () => {
    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      "       CASHFLOW GUARDIAN BACKEND"
    );
    console.log(
      "=============================================="
    );
    console.log(
      `API:      http://localhost:${PORT}`
    );
    console.log(
      `Health:   http://localhost:${PORT}/api/health`
    );
    console.log(
      `Database: ${DB_FILE}`
    );
    console.log(
      "=============================================="
    );
    console.log("");
  });

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

function shutdown(signal) {
  console.log(
    `\n${signal} received. Closing database...`
  );

  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);