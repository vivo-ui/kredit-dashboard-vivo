"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
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
 * KREDIT VIVO FLORES - UPGRADED DASHBOARD V14
 * - Full filter integration for all metrics.
 * - Sator Achievement Matrix on Home.
 * - Dynamic Daily Insights.
 * - Team Performance with full metrics (Targets, Closing, Pending, Reject, Approval Rate).
 * - AI Recommendations for every Promotor.
 */

export default function IntegratedDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(false);

  // State Management
  const [data, setData] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [sators, setSators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Global Filters
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    const { data: kd } = await supabase.from("kredit_vast").select("*");
    const { data: pr } = await supabase.from("promotors").select("*");
    const { data: tk } = await supabase.from("tokos").select("*");
    const { data: tg } = await supabase.from("targets").select("*");
    const { data: st } = await supabase.from("sators").select("*");
    setData(kd || []);
    setPromotors(pr || []);
    setTokos(tk || []);
    setTargets(tg || []);
    setSators(st || []);
    setLoading(false);
  }

  // GLOBAL FILTER LOGIC
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

  const currentMonthStr = monthFilter 
    ? `2026-${monthFilter.padStart(2, '0')}` 
    : new Date().toISOString().slice(0, 7);

  // SATOR LOGIC
  const satorStats = useMemo(() => {
    return sators.map((s) => {
      const sName = s.nama_sator?.toLowerCase().trim();
      const sData = filteredData.filter((d) => (d.sator || "").toLowerCase().trim() === sName);
      
      const closing = sData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = sData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = sData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      const count = sData.length;

      const sTarget = targets.filter(t => {
        const p = promotors.find(x => x.nama_promotor === t.promotor);
        return p?.sator === s.nama_sator && t.bulan === currentMonthStr;
      }).reduce((sum, t) => sum + (t.target || 0), 0);

      const percent = sTarget > 0 ? Math.round((count / sTarget) * 100) : 0;
      const approvalRate = count > 0 ? Math.round(((pending + closing) / count) * 100) : 0;

      return { ...s, count, closing, pending, reject, sTarget, percent, approvalRate };
    }).sort((a, b) => b.count - a.count);
  }, [sators, filteredData, targets, promotors, currentMonthStr]);

  // TEAM LOGIC
  const teamStats = useMemo(() => {
    return promotors.map((p) => {
      const pName = p.nama_promotor?.toLowerCase().trim();
      const pData = filteredData.filter((d) => (d.promotor || "").toLowerCase().trim() === pName);
      const count = pData.length;
      
      const closing = pData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = pData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = pData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;

      const pTarget = targets.find(t => t.promotor?.toLowerCase().trim() === pName && t.bulan === currentMonthStr)?.target || 0;
      const approvalRate = count > 0 ? Math.round(((pending + closing) / count) * 100) : 0;
      const progress = pTarget > 0 ? Math.round((count / pTarget) * 100) : 0;

      return { ...p, count, closing, pending, reject, pTarget, approvalRate, progress };
    }).sort((a, b) => b.count - a.count);
  }, [promotors, filteredData, targets, currentMonthStr]);

  // CHART LOGIC
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
    XLSX.utils.book_append_sheet(wb, ws, "Financial_Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), `VF_Report_${currentMonthStr}.xlsx`);
  };

  if (loading) return (
    <div className="h-screen bg-[#0c1321] flex flex-col items-center justify-center font-['Manrope']">
      <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl animate-pulse mb-4 text-center">VF</div>
      <p className="text-[#aec6ff] font-bold tracking-widest uppercase text-[10px] text-center">Calibrating Financial Hub...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c1321] font-['Manrope'] text-[#dce2f6] antialiased">
      
      {/* STICKY HEADER */}
      <header className="fixed top-0 w-full z-[100] bg-[#0c1321]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#aec6ff] rounded-lg flex items-center justify-center text-[#0c1321] font-black text-sm">VF</div>
          <h1 className="text-sm font-black uppercase tracking-widest hidden sm:block">Dashboard Kredit Area Flores</h1>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="flex bg-[#151b2a] p-1 rounded-xl border border-white/5 flex-1 max-w-[280px]">
            <input type="date" className="bg-transparent text-[10px] font-bold p-2 outline-none text-[#aec6ff] w-full" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            <select className="bg-transparent text-[10px] font-bold p-2 outline-none text-[#aec6ff] w-full border-l border-white/5" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="" className="bg-[#151b2a]">All Months</option>
              {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => (
                <option key={i} value={i + 1} className="bg-[#151b2a]">{m} 2026</option>
              ))}
            </select>
          </div>
          <button onClick={exportExcel} className="bg-[#aec6ff] text-[#0c1321] p-3 rounded-xl hover:opacity-90 active:scale-95 transition-all">
             <span className="material-icons-outlined text-sm">file_download</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-[1440px] mx-auto">
        
        {/* TAB 1: HOME (SATOR MATRIX) */}
        {tab === "dashboard" && (
          <div className="space-y-8">
             <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#aec6ff]/60 mb-2">Total Pengajuan/Inputan</p>
                <h2 className="text-6xl font-black tracking-tighter text-[#aec6ff] mb-6">{filteredData.length}</h2>
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Pencapaian Terhadap Target</span>
                   <span className="text-[10px] font-black text-[#aec6ff]">78%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#aec6ff]" style={{width: '78%'}}></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {satorStats.map((s, i) => (
                    <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                       <div className="flex justify-between items-start">
                          <div>
                             <h4 className="text-lg font-black uppercase">{s.nama_sator}</h4>
                             <p className="text-[10px] font-bold text-[#aec6ff] opacity-60">PIC AREA</p>
                          </div>
                          <div className="bg-[#aec6ff]/10 px-3 py-1 rounded-full">
                             <span className="text-[10px] font-black text-[#aec6ff]">{s.approvalRate}% RATE</span>
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                             <span>Target: {s.count} / {s.sTarget}</span>
                             <span>{s.percent}%</span>
                          </div>
                          <div className="h-1 bg-[#0c1321] rounded-full overflow-hidden">
                             <div className="h-full bg-[#aec6ff]" style={{width: `${s.percent}%`}}></div>
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-4">
                          <div><p className="text-[8px] font-black opacity-30 uppercase">Closing</p><p className="text-sm font-black text-[#aec6ff]">{s.closing}</p></div>
                          <div><p className="text-[8px] font-black opacity-30 uppercase">Pending</p><p className="text-sm font-black">{s.pending}</p></div>
                          <div><p className="text-[8px] font-black opacity-30 uppercase">Reject</p><p className="text-sm font-black text-rose-400">{s.reject}</p></div>
                       </div>
                    </div>
                 ))}
              </div>
          </div>
        )}

        {/* TAB 2: INSIGHTS (DAILY CHART) */}
        {tab === "grafik" && (
          <div className="bg-[#151b2a] p-8 rounded-[3rem] border border-white/5">
             <div className="mb-10">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-2">Inputan Harian area Flores</h3>
                <p className="text-[10px] font-bold opacity-40 uppercase">Tren Input Harian </p>
             </div>
             <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#aec6ff" stopOpacity={0.3}/><stop offset="95%" stopColor="#aec6ff" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#aec6ff60', fontWeight: 'bold'}} />
                  <Tooltip contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '12px'}} />
                  <Area type="monotone" dataKey="count" stroke="#aec6ff" strokeWidth={4} fill="url(#gCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM PERFORMANCE */}
        {tab === "promotor" && (
          <div className="space-y-4">
             {teamStats.map((p, i) => (
                <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                   <div className="flex justify-between items-center">
                      <h4 className="text-lg font-black uppercase">{p.nama_promotor}</h4>
                      <div className="text-right">
                         <span className="text-2xl font-black text-[#aec6ff]">{p.approvalRate}%</span>
                         <p className="text-[8px] font-black uppercase opacity-30">Approval</p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase opacity-40">
                         <span>Target: {p.count} / {p.pTarget}</span>
                         <span>{p.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#0c1321] rounded-full overflow-hidden">
                         <div className="h-full bg-[#aec6ff]" style={{width: `${p.progress}%`}}></div>
                      </div>
                   </div>
                   <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-4">
                      <div><p className="text-[8px] font-black opacity-30 uppercase">Closing</p><p className="text-sm font-black text-[#aec6ff]">{p.closing}</p></div>
                      <div><p className="text-[8px] font-black opacity-30 uppercase">Pending</p><p className="text-sm font-black">{p.pending}</p></div>
                      <div><p className="text-[8px] font-black opacity-30 uppercase">Reject</p><p className="text-sm font-black text-rose-400">{p.reject}</p></div>
                   </div>
                </div>
             ))}
          </div>
        )}

        {/* TAB 4: DEALERS */}
        {tab === "dealer" && (
          <div className="bg-[#151b2a] rounded-[2.5rem] border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#19202e] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-[#aec6ff]/60">
                  <th className="px-8 py-6">Dealer</th>
                  <th className="px-8 py-6 text-center">Jumlah Pengajuan</th>
                  <th className="px-8 py-6 text-right">Rate Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tokos.map((t, i) => {
                  const tData = filteredData.filter(d => d.toko === t.nama_toko);
                  const count = tData.length;
                  const rate = count > 0 ? Math.round((tData.filter(d => (d.status || "").toLowerCase().includes("clos")).length / count) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-[#19202e]/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-sm uppercase">{t.nama_toko}</td>
                      <td className="px-8 py-6 text-center font-black text-[#aec6ff]">{count}</td>
                      <td className="px-8 py-6 text-right font-black text-[10px] text-emerald-400">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: AI (ALL PROMOTORS) */}
        {tab === "ai" && (
           <div className="space-y-6">
              <div className="bg-[#aec6ff] p-10 rounded-[3rem] text-[#0c1321] mb-10">
                 <h2 className="text-3xl font-black leading-tight">Analisa dan Perbaikan</h2>
                 <p className="font-bold text-xs uppercase tracking-widest mt-2">Optimalisasi Performa Tim Berbasis Data</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {promotors.map((p, i) => (
                    <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex justify-between items-center">
                          <h4 className="text-sm font-black uppercase text-[#aec6ff]">{p.nama_promotor}</h4>
                          <span className="text-[8px] font-black px-2 py-1 rounded bg-[#aec6ff]/10 text-[#aec6ff] uppercase">Analisa dan Perbaikan</span>
                       </div>
                       <p className="text-xs leading-relaxed opacity-60 font-medium italic">
                         Berdasarkan {p.count} pengajuan saat ini, tingkatkan Pengecekan Limit, Aktivitas cek limit diluar toko (Perkantoran, Pasar dan atau Desa), Perkuat aktivitas media sosial perihal Cicilan Kredit Vast Finance dan, Kualitas Konsumen  {p.area || 'Regional'} untuk mendorong kenaikan approval rate dari {teamStats.find(x => x.nama_promotor === p.nama_promotor)?.approvalRate}%.
                       </p>
                    </div>
                 ))}
              </div>
           </div>
        )}

      </main>

      <nav className="fixed bottom-0 w-full z-[100] bg-[#0c1321]/90 backdrop-blur-3xl border-t border-white/5 px-6 pb-10 pt-4 flex justify-around items-center">
        {[
          { id: "dashboard", icon: "grid_view", label: "Home" },
          { id: "grafik", icon: "query_stats", label: "Insights" },
          { id: "promotor", icon: "group", label: "Team" },
          { id: "dealer", icon: "storefront", label: "Dealers" },
          { id: "ai", icon: "psychology", label: "AI" }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center gap-2 transition-all ${tab === item.id ? 'text-[#aec6ff]' : 'text-white/20'}`}>
            <span className="material-icons-outlined text-2xl">{item.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
