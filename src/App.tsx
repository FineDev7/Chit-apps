/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  Wallet, 
  Gavel, 
  LineChart, 
  Bell, 
  LayoutDashboard, 
  FolderKanban,
  Search,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useStore } from './store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart as ReLineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left ${
      active 
        ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
        : 'text-white/50 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, sub, color, icon: Icon }: any) => (
  <div className="glass-card flex flex-col gap-2">
    <div className="flex justify-between items-start">
      <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</span>
    </div>
    <div className="text-2xl font-bold tracking-tight">{value}</div>
    <div className={`text-[10px] uppercase font-bold tracking-tight text-${color}`}>
       {sub}
    </div>
  </div>
);


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showChitModal, setShowChitModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  const [newPayment, setNewPayment] = useState({
    member_id: '',
    amount: '',
    method: 'UPI',
    payment_date: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'paid'
  });

  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    email: '',
    chit_id: '',
    pref_channel: 'whatsapp'
  });

  const [newChit, setNewChit] = useState({
    name: '',
    members_count: '25',
    duration: '25',
    monthly_contribution: '',
    total_pot: '',
    start_date: new Date().toISOString().split('T')[0]
  });

  const [newAuction, setNewAuction] = useState({
    chit_id: '',
    month: '1',
    winner_id: '',
    bid_discount: '',
    payout: '',
    auction_date: new Date().toISOString().split('T')[0]
  });

  const {
    stats, fetchDashboard,
    chits, fetchChits, addChit,
    members, fetchMembers, addMember,
    payments, fetchPayments, addPayment,
    auctions, fetchAuctions, addAuction,
    notifications, fetchNotifications
  } = useStore();

  // Compute charts data from actual store state
  const cashFlowData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    return months.map((month, index) => {
      const monthNum = index + 1;
      const collected = payments
        .filter(p => p.month === monthNum && p.year === currentYear && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      const paid = auctions
        .filter(a => {
          const date = new Date(a.auction_date);
          return date.getMonth() === index && date.getFullYear() === currentYear;
        })
        .reduce((sum, a) => sum + a.payout, 0);

      return { name: month, collected, paid };
    });
  }, [payments, auctions]);

  const paymentStatusData = React.useMemo(() => {
    const paid = payments.filter(p => p.status === 'paid').length;
    const unpaid = payments.filter(p => p.status === 'unpaid').length;
    const late = payments.filter(p => p.status === 'late').length;

    return [
      { name: 'Paid', value: paid, color: '#34d399' },
      { name: 'Late', value: late, color: '#fbbf24' },
      { name: 'Unpaid', value: unpaid, color: '#f87171' },
    ].filter(d => d.value > 0);
  }, [payments]);

  const paymentStats = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlyPayments = payments.filter(p => p.month === currentMonth && p.year === currentYear);
    const paidCount = monthlyPayments.filter(p => p.status === 'paid').length;
    const paidAmount = monthlyPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    const unpaidCount = monthlyPayments.filter(p => p.status === 'unpaid').length;
    const unpaidAmount = monthlyPayments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0);

    return {
      paidCount,
      paidAmount,
      unpaidCount,
      unpaidAmount,
      totalCount: members.length
    };
  }, [payments, members]);

  useEffect(() => {
    fetchDashboard();
    fetchChits();
    fetchMembers();
    fetchPayments();
    fetchAuctions();
    fetchNotifications();
  }, []);

  const exportToCSV = (data: any[], fileName: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(val => `"${val}"`).join(',')
    ).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (data: any[], headers: string[], fileName: string, title: string) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: data.map(item => Object.values(item)),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 172, 254] }
    });
    doc.save(`${fileName}.pdf`);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.member_id || !newPayment.amount) return;
    
    await addPayment({
      ...newPayment,
      member_id: parseInt(newPayment.member_id),
      amount: parseFloat(newPayment.amount)
    });
    
    setShowPaymentModal(false);
    setNewPayment({
      member_id: '',
      amount: '',
      method: 'UPI',
      payment_date: new Date().toISOString().split('T')[0],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: 'paid'
    });
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMember({
      ...newMember,
      chit_id: newMember.chit_id ? parseInt(newMember.chit_id) : null
    });
    setShowMemberModal(false);
    setNewMember({ name: '', phone: '', email: '', chit_id: '', pref_channel: 'whatsapp' });
  };

  const handleChitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addChit({
      ...newChit,
      members_count: parseInt(newChit.members_count),
      duration: parseInt(newChit.duration),
      monthly_contribution: parseFloat(newChit.monthly_contribution),
      total_pot: parseFloat(newChit.total_pot)
    });
    setShowChitModal(false);
    setNewChit({
      name: '',
      members_count: '25',
      duration: '25',
      monthly_contribution: '',
      total_pot: '',
      start_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleAuctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAuction({
      ...newAuction,
      chit_id: parseInt(newAuction.chit_id),
      winner_id: parseInt(newAuction.winner_id),
      month: parseInt(newAuction.month),
      bid_discount: parseFloat(newAuction.bid_discount),
      payout: parseFloat(newAuction.payout)
    });
    setShowAuctionModal(false);
    setNewAuction({
      chit_id: '',
      month: '1',
      winner_id: '',
      bid_discount: '',
      payout: '',
      auction_date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-24 glass border-r-0 rounded-none border-white/10 flex flex-col gap-8 py-8 items-center z-50">
        <div className="font-black text-2xl text-accent mb-6">C.</div>

        <nav className="flex flex-col gap-6 flex-1 px-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'chits', icon: FolderKanban },
            { id: 'members', icon: Users },
            { id: 'payments', icon: Wallet },
            { id: 'auctions', icon: Gavel },
            { id: 'analytics', icon: LineChart },
            { id: 'notifications', icon: Bell }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-white/15 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                  : 'text-white/50 hover:text-white'
              }`}
              title={item.id.charAt(0).toUpperCase() + item.id.slice(1)}
            >
              <item.icon size={22} />
            </button>
          ))}
        </nav>

        <div className="mt-auto px-2">
          <div className="w-10 h-10 rounded-xl glass border-2 border-accent/50 overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-transparent">
        <header className="px-10 py-8 flex justify-between items-center bg-transparent border-b border-white/5 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Chit Management Dashboard</h1>
            <p className="text-white/40 text-sm">Admin System • Monitoring Unit 01</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="glass px-4 py-2 text-xs flex items-center gap-2 border-white/10">
               <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
               Notification Engine Active
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-10 w-64 h-10 border-white/10"
              />
            </div>
          </div>
        </header>

        <div className="px-10 pb-10">
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                <StatCard label="Total Collected" value={`₹${stats.totalCollected.toLocaleString()}`} sub="Current Cash" color="accent" icon={Wallet} />
                <StatCard label="Discount Pool" value={`₹${stats.discountAccumulated.toLocaleString()}`} sub="Shared Benefit" color="success" icon={ArrowUpRight} />
                <StatCard label="Pot Balance" value={`₹${stats.potBalance.toLocaleString()}`} sub="Remaining Value" color="danger" icon={FolderKanban} />
                <StatCard label="Total Members" value={stats.totalMembers} sub="Active Participants" color="warning" icon={Users} />
                <StatCard label="Defaulter Watch" value={stats.defaulters} sub="Needs Attention" color="rose" icon={AlertCircle} />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card">
                  <h3 className="text-sm font-semibold mb-6 flex items-center justify-between">
                    <span>Cash Flow & Collection</span>
                    <span className="text-[10px] opacity-50 uppercase">Last 6 Months</span>
                  </h3>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowData}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#4facfe" />
                            <stop offset="100%" stopColor="#00f2fe" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} hide />
                        <Tooltip 
                          contentStyle={{ background: 'rgba(26, 33, 62, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                          itemStyle={{ color: '#fff' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="collected" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Payment Distribution
                  </h3>
                  <div className="h-[280px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(15, 12, 41, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-bold">{payments.length}</span>
                      <span className="text-[10px] text-slate-500 uppercase">Total</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lists Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card overflow-hidden">
                  <div className="p-1 px-0 flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold">Defaulter Watch</h3>
                    <button className="text-[10px] text-accent hover:underline uppercase tracking-wider font-bold">View List</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 opacity-40 uppercase text-[9px]">
                          <th className="py-3 font-semibold px-2">Member</th>
                          <th className="py-3 font-semibold px-2">Dues</th>
                          <th className="py-3 font-semibold px-2">Duration</th>
                          <th className="py-3 font-semibold px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members
                          .filter(m => {
                            const unpaidCount = payments.filter(p => p.member_id === m.id && p.status === 'unpaid').length;
                            return unpaidCount > 0;
                          })
                          .map((m) => {
                            const unpaidPayments = payments.filter(p => p.member_id === m.id && p.status === 'unpaid');
                            const totalDues = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
                            const risk = unpaidPayments.length > 1 ? 'Critical' : 'Moderate';
                            return {
                              name: m.name,
                              amount: totalDues,
                              months: unpaidPayments.length,
                              risk,
                              initial: m.name.split(' ').map(n => n[0]).join('')
                            };
                          })
                          .map((def, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-2 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold">{def.initial}</div>
                              <span className="font-medium">{def.name}</span>
                            </td>
                            <td className="py-4 px-2">₹{def.amount.toLocaleString()}</td>
                            <td className="py-4 px-2 opacity-50">{def.months} Mo</td>
                            <td className="py-4 px-2 text-right">
                              <button className={`pill ${def.risk === 'Critical' ? 'pill-red' : 'pill-yellow'}`}>
                                {def.risk}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="text-sm font-semibold mb-6">Recent Auctions</h3>
                  <div className="flex flex-col gap-4">
                    {auctions.slice(0, 5).map((auc, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div>
                          <div className="text-sm">{auc.winner_name}</div>
                          <div className="text-[10px] opacity-50 uppercase font-semibold">{auc.chit_name} • Month {auc.month}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">₹{auc.payout.toLocaleString()}</div>
                          <div className="pill pill-green mt-1">Paid</div>
                        </div>
                      </div>
                    ))}
                    {auctions.length === 0 && (
                      <div className="text-center py-4 text-white/30 italic text-xs">No recent auctions.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chits' && (
            <motion.div
              key="chits"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {chits.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((chit) => (
                <div key={chit.id} className="glass-card border-l-4 border-l-indigo-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{chit.name}</h3>
                      <span className="text-[10px] text-slate-500 font-mono">CHT-00{chit.id} • Started Jan 2026</span>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">Active</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Members</div>
                      <div className="text-sm font-bold">{chit.members_count} Members</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Duration</div>
                      <div className="text-sm font-bold">{chit.duration} Months</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Monthly</div>
                      <div className="text-sm font-bold">₹{chit.monthly_contribution.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Total Pot</div>
                      <div className="text-sm font-bold">₹{chit.total_pot.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400">Progress</span>
                    <span className="text-[10px] font-bold">4 / {chit.duration} Months</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: '16%' }}></div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 glass-btn py-1.5">Edit Rules</button>
                    <button className="flex-1 glass-btn glass-btn-primary py-1.5">Run Auction</button>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => setShowChitModal(true)}
                className="glass-card border-2 border-dashed border-white/5 hover:border-white/10 hover:bg-white/5 flex flex-col items-center justify-center gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <div className="text-sm font-medium text-slate-400 text-center">
                  Create New Chit Fund<br/>
                  <span className="text-[10px] text-slate-600 font-normal">Define members, duration & rules</span>
                </div>
              </button>
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-col gap-6"
            >
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex gap-4">
                  {['All', 'Paid', 'Pending', 'Defaulters'].map((filter) => (
                    <button key={filter} className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${filter === 'All' ? 'bg-white/15 text-white' : 'hover:bg-white/5'}`}>
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => exportToCSV(members.map(m => ({ Name: m.name, Phone: m.phone, Email: m.email, Chit: m.chit_name, Channel: m.pref_channel, Paid: m.total_paid })), 'members_export')}
                    className="glass-btn text-xs"
                  >
                    Export CSV
                  </button>
                  <button 
                    onClick={() => exportToPDF(
                      members.map(m => ({ name: m.name, phone: m.phone, email: m.email, chit: m.chit_name })),
                      ['Name', 'Phone', 'Email', 'Chit'],
                      'members_export',
                      'Member Directory'
                    )}
                    className="glass-btn text-xs"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => setShowMemberModal(true)}
                    className="glass-btn glass-btn-primary flex items-center gap-2"
                  >
                    <Plus size={14} /> Add Member
                  </button>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="py-4 font-semibold text-white/50">Member</th>
                      <th className="py-4 font-semibold text-white/50">Chit</th>
                      <th className="py-4 font-semibold text-white/50 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.filter(m =>
                      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.phone?.includes(searchQuery) ||
                      m.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((member) => (
                      <tr key={member.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-[10px] text-white/40">{member.phone}</div>
                          </div>
                        </td>
                        <td className="py-4">{member.chit_name || 'Unassigned'}</td>
                        <td className="py-4 text-right">
                          <button className="glass-btn text-[10px] py-1 px-3">View Profile</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="glass-card flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">This Month</span>
                  <div className="text-xl font-bold text-emerald-400">₹{paymentStats.paidAmount.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">{paymentStats.paidCount} of {paymentStats.totalCount} members</span>
                </div>
                <div className="glass-card flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Pending</span>
                  <div className="text-xl font-bold text-amber-400">₹{paymentStats.unpaidAmount.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-500">{paymentStats.unpaidCount} members</span>
                </div>
                <div className="glass-card flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Defaulters</span>
                  <div className="text-xl font-bold text-rose-400">{stats.defaulters}</div>
                  <span className="text-[10px] text-slate-500">Action Required</span>
                </div>
                <div className="glass-card flex flex-col items-center justify-center border-accent/30">
                  <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="glass-btn glass-btn-primary w-full h-full flex flex-col items-center justify-center gap-1 group"
                  >
                    <Plus size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs">Record New Payment</span>
                  </button>
                </div>
              </div>

              <div className="glass-card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-semibold">Payment History — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => exportToCSV(payments.map(p => ({ Date: p.payment_date, Member: p.member_name, Method: p.method, Amount: p.amount, Status: p.status })), 'payments_export')}
                      className="glass-btn text-[10px] px-3 py-1"
                    >
                      Export CSV
                    </button>
                    <button 
                      onClick={() => exportToPDF(
                        payments.map(p => ({ date: p.payment_date, member: p.member_name, amount: p.amount, status: p.status })),
                        ['Date', 'Member', 'Amount', 'Status'],
                        'payments_export',
                        'Payment History'
                      ) }
                      className="glass-btn text-[10px] px-3 py-1"
                    >
                      Export PDF
                    </button>
                    <button className="glass-btn text-[10px] px-3 py-1">Bulk Update</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-3 font-semibold text-white/50">Date</th>
                        <th className="py-3 font-semibold text-white/50">Member</th>
                        <th className="py-3 font-semibold text-white/50">Method</th>
                        <th className="py-3 font-semibold text-white/50">Amount</th>
                        <th className="py-3 font-semibold text-white/50">Status</th>
                        <th className="py-3 font-semibold text-white/50 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.filter(p =>
                        p.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.method.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((pay) => (
                        <tr key={pay.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="py-3">{pay.payment_date || '-'}</td>
                          <td className="py-3 font-medium">{pay.member_name}</td>
                          <td className="py-3 text-white/40">{pay.method}</td>
                          <td className="py-3">₹{pay.amount.toLocaleString()}</td>
                          <td className="py-3">
                            <span className={`pill ${
                              pay.status === 'paid' ? 'pill-green' : 
                              pay.status === 'unpaid' ? 'pill-red' : 
                              'pill-yellow'
                            }`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button className="glass-btn text-[10px] py-1 px-3">Receipt</button>
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-white/30 italic">No payments recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="glass-card">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold">Notification Center</h3>
                    <button className="glass-btn glass-btn-primary text-xs flex items-center gap-2">
                       <Plus size={14} /> Send Custom Broadcast
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                     {notifications.map((log, i) => (
                       <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-indigo-400">
                             <Bell size={18} />
                           </div>
                           <div>
                             <div className="text-sm font-semibold">{log.type}</div>
                             <div className="text-[10px] text-slate-500 uppercase tracking-tight">{new Date(log.timestamp).toLocaleString()} • To {log.member_name} via {log.channel}</div>
                           </div>
                         </div>
                         <span className={`pill ${log.status === 'Failed' ? 'pill-red' : 'pill-green'}`}>
                           {log.status}
                         </span>
                       </div>
                     ))}
                     {notifications.length === 0 && (
                       <div className="text-center py-10 text-white/30 italic text-xs">No notifications sent yet.</div>
                     )}
                  </div>
                </div>

                <div className="glass-card">
                  <h3 className="text-sm font-semibold mb-6">Automated Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'Due Date -2 Days', desc: 'Pre-reminder to all members', active: true },
                      { title: 'Due Date Alert', desc: 'Alert at 9:00 AM on due date', active: true },
                      { title: 'Late Notice +3 Days', desc: 'First warning to late payers', active: true },
                      { title: 'Auction Result', desc: 'Broadcast result to chit group', active: true },
                    ].map((rule, i) => (
                      <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-bold uppercase text-slate-400">{rule.title}</span>
                          <div className={`w-8 h-4 rounded-full relative p-0.5 cursor-pointer ${rule.active ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-all ${rule.active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">{rule.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="glass-card">
                  <h3 className="text-sm font-semibold mb-4">Channel Availability</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <span className="text-xs">WhatsApp API</span>
                      <span className="text-[10px] text-emerald-400 font-bold">CONNECTED</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <span className="text-xs">Email (SendGrid)</span>
                      <span className="text-[10px] text-emerald-400 font-bold">CONNECTED</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <span className="text-xs">SMS Gateway</span>
                      <span className="text-[10px] text-amber-400 font-bold">LOW BALANCE</span>
                    </div>
                  </div>
                </div>
                
                <div className="glass-card flex-1">
                  <h3 className="text-sm font-semibold mb-4">Quick Templates</h3>
                  <div className="space-y-2">
                    {['Payment Reminder', 'Auction Postponed', 'Late Fee Alert', 'New Chit Launch'].map(t => (
                      <button key={t} className="w-full text-left p-3 text-xs text-slate-400 hover:bg-white/5 hover:text-white rounded-lg border border-transparent hover:border-white/5 transition-all">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card h-[400px]">
                  <h3 className="text-sm font-semibold mb-6">Discount Accumulation Trend</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 12, 41, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="collected" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="paid" stroke="#f87171" strokeWidth={3} dot={{ r: 4 }} />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="glass-card">
                    <h3 className="text-sm font-semibold mb-4">Predictive Business Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                       <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Payouts</div>
                       <div className="text-xl font-bold text-emerald-400">₹{auctions.reduce((sum, a) => sum + a.payout, 0).toLocaleString()}</div>
                       <div className="text-[9px] text-slate-600">Actual disbursed</div>
                      </div>
                      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                       <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Active Chits</div>
                       <div className="text-xl font-bold text-amber-400">{chits.length}</div>
                       <div className="text-[9px] text-slate-600">Managed funds</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card flex-1">
                    <h3 className="text-sm font-semibold mb-4">Risk Distribution</h3>
                    <div className="space-y-4">
                       {[
                         { name: 'Rajan K.', score: 82, status: 'Critcal' },
                         { name: 'Sunitha L.', score: 78, status: 'High' },
                         { name: 'Mohan P.', score: 45, status: 'Medium' },
                       ].map((risk, i) => (
                         <div key={i}>
                            <div className="flex justify-between text-[10px] mb-1">
                               <span className="font-bold text-slate-300">{risk.name}</span>
                               <span className={risk.score > 70 ? 'text-rose-400' : 'text-amber-400'}>{risk.status} • {risk.score}%</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                               <div 
                                className={`h-full transition-all ${risk.score > 70 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                                style={{ width: `${risk.score}%` }}
                               ></div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'auctions' && (
             <motion.div
                key="auctions"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                tabIndex={0}
                className="flex flex-col gap-6"
             >
                <div className="glass-card border-indigo-500/30 bg-indigo-500/5">
                   <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-xl font-bold mb-1">Active Auction Monitor</h2>
                        <p className="text-xs text-slate-400 underline decoration-indigo-500/50 underline-offset-4 decoration-2">Auto-calculating payouts based on current bid dynamics</p>
                      </div>
                      <button
                        onClick={() => setShowAuctionModal(true)}
                        className="glass-btn glass-btn-primary animate-pulse"
                      >
                        Record Live Auction
                      </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                         <div className="text-[10px] text-slate-500 uppercase font-bold mb-3">Formula Baseline</div>
                         <div className="text-xs font-mono text-indigo-300">payout = pot - bid - commission</div>
                         <div className="mt-4 text-[10px] text-slate-500">System engine live</div>
                      </div>
                      <div className="md:col-span-2 p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                         <div className="text-center">
                            <Gavel size={32} className="mx-auto mb-2 text-indigo-400" />
                            <div className="text-sm font-semibold">Auction Engine Ready</div>
                            <div className="text-[10px] text-slate-500">Select a chit to record live auction results</div>
                         </div>
                      </div>
                   </div>
                </div>
                
                <div className="glass-card">
                   <h3 className="text-sm font-semibold mb-6">Historical Logs</h3>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-xs">
                        <thead>
                           <tr className="border-b border-white/5">
                              <th className="py-3 text-slate-500">Month</th>
                              <th className="py-3 text-slate-500">Winner</th>
                              <th className="py-3 text-slate-500">Bid Reward</th>
                              <th className="py-3 text-slate-500">Net Payout</th>
                              <th className="py-3 text-slate-400">Status</th>
                           </tr>
                        </thead>
                        <tbody>
                           {auctions.map((auc) => (
                             <tr key={auc.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <td className="py-3">{auc.auction_date}</td>
                                <td className="py-3 font-medium">{auc.winner_name}</td>
                                <td className="py-3">₹{auc.bid_discount.toLocaleString()}</td>
                                <td className="py-3 text-emerald-400">₹{auc.payout.toLocaleString()}</td>
                                <td className="py-3">
                                   <CheckCircle2 size={12} className="text-emerald-400" />
                                </td>
                             </tr>
                           ))}
                           {auctions.length === 0 && (
                             <tr>
                               <td colSpan={5} className="py-10 text-center text-white/30 italic">No auctions recorded yet.</td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {/* Record Payment Modal */}
          {showPaymentModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPaymentModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-card w-full max-w-md relative z-10 p-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Record New Payment</h2>
                  <button onClick={() => setShowPaymentModal(false)} className="text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Select Member</label>
                    <select 
                      required
                      value={newPayment.member_id}
                      onChange={e => setNewPayment({...newPayment, member_id: e.target.value})}
                      className="glass-input w-full bg-[#1a1a2e]"
                    >
                      <option value="" disabled className="bg-[#1a1a2e]">Choose a member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1a1a2e]">{m.name} ({m.chit_name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Amount (₹)</label>
                      <input 
                        type="number" 
                        required
                        value={newPayment.amount}
                        onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                        placeholder="0.00"
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Method</label>
                      <select 
                        value={newPayment.method}
                        onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                        className="glass-input w-full bg-[#1a1a2e]"
                      >
                        <option value="UPI" className="bg-[#1a1a2e]">UPI</option>
                        <option value="Cash" className="bg-[#1a1a2e]">Cash</option>
                        <option value="NEFT" className="bg-[#1a1a2e]">NEFT</option>
                        <option value="Cheque" className="bg-[#1a1a2e]">Cheque</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Payment Date</label>
                    <input 
                      type="date" 
                      required
                      value={newPayment.payment_date}
                      onChange={e => setNewPayment({...newPayment, payment_date: e.target.value})}
                      className="glass-input w-full"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 glass-btn"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 glass-btn glass-btn-primary"
                    >
                      Submit Payment
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Add Member Modal */}
          {showMemberModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMemberModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card w-full max-w-md relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Add New Member</h2>
                  <button onClick={() => setShowMemberModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleMemberSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Full Name</label>
                    <input type="text" required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="John Doe" className="glass-input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Phone</label>
                      <input type="tel" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} placeholder="+91 ..." className="glass-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Email</label>
                      <input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} placeholder="john@example.com" className="glass-input w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Assign to Chit (Optional)</label>
                    <select value={newMember.chit_id} onChange={e => setNewMember({...newMember, chit_id: e.target.value})} className="glass-input w-full bg-[#1a1a2e]">
                      <option value="">No Chit Assigned</option>
                      {chits.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name}</option>)}
                    </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowMemberModal(false)} className="flex-1 glass-btn">Cancel</button>
                    <button type="submit" className="flex-1 glass-btn glass-btn-primary">Add Member</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Create Chit Modal */}
          {showChitModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChitModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card w-full max-w-lg relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Create New Chit Fund</h2>
                  <button onClick={() => setShowChitModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleChitSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Chit Name</label>
                    <input type="text" required value={newChit.name} onChange={e => setNewChit({...newChit, name: e.target.value})} placeholder="e.g., Diamond Alpha" className="glass-input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Duration (Months)</label>
                      <input type="number" required value={newChit.duration} onChange={e => setNewChit({...newChit, duration: e.target.value})} className="glass-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Members Count</label>
                      <input type="number" required value={newChit.members_count} onChange={e => setNewChit({...newChit, members_count: e.target.value})} className="glass-input w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Monthly Contribution (₹)</label>
                      <input type="number" required value={newChit.monthly_contribution} onChange={e => setNewChit({...newChit, monthly_contribution: e.target.value})} className="glass-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Total Pot Value (₹)</label>
                      <input type="number" required value={newChit.total_pot} onChange={e => setNewChit({...newChit, total_pot: e.target.value})} className="glass-input w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Start Date</label>
                    <input type="date" required value={newChit.start_date} onChange={e => setNewChit({...newChit, start_date: e.target.value})} className="glass-input w-full" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowChitModal(false)} className="flex-1 glass-btn">Cancel</button>
                    <button type="submit" className="flex-1 glass-btn glass-btn-primary">Create Fund</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Record Auction Modal */}
          {showAuctionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuctionModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card w-full max-w-md relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Record Auction</h2>
                  <button onClick={() => setShowAuctionModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleAuctionSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 px-1">Select Chit</label>
                    <select required value={newAuction.chit_id} onChange={e => setNewAuction({...newAuction, chit_id: e.target.value})} className="glass-input w-full bg-[#1a1a2e]">
                      <option value="">Select a chit...</option>
                      {chits.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a2e]">{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Auction Month</label>
                      <input type="number" required value={newAuction.month} onChange={e => setNewAuction({...newAuction, month: e.target.value})} className="glass-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Winner</label>
                      <select required value={newAuction.winner_id} onChange={e => setNewAuction({...newAuction, winner_id: e.target.value})} className="glass-input w-full bg-[#1a1a2e]">
                        <option value="">Select winner...</option>
                        {members.filter(m => !newAuction.chit_id || m.chit_id === parseInt(newAuction.chit_id)).map(m => <option key={m.id} value={m.id} className="bg-[#1a1a2e]">{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Bid Discount (₹)</label>
                      <input type="number" required value={newAuction.bid_discount} onChange={e => setNewAuction({...newAuction, bid_discount: e.target.value})} className="glass-input w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 px-1">Net Payout (₹)</label>
                      <input type="number" required value={newAuction.payout} onChange={e => setNewAuction({...newAuction, payout: e.target.value})} className="glass-input w-full" />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowAuctionModal(false)} className="flex-1 glass-btn">Cancel</button>
                    <button type="submit" className="flex-1 glass-btn glass-btn-primary">Record Auction</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
