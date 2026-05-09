import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
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

  // Supabase Client
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  console.log("Using Supabase Backend");

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    
    console.log(`Login attempt: email=${email}, password=${password}`);
    
    try {
      // First try to find by email
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.toLowerCase());
      
      if (error) {
        console.error("Supabase email query error:", error);
      }
      
      // If not found by email, try by username
      if (!data || data.length === 0) {
        const { data: usernameData, error: usernameError } = await supabase
          .from("users")
          .select("*")
          .eq("username", email.toLowerCase());
        
        if (usernameError) {
          console.error("Supabase username query error:", usernameError);
        }
        
        data = usernameData || [];
      }
      
      console.log(`Found users: ${data?.length || 0}`);
      
      if (!data || data.length === 0) {
        console.log("No user found");
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check password
      const user = data[0];
      console.log(`Comparing passwords: input="${password}", stored="${user.password}"`);
      
      if (user.password !== password) {
        console.log("Password mismatch");
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log("Login successful");
      res.json(user);
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/dashboard", async (req, res) => {
    try {
      const { data: pData } = await supabase.from("payments").select("amount").eq("status", "paid");
      const { data: aData } = await supabase.from("auctions").select("bid_discount, payout");
      const { count: mCount } = await supabase.from("members").select("*", { count: 'exact', head: true });
      const { data: uData } = await supabase.from("payments").select("member_id").eq("status", "unpaid");
      const { data: cData } = await supabase.from("chits").select("total_pot");

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
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/chits", async (req, res) => {
    try {
      const { data, error } = await supabase.from("chits").select("*");
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error("Chits error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/chits", async (req, res) => {
    try {
      const { data, error } = await supabase.from("chits").insert([req.body]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Create chit error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/members", async (req, res) => {
    try {
      const { data, error } = await supabase.from("members").select(`
        *,
        chits ( name ),
        payments ( amount, status ),
        auctions ( id )
      `);
      if (error) throw error;
      const processed = data.map((m: any) => ({
        ...m,
        chit_name: m.chits?.name,
        total_paid: m.payments?.filter((p: any) => p.status === 'paid').reduce((s: any, p: any) => s + p.amount, 0) || 0,
        auctions_won: m.auctions?.length || 0
      }));
      res.json(processed);
    } catch (err) {
      console.error("Members error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const { userId } = req.query;
      const { data, error } = await supabase.from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error("Messages error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { data, error } = await supabase.from("messages").insert([req.body]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Create message error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      console.error("Users error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/users/update-role", async (req, res) => {
    try {
      const { email, role } = req.body;
      const { error } = await supabase.from("users").update({ role, admin_requested: 0 }).eq("email", email);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Update role error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const { name, phone, email, chit_id, pref_channel } = req.body;
      const { data: mData, error: mError } = await supabase.from("members").insert([{ name, phone, email, chit_id, pref_channel }]).select().single();
      if (mError) throw mError;
      const username = name.split(' ')[0].toLowerCase() + mData.id;
      const password = name.split(' ')[0].toLowerCase() + (phone ? phone.slice(-4) : '1234');
      const { error: uError } = await supabase.from("users").insert([{ name, username, email, password, role: 'user', member_id: mData.id }]);
      if (uError) throw uError;
      res.json({ ...mData, username, password });
    } catch (err) {
      console.error("Create member error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/payments", async (req, res) => {
    try {
      const { data, error } = await supabase.from("payments").select("*, members(name, chits(name))").order("year", { ascending: false });
      if (error) throw error;
      res.json(data?.map((p: any) => ({
        ...p,
        member_name: p.members?.name,
        chit_name: p.members?.chits?.name
      })) || []);
    } catch (err) {
      console.error("Payments error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const { data, error } = await supabase.from("payments").insert([req.body]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Create payment error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/auctions", async (req, res) => {
    try {
      const { data, error } = await supabase.from("auctions").select("*, members(name), chits(name)").order("auction_date", { ascending: false });
      if (error) throw error;
      res.json(data?.map((a: any) => ({ ...a, winner_name: a.members?.name, chit_name: a.chits?.name })) || []);
    } catch (err) {
      console.error("Auctions error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auctions", async (req, res) => {
    try {
      const { data, error } = await supabase.from("auctions").insert([req.body]).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error("Create auction error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      const { data, error } = await supabase.from("notifications").select("*, members(name)").order("timestamp", { ascending: false });
      if (error) throw error;
      res.json(data?.map((n: any) => ({ ...n, member_name: n.members?.name })) || []);
    } catch (err) {
      console.error("Notifications error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/reminders/process", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from("payments").select("member_id").eq("status", "unpaid").lt("due_date", today);
      if (error) throw error;
      if (data && data.length > 0) {
        const notifications = data.map(p => ({
          member_id: p.member_id,
          type: 'Overdue Payment Reminder',
          channel: 'WhatsApp',
          status: 'Sent'
        }));
        const { error: nError } = await supabase.from("notifications").insert(notifications);
        if (nError) throw nError;
      }
      res.json({ processed: data?.length || 0 });
    } catch (err) {
      console.error("Reminders error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/users/request-admin", async (req, res) => {
    try {
      const { email } = req.body;
      const { error } = await supabase.from("users").update({ admin_requested: 1 }).eq("email", email);
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error("Request admin error:", err);
      res.status(500).json({ error: "Server error" });
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
