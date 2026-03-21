"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// --- Design System Constants (Cobalt Core) ---
const COLORS = {
  primary: "#0052FF",
  secondary: "#64748b",
  success: "#10b981",
  pending: "#f59e0b",
  error: "#ef4444",
  background: "#f8fafc",
  card: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  chartGrey: "#e2e8f0"
};

const PIE_COLORS = [COLORS.primary, COLORS.chartGrey];

export default function Dashboard() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadData();
    loadPromotors();
    loadTokos();
    loadTargets();
  }, []);

  async function loadData() {
    const { data } = await supabase.from("kredit_vast").select("*");
    setData(data || []);
  }

  async function loadPromotors() {
    const { data } = await supabase.from("promotors").select("*");
    setPromotors(data || []);
  }

  async function loadTokos() {
    const { data } = await supabase.from("tokos").select("*");
    setTokos(data || []);
  }

  async function loadTargets() {
    const { data } = await supabase.from("targets").select("*");
    setTargets(data || []);
  }

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (dateFilter) return d.tanggal === dateFilter;
      if (monthFilter) {
        const month = new Date(d.tanggal).getMonth() + 1;
        return month === parseInt(monthFilter);
      }
      return true;
    });
  }, [data, dateFilter, monthFilter]);

  // --- Today's Progress ---
  const today = new Date().toISOString().slice(0, 10);
  const todayData = useMemo(() => {
    return data.filter((d) => String(d.tanggal).slice(0, 10) === today);
  }, [data, today]);

  const closingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
  const pendingToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
  const rejectToday = todayData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
  const totalToday = todayData.length;

  const progressPieData = [
    { name: "Progress", value: totalToday },
    { name: "Remaining", value: Math.max(0, 100 - totalToday) }
  ];

  // --- Monthly Targets ---
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const totalTarget = useMemo(() => {
    return targets
      .filter((t) => t.bulan === currentMonthStr)
      .reduce((sum, t) => sum + t.target, 0);
  }, [targets, currentMonthStr]);

  const monthInput = filteredData.length;
  const monthClosing = filteredData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
  const monthPending = filteredData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
  const monthReject = filteredData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;

  const percentTarget = totalTarget ? Math.round((monthInput / totalTarget) * 100) : 0;

  // --- Star Rating Helper ---
  const renderStars = (rate: number) => {
    const stars = Math.ceil(rate / 20);
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`material-symbols-rounded text-xs ${i < stars ? 'text-amber-400' : 'text-slate-200'}`}>
        star
      </span>
    ));
  };

  // --- Performance Stats (Sator) ---
  const satorPerformance = useMemo(() => {
    const stats: any = {};
    filteredData.forEach((d) => {
      const p = promotors.find((x) => x.nama_promotor === d.promotor);
      const sator = p?.sator;
      if (!sator) return;
      if (!stats[sator]) stats[sator] = { input: 0, target: 0 };
      stats[sator].input++;
    });
    targets.forEach((t) => {
      const p = promotors.find((x) => x.nama_promotor === t.promotor);
      const sator = p?.sator;
      if (!sator) return;
      if (!stats[sator]) stats[sator] = { input: 0, target: 0 };
      stats[sator].target += t.target;
    });
    return Object.keys(stats).map((s) => ({
      name: s,
      ...stats[s],
      percent: stats[s].target ? Math.round((stats[s].input / stats[s].target) * 100) : 0
    }));
  }, [filteredData, targets, promotors]);

  // --- Rankings (Promotor & Dealer) ---
  const normalize = (text: any) => (text || "").toString().trim().toLowerCase();

  const promotorRank = useMemo(() => {
    return promotors
      .map((p) => {
        const dPromotor = filteredData.filter((d) => normalize(d.promotor) === normalize(p.nama_promotor));
        const acc = dPromotor.filter((d) => normalize(d.status).includes("clos")).length;
        const pengajuan = dPromotor.length;
        return {
          name: p.nama_promotor,
          acc,
          pengajuan,
          pending: dPromotor.filter((d) => normalize(d.status) === "pending").length,
          reject: dPromotor.filter((d) => normalize(d.status) === "reject").length,
          rate: pengajuan ? Math.round((acc / pengajuan) * 100) : 0
        };
      })
      .sort((a, b) => b.pengajuan - a.pengajuan);
  }, [promotors, filteredData]);

  const dealerRank = useMemo(() => {
    return tokos
      .map((t) => {
        const dDealer = filteredData.filter((d) => d.toko === t.nama_toko);
        const acc = dDealer.filter((d) => normalize(d.status).includes("clos")).length;
        const pengajuan = dDealer.length;
        return {
          name: t.nama_toko,
          acc,
          pengajuan,
          pending: dDealer.filter((d) => d.status === "Pending").length,
          reject: dDealer.filter((d) => d.status === "Reject").length,
          rate: pengajuan ? Math.round((acc / pengajuan) * 100) : 0
        };
      })
      .sort((a, b) => b.pengajuan - a.pengajuan);
  }, [tokos, filteredData]);

  // --- AI Prediction ---
  const predictedClosing = useMemo(() => {
    const todayDay = new Date().getDate();
    const avgClosing = monthClosing / todayDay;
    return Math.round(avgClosing * 30);
  }, [monthClosing]);

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "report");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "report_kredit_vivo.xlsx");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24 font-manrope">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Vivo Flores</span>
          <h1 className="text-lg font-black text-slate-900 leading-tight">Kredit Dashboard</h1>
        </div>
        <img src="/logo-vivo.png" alt="Vivo" className="h-10 w-auto" />
      </header>

      <section className="px-6 py-4 flex flex-wrap gap-2">
        <select
          className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="">Semua Bulan</option>
          {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"].map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="date"
          className="bg-white border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <button onClick={() => setDateFilter("")} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200">Reset</button>
        <button onClick={exportExcel} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Export</button>
      </section>

      <main className="flex-1">
        {tab === "dashboard" && (
          <div className="px-6 space-y-6">
            <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-2xl shadow-blue-200 overflow-hidden relative">
              <h3 className="text-center text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-6">Progress Hari Ini</h3>
              <div className="relative flex justify-center items-center h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={progressPieData} innerRadius={70} outerRadius={90} cornerRadius={10} paddingAngle={5} dataKey="value">
                      <Cell fill="rgba(255,255,255,0.9)" />
                      <Cell fill="rgba(255,255,255,0.15)" stroke="none" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black">{totalToday}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Unit Terjual</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-8">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center">
                  <span className="block text-[10px] uppercase font-bold opacity-70 mb-1">Clos</span>
                  <span className="text-lg font-black">{closingToday}</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center">
                  <span className="block text-[10px] uppercase font-bold opacity-70 mb-1">Pend</span>
                  <span className="text-lg font-black">{pendingToday}</span>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center">
                  <span className="block text-[10px] uppercase font-bold opacity-70 mb-1">Rej</span>
                  <span className="text-lg font-black">{rejectToday}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-900">Target Bulan Ini</h3>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-lg">{percentTarget}%</span>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-black text-slate-900">{monthInput}</span>
                <span className="text-slate-400 font-bold">/ {totalTarget} Unit</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${percentTarget}%` }}></div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-6">
                <div className="text-center">
                  <span className="block text-xl font-black text-blue-600">{monthClosing}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Closing</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-black text-amber-500">{monthPending}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Pending</span>
                </div>
                <div className="text-center">
                  <span className="block text-xl font-black text-rose-500">{monthReject}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Reject</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "promotor" && (
          <div className="px-6 space-y-6">
            <h3 className="font-bold text-slate-900 text-xl">Ranking Promotor</h3>
            <div className="space-y-4">
              {promotorRank.map((p, i) => (
                <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm transition-all active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">#{i+1}</div>
                       <div className="flex flex-col">
                         <span className="font-bold text-slate-900">{p.name}</span>
                         <div className="flex gap-0.5 mt-1">{renderStars(p.rate)}</div>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-blue-600 font-black text-lg">ACC: {p.acc}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{p.rate}% Success</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    <div>Input: {p.pengajuan}</div>
                    <div>Pending: {p.pending}</div>
                    <div>Reject: {p.reject}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "dealer" && (
          <div className="px-6 space-y-6">
            <h3 className="font-bold text-slate-900 text-xl">Leaderboard Dealer</h3>
            <div className="space-y-4">
              {dealerRank.map((d, i) => (
                <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">{i+1}</div>
                       <div>
                         <h4 className="font-bold text-slate-900">{d.name}</h4>
                         <div className="flex gap-0.5 mt-1">{renderStars(d.rate)}</div>
                       </div>
                     </div>
                     <div className="text-right">
                        <div className="text-blue-600 font-black text-xl">{d.rate}%</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Success</div>
                     </div>
                   </div>
                   <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4">
                      <div className="text-center border-r border-slate-200">
                        <span className="block text-xs font-bold text-slate-900">{d.pengajuan}</span>
                        <span className="text-[9px] text-slate-400 uppercase">Pengajuan</span>
                      </div>
                      <div className="text-center border-r border-slate-200">
                        <span className="block text-xs font-bold text-blue-600">{d.acc}</span>
                        <span className="text-[9px] text-slate-400 uppercase">ACC</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-bold text-rose-500">{d.reject}</span>
                        <span className="text-[9px] text-slate-400 uppercase">Reject</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "ai" && (
          <div className="px-6">
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm text-center relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
              <span className="material-symbols-rounded text-6xl text-blue-600 mb-6">smart_toy</span>
              <h3 className="font-black text-slate-900 text-xl mb-2">AI Prediksi Closing</h3>
              <p className="text-sm text-slate-400 mb-8 max-w-[200px] mx-auto">Estimasi unit terjual bulan ini berdasarkan performa real-time.</p>
              <div className="text-8xl font-black text-blue-600 mb-4 tracking-tighter">{predictedClosing}</div>
              <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">Unit Terjual (Est)</span>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 px-6 pb-8 pt-4 flex justify-around items-center rounded-t-[32px] shadow-lg">
        {[
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "grafik", label: "Grafik", icon: "insights" },
          { id: "promotor", label: "Promotor", icon: "stars" },
          { id: "dealer", label: "Dealer", icon: "storefront" },
          { id: "ai", label: "AI", icon: "smart_toy" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 transition-all ${tab === t.id ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
          >
            <span className="material-symbols-rounded text-2xl">{t.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
