-- Supabase Migration Script
-- Run this in the Supabase SQL Editor

-- 1. Chits Table
CREATE TABLE IF NOT EXISTS chits (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  members_count INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  monthly_contribution REAL NOT NULL,
  total_pot REAL NOT NULL,
  status TEXT DEFAULT 'active',
  start_date TEXT,
  rules TEXT
);

-- 2. Members Table
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  chit_id INTEGER REFERENCES chits(id),
  pref_channel TEXT DEFAULT 'whatsapp',
  whatsapp_opt_in INTEGER DEFAULT 1
);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  month INTEGER,
  year INTEGER,
  amount REAL,
  status TEXT DEFAULT 'unpaid',
  method TEXT,
  payment_date TEXT,
  due_date TEXT
);

-- 4. Auctions Table
CREATE TABLE IF NOT EXISTS auctions (
  id SERIAL PRIMARY KEY,
  chit_id INTEGER REFERENCES chits(id),
  month INTEGER,
  winner_id INTEGER REFERENCES members(id),
  bid_discount REAL,
  payout REAL,
  auction_date TEXT
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  type TEXT,
  channel TEXT,
  status TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Users & Roles Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  member_id INTEGER REFERENCES members(id),
  admin_requested INTEGER DEFAULT 0
);

-- 7. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER,
  receiver_id INTEGER,
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_read INTEGER DEFAULT 0
);

-- Seed Admin
INSERT INTO users (name, username, email, password, role)
VALUES ('Administrator', 'admin', 'admin@chitapp', 'admin123', 'master_admin')
ON CONFLICT (email) DO NOTHING;
