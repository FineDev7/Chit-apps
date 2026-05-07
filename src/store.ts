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

interface Auction {
  id: number;
  chit_id: number;
  chit_name: string;
  month: number;
  winner_id: number;
  winner_name: string;
  bid_discount: number;
  payout: number;
  auction_date: string;
}

interface Notification {
  id: number;
  member_id: number;
  member_name: string;
  type: string;
  channel: string;
  status: string;
  timestamp: string;
}

interface AppState {
  stats: DashboardStats;
  chits: Chit[];
  members: Member[];
  payments: Payment[];
  auctions: Auction[];
  notifications: Notification[];
  loading: boolean;
  fetchDashboard: () => Promise<void>;
  fetchChits: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchPayments: () => Promise<void>;
  fetchAuctions: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  addPayment: (payment: any) => Promise<void>;
  addMember: (member: any) => Promise<void>;
  addChit: (chit: any) => Promise<void>;
  addAuction: (auction: any) => Promise<void>;
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
  auctions: [],
  notifications: [],
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
  fetchAuctions: async () => {
    const res = await fetch('/api/auctions');
    const data = await res.json();
    set({ auctions: data });
  },
  fetchNotifications: async () => {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    set({ notifications: data });
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
  },
  addMember: async (member) => {
    set({ loading: true });
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
      await get().fetchMembers();
      await get().fetchDashboard();
    } finally {
      set({ loading: false });
    }
  },
  addChit: async (chit) => {
    set({ loading: true });
    try {
      await fetch('/api/chits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chit)
      });
      await get().fetchChits();
      await get().fetchDashboard();
    } finally {
      set({ loading: false });
    }
  },
  addAuction: async (auction) => {
    set({ loading: true });
    try {
      await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auction)
      });
      await get().fetchAuctions();
      await get().fetchDashboard();
    } finally {
      set({ loading: false });
    }
  }
}));
