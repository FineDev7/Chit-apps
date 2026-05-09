import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database initialization
  const isSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
  const supabase = isSupabase ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!) : null;
  const sqliteDb = !isSupabase ? new sqlite3.Database("chit_fund.db") : null;

  if (!isSupabase && sqliteDb) {
    sqliteDb.serialize(() => {
      // Chits Table
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS chits (
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
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS members (
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
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER,
        month INTEGER,
        year INTEGER,
        amount REAL,
        status TEXT DEFAULT 'unpaid',
        method TEXT,
        payment_date TEXT,
        due_date TEXT,
        FOREIGN KEY(member_id) REFERENCES members(id)
      )`);

      // Auctions Table
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS auctions (
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
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER,
        type TEXT,
        channel TEXT,
        status TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(member_id) REFERENCES members(id)
      )`);

      // Users & Roles Table
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        member_id INTEGER,
        admin_requested INTEGER DEFAULT 0,
        FOREIGN KEY(member_id) REFERENCES members(id)
      )`);

      // Messages Table
      sqliteDb.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        receiver_id INTEGER,
        content TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0
      )`);

      // Seed Admin
      sqliteDb.get("SELECT * FROM users WHERE email = 'admin@chitapp'", (err, row) => {
        if (!row) {
          sqliteDb.run("INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
            ['Administrator', 'admin', 'admin@chitapp', 'admin123', 'master_admin']);
        }
      });
    });
  }

  console.log(isSupabase ? "Using Supabase Backend" : "Using Local SQLite Backend");

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (isSupabase) {
      try {
        const { data, error } = await supabase!
          .from("users")
          .select("*")
          .or(`email.eq.${email},username.eq.${email}`)
          .eq("password", password);
        
        if (error) {
          console.error("Supabase error:", error);
          return res.status(401).json({ error: "Invalid credentials" });
        }
        
        if (!data || data.length === 0) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        
        res.json(data[0]); // Return first match
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
      }
    } else {
      sqliteDb!.get("SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?", [email, email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) res.json(row);
        else res.status(401).json({ error: "Invalid credentials" });
      });
    }
  });

  app.get("/api/dashboard", async (req, res) => {
    if (isSupabase) {
      const { data: pData } = await supabase!.from("payments").select("amount").eq("status", "paid");
      const { data: aData } = await supabase!.from("auctions").select("bid_discount, payout");
      const { count: mCount } = await supabase!.from("members").select("*", { count: 'exact', head: true });
      const { data: uData } = await supabase!.from("payments").select("member_id").eq("status", "unpaid");
      const { data: cData } = await supabase!.from("chits").select("total_pot");

      const totalCollected = pData?.reduce((s, p) => s + p.amount, 0) || 0;
      const discountAccumulated = aData?.reduce((s, a) => s + a.bid_discount, 0) || 0;
      const totalPot = cData?.reduce((s, c) => s + c.total_pot, 0) || 0;
      const totalPaidOut = aData?.reduce((s, a) => s + a.payout, 0) || 0;
      const defaulters = new Set(uData?.map(u => u.member_id)).size;

      res.json({
        totalCollected,
        discountAccumulated,
        potBalance: totalPot - totalPaidOut,
        totalMembers: mCount || 0,
        defaulters
      });
    } else {
      const queries = [
        "SELECT SUM(amount) as total FROM payments WHERE status = 'paid'",
        "SELECT SUM(bid_discount) as total FROM auctions",
        "SELECT COUNT(*) as count FROM members",
        "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE status = 'unpaid'",
        "SELECT SUM(total_pot) as total FROM chits",
        "SELECT SUM(payout) as total FROM auctions"
      ];
      sqliteDb!.get(queries[0], (err, row1: any) => {
        sqliteDb!.get(queries[1], (err, row2: any) => {
          sqliteDb!.get(queries[2], (err, row3: any) => {
            sqliteDb!.get(queries[3], (err, row4: any) => {
              sqliteDb!.get(queries[4], (err, row5: any) => {
                sqliteDb!.get(queries[5], (err, row6: any) => {
                  res.json({
                    totalCollected: row1?.total || 0,
                    discountAccumulated: row2?.total || 0,
                    potBalance: (row5?.total || 0) - (row6?.total || 0),
                    totalMembers: row3?.count || 0,
                    defaulters: row4?.count || 0
                  });
                });
              });
            });
          });
        });
      });
    }
  });

  app.get("/api/chits", async (req, res) => {
    if (isSupabase) {
      const { data, error } = await supabase!.from("chits").select("*");
      res.json(data || []);
    } else {
      sqliteDb!.all("SELECT * FROM chits", (err, rows) => res.json(rows || []));
    }
  });

  app.post("/api/chits", async (req, res) => {
    if (isSupabase) {
      const { data, error } = await supabase!.from("chits").insert([req.body]).select().single();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    } else {
      const { name, members_count, duration, monthly_contribution, total_pot, start_date } = req.body;
      sqliteDb!.run(`INSERT INTO chits (name, members_count, duration, monthly_contribution, total_pot, start_date)
              VALUES (?, ?, ?, ?, ?, ?)`, [name, members_count, duration, monthly_contribution, total_pot, start_date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      });
    }
  });

  app.get("/api/members", async (req, res) => {
    if (isSupabase) {
      const { data, error } = await supabase!.from("members").select(`
        *,
        chits ( name ),
        payments ( amount, status ),
        auctions ( id )
      `);
      if (error) return res.status(500).json({ error: error.message });
      const processed = data.map((m: any) => ({
        ...m,
        chit_name: m.chits?.name,
        total_paid: m.payments?.filter((p: any) => p.status === 'paid').reduce((s: any, p: any) => s + p.amount, 0) || 0,
        auctions_won: m.auctions?.length || 0
      }));
      res.json(processed);
    } else {
      sqliteDb!.all(`SELECT m.*, c.name as chit_name,
              (SELECT SUM(amount) FROM payments WHERE member_id = m.id AND status = 'paid') as total_paid,
              (SELECT COUNT(*) FROM auctions WHERE winner_id = m.id) as auctions_won
              FROM members m
              LEFT JOIN chits c ON m.chit_id = c.id`, (err, rows) => res.json(rows));
    }
  });

  app.get("/api/messages", async (req, res) => {
    const { userId } = req.query;
    if (isSupabase) {
      const { data } = await supabase!.from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("timestamp", { ascending: true });
      res.json(data || []);
    } else {
      sqliteDb!.all(`SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY timestamp ASC`, [userId, userId], (err, rows) => res.json(rows));
    }
  });

  app.post("/api/messages", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("messages").insert([req.body]).select().single();
      res.json(data);
    } else {
      const { sender_id, receiver_id, content } = req.body;
      sqliteDb!.run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`, [sender_id, receiver_id, content], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      });
    }
  });

  app.get("/api/users", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("users").select("*");
      res.json(data || []);
    } else {
      sqliteDb!.all(`SELECT * FROM users`, (err, rows) => res.json(rows));
    }
  });

  app.post("/api/users/update-role", async (req, res) => {
    const { email, role } = req.body;
    if (isSupabase) {
      await supabase!.from("users").update({ role, admin_requested: 0 }).eq("email", email);
      res.json({ success: true });
    } else {
      sqliteDb!.run(`UPDATE users SET role = ?, admin_requested = 0 WHERE email = ?`, [role, email], (err) => res.json({ success: true }));
    }
  });

  app.post("/api/members", async (req, res) => {
    const { name, phone, email, chit_id, pref_channel } = req.body;
    if (isSupabase) {
      const { data: mData } = await supabase!.from("members").insert([{ name, phone, email, chit_id, pref_channel }]).select().single();
      const username = name.split(' ')[0].toLowerCase() + mData.id;
      const password = name.split(' ')[0].toLowerCase() + (phone ? phone.slice(-4) : '1234');
      await supabase!.from("users").insert([{ name, username, email, password, role: 'user', member_id: mData.id }]);
      res.json({ ...mData, username, password });
    } else {
      sqliteDb!.serialize(() => {
        sqliteDb!.run("BEGIN TRANSACTION");
        sqliteDb!.run(`INSERT INTO members (name, phone, email, chit_id, pref_channel) VALUES (?, ?, ?, ?, ?)`,
          [name, phone, email, chit_id, pref_channel], function(err) {
          const memberId = this.lastID;
          const username = name.split(' ')[0].toLowerCase() + memberId;
          const password = name.split(' ')[0].toLowerCase() + (phone ? phone.slice(-4) : '1234');
          sqliteDb!.run(`INSERT INTO users (name, username, email, password, role, member_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, username, email, password, 'user', memberId], function(err2) {
            sqliteDb!.run("COMMIT");
            res.json({ id: memberId, email, password, username });
          });
        });
      });
    }
  });

  app.get("/api/payments", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("payments").select("*, members(name, chits(name))").order("year", { ascending: false });
      res.json(data?.map((p: any) => ({
        ...p,
        member_name: p.members?.name,
        chit_name: p.members?.chits?.name
      })) || []);
    } else {
      sqliteDb!.all(`SELECT p.*, m.name as member_name, c.name as chit_name FROM payments p
              JOIN members m ON p.member_id = m.id
              JOIN chits c ON m.chit_id = c.id
              ORDER BY year DESC, month DESC`, (err, rows) => res.json(rows));
    }
  });

  app.post("/api/payments", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("payments").insert([req.body]).select().single();
      res.json(data);
    } else {
      const { member_id, month, year, amount, method, status, payment_date, due_date } = req.body;
      sqliteDb!.run(`INSERT INTO payments (member_id, month, year, amount, method, status, payment_date, due_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [member_id, month, year, amount, method, status, payment_date, due_date], function(err) {
        res.json({ id: this.lastID });
      });
    }
  });

  app.get("/api/auctions", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("auctions").select("*, members(name), chits(name)").order("auction_date", { ascending: false });
      res.json(data?.map((a: any) => ({ ...a, winner_name: a.members?.name, chit_name: a.chits?.name })) || []);
    } else {
      sqliteDb!.all(`SELECT a.*, m.name as winner_name, c.name as chit_name
              FROM auctions a
              JOIN members m ON a.winner_id = m.id
              JOIN chits c ON a.chit_id = c.id
              ORDER BY auction_date DESC`, (err, rows) => res.json(rows));
    }
  });

  app.post("/api/auctions", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("auctions").insert([req.body]).select().single();
      res.json(data);
    } else {
      const { chit_id, month, winner_id, bid_discount, payout, auction_date } = req.body;
      sqliteDb!.run(`INSERT INTO auctions (chit_id, month, winner_id, bid_discount, payout, auction_date)
              VALUES (?, ?, ?, ?, ?, ?)`, [chit_id, month, winner_id, bid_discount, payout, auction_date], function(err) {
        res.json({ id: this.lastID });
      });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    if (isSupabase) {
      const { data } = await supabase!.from("notifications").select("*, members(name)").order("timestamp", { ascending: false });
      res.json(data?.map((n: any) => ({ ...n, member_name: n.members?.name })) || []);
    } else {
      sqliteDb!.all(`SELECT n.*, m.name as member_name FROM notifications n
              JOIN members m ON n.member_id = m.id ORDER BY timestamp DESC`, (err, rows) => res.json(rows));
    }
  });

  app.post("/api/reminders/process", async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    if (isSupabase) {
      const { data } = await supabase!.from("payments").select("member_id").eq("status", "unpaid").lt("due_date", today);
      if (data && data.length > 0) {
        const notifications = data.map(p => ({
          member_id: p.member_id,
          type: 'Overdue Payment Reminder',
          channel: 'WhatsApp',
          status: 'Sent'
        }));
        await supabase!.from("notifications").insert(notifications);
      }
      res.json({ processed: data?.length || 0 });
    } else {
      sqliteDb!.all(`SELECT p.*, m.name as member_name, m.id as member_id FROM payments p
              JOIN members m ON p.member_id = m.id
              WHERE p.status = 'unpaid' AND p.due_date < ?`, [today], (err, rows: any[]) => {
        rows?.forEach(row => {
          sqliteDb!.run(`INSERT INTO notifications (member_id, type, channel, status) VALUES (?, ?, ?, ?)`,
            [row.member_id, 'Overdue Payment Reminder', 'WhatsApp', 'Sent']);
        });
        res.json({ processed: rows?.length || 0 });
      });
    }
  });

  app.post("/api/users/request-admin", async (req, res) => {
    const { email } = req.body;
    if (isSupabase) {
      await supabase!.from("users").update({ admin_requested: 1 }).eq("email", email);
      res.json({ success: true });
    } else {
      sqliteDb!.run(`UPDATE users SET admin_requested = 1 WHERE email = ?`, [email], (err) => res.json({ success: true }));
    }
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
