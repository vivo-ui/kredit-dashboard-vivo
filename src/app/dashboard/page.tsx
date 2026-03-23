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

export default function IntegratedDashboard() {
  const [tab, setTab] = useState("dashboard");

  // State Management
  const [data, setData] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [sators, setSators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (Global for all tabs)
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

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

  // Filter Logic (Applied to all calculations)
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

  // 1. DASHBOARD CALCULATIONS (Efficiency Ring)
  const today = new Date().toISOString().slice(0, 10);
  const todayData = data.filter((d) => String(d.tanggal).slice(0, 10) === today);
  const closingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
  const pendingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
  const rejectToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
  const totalToday = todayData.length;
  const efficiency = totalToday > 0 ? Math.round((closingToday / totalToday) * 100) : 0;

  // 2. SATOR PERFORMANCE (Top Sators on Dashboard)
  const satorPerformance = useMemo(() => {
    return sators.map((s) => {
      const sName = s.nama_sator?.toLowerCase().trim();
      const sData = filteredData.filter((d) => d.sator?.toLowerCase().trim() === sName);
      const count = sData.length;
      
      const sTarget = targets.filter(t => {
        const p = promotors.find(x => x.nama_promotor === t.promotor);
        return p?.sator === s.nama_sator && t.bulan === currentMonthStr;
      }).reduce((sum, t) => sum + (t.target || 0), 0);

      const targetPercent = sTarget > 0 ? Math.round((count / sTarget) * 100) : 0;
      return { ...s, count, targetPercent };
    }).sort((a, b) => b.count - a.count);
  }, [sators, filteredData, targets, promotors, currentMonthStr]);

  // 3. PROMOTORS PERFORMANCE (Tab Menu)
  const promotorStats = useMemo(() => {
    return promotors.map((p) => {
      const pName = p.nama_promotor?.toLowerCase().trim();
      const pData = filteredData.filter((d) => d.promotor?.toLowerCase().trim() === pName);
      
      const count = pData.length;
      const closing = pData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = pData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = pData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      
      const pTarget = targets.find(t => 
        t.promotor?.toLowerCase().trim() === pName && 
        t.bulan === (monthFilter ? `${new Date().getFullYear()}-${monthFilter.padStart(2,'0')}` : currentMonthStr)
      )?.target || 0;

      const rate = count > 0 ? Math.round((closing / count) * 100) : 0;
      const progress = pTarget > 0 ? Math.min(100, Math.round((count / pTarget) * 100)) : 0;

      return { ...p, count, closing, pending, reject, pTarget, rate, progress };
    }).sort((a, b) => b.count - a.count);
  }, [promotors, filteredData, targets, monthFilter, currentMonthStr]);

  // 4. DEALERS PERFORMANCE
  const dealerPerformance = useMemo(() => {
    return tokos.map((t) => {
      const tData = filteredData.filter((d) => d.toko === t.nama_toko);
      const input = tData.length;
      const acc = tData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const rate = input > 0 ? Math.round((acc / input) * 100) : 0;
      return { ...t, input, rate };
    }).sort((a, b) => b.input - a.input);
  }, [tokos, filteredData]);

  // 5. INSIGHTS (DAILY CHART)
  const chartData = useMemo(() => {
    const groups: any = {};
    filteredData.forEach(d => {
      const dateKey = new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });
    return Object.keys(groups).map(date => ({ date, count: groups[date] }));
  }, [filteredData]);

  // 6.  RECOMMENDATIONS
  const aiInsights = useMemo(() => {
    return tokos.map((t) => {
      const tData = data.filter((d) => d.toko === t.nama_toko);
      const input = tData.length;
      const rej = tData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      const rejRate = input > 0 ? Math.round((rej / input) * 100) : 0;
      let category = ""; let advice = ""; let color = "";
      if (input < 5) { category = "Low Volume"; advice = "Saran: Buat Jadwal Harian kerja Perjam untuk Promotor Melakukan Pengecekan Limit diluar Toko, fokus pada jumlah pengajuan."; color = "blue"; }
      else if (rejRate > 40) { category = "High Rejection"; advice = "Saran: Evaluasi Kualitas Data konsumen, fokus pada konsumen yang memiliki penghasilan tetap diatas 3juta."; color = "rose"; }
      return { ...t, input, category, advice, color };
    }).filter(item => item.category !== "");
  }, [data, tokos]);

  // 7. EXPORT FUNCTION
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "Vault_Fidelity_Report.xlsx");
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-[#002F6C]">Syncing Data Ledger...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Manrope'] pb-24 text-slate-900">
      
      {/* GLOBAL TOP APP BAR (FILTERS) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#002F6C] rounded-lg flex items-center justify-center text-white font-bold">VF</div>
          <h1 className="text-[#002F6C] font-extrabold tracking-tight">DASHBOARD TRACKING KREDIT AREA FLORES</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <input 
              type="date" 
              className="bg-transparent text-[11px] font-bold p-2 outline-none border-none" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <select 
              className="bg-transparent text-[11px] font-bold p-2 outline-none border-none"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">Semua Bulan</option>
              {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => (
                <option key={i} value={i + 1}>{m} 2026</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportExcel}
              className="bg-[#002F6C] text-white text-[11px] font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-900/10"
            >
              <span className="material-icons-outlined text-sm">EXPORT</span>
              DATA
            </button>
            <button onClick={() => {setDateFilter(""); setMonthFilter("");}} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#002F6C]">Reset</button>
          </div>
        </div>
      </header>

      <main className="p-5 space-y-6 max-w-md mx-auto">
        
        {/* TAB 1: DASHBOARD */}
        {tab === "Dashboard" && (
          <>
            <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
              <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">PROGRESS HARI INI</h2>
              <div className="flex justify-center py-4">
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{v: efficiency}, {v: 100-efficiency}]} innerRadius={65} outerRadius={80} dataKey="v" startAngle={90} endAngle={450}>
                        <Cell fill="#002F6C" /><Cell fill="#F1F5F9" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-[#002F6C]">{efficiency}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Efficiency</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                   <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Closing</span>
                   <span className="block text-lg font-black text-[#002F6C]">{closingToday}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                   <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Pending</span>
                   <span className="block text-lg font-black text-slate-800">{pendingToday}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                   <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Reject</span>
                   <span className="block text-lg font-black text-rose-500">{rejectToday}</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-black text-[#002F6C] px-2">Top Sators (Progress Terhadap Target  )</h3>
              <div className="space-y-3">
                {satorPerformance.map((s, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">{s.nama_sator}</span>
                      <span className="text-xs font-black text-[#002F6C]">{s.targetPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#002F6C]" style={{width: `${s.targetPercent}%`}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* TAB 2: INSIGHTS (GRAPH) */}
        {tab === "grafik" && (
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Grafik Harian</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#002F6C" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#002F6C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#002F6C" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* TAB 3: PROMOTORS */}
        {tab === "promotor" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#002F6C] px-2">Progress Promotor</h2>
            <div className="space-y-4">
              {promotorStats.map((p, i) => (
                <div key={i} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 leading-tight">{p.nama_promotor}</h4>
                      <p className="text-[10px] font-bold text-[#002F6C] uppercase tracking-tighter">{p.area || 'Regional Area'}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-2xl font-black text-[#002F6C]">{p.rate}%</span>
                      <span className="block text-[8px] font-black text-slate-400 uppercase">Approval Rate</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Progress Input</span>
                      <span>{p.count} / {p.pTarget}</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div className="h-full bg-[#002F6C] rounded-full transition-all duration-700" style={{width: `${p.progress}%`}}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Closing</p>
                       <p className="text-sm font-black text-[#002F6C]">{p.closing}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Pending</p>
                       <p className="text-sm font-black text-slate-800">{p.pending}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl text-center">
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Reject</p>
                       <p className="text-sm font-black text-rose-500">{p.reject}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DEALERS */}
        {tab === "dealer" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[#002F6C] px-2">Dealers Network</h2>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4 font-black text-slate-400 uppercase tracking-widest">Dealer</th>
                    <th className="px-5 py-4 font-black text-slate-400 uppercase tracking-widest text-center">Input</th>
                    <th className="px-5 py-4 font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dealerPerformance.map((d, i) => (
                    <tr key={i} className="active:bg-slate-50">
                      <td className="px-5 py-5 font-bold text-slate-700">{d.nama_toko}</td>
                      <td className="px-5 py-5 font-black text-[#002F6C] text-center">{d.input}</td>
                      <td className="px-5 py-5 text-right">
                        <span className={`px-2 py-1 rounded-lg font-bold ${d.rate > 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {d.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AI */}
        {tab === "ai" && (
          <div className="space-y-6">
             <div className="bg-[#002F6C] p-7 rounded-[2.5rem] text-white shadow-xl">
               <span className="material-icons-outlined text-3xl mb-4 opacity-50">EVALUASI</span>
               <h2 className="text-2xl font-black leading-tight">Perbaikan yang harus dilakukan.</h2>
             </div>
             {aiInsights.map((insight, idx) => (
              <section key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800">{insight.nama_toko}</h4>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${insight.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                    {insight.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{insight.advice}</p>
              </section>
             ))}
          </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 py-3 pb-8 flex items-center justify-around z-50">
        {[
          {id: "Dashboard", icon: "Dashboard", label: "Home"},
          {id: "grafik", icon: "Data", label: "Insights"},
          {id: "promotor", icon: "Data", label: "Team"},
          {id: "dealer", icon: "Data", label: "Dealers"},
          {id: "ai", icon: "Analisys", label: "Saran Perbaikan"}
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${tab === item.id ? 'text-[#002F6C]' : 'text-slate-300'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${tab === item.id ? 'bg-[#002F6C]/10 scale-110' : ''}`}>
              <span className="material-icons-outlined text-2xl">{item.icon}</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}