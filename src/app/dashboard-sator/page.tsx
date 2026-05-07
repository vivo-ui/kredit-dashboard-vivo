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
  BarChart,
  Bar,
  Legend
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * RESPONSIVE SATOR DASHBOARD - V10 (FINAL)
 * Features:
 * 1. Adaptive Shell: Sidebar for Desktop, Top/Bottom Bars for Mobile.
 * 2. Data Isolation per PIC with Normalization (Yuven Fix).
 * 3. Global Filters (Date/Month) fully responsive.
 * 4. Excel Export & Real-time Insights.
 * 5. Numerical focus (Submission Counts only).
 */

export default function SatorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);

  // State Management
  const [data, setData] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PIC Identity
  const [picName, setPicName] = useState("");
  const [picArea, setPicArea] = useState("");

  // Filters
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Detect Device
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const normalize = (text: any) => (text || "").toString().trim().toLowerCase();

  async function loadAllData(satorName: string) {
    setLoading(true);
    const { data: kd } = await supabase.from("kredit_vast").select("*");
    const { data: pr } = await supabase.from("promotors").select("*");
    const { data: tk } = await supabase.from("tokos").select("*");
    const { data: tg } = await supabase.from("targets").select("*");

    const normSator = normalize(satorName);

    // PROACTIVE ENRICHMENT (Consistency Fix)
    const promotorMap = new Map();
    (pr || []).forEach(p => promotorMap.set(normalize(p.nama_promotor), p));

    const enrichedKd = (kd || []).map(d => {
      const p = promotorMap.get(normalize(d.promotor));
      return { 
        ...d, 
        area: p?.area || d.area || "",
        sator: p?.sator || d.sator || "" 
      };
    });

    const picData = enrichedKd.filter(d => normalize(d.sator).includes(normSator));
    const picPromotors = (pr || []).filter(p => normalize(p.sator).includes(normSator));
    const picTokos = (tk || []).filter(t => normalize(t.sator).includes(normSator));

    setData(picData);
    setPromotors(picPromotors);
    setTokos(picTokos);
    setTargets(tg || []);
    setLoading(false);
  }

  const handleLogout = async () => {
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;
    localStorage.removeItem("sator_identity");
    localStorage.removeItem("sator_area");
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (dateFilter) return d.tanggal === dateFilter;
      if (monthFilter) {
        return d.tanggal.startsWith(monthFilter);
      }
      return true;
    });
  }, [data, dateFilter, monthFilter]);

  const currentMonthStr = useMemo(() => {
    if (monthFilter) return monthFilter;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [monthFilter]);

  // 1. CALCULATIONS (Respecting Filters)
  const filteredClosing = filteredData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
  const filteredPending = filteredData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
  const filteredReject = filteredData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
  const filteredTotal = filteredData.length;
  
  // Overall ACC Rate includes Closing + Pending
  const efficiency = filteredTotal > 0 ? Math.round(((filteredClosing + filteredPending) / filteredTotal) * 100) : 0;

  const picTarget = useMemo(() => {
    return targets
      .filter(t => promotors.some(p => normalize(p.nama_promotor) === normalize(t.promotor)) && (t.bulan || "").trim() === currentMonthStr)
      .reduce((sum, t) => sum + (t.target || 0), 0);
  }, [targets, promotors, currentMonthStr]);

  const achievementPercent = picTarget > 0 ? Math.round((filteredData.length / picTarget) * 100) : 0;

  const teamStats = useMemo(() => {
    return promotors.map((p) => {
      const pName = normalize(p.nama_promotor);
      const pData = filteredData.filter((d) => normalize(d.promotor) === pName);
      const count = pData.length;
      const closing = pData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = pData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = pData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      
      const pTarget = targets.find(t => normalize(t.promotor) === pName && (t.bulan || "").trim() === currentMonthStr)?.target || 0;
      const rate = count > 0 ? Math.round(((closing + pending) / count) * 100) : 0;
      const progress = pTarget > 0 ? Math.round((count / pTarget) * 100) : 0;
      
      return { ...p, count, closing, pending, reject, pTarget, rate, progress };
    }).sort((a, b) => b.progress - a.progress);
  }, [promotors, filteredData, targets, currentMonthStr]);

  const dealerStats = useMemo(() => {
    return tokos.map((t) => {
      const tName = normalize(t.nama_toko);
      const tData = filteredData.filter((d) => normalize(d.toko) === tName);
      const count = tData.length;
      const closing = tData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = tData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = tData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;

      const tTarget = targets.filter(tg => {
        const p = promotors.find(x => normalize(x.nama_promotor) === normalize(tg.promotor));
        return normalize(p?.nama_toko) === tName && (tg.bulan || "").trim() === currentMonthStr;
      }).reduce((sum, tg) => sum + (tg.target || 0), 0);
      
      const progress = tTarget > 0 ? Math.round((count / tTarget) * 100) : 0;
      const rate = count > 0 ? Math.round(((closing + pending) / count) * 100) : 0;
      
      return { ...t, count, closing, pending, reject, tTarget, progress, rate };
    }).sort((a, b) => b.progress - a.progress);
  }, [tokos, filteredData, targets, promotors, currentMonthStr]);


  const chartData = useMemo(() => {
    const groups: any = {};
    filteredData.forEach(d => {
      const dateKey = new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });
    return Object.keys(groups).map(date => ({ date, count: groups[date] }));
  }, [filteredData]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sator_Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `Ledger_Report_${picName}.xlsx`);
  };

  if (loading) return (
    <div className="h-screen bg-[#0c1321] flex flex-col items-center justify-center font-['Manrope'] text-[#aec6ff]">
       <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl animate-pulse mb-4">V</div>
       <p className="font-bold tracking-widest uppercase text-[10px]">Establishing Secure PIC Link...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c1321] font-['Manrope'] text-[#dce2f6] antialiased">
      
      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <aside className="w-64 border-r border-white/5 flex flex-col p-8 fixed h-full z-50 bg-[#0c1321]">
          <div className="mb-12">
            <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl shadow-[0_0_30px_rgba(174,198,255,0.3)]">VF</div>
            <div className="mt-8">
              <h2 className="text-lg font-black tracking-tighter text-white">{picName}</h2>
              <p className="text-[10px] font-bold text-[#aec6ff]/40 uppercase tracking-widest mt-1">Area: {picArea}</p>
            </div>
          </div>
          <nav className="flex-1 space-y-2">
            {[
              { id: "dashboard", icon: "dashboard", label: "Overview" },
              { id: "grafik", icon: "insights", label: "Insights" },
              { id: "promotor", icon: "group", label: "Team Progress" },
              { id: "dealer", icon: "storefront", label: "Dealers" },
              { id: "ai", icon: "psychology", label: "AI Analysis" }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${tab === item.id ? 'bg-white/5 text-[#aec6ff] shadow-sm font-black' : 'text-white/20 hover:text-white/40'}`}
              >
                <span className="material-icons-outlined text-xl">{item.icon}</span>
                <span className="text-[11px] uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={handleLogout} className="mt-auto flex items-center gap-4 px-5 py-4 text-rose-400/40 hover:text-rose-400 rounded-2xl hover:bg-rose-400/5 transition-all">
            <span className="material-icons-outlined">logout</span>
            <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
          </button>
        </aside>
      )}

      {/* MOBILE TOP BAR */}
      {isMobile && (
        <header className="fixed top-0 w-full z-50 bg-[#0c1321]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-sm shadow-lg shadow-[#aec6ff]/20">V</div>
            <div>
               <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">Sator Panel</h1>
               <p className="text-[8px] font-bold text-[#aec6ff]/40 uppercase tracking-widest mt-1">Area: {picArea}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
             <span className="material-icons-outlined text-lg">logout</span>
          </button>
        </header>
      )}

      {/* MAIN CONTENT */}
      <main className={`${!isMobile ? 'ml-64 p-12' : 'pt-28 px-5 pb-40'} max-w-[1440px] mx-auto`}>
        
        {/* FILTERS */}
        <div className="flex flex-wrap justify-between items-center gap-6 mb-12">
          <div className="flex bg-[#151b2a] p-1 rounded-2xl border border-white/5 w-full sm:max-w-[420px]">
            <input type="date" className="bg-transparent text-[11px] font-black p-3 outline-none text-[#aec6ff] w-full" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            <select className="bg-transparent text-[11px] font-black p-3 outline-none text-[#aec6ff] w-full border-l border-white/5" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="" className="bg-[#151b2a]">Semua Bulan</option>
              {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m, i) => (
                <option key={i} value={`2026-${m}`} className="bg-[#151b2a]">{["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][i]} 2026</option>
              ))}
            </select>
          </div>
          {!isMobile && (
            <button onClick={exportExcel} className="bg-[#aec6ff] text-[#0c1321] px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#aec6ff]/10 hover:opacity-90 active:scale-95 transition-all flex items-center gap-3">
              <span className="material-icons-outlined text-sm">download</span>
              Export Report
            </button>
          )}
        </div>

        {/* TAB CONTENT */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-4 bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 relative">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#aec6ff]/40 mb-8 text-center">Approval Matrix</h3>
              <div className="flex justify-center py-6">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{v: efficiency}, {v: 100-efficiency}]} innerRadius={75} outerRadius={90} dataKey="v" startAngle={90} endAngle={450}>
                        <Cell fill="#aec6ff" stroke="none" /><Cell fill="#1d263a" stroke="none" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-[#aec6ff]">{efficiency}%</span>
                    <span className="text-[9px] font-black text-[#aec6ff]/40 uppercase tracking-widest mt-1">ACC Rate</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-10">
                <div className="bg-[#0c1321] p-4 rounded-2xl text-center border border-white/5">
                   <span className="block text-[9px] font-black text-white/20 uppercase mb-1">ACC</span>
                   <span className="block text-xl font-black text-[#aec6ff]">{filteredClosing}</span>
                </div>
                <div className="bg-[#0c1321] p-4 rounded-2xl text-center border border-white/5">
                   <span className="block text-[9px] font-black text-white/20 uppercase mb-1">PEND</span>
                   <span className="block text-xl font-black text-amber-500">{filteredPending}</span>
                </div>
                <div className="bg-[#0c1321] p-4 rounded-2xl text-center border border-white/5">
                   <span className="block text-[9px] font-black text-white/20 uppercase mb-1">REJ</span>
                   <span className="block text-xl font-black text-rose-500">{filteredReject}</span>
                </div>
                <div className="bg-[#aec6ff] p-4 rounded-2xl text-center text-[#0c1321] shadow-lg shadow-[#aec6ff]/10">
                   <span className="block text-[9px] font-black opacity-50 uppercase mb-1">Total</span>
                   <span className="block text-xl font-black">{filteredTotal}</span>
                </div>
              </div>
            </section>

            <section className="lg:col-span-8 bg-[#151b2a] p-12 rounded-[3.5rem] border border-white/5 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150">
                  <span className="material-icons-outlined text-[15rem] text-[#aec6ff]">analytics</span>
               </div>
               <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#aec6ff]/40 mb-4">Pencapaian Area vs Target</p>
               <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="text-8xl font-black tracking-tighter text-[#aec6ff]">{filteredData.length}</h2>
                  <span className="text-2xl font-bold text-white/10">/ {picTarget} Target</span>
               </div>
               <div className="space-y-4 max-w-lg relative z-10">
                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-white/20">Completion Status</span>
                    <span className={achievementPercent >= 100 ? 'text-emerald-400' : 'text-[#aec6ff]'}>{achievementPercent}%</span>
                 </div>
                 <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${achievementPercent >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, achievementPercent)}%`}}></div>
                 </div>
                 <p className="text-[10px] font-bold text-white/20 italic">Sinkronisasi data real-time dengan {promotors.length} Promotor Aktif.</p>
               </div>
            </section>
          </div>
        )}

        {tab === "grafik" && (
          <div className="space-y-8">
             <div className="bg-[#151b2a] p-12 rounded-[3rem] border border-white/5">
                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-12">Area Performance Trend</h3>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#aec6ff" stopOpacity={0.1}/><stop offset="95%" stopColor="#aec6ff" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff40', fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff40', fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '16px'}} />
                      <Area type="monotone" dataKey="count" stroke="#aec6ff" strokeWidth={5} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-[#151b2a] p-12 rounded-[3rem] border border-white/5">
                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-12">Target vs Pencapaian Team</h3>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                      <XAxis dataKey="nama_promotor" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#aec6ff40', fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff40', fontWeight: 'bold'}} />
                      <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '16px'}} />
                      <Bar dataKey="pTarget" name="Target Unit" fill="#1d263a" radius={[10, 10, 0, 0]} barSize={40} />
                      <Bar dataKey="count" name="Realisasi" fill="#aec6ff" radius={[10, 10, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {tab === "promotor" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamStats.map((p, i) => (
              <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-white uppercase leading-tight truncate">{p.nama_promotor}</h4>
                    <p className="text-[9px] font-bold text-[#aec6ff]/40 uppercase tracking-widest mt-1 truncate">{p.nama_toko}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-[#aec6ff]">{p.rate}%</span>
                    <span className="block text-[8px] font-black uppercase tracking-widest text-white/20">ACC Rate</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px] font-black uppercase text-white/20">
                    <span>Target: {p.count} / {p.pTarget}</span>
                    <span className={p.progress >= 100 ? 'text-emerald-500' : 'text-[#aec6ff]'}>{p.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${p.progress >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, p.progress)}%`}}></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-4 border-t border-white/5">
                    <div><p className="text-[8px] font-black text-white/20 uppercase">ACC</p><p className="text-sm font-black text-[#aec6ff]">{p.closing + p.pending}</p></div>
                    <div><p className="text-[8px] font-black text-white/20 uppercase">PEND</p><p className="text-sm font-black opacity-60">{p.pending}</p></div>
                    <div><p className="text-[8px] font-black text-white/20 uppercase">REJ</p><p className="text-sm font-black text-rose-500">{p.reject}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "dealer" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dealerStats.map((t, i) => (
              <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-black text-white uppercase">{t.nama_toko}</h4>
                    <p className="text-[10px] font-bold text-[#aec6ff]/40 uppercase tracking-widest mt-1">Authorized Dealer Point</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-[#aec6ff]">{t.rate}%</span>
                    <p className="text-[9px] font-black uppercase text-white/20">ACC Rate</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/20">
                    <span>Target: {t.count} / {t.tTarget}</span>
                    <span className={t.progress >= 100 ? 'text-emerald-500' : 'text-[#aec6ff]'}>{t.progress}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${t.progress >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, t.progress)}%`}}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <span className="material-icons-outlined text-white/20 text-sm">group</span>
                       <span className="text-[10px] font-black text-white/20 uppercase">Team Flores Active</span>
                    </div>
                    <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                      <span className="text-[10px] font-black text-[#aec6ff] uppercase">{t.count} SUBMISSIONS</span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "ai" && (
           <div className="space-y-8">
              <div className="bg-[#aec6ff] p-12 rounded-[3.5rem] text-[#0c1321] shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 max-w-xl">
                    <h2 className="text-4xl font-black leading-tight tracking-tight">Area Intelligence</h2>
                    <p className="font-bold text-sm uppercase tracking-widest mt-4 opacity-50">Strategi Personal untuk Wilayah {picArea}</p>
                 </div>
                 <div className="absolute top-0 right-0 p-12 opacity-20 scale-150">
                    <span className="material-icons-outlined text-[12rem]">psychology</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-6 md:col-span-2">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#aec6ff]">
                          <span className="material-icons-outlined">info</span>
                       </div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#aec6ff]">Rekomendasi Strategis Area</h3>
                    </div>
                    <p className="text-base leading-relaxed text-white/60 font-medium">
                       Berdasarkan pencapaian area {picArea} sebesar {achievementPercent}%, prioritas utama adalah melakukan audit pada dealer dengan pencapaian di bawah 50%. Pastikan setiap promotor memaksimalkan penggunaan alat bantu pemasaran digital untuk meningkatkan volume inputan.
                    </p>
                 </div>

                 {teamStats.map((p, i) => (
                    <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full ${p.progress >= 80 ? 'bg-emerald-400' : p.progress >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}></div>
                             <h4 className="text-sm font-black uppercase text-white">{p.nama_promotor}</h4>
                          </div>
                          <span className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-white/5 text-[#aec6ff]/40 uppercase">Action Plan</span>
                       </div>
                       <p className="text-sm leading-relaxed text-white/40 font-medium italic">
                          {p.progress < 60 ? `Tingkatkan intensitas prospek di ${p.nama_toko}. Fokus pada pengenalan program cicilan ringan untuk mengejar target ${p.pTarget} unit.` : 
                           p.rate < 60 ? `Fokus pada kualitas verifikasi data di ${p.nama_toko}. Pastikan dokumen konsumen lengkap sebelum melakukan input data ke sistem.` :
                           `Performa sangat baik di ${p.nama_toko}. Pertahankan standar kerja dan bagikan tips sukses Anda kepada anggota tim lainnya.`}
                       </p>
                    </div>
                 ))}
              </div>
           </div>
        )}

      </main>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <nav className="fixed bottom-0 w-full z-50 bg-[#0c1321]/80 backdrop-blur-xl border-t border-white/5 px-6 pb-10 pt-4 flex justify-around items-center">
          {[
            { id: "dashboard", icon: "dashboard", label: "Home" },
            { id: "grafik", icon: "insights", label: "Insights" },
            { id: "promotor", icon: "group", label: "Team" },
            { id: "dealer", icon: "storefront", label: "Dealers" },
            { id: "ai", icon: "psychology", label: "AI" }
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center gap-2 ${tab === item.id ? 'text-[#aec6ff]' : 'text-white/20'}`}>
              <span className="material-icons-outlined text-2xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}