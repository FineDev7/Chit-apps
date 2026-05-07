import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database initialization
  const db = new sqlite3.Database("chit_fund.db", (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to SQLite database.");
  });

  db.serialize(() => {
    // Chits Table
    db.run(`CREATE TABLE IF NOT EXISTS chits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      members_count INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      monthly_contribution REAL NOT NULL,
      total_pot REAL NOT NULL,
      status TEXT DEFAULT 'active',
      start_date TEXT,
      rules TEXT
    )`);

    // Members Table
    db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      chit_id INTEGER,
      pref_channel TEXT DEFAULT 'whatsapp',
      whatsapp_opt_in INTEGER DEFAULT 1,
      FOREIGN KEY(chit_id) REFERENCES chits(id)
    )`);

    // Payments Table
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      month INTEGER,
      year INTEGER,
      amount REAL,
      status TEXT DEFAULT 'unpaid',
      method TEXT,
      payment_date TEXT,
      FOREIGN KEY(member_id) REFERENCES members(id)
    )`);

    // Auctions Table
    db.run(`CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chit_id INTEGER,
      month INTEGER,
      winner_id INTEGER,
      bid_discount REAL,
      payout REAL,
      auction_date TEXT,
      FOREIGN KEY(chit_id) REFERENCES chits(id),
      FOREIGN KEY(winner_id) REFERENCES members(id)
    )`);

    // Notifications Table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      type TEXT,
      channel TEXT,
      status TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(member_id) REFERENCES members(id)
    )`);

    // Seed mock data if empty
    db.get("SELECT COUNT(*) as count FROM chits", (err, row: any) => {
      if (row.count === 0) {
        db.run(`INSERT INTO chits (name, members_count, duration, monthly_contribution, total_pot, start_date) 
                VALUES ('Chit Alpha', 25, 25, 6000, 150000, '2026-01-01')`);
      }
    });
  });

  // API Routes
  app.get("/api/dashboard", (req, res) => {
    // Aggregated stats
    const queries = [
      "SELECT SUM(amount) as total FROM payments",
      "SELECT SUM(bid_discount) as total FROM auctions",
      "SELECT COUNT(*) as count FROM members",
      "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE status = 'unpaid'"
    ];

    db.get(queries[0], (err, row1: any) => {
      db.get(queries[1], (err, row2: any) => {
        db.get(queries[2], (err, row3: any) => {
          db.get(queries[3], (err, row4: any) => {
            res.json({
              totalCollected: row1?.total || 1860000,
              discountAccumulated: row2?.total || 245000,
              potBalance: 1575000, // This would be calculated based on chits total pot - paid auctions
              totalMembers: row3?.count || 73,
              defaulters: row4?.count || 4
            });
          });
        });
      });
    });
  });

  app.get("/api/chits", (req, res) => {
    db.all("SELECT * FROM chits", (err, rows: any[]) => {
      // Logic for trigger double auctions: 
      // check if cumulative discount >= total_pot
      const processed = rows.map(chit => {
        // Mocking the check for now as we don't have many auctions in DB yet
        return { ...chit, triggerDouble: false };
      });
      res.json(processed);
    });
  });

  app.post("/api/chits", (req, res) => {
    const { name, members_count, duration, monthly_contribution, total_pot, start_date } = req.body;
    db.run(`INSERT INTO chits (name, members_count, duration, monthly_contribution, total_pot, start_date) 
            VALUES (?, ?, ?, ?, ?, ?)`, [name, members_count, duration, monthly_contribution, total_pot, start_date], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });

  app.get("/api/members", (req, res) => {
    db.all(`SELECT m.*, c.name as chit_name,
            (SELECT SUM(amount) FROM payments WHERE member_id = m.id AND status = 'paid') as total_paid,
            (SELECT COUNT(*) FROM auctions WHERE winner_id = m.id) as auctions_won
            FROM members m 
            LEFT JOIN chits c ON m.chit_id = c.id`, (err, rows) => {
      res.json(rows);
    });
  });

  app.post("/api/members", (req, res) => {
    const { name, phone, email, chit_id, pref_channel } = req.body;
    db.run(`INSERT INTO members (name, phone, email, chit_id, pref_channel) VALUES (?, ?, ?, ?, ?)`,
      [name, phone, email, chit_id, pref_channel], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });

  app.get("/api/payments", (req, res) => {
    db.all(`SELECT p.*, m.name as member_name, c.name as chit_name FROM payments p
            JOIN members m ON p.member_id = m.id
            JOIN chits c ON m.chit_id = c.id
            ORDER BY year DESC, month DESC`, (err, rows) => {
      res.json(rows);
    });
  });

  app.post("/api/payments", (req, res) => {
    const { member_id, month, year, amount, method, status, payment_date } = req.body;
    db.run(`INSERT INTO payments (member_id, month, year, amount, method, status, payment_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`, [member_id, month, year, amount, method, status, payment_date], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });

  app.get("/api/auctions", (req, res) => {
    db.all(`SELECT a.*, m.name as winner_name, c.name as chit_name
            FROM auctions a
            JOIN members m ON a.winner_id = m.id
            JOIN chits c ON a.chit_id = c.id
            ORDER BY auction_date DESC`, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  app.post("/api/auctions", (req, res) => {
    const { chit_id, month, winner_id, bid_discount, payout, auction_date } = req.body;
    db.run(`INSERT INTO auctions (chit_id, month, winner_id, bid_discount, payout, auction_date) 
            VALUES (?, ?, ?, ?, ?, ?)`, [chit_id, month, winner_id, bid_discount, payout, auction_date], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  });

  app.get("/api/notifications", (req, res) => {
    db.all(`SELECT n.*, m.name as member_name FROM notifications n
            JOIN members m ON n.member_id = m.id ORDER BY timestamp DESC`, (err, rows) => {
      res.json(rows);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
