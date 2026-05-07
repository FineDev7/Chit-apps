<div align="center">
  <img width="1200" height="475" alt="ChitAdmin Pro Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  # 💎 ChitAdmin Pro

  ### *The Ultimate High-Performance Chit Fund Management System*

  [![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
  [![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.0-ff69b4?logo=framer)](https://www.framer.com/motion/)
</div>

---

## ✨ Overview

ChitAdmin Pro is a sophisticated, admin-only management platform designed for modern chit fund operators. Built with a stunning **Glassmorphism UI**, it offers real-time analytics, automated notification tracking, and seamless financial monitoring.

## 🚀 Key Features

- **📊 Real-time Analytics**: Visual insights into cash flow, payment distribution, and discount accumulation trends using Recharts.
- **🛡️ Defaulter Watch**: Intelligent tracking and risk scoring for overdue members to maintain fund health.
- **🔨 Smart Auctions**: Automated payout calculations and historical logging of live auction dynamics.
- **📱 Multi-Channel Notifications**: Integrated engine for WhatsApp, Email, and SMS alerts.
- **✨ Glassmorphism UI**: A beautiful, immersive interface with smooth animations powered by Framer Motion.
- **📄 Export Reports**: Generate professional PDF and CSV reports for members, payments, and auctions instantly.
- **🔍 Quick Search**: Global search functionality across members, chits, and payment records.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Backend**: Express, Node.js
- **Database**: SQLite3
- **Reporting**: jsPDF, autoTable
- **Charts**: Recharts

## 📥 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chitadmin-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file (or copy from `.env.example`) and add your API keys.
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 🚢 Deployment

### Platform Recommendations

- **Render / Railway**: Excellent for full-stack Node.js + SQLite apps.
- **VPS (DigitalOcean / Linode)**: Best for performance and persistent storage control.

### Deployment Steps (Generic)

1. **Build the frontend**:
   ```bash
   npm run build
   ```
2. **Start the production server**:
   ```bash
   NODE_ENV=production node server.ts
   ```
   *Note: In production, the server serves the static files from the `dist` directory.*

### ⚠️ Persistence & Deployment (Vercel/Render/Railway)

Vercel and most serverless platforms are **stateless**. This means the SQLite database (`chit_fund.db`) will be reset on every redeploy or function cold start.

#### To make the database persistent:
1. **Turso (Recommended):** Turso is a distributed SQLite database.
   - Replace the `sqlite3` driver in `server.ts` with `@libsql/client`.
   - Use a Turso DB URL and Auth Token in your environment variables.
2. **Supabase (PostgreSQL):**
   - Migrate the schema to Postgres (Supabase provides a free tier).
   - Use `pg` or `prisma` to connect.
3. **Railway/Render with Volumes:**
   - If deploying to Railway or Render, you can attach a **Persistent Volume**.
   - Mount the volume at `/data` and update your DB path to `/data/chit_fund.db`.

### 🔑 Authentication

#### Default Admin Credentials
- **Admin Email:** `admin@chitapp`
- **Admin Password:** `admin123`

#### User Credentials
When you add a new member, the system automatically generates:
- **Email:** The email provided during member creation.
- **Password:** `[firstname] + [last 4 digits of phone]` (e.g., `john1234`).

## 📸 Screenshots

| Dashboard | Analytics |
| :---: | :---: |
| ![Dashboard](https://via.placeholder.com/400x225?text=ChitAdmin+Dashboard) | ![Analytics](https://via.placeholder.com/400x225?text=ChitAdmin+Analytics) |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<div align="center">
  <p>Built with ❤️ for Financial Excellence</p>
  <p>© 2026 ChitAdmin Pro. All rights reserved.</p>
</div>
