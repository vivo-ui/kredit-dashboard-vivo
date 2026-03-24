"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * SATOR INSTITUTIONAL DASHBOARD - FINAL V9 (DESKTOP LAYOUT)
 * Features:
 * 1. Permanent Sidebar Navigation (Home, Insights, Team)
 * 2. Integrated Logout logic
 * 3. Data Isolation per PIC (with Normalization for Yuven/etc)
 * 4. Global Filters (Date/Month) at Header
 * 5. Excel Export Support for PIC Ledger
 */

export default function SatorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");

  // State Management
  const [data, setData] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PIC Identity (Loaded from Login Storage)
  const [picName, setPicName] = useState("");
  const [picArea, setPicArea] = useState("");

  // Filters
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("sator_identity") || "";
    const savedArea = localStorage.getItem("sator_area") || "";
    
    if (!savedName) {
      router.push("/login");
      return;
    }

    setPicName(savedName);
    setPicArea(savedArea);
    loadAllData(savedName);
  }, [router]);

  // Normalization Helper (Ensures "Yuven" login matches "SATOR YUVEN" in DB)
  const normalize = (text: any) => (text || "").toString().trim().toLowerCase();

  async function loadAllData(satorName: string) {
    setLoading(true);
    
    // Fetch all raw data first for client-side normalization flexibility
    const { data: kd } = await supabase.from("kredit_vast").select("*");
    const { data: pr } = await supabase.from("promotors").select("*");
    const { data: tk } = await supabase.from("tokos").select("*");
    const { data: tg } = await supabase.from("targets").select("*");

    const normSator = normalize(satorName);

    // Client-side Filter by PIC Identity (Dynamic & Secure)
    const picData = (kd || []).filter(d => normalize(d.sator).includes(normSator));
    const picPromotors = (pr || []).filter(p => normalize(p.sator).includes(normSator));
    const picTokos = (tk || []).filter(t => normalize(t.sator).includes(normSator));

    setData(picData);
    setPromotors(picPromotors);
    setTokos(picTokos);
    setTargets(tg || []);
    setLoading(false);
  }

  const handleLogout = () => {
    localStorage.removeItem("sator_identity");
    localStorage.removeItem("sator_area");
    router.push("/login");
  };

  // Global Time Filters logic
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (dateFilter) return d.tanggal === dateFilter;
      if (monthFilter) {
        const m = new Date(d.tanggal).getMonth() + 1;
        return m === parseInt(monthFilter);
      }
      return true;
    });
  }, [data, dateFilter, monthFilter]);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // 1. CALCULATIONS: EFFICIENCY (Today's Data)
  const today = new Date().toISOString().slice(0, 10);
  const todayData = filteredData.filter((d) => String(d.tanggal).slice(0, 10) === today);
  const closingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
  const pendingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
  const rejectToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
  const totalToday = todayData.length;
  const efficiency = totalToday > 0 ? Math.round((closingToday / totalToday) * 100) : 0;

  // 2. CALCULATIONS: PIC MONTHLY ACHIEVEMENT (Numeric)
  const picTarget = useMemo(() => {
    return targets
      .filter(t => promotors.some(p => normalize(p.nama_promotor) === normalize(t.promotor)) && t.bulan === currentMonthStr)
      .reduce((sum, t) => sum + (t.target || 0), 0);
  }, [targets, promotors, currentMonthStr]);

  const achievementPercent = picTarget > 0 ? Math.round((filteredData.length / picTarget) * 100) : 0;

  // 3. CALCULATIONS: TEAM PERFORMANCE (PIC-Specific List)
  const teamStats = useMemo(() => {
    return promotors.map((p) => {
      const pData = filteredData.filter((d) => normalize(d.promotor) === normalize(p.nama_promotor));
      const count = pData.length;
      const closing = pData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pTarget = targets.find(t => normalize(t.promotor) === normalize(p.nama_promotor) && t.bulan === currentMonthStr)?.target || 0;
      const rate = count > 0 ? Math.round((closing / count) * 100) : 0;
      const progress = pTarget > 0 ? Math.min(100, Math.round((count / pTarget) * 100)) : 0;
      return { ...p, count, closing, pTarget, rate, progress };
    }).sort((a, b) => b.count - a.count);
  }, [promotors, filteredData, targets, currentMonthStr]);

  // 4. CHART DATA: TREND OVER TIME
  const chartData = useMemo(() => {
    const groups: any = {};
    filteredData.forEach(d => {
      const dateKey = new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });
    return Object.keys(groups).map(date => ({ date, count: groups[date] }));
  }, [filteredData]);

  // EXPORT TO EXCEL logic
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sator_Ledger_Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `Institutional_Report_${picName}.xlsx`);
  };

  if (loading) return (
    <div className="h-screen bg-[#0c1321] flex flex-col items-center justify-center font-['Manrope']">
      <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl animate-pulse mb-4">V</div>
      <p className="font-bold text-[#aec6ff] tracking-widest uppercase text-[10px]">Establishing Secure PIC Link...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0c1321] font-['Manrope'] text-[#dce2f6] antialiased">
      
      {/* INSTITUTIONAL SIDEBAR (PERMANENT) */}
      <aside className="w-64 border-r border-white/5 flex flex-col p-8 fixed h-full z-50 bg-[#0c1321]">
        <div className="mb-12">
          <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl shadow-[0_0_20px_rgba(174,198,255,0.3)]">VF</div>
          <div className="mt-4">
            <h2 className="text-lg font-black tracking-tighter">Sator Dashboard</h2>
            <p className="text-[10px] font-bold text-[#aec6ff] uppercase tracking-widest opacity-60">PIC Access</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "dashboard", icon: "dashboard", label: "Overview" },
            { id: "grafik", icon: "insights", label: "Insights" },
            { id: "promotor", icon: "group", label: "Team Progress" }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${tab === item.id ? 'bg-[#19202e] text-[#aec6ff] shadow-sm' : 'text-[#dce2f6]/40 hover:text-[#dce2f6]'}`}
            >
              <span className="material-icons-outlined text-xl">{item.icon}</span>
              <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-4 px-4 py-3 text-rose-400/60 hover:text-rose-400 transition-all rounded-xl hover:bg-rose-400/5"
        >
          <span className="material-icons-outlined">logout</span>
          <span className="text-xs font-black uppercase tracking-wider">Log Out</span>
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="ml-64 flex-1 p-10 pb-20">
        
        {/* HEADER & GLOBAL FILTERS */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">{picName}</h1>
            <p className="text-xs font-bold text-[#aec6ff] tracking-[0.2em] uppercase mt-1 opacity-50">Authorized Area: {picArea}</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-[#151b2a] p-1 rounded-2xl border border-white/5">
              <input 
                type="date" 
                className="bg-transparent text-[11px] font-bold p-3 outline-none border-none text-[#aec6ff]" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              <select 
                className="bg-transparent text-[11px] font-bold p-3 outline-none border-none text-[#aec6ff]"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="" className="bg-[#151b2a]">Filter Month</option>
                {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => (
                  <option key={i} value={i + 1} className="bg-[#151b2a]">{m} 2026</option>
                ))}
              </select>
            </div>
            <button 
              onClick={exportExcel}
              className="bg-[#aec6ff] text-[#0c1321] px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#aec6ff]/10 hover:opacity-90 transition-all flex items-center gap-2"
            >
              <span className="material-icons-outlined text-sm">download</span>
              Generate Report
            </button>
          </div>
        </header>

        {/* TAB 1: OVERVIEW (DASHBOARD) */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-12 gap-8">
            <section className="col-span-4 bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#aec6ff]/40 mb-6">Efficiency Matrix</h3>
              <div className="flex justify-center py-6">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{v: efficiency}, {v: 100-efficiency}]} innerRadius={70} outerRadius={85} dataKey="v" startAngle={90} endAngle={450} paddingAngle={0}>
                        <Cell fill="#aec6ff" stroke="none" /><Cell fill="#1d263a" stroke="none" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-[#aec6ff]">{efficiency}%</span>
                    <span className="text-[10px] font-bold text-[#aec6ff]/40 uppercase tracking-[0.3em] mt-2">Efficiency</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-10">
                <div className="bg-[#0c1321] p-4 rounded-2xl text-center">
                   <span className="block text-[8px] font-bold text-[#aec6ff] uppercase mb-1">Closing</span>
                   <span className="block text-2xl font-black">{closingToday}</span>
                </div>
                <div className="bg-[#0c1321] p-4 rounded-2xl text-center">
                   <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Pending</span>
                   <span className="block text-2xl font-black">{pendingToday}</span>
                </div>
                <div className="bg-[#0c1321] p-4 rounded-2xl text-center text-rose-400">
                   <span className="block text-[8px] font-bold uppercase mb-1">Reject</span>
                   <span className="block text-2xl font-black">{rejectToday}</span>
                </div>
              </div>
            </section>

            <section className="col-span-8 bg-[#19202e] p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col justify-center">
               <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#aec6ff]/5 rounded-full blur-3xl"></div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-4">Monthly Target</p>
               <h2 className="text-7xl font-black tracking-tighter text-[#aec6ff] mb-2">{filteredData.length} <span className="text-xl text-white/20 font-normal">/ {picTarget} Target</span></h2>
               <div className="mt-10 space-y-4">
                 <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-[#aec6ff]">Progress Pencapaian</span>
                    <span>{achievementPercent}% Complete</span>
                 </div>
                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#aec6ff] transition-all duration-1000 shadow-[0_0_15px_rgba(174,198,255,0.5)]" style={{width: `${achievementPercent}%`}}></div>
                 </div>
                 <p className="text-[10px] font-bold text-white/30 italic">Berdasarkan Inputan Promotor di area masing-masing.</p>
               </div>
            </section>
          </div>
        )}

        {/* TAB 2: INSIGHTS (CHARTS) */}
        {tab === "grafik" && (
          <div className="space-y-8">
             <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5">
                <h3 className="text-xs font-black uppercase tracking-[0.5em] text-[#aec6ff] mb-10">Daily Submission Trend Analysis</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#aec6ff" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#aec6ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff60', fontWeight: 'bold'}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '12px'}}
                        itemStyle={{color: '#aec6ff', fontSize: '12px', fontWeight: '900'}}
                      />
                      <Area type="monotone" dataKey="count" stroke="#aec6ff" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* TAB 3: TEAM PERFORMANCE (LIST) */}
        {tab === "promotor" && (
          <div className="space-y-8">
            <h2 className="text-xl font-black uppercase tracking-widest text-[#aec6ff]">Team Performance Detail</h2>
            <div className="grid grid-cols-2 gap-6">
              {teamStats.map((p, i) => (
                <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-black uppercase leading-tight tracking-tight">{p.nama_promotor}</h4>
                      <p className="text-[10px] font-bold text-[#aec6ff] uppercase tracking-widest mt-1 opacity-60">{p.nama_toko}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-3xl font-black text-[#aec6ff]">{p.rate}%</span>
                      <span className="block text-[8px] font-black uppercase tracking-widest opacity-40">Approval Rate</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                      <span>Volume Analysis</span>
                      <span>{p.count} / {p.pTarget} Submissions</span>
                    </div>
                    <div className="h-1.5 bg-[#0c1321] rounded-full overflow-hidden">
                      <div className="h-full bg-[#aec6ff] transition-all duration-700 shadow-[0_0_10px_rgba(174,198,255,0.2)]" style={{width: `${p.progress}%`}}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
