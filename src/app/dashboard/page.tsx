
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
 * INTEGRATED DASHBOARD V13 - FINAL RESPONSIVE
 * Features:
 * 1. Adaptive UI for Mobile & Desktop.
 * 2. Purely Numerical Focus (Submission Counts only).
 * 3. Team Tab: No photos, detailed metrics (Submissions/Target, Closing, Pending, Reject).
 * 4. Approval Rate Logic: ((Pending + Closing) / Total Submissions) * 100.
 * 5. Sticky Global Header with Date/Month Filters and Excel Export.
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

  // Handle Responsive Resize
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

  // Filter Logic (Applied globally)
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

  // 1. DASHBOARD CALCULATIONS
  const today = new Date().toISOString().slice(0, 10);
  const todayData = data.filter((d) => String(d.tanggal).slice(0, 10) === today);
  const closingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
  const pendingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
  const rejectToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
  const totalToday = todayData.length;
  const efficiency = totalToday > 0 ? Math.round((closingToday / totalToday) * 100) : 0;

  // Sator Achievements
  const satorStats = useMemo(() => {
    return sators.map((s) => {
      const sName = s.nama_sator?.toLowerCase().trim();
      const sData = filteredData.filter((d) => (d.sator || "").toLowerCase().trim() === sName);
      const count = sData.length;
      const sTarget = targets.filter(t => {
        const p = promotors.find(x => x.nama_promotor === t.promotor);
        return p?.sator === s.nama_sator && t.bulan === currentMonthStr;
      }).reduce((sum, t) => sum + (t.target || 0), 0);
      const percent = sTarget > 0 ? Math.round((count / sTarget) * 100) : 0;
      return { ...s, count, percent };
    }).sort((a, b) => b.count - a.count);
  }, [sators, filteredData, targets, promotors, currentMonthStr]);

  // 2. TEAM PERFORMANCE (V13 Logic)
  const teamStats = useMemo(() => {
    return promotors.map((p) => {
      const pName = p.nama_promotor?.toLowerCase().trim();
      const pData = filteredData.filter((d) => (d.promotor || "").toLowerCase().trim() === pName);
      const count = pData.length;
      
      const closing = pData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = pData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = pData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;

      const pTarget = targets.find(t => t.promotor?.toLowerCase().trim() === pName && t.bulan === currentMonthStr)?.target || 0;
      
      // Approval Rate: ((Pending + Closing) / Total Submissions) * 100
      const approvalRate = count > 0 ? Math.round(((pending + closing) / count) * 100) : 0;
      const progress = pTarget > 0 ? Math.min(100, Math.round((count / pTarget) * 100)) : 0;

      return { ...p, count, closing, pending, reject, pTarget, approvalRate, progress };
    }).sort((a, b) => b.count - a.count);
  }, [promotors, filteredData, targets, currentMonthStr]);

  // 3. CHART DATA
  const chartData = useMemo(() => {
    const groups: any = {};
    filteredData.forEach(d => {
      const dateKey = new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });
    return Object.keys(groups).map(date => ({ date, count: groups[date] }));
  }, [filteredData]);

  // 4. EXCEL EXPORT
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger_Data");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "Vault_Fidelity_Report.xlsx");
  };

  if (loading) return (
    <div className="h-screen bg-[#0c1321] flex flex-col items-center justify-center font-['Manrope']">
      <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl animate-pulse mb-4">VF</div>
      <p className="text-[#aec6ff] font-bold tracking-widest uppercase text-[10px]">Syncing Architecture...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0c1321] font-['Manrope'] text-[#dce2f6] antialiased">
      
      {/* ADAPTIVE HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#0c1321]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-10 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#aec6ff] rounded-lg flex items-center justify-center text-[#0c1321] font-black text-sm">VF</div>
          <h1 className="text-sm font-black uppercase tracking-widest hidden sm:block">Dashboard Kredit VIVO FLORES</h1>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex bg-[#151b2a] p-1 rounded-xl border border-white/5 flex-1 max-w-[320px]">
            <input type="date" className="bg-transparent text-[10px] font-bold p-2 outline-none text-[#aec6ff] w-full" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            <select className="bg-transparent text-[10px] font-bold p-2 outline-none text-[#aec6ff] w-full border-l border-white/5" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="" className="bg-[#151b2a]">All Months</option>
              {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => (
                <option key={i} value={i + 1} className="bg-[#151b2a]">{m} 2026</option>
              ))}
            </select>
          </div>
          <button onClick={exportExcel} className="bg-[#aec6ff] text-[#0c1321] p-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
            <span className="material-icons-outlined text-sm">download</span>
            <span className="text-[10px] font-black uppercase hidden lg:block">Export</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="pt-24 lg:pt-32 pb-32 px-5 lg:px-20 max-w-[1440px] mx-auto">
        
        {/* TAB 1: OVERVIEW */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-4 bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#aec6ff]/40 mb-6">Efficiency Matrix</h3>
              <div className="flex justify-center py-6">
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{v: efficiency}, {v: 100-efficiency}]} innerRadius={70} outerRadius={85} dataKey="v" startAngle={90} endAngle={450}>
                        <Cell fill="#aec6ff" stroke="none" /><Cell fill="#1d263a" stroke="none" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-[#aec6ff]">{efficiency}%</span>
                    <span className="text-[10px] font-bold text-[#aec6ff]/40 uppercase mt-2">Efficiency</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-8 text-center">
                <div><span className="block text-[8px] font-bold text-[#aec6ff] uppercase mb-1">Closing</span><span className="text-xl font-black">{closingToday}</span></div>
                <div><span className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Pending</span><span className="text-xl font-black">{pendingToday}</span></div>
                <div className="text-rose-400"><span className="block text-[8px] font-bold uppercase mb-1">Reject</span><span className="text-xl font-black">{rejectToday}</span></div>
              </div>
            </section>

            <section className="lg:col-span-8 space-y-6">
              <div className="bg-[#19202e] p-10 rounded-[2.5rem] border border-white/10 relative overflow-hidden flex flex-col justify-center min-h-[280px]">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-4">Total Submissions</p>
                <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-[#aec6ff] mb-6">{filteredData.length}</h2>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#aec6ff] shadow-[0_0_15px_rgba(174,198,255,0.4)]" style={{width: '75%'}}></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {satorStats.slice(0, 4).map((s, i) => (
                  <div key={i} className="bg-[#151b2a] p-6 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-[#aec6ff]/60">{s.nama_sator}</span>
                      <span className="text-xs font-black text-[#aec6ff]">{s.percent}%</span>
                    </div>
                    <div className="h-1 bg-[#0c1321] rounded-full overflow-hidden"><div className="h-full bg-[#aec6ff]" style={{width: `${s.percent}%`}}></div></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: INSIGHTS */}
        {tab === "grafik" && (
          <div className="bg-[#151b2a] p-8 lg:p-12 rounded-[3rem] border border-white/5">
            <h3 className="text-xs font-black uppercase tracking-[0.5em] text-[#aec6ff] mb-10 text-center">Daily Submission Trend Analysis</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#aec6ff" stopOpacity={0.3}/><stop offset="95%" stopColor="#aec6ff" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff60', fontWeight: 'bold'}} />
                  <Tooltip contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '12px'}} itemStyle={{color: '#aec6ff', fontSize: '12px', fontWeight: '900'}} />
                  <Area type="monotone" dataKey="count" stroke="#aec6ff" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM PERFORMANCE (No Photos V13) */}
        {tab === "promotor" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teamStats.map((p, i) => (
              <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-lg font-black uppercase truncate">{p.nama_promotor}</h4>
                    <p className="text-[10px] font-bold text-[#aec6ff] uppercase tracking-widest mt-1 opacity-60 truncate">{p.area || 'Regional'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-3xl font-black text-[#aec6ff]">{p.approvalRate}%</span>
                    <span className="block text-[8px] font-black uppercase opacity-40">Approval Rate</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span>Quota: {p.count} / {p.pTarget}</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0c1321] rounded-full overflow-hidden">
                    <div className="h-full bg-[#aec6ff] shadow-[0_0_10px_rgba(174,198,255,0.2)]" style={{width: `${p.progress}%`}}></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-4">
                  <div><p className="text-[8px] font-bold uppercase opacity-30">Closing</p><p className="text-sm font-black text-[#aec6ff]">{p.closing}</p></div>
                  <div><p className="text-[8px] font-bold uppercase opacity-30">Pending</p><p className="text-sm font-black">{p.pending}</p></div>
                  <div><p className="text-[8px] font-bold uppercase opacity-30">Reject</p><p className="text-sm font-black text-rose-400">{p.reject}</p></div>
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
                <tr className="bg-[#19202e] border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-[#aec6ff]/60">
                  <th className="px-8 py-5">Dealer Network</th>
                  <th className="px-8 py-5 text-center">Input Vol.</th>
                  <th className="px-8 py-5 text-right">Approval %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tokos.map((t, i) => {
                  const tData = filteredData.filter(d => d.toko === t.nama_toko);
                  const count = tData.length;
                  const rate = count > 0 ? Math.round((tData.filter(d => (d.status || "").toLowerCase().includes("clos")).length / count) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-[#19202e]/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-sm">{t.nama_toko}</td>
                      <td className="px-8 py-6 text-center font-black text-[#aec6ff]">{count}</td>
                      <td className="px-8 py-6 text-right"><span className={`px-2 py-1 rounded-lg font-black text-[10px] ${rate > 80 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>{rate}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: AI */}
        {tab === "ai" && (
          <div className="space-y-6">
            <div className="bg-[#aec6ff] p-10 rounded-[3rem] text-[#0c1321]">
              <span className="material-icons-outlined text-4xl mb-4">psychology</span>
              <h2 className="text-3xl font-black leading-tight">Saran Perbaikan Kinerja Team.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tokos.slice(0, 4).map((t, i) => (
                <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black uppercase text-[#aec6ff]">{t.nama_toko}</h4>
                    <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase bg-blue-400/10 text-blue-400">Analysis Active</span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-60 font-medium">Recommend increasing promoter visits to boost daily submission velocity by 12%.</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ADAPTIVE NAVIGATION */}
      <nav className="fixed bottom-0 w-full z-50 bg-[#0c1321]/95 backdrop-blur-xl border-t border-white/5 px-4 pb-8 pt-4 flex justify-around items-center">
        {[
          { id: "dashboard", icon: "dashboard", label: "Home" },
          { id: "grafik", icon: "insights", label: "Insights" },
          { id: "promotor", icon: "group", label: "Team" },
          { id: "dealer", icon: "storefront", label: "Dealers" },
          { id: "ai", icon: "smart_toy", label: "AI" }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center gap-1.5 transition-all ${tab === item.id ? 'text-[#aec6ff]' : 'text-white/30'}`}>
            <span className="material-icons-outlined text-2xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
