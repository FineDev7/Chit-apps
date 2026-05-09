# 💎 ChitAdmin Pro

> **The Ultimate High-Performance Chit Fund Management System**
> *Crafted with Glassmorphism UI, Real-time Analytics, and Multi-role Security.*

---

## 🌟 Overview

ChitAdmin Pro is a state-of-the-art management platform designed for modern financial groups. It combines a sophisticated **Glassmorphism UI** with a robust backend to handle auctions, member payments, and automated reminders seamlessly.

### ✨ Key Features

-   **🎭 Multi-role Access Control:** Tailored experiences for Master Admins, Chit Admins, and Users.
-   **📱 Mobile-First Design:** Fluid transitions and a responsive layout using Tailwind CSS v4 and Framer Motion.
-   **📈 Intelligent Dashboard:** Real-time metrics on collection, pot balance, and defaulter tracking.
-   **💬 Secure Messaging:** Built-in communication channel between administrators and members.
-   **⏰ Automated Reminders:** One-click overdue payment notifications via WhatsApp-style tracking.
-   **🔐 Smart Onboarding:** Automatic user account generation with predictable credential patterns.
-   **💾 Hybrid Persistence:** Works with local SQLite for development and **Supabase (PostgreSQL)** for production deployment.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project (for production persistence)

### 2. Installation
```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 3. Database Configuration
To ensure data persists on platforms like Vercel, this project uses **Supabase**.

1.  Log in to your [Supabase Dashboard](https://supabase.com).
2.  Go to the **SQL Editor** and paste the contents of `supabase_schema.sql`.
3.  Run the script to initialize your tables and the Master Admin account.
4.  Copy your `SUPABASE_URL` and `SUPABASE_KEY` to your environment variables.

### 4. Running the App
```bash
# Start the production server
npm run dev
```

---

## 🔑 Default Credentials

| Role | Username/Email | Password |
| :--- | :--- | :--- |
| **Master Admin** | `admin@chitapp` | `admin123` |
| **Member** | `[firstname][id]` | `[firstname][last4phone]` |

> *Example: A member named "John Doe" with ID 5 and phone 9876543210 would log in with `john5` / `john3210`.*

---

## 🛠 Tech Stack

-   **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons.
-   **State Management:** Zustand.
-   **Backend:** Express (Node.js).
-   **Database:** SQLite3 (Local) / Supabase (Cloud).
-   **Analytics:** Recharts.
-   **Reporting:** jsPDF for transaction receipts.

---

## ⚠️ Important Note for Vercel Users

Vercel has a **read-only file system**. If you use the local SQLite database, your data **will be lost** every time the server restarts.
**Always use Supabase for production** by providing the `SUPABASE_URL` and `SUPABASE_KEY` environment variables.

---

## 🏗 Project Structure

- `src/` - Frontend React application.
- `server.ts` - Express API with dual-database support.
- `supabase_schema.sql` - Database migration script.
- `store.ts` - Centralized application state and API logic.

---

*Built with ❤️ for financial transparency and efficiency.*
