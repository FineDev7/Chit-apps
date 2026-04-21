import { create } from 'zustand';

interface DashboardStats {
  totalCollected: number;
  discountAccumulated: number;
  potBalance: number;
  totalMembers: number;
  defaulters: number;
}

interface Chit {
  id: number;
  name: string;
  members_count: number;
  duration: number;
  monthly_contribution: number;
  total_pot: number;
  status: string;
  start_date: string;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  chit_id: number;
  chit_name: string;
  pref_channel: string;
  total_paid: number;
  auctions_won: number;
}

interface Payment {
  id: number;
  member_id: number;
  member_name: string;
  chit_name: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  method: string;
  payment_date: string;
}

interface AppState {
  stats: DashboardStats;
  chits: Chit[];
  members: Member[];
  payments: Payment[];
  loading: boolean;
  fetchDashboard: () => Promise<void>;
  fetchChits: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  addPayment: (payment: any) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  stats: {
    totalCollected: 0,
    discountAccumulated: 0,
    potBalance: 0,
    totalMembers: 0,
    defaulters: 0
  },
  chits: [],
  members: [],
  payments: [],
  loading: false,
  fetchDashboard: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      set({ stats: data });
    } finally {
      set({ loading: false });
    }
  },
  fetchChits: async () => {
    const res = await fetch('/api/chits');
    const data = await res.json();
    set({ chits: data });
  },
  fetchMembers: async () => {
    const res = await fetch('/api/members');
    const data = await res.json();
    set({ members: data });
  },
  fetchPayments: async () => {
    const res = await fetch('/api/payments');
    const data = await res.json();
    set({ payments: data });
  },
  addPayment: async (payment) => {
    set({ loading: true });
    try {
      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment)
      });
      await get().fetchPayments();
      await get().fetchDashboard();
    } finally {
      set({ loading: false });
    }
  }
}));
