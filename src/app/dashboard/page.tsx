
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
  BarChart,
  Bar,
  Legend
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

  // Helper for consistent string matching
  const normalize = (text: any) => (text || "").toString().trim().toLowerCase();

  // Global Filters
  const [monthFilter, setMonthFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

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
    try {
      const { data: kd, error: e1 } = await supabase.from("kredit_vast").select("*");
      const { data: pr, error: e2 } = await supabase.from("promotors").select("*");
      const { data: tg, error: e3 } = await supabase.from("targets").select("*");
      const { data: st, error: e4 } = await supabase.from("sators").select("*");
      
      if (e1 || e2 || e3 || e4) console.warn("Some data fetch errors:", {e1, e2, e3, e4});

      // Try 'tokos' then 'toko' if empty
      let { data: tk } = await supabase.from("tokos").select("*");
      if (!tk || tk.length === 0) {
        const { data: tkAlt } = await supabase.from("toko").select("*");
        tk = tkAlt;
      }

      // Create a map for faster lookup
      const promotorMap = new Map();
      (pr || []).forEach(p => promotorMap.set(normalize(p.nama_promotor), p));

      // Enrich data with area and sator from promotors if missing
      const enrichedKd = (kd || []).map(d => {
        const p = promotorMap.get(normalize(d.promotor));
        return { 
          ...d, 
          area: p?.area || d.area || "",
          sator: p?.sator || d.sator || "" 
        };
      });

      setData(enrichedKd);
      setPromotors(pr || []);
      setTokos(tk || []);
      setTargets(tg || []);
      setSators(st || []);
    } catch (err) {
      console.error("Data fetch error:", err);
    }
    setLoading(false);
  }

  // GLOBAL FILTER LOGIC
  const filteredData = useMemo(() => {
    return (data || []).filter((d) => {
      if (!d.tanggal) return false;
      
      // Handle Date Range
      if (startDate && endDate) {
        if (d.tanggal < startDate || d.tanggal > endDate) return false;
      }

      if (monthFilter && !d.tanggal.startsWith(monthFilter)) return false;
      if (areaFilter) {
        return (d.area || "").toLowerCase().trim() === areaFilter.toLowerCase().trim();
      }
      return true;
    });
  }, [data, monthFilter, areaFilter, startDate, endDate]);

  // Sync Month String with Filter or Current Date
  const currentMonthStr = useMemo(() => {
    if (monthFilter) return monthFilter;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [monthFilter]);

  // ACCUMULATED TOTAL TARGET LOGIC
  const globalTarget = useMemo(() => {
    if (!targets.length) return 0;
    return targets
      .filter(t => {
        const tBulan = (t.bulan || "").toString().trim();
        const isMonth = tBulan.startsWith(currentMonthStr);
        if (!isMonth) return false;
        
        if (areaFilter) {
          const p = promotors.find(x => normalize(x.nama_promotor) === normalize(t.promotor));
          return normalize(p?.area) === normalize(areaFilter);
        }
        return true;
      })
      .reduce((sum, t) => sum + (Number(t.target) || 0), 0);
  }, [targets, currentMonthStr, areaFilter, promotors]);

  const daysInMonth = useMemo(() => {
    try {
      const parts = (currentMonthStr || "").split("-");
      if (parts.length < 2) return 30;
      const [year, month] = parts.map(Number);
      return new Date(year, month, 0).getDate() || 30;
    } catch {
      return 30;
    }
  }, [currentMonthStr]);

  const rangeDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch { return 1; }
  }, [startDate, endDate]);

  const globalPencapaian = useMemo(() => {
    const closing = filteredData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
    const pending = filteredData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
    const reject = filteredData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
    return closing + pending + reject;
  }, [filteredData]);

  const displayTarget = useMemo(() => {
    if (!globalTarget) return 0;
    if (startDate && endDate) return Math.round((globalTarget / daysInMonth) * rangeDays);
    return globalTarget;
  }, [globalTarget, daysInMonth, startDate, endDate, rangeDays]);

  const globalProgress = displayTarget > 0 
    ? Math.round((globalPencapaian / displayTarget) * 100) 
    : 0;

  // SATOR LOGIC
  const satorStats = useMemo(() => {
    const sourceSators = sators || [];
    const filteredSators = areaFilter 
      ? sourceSators.filter(s => (s.area || "").toLowerCase().trim() === areaFilter.toLowerCase().trim())
      : sourceSators;

    return filteredSators.map((s) => {
      const sName = s.nama_sator?.toLowerCase().trim();
      const sData = (filteredData || []).filter((d) => (d.sator || "").toLowerCase().trim() === sName);
      
      const closing = sData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = sData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = sData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      const count = closing + pending + reject;

      // Accumulate targets from promoters in this sator
      const rawTarget = (targets || []).filter(t => {
        const p = (promotors || []).find(x => normalize(x.nama_promotor) === normalize(t.promotor));
        const tBulan = (t.bulan || "").toString().trim();
        return p?.sator?.toLowerCase().trim() === sName && tBulan.startsWith(currentMonthStr);
      }).reduce((sum, t) => sum + (Number(t.target) || 0), 0);

      const sTarget = (startDate && endDate) 
        ? Math.round((rawTarget / daysInMonth) * rangeDays)
        : rawTarget;
      
      const percent = sTarget > 0 ? Math.round((count / sTarget) * 100) : 0;
      const approvalRate = count > 0 ? Math.round(((pending + closing) / count) * 100) : 0;

      return { ...s, count, closing, pending, reject, sTarget, percent, approvalRate };
    }).sort((a, b) => b.percent - a.percent);
  }, [sators, filteredData, targets, promotors, currentMonthStr, areaFilter, daysInMonth, startDate, endDate, rangeDays]);

  // TEAM LOGIC
  const teamStats = useMemo(() => {
    const sourcePromotors = promotors || [];
    const filteredPromotors = areaFilter
      ? sourcePromotors.filter(p => normalize(p.area) === normalize(areaFilter))
      : sourcePromotors;

    return filteredPromotors.map((p) => {
      const pName = normalize(p.nama_promotor);
      const pData = (filteredData || []).filter((d) => normalize(d.promotor) === pName);
      const closing = pData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = pData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = pData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      const count = closing + pending + reject;

      const rawTarget = (targets || []).find(t => {
        const tBulan = (t.bulan || "").toString().trim();
        return normalize(t.promotor) === pName && tBulan.startsWith(currentMonthStr);
      })?.target || 0;

      const pTarget = (startDate && endDate) 
        ? Math.round((rawTarget / daysInMonth) * rangeDays)
        : rawTarget;
        
      const approvalRate = count > 0 ? Math.round(((pending + closing) / count) * 100) : 0;
      const progress = pTarget > 0 ? Math.round((count / pTarget) * 100) : 0;

      return { ...p, count, closing, pending, reject, pTarget, approvalRate, progress };
    }).sort((a, b) => b.progress - a.progress);
  }, [promotors, filteredData, targets, currentMonthStr, areaFilter, daysInMonth, startDate, endDate, rangeDays]);


  const dealerStats = useMemo(() => {
    // SMART FALLBACK: If tokos table is empty, generate from unique names in data & targets
    let sourceTokos = tokos || [];
    const sourceData = data || [];
    const sourcePromotors = promotors || [];

    if (!sourceTokos.length && sourceData.length) {
      const uniqueNames = Array.from(new Set([
        ...sourceData.map(d => d.toko),
        ...sourcePromotors.map(p => p.nama_toko)
      ])).filter(Boolean);
      
      sourceTokos = uniqueNames.map(name => ({
        nama_toko: name,
        area: sourcePromotors.find(p => normalize(p.nama_toko) === normalize(name))?.area || "Global",
        sator: sourcePromotors.find(p => normalize(p.nama_toko) === normalize(name))?.sator || "Global"
      }));
    }

    if (!sourceTokos.length) return [];

    const filteredTokos = areaFilter
      ? sourceTokos.filter(t => normalize(t.area) === normalize(areaFilter))
      : sourceTokos;

    return filteredTokos.map((t) => {
      const tName = normalize(t.nama_toko);
      const tData = (filteredData || []).filter((d) => normalize(d.toko) === tName);
      const closing = tData.filter((d) => (d.status || "").toLowerCase().includes("clos")).length;
      const pending = tData.filter((d) => (d.status || "").toLowerCase().includes("pend")).length;
      const reject = tData.filter((d) => (d.status || "").toLowerCase().includes("rej")).length;
      const count = closing + pending + reject;
      
      const rawTarget = (targets || []).filter(tg => {
        const p = (promotors || []).find(x => normalize(x.nama_promotor) === normalize(tg.promotor));
        const tBulan = (tg.bulan || "").toString().trim();
        // Check if promotor belongs to this toko or if target is set specifically for this toko
        return normalize(p?.nama_toko) === tName && tBulan.startsWith(currentMonthStr);
      }).reduce((sum, tg) => sum + (Number(tg.target) || 0), 0);

      const tTarget = (startDate && endDate) 
        ? Math.round((rawTarget / daysInMonth) * rangeDays)
        : rawTarget;
        
      const progress = tTarget > 0 ? Math.round((count / tTarget) * 100) : 0;
      const approvalRate = count > 0 ? Math.round(((closing + pending) / count) * 100) : 0;

      return { ...t, count, closing, pending, reject, tTarget, progress, approvalRate };
    }).sort((a, b) => b.progress - a.progress);
  }, [tokos, data, filteredData, targets, promotors, currentMonthStr, areaFilter, daysInMonth, startDate, endDate, rangeDays]);

  const availableTokos = useMemo(() => {
    const fromTable = (tokos || []).map(t => t.nama_toko);
    const fromData = (data || []).map(d => d.toko);
    const fromPromotors = (promotors || []).map(p => p.nama_toko);
    return Array.from(new Set([...fromTable, ...fromData, ...fromPromotors])).filter(Boolean).sort();
  }, [tokos, data, promotors]);


  // NEW: TYPE ANALYSIS (Market Intelligence - Global Perspective)
  const typeAnalysis = useMemo(() => {
    const counts: any = { overall: {}, acc: {}, rej: {}, pend: {} };
    const sourceData = areaFilter 
      ? (data || []).filter(d => (d.area || "").toLowerCase().trim() === areaFilter.toLowerCase().trim())
      : (data || []);

    sourceData.forEach(d => {
      const type = d.type_hp || "Unknown";
      const status = (d.status || "").toLowerCase();
      
      counts.overall[type] = (counts.overall[type] || 0) + 1;
      if (status.includes("clos") || status.includes("acc")) counts.acc[type] = (counts.acc[type] || 0) + 1;
      if (status.includes("rej")) counts.rej[type] = (counts.rej[type] || 0) + 1;
      if (status.includes("pend")) counts.pend[type] = (counts.pend[type] || 0) + 1;
    });

    const getTop = (obj: any) => Object.entries(obj).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
    return {
      topOverall: getTop(counts.overall),
      topAcc: getTop(counts.acc),
      topRej: getTop(counts.rej),
      topPend: getTop(counts.pend)
    };
  }, [data, areaFilter]);

  const pendingReasons = useMemo(() => {
    const counts: any = {};
    const sourceData = areaFilter 
      ? (data || []).filter(d => (d.area || "").toLowerCase().trim() === areaFilter.toLowerCase().trim())
      : (data || []);

    sourceData.filter(d => (d.status || "").toLowerCase().includes("pend")).forEach(d => {
      const reason = d.alasan_pending || d.keterangan || "Tanpa Keterangan";
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10);
  }, [data, areaFilter]);

  const topPromotorAnalysis = useMemo(() => {
    const stats: any = {};
    const sourceData = areaFilter 
      ? (data || []).filter(d => (d.area || "").toLowerCase().trim() === areaFilter.toLowerCase().trim())
      : (data || []);

    sourceData.forEach(d => {
      const p = d.promotor || "Unknown";
      if (!stats[p]) stats[p] = { name: p, total: 0, acc: 0 };
      stats[p].total++;
      const status = (d.status || "").toLowerCase();
      if (status.includes("clos") || status.includes("acc")) stats[p].acc++;
    });

    const list = Object.values(stats).map((s: any) => ({
      ...s,
      rate: s.total > 0 ? Math.round((s.acc / s.total) * 100) : 0
    }));

    return {
      byVolume: [...list].sort((a, b) => b.total - a.total).slice(0, 5),
      byRate: [...list].filter(s => s.total >= 5).sort((a, b) => b.rate - a.rate).slice(0, 5)
    };
  }, [data, areaFilter]);

  const unitTypes = useMemo(() => {
    const types = data.map(d => d.type_hp).filter(t => t && t !== "EMPTY");
    return Array.from(new Set(types)).sort();
  }, [data]);

  // TARGET INPUT STATE
  const [targetForm, setTargetForm] = useState({ promotor: "", target: "", bulan: currentMonthStr, unit: "ALL UNITS" });
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetLoading, setTargetLoading] = useState(false);

  async function saveTarget() {
    if (!targetForm.promotor || !targetForm.target || !targetForm.bulan || !targetForm.unit) {
      alert("❌ GAGAL: Semua kolom WAJIB diisi!");
      return;
    }
    setTargetLoading(true);
    
    const payload = {
      promotor: targetForm.promotor,
      target: parseInt(targetForm.target),
      bulan: targetForm.bulan,
      unit: targetForm.unit
    };

    try {
      const { error } = editingTargetId 
        ? await supabase.from("targets").update(payload).eq("id", editingTargetId)
        : await supabase.from("targets").insert([payload]);
      
      if (error) throw error;
      
      alert(editingTargetId ? "✅ Target Diperbarui!" : "✅ Target Disimpan!");
      setTargetForm({ promotor: "", target: "", bulan: currentMonthStr, unit: "ALL UNITS" });
      setEditingTargetId(null);
      await loadAllData();
    } catch (err: any) {
      console.error("Save Target Error:", err);
      alert("❌ GAGAL: " + (err.message || "Terjadi kesalahan saat simpan target"));
    } finally {
      setTargetLoading(false);
    }
  }

  // MASTER DATA STATE
  const [masterForm, setMasterForm] = useState({ type: "promotor", name: "", toko: "", sator: "", area: "Flotim" });
  const [masterLoading, setMasterLoading] = useState(false);

  async function saveMaster() {
    if (!masterForm.name) return alert("❌ Nama wajib diisi!");
    if (masterForm.type === "promotor" && !masterForm.toko) return alert("❌ Toko penempatan wajib dipilih!");
    if (!masterForm.sator || !masterForm.area) return alert("❌ Sator & Area wajib diisi!");
    
    setMasterLoading(true);
    
    try {
      if (masterForm.type === "toko") {
        // Use upsert to allow updating existing toko or adding new one
        const { error } = await supabase.from("tokos").upsert([{
          nama_toko: masterForm.name,
          area: masterForm.area,
          sator: masterForm.sator
        }], { onConflict: 'nama_toko' });
        
        if (error) throw error;
        alert("✅ Toko Berhasil Disimpan!");
      } else {
        // Promoter Rolling / Addition
        const { error } = await supabase.from("promotors").upsert([{
          nama_promotor: masterForm.name,
          nama_toko: masterForm.toko,
          sator: masterForm.sator,
          area: masterForm.area
        }], { onConflict: 'nama_promotor' });
        
        if (error) throw error;
        alert("✅ Data Promotor / Rolling Berhasil!");
      }
      
      setMasterForm({ type: "promotor", name: "", toko: "", sator: "", area: "Flotim" });
      await loadAllData();
    } catch (err: any) {
      console.error("Save Master Error:", err);
      alert("❌ GAGAL SIMPAN: " + (err.message || "Periksa koneksi database atau RLS"));
    } finally {
      setMasterLoading(false);
    }
  }

  async function deleteMaster(id: string, type: string, name: string) {
    const confirmDelete = confirm(`⚠️ PERINGATAN: Hapus ${type} "${name}"?\nData yang sudah dihapus tidak dapat dikembalikan.`);
    if (!confirmDelete) return;

    setMasterLoading(true);
    try {
      const table = type === "promotor" ? "promotors" : "tokos";
      const { error } = await supabase.from(table).delete().eq("id", id);
      
      if (error) throw error;
      
      alert(`✅ ${type === 'promotor' ? 'Promotor' : 'Toko'} Berhasil Dihapus!`);
      await loadAllData();
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert("❌ GAGAL HAPUS: " + (err.message || "Data mungkin sedang digunakan di tabel lain"));
    } finally {
      setMasterLoading(false);
    }
  }

  async function handleLogout() {
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error(error);
    window.location.href = "/";
  }

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
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    saveAs(new Blob([buffer]), `VF_Report_${dateStr}.xlsx`);
  };

  if (loading) return (
    <div className="h-screen bg-[#0c1321] flex flex-col items-center justify-center font-['Manrope']">
      <div className="w-12 h-12 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-2xl animate-pulse mb-4 text-center">VF</div>
      <p className="text-[#aec6ff] font-bold tracking-widest uppercase text-[10px] text-center">Calibrating Financial Hub...</p>
    </div>
  );

    return (
    <div className="min-h-screen bg-[#0c1321] font-['Manrope'] text-[#dce2f6] antialiased p-4 md:p-8">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-[#aec6ff] rounded-2xl flex items-center justify-center text-[#0c1321] shadow-2xl shadow-[#aec6ff]/20">
              <span className="text-2xl font-black">VF</span>
           </div>
           <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase">Kredit Area Flores</h1>
              <p className="text-[10px] font-bold text-[#aec6ff]/40 uppercase tracking-[0.3em]">Management Oversight</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           {/* FILTERS */}
           <div className="flex-1 md:flex-none flex bg-[#151b2a] p-2 rounded-2xl border border-white/5 gap-2 overflow-x-auto no-scrollbar">
              <select className="bg-[#151b2a] text-[10px] font-black uppercase text-[#aec6ff] px-4 py-2 outline-none border-r border-white/5 cursor-pointer" value={areaFilter} onChange={(e)=>setAreaFilter(e.target.value)}>
                 <option value="" className="bg-[#151b2a]">Semua Area</option>
                 <option value="Flotim" className="bg-[#151b2a]">Flotim</option>
                 <option value="Flobar" className="bg-[#151b2a]">Flobar</option>
              </select>
              <div className="flex items-center gap-1 border-r border-white/5 px-2">
                 <span className="text-[8px] font-black text-white/20 uppercase">Start</span>
                 <input type="date" className="bg-[#151b2a] text-[10px] font-black uppercase text-[#aec6ff] px-2 py-2 outline-none cursor-pointer" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
                 <span className="text-[8px] font-black text-white/20 uppercase ml-2">End</span>
                 <input type="date" className="bg-[#151b2a] text-[10px] font-black uppercase text-[#aec6ff] px-2 py-2 outline-none cursor-pointer" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
              </div>
              <select className="bg-[#151b2a] text-[10px] font-black uppercase text-[#aec6ff] px-4 py-2 outline-none cursor-pointer" value={monthFilter} onChange={(e)=>setMonthFilter(e.target.value)}>
                 <option value="" className="bg-[#151b2a]">Pilih Bulan</option>
                 {Array.from({length: 12}, (_, i) => {
                    const d = new Date(2026, i, 1);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const val = `${year}-${month}`;
                    const label = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
                    return <option key={i} value={val} className="bg-[#151b2a]">{label}</option>
                 })}
              </select>
           </div>
           <button onClick={exportExcel} className="p-4 bg-[#aec6ff] text-[#0c1321] rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl shadow-[#aec6ff]/10">
              <span className="material-icons-outlined">download</span>
           </button>
           <button onClick={handleLogout} className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
              <span className="material-icons-outlined">logout</span>
           </button>
        </div>
      </header>

      <main className="pb-32 max-w-[1440px] mx-auto">
        
        {/* TAB 1: HOME (DARK MODERN) */}
        {tab === "dashboard" && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-[#151b2a] p-12 rounded-[3.5rem] border border-white/5 flex flex-col justify-center relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 group-hover:scale-[1.7] transition-all duration-700">
                  <span className="material-icons-outlined text-[15rem] text-[#aec6ff]">analytics</span>
               </div>
               <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#aec6ff]/40 mb-4">
                 {startDate && endDate ? `Range Progress (${startDate} - ${endDate})` : `Monthly Progress (${currentMonthStr})`}
               </p>
               <div className="flex items-baseline gap-4 mb-8">
                  <h2 className="text-8xl font-black tracking-tighter text-[#aec6ff]">{globalPencapaian}</h2>
                  <span className="text-2xl font-bold text-white/10">/ {displayTarget} Target</span>
               </div>
               <div className="space-y-4 max-w-lg relative z-10">
                 <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-white/20">Overall Completion</span>
                    <span className={globalProgress >= 100 ? 'text-emerald-400 font-black' : 'text-[#aec6ff] font-black'}>{globalProgress}%</span>
                 </div>
                 <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${globalProgress >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, globalProgress)}%`}}></div>
                 </div>
                 <p className="text-[10px] font-bold text-white/20 italic">
                   {startDate && endDate ? `Target proporsional untuk ${rangeDays} hari.` : `Target bulanan penuh.`}
                 </p>
               </div>
            </section>

                <div className="bg-[#aec6ff] p-10 rounded-[3rem] shadow-2xl text-[#0c1321] flex flex-col justify-between">
                   <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 mb-6">Rate Approval</h3>
                      <div className="text-5xl font-black tracking-tight">{Math.round(((filteredData.filter(d => (d.status || "").toLowerCase().includes("clos")).length + filteredData.filter(d => (d.status || "").toLowerCase().includes("pend")).length) / (filteredData.length || 1)) * 100)}%</div>
                      <p className="text-[10px] font-bold opacity-30 uppercase mt-2">Overall ACC Rate</p>
                   </div>
                   <div className="grid grid-cols-3 gap-2 border-t border-[#0c1321]/10 pt-6">
                      <div><p className="text-[9px] font-black opacity-30 uppercase">ACC</p><p className="text-lg font-black">{filteredData.filter(d => (d.status || "").toLowerCase().includes("clos")).length}</p></div>
                      <div><p className="text-[9px] font-black opacity-30 uppercase">PEND</p><p className="text-lg font-black opacity-60">{filteredData.filter(d => (d.status || "").toLowerCase().includes("pend")).length}</p></div>
                      <div><p className="text-[9px] font-black opacity-30 uppercase">REJ</p><p className="text-lg font-black text-rose-600">{filteredData.filter(d => (d.status || "").toLowerCase().includes("rej")).length}</p></div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {satorStats.map((s, i) => (
                   <div key={i} 
                    style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                    className={`relative p-8 rounded-[2.5rem] border border-white/5 transition-all duration-500 group overflow-hidden bg-[#151b2a] hover:scale-[1.02] hover:border-[#aec6ff]/30 hover:shadow-2xl hover:shadow-[#aec6ff]/5`}>
                      <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <h4 className="text-lg font-black uppercase text-white">{s.nama_sator}</h4>
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">PIC Area Control</p>
                           </div>
                           <div className="bg-[#aec6ff]/10 px-3 py-1.5 rounded-lg border border-[#aec6ff]/10">
                              <span className="text-[10px] font-black text-[#aec6ff]">{s.approvalRate}% ACC</span>
                           </div>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-white/20">Target: {s.count} / {s.sTarget}</span>
                              <span className={s.percent >= 100 ? 'text-emerald-400' : 'text-[#aec6ff]'}>{s.percent}%</span>
                           </div>
                           <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-700 ${s.percent >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, s.percent)}%`}}></div>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-4 border-t border-white/5">
                           <div><p className="text-[8px] font-black text-white/20 uppercase">ACC</p><p className="text-sm font-black text-[#aec6ff]">{s.closing}</p></div>
                           <div><p className="text-[8px] font-black text-white/20 uppercase">PEND</p><p className="text-sm font-black opacity-60 text-white/60">{s.pending}</p></div>
                           <div><p className="text-[8px] font-black text-white/20 uppercase">REJ</p><p className="text-sm font-black text-rose-500">{s.reject}</p></div>
                        </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB 2: INSIGHTS (DARK CHARTS) */}
        {tab === "grafik" && (
          <div className="space-y-8">
             <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5">
                <div className="mb-12">
                   <h3 className="text-sm font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-2">Trend Analisa Harian</h3>
                   <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Visualisasi Performa Inputan Area Flores</p>
                </div>
                <div className="h-[350px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                     <defs><linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#aec6ff" stopOpacity={0.2}/><stop offset="95%" stopColor="#aec6ff" stopOpacity={0}/></linearGradient></defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff40', fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff40', fontWeight: 'bold'}} />
                     <Tooltip contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '16px'}} />
                     <Area type="monotone" dataKey="count" stroke="#aec6ff" strokeWidth={5} fill="url(#gCount)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>

             <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5">
                <div className="mb-12">
                   <h3 className="text-sm font-black uppercase tracking-[0.4em] text-[#aec6ff] mb-2">Target vs Pencapaian Sator</h3>
                   <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Perbandingan Target Unit vs Realisasi per PIC Area</p>
                </div>
                <div className="h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={satorStats}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                     <XAxis dataKey="nama_sator" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#aec6ff40', fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#aec6ff40', fontWeight: 'bold'}} />
                     <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0c1321', border: '1px solid #ffffff10', borderRadius: '16px'}} />
                     <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase'}} />
                     <Bar dataKey="sTarget" name="Target Unit" fill="#1d263a" radius={[10, 10, 0, 0]} barSize={40} />
                     <Bar dataKey="count" name="Realisasi" fill="#aec6ff" radius={[10, 10, 0, 0]} barSize={40} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>
        )}

        {/* TAB 3: TEAM PERFORMANCE (DARK LIST) */}
        {tab === "promotor" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {teamStats.map((p, i) => (
                <div key={i} className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                   <div className="flex justify-between items-center">
                      <div className="min-w-0">
                        <h4 className="text-lg font-black text-white uppercase truncate">{p.nama_promotor}</h4>
                        <p className="text-[9px] font-bold text-[#aec6ff]/40 uppercase tracking-widest truncate">{p.nama_toko}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-3xl font-black text-[#aec6ff]">{p.approvalRate}%</span>
                         <p className="text-[8px] font-black uppercase text-[#aec6ff]/20">ACC Rate</p>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase text-white/20">
                         <span>Target: {p.count} / {p.pTarget}</span>
                         <span className={p.progress >= 100 ? 'text-emerald-500' : 'text-[#aec6ff]'}>{p.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                         <div className={`h-full transition-all duration-1000 ${p.progress >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, p.progress)}%`}}></div>
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

        {/* TAB 4: DEALERS (DARK TABLE) */}
        {tab === "dealer" && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
             {dealerStats.length > 0 ? dealerStats.map((t, i) => (
               <div key={i} 
                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                className="bg-[#151b2a] p-8 rounded-[2.5rem] border border-white/5 space-y-6 hover:scale-[1.02] hover:border-[#aec6ff]/30 transition-all duration-500">
                 <div className="flex justify-between items-center">
                   <div>
                     <h4 className="text-xl font-black text-white uppercase">{t.nama_toko}</h4>
                     <p className="text-[10px] font-bold text-[#aec6ff]/40 opacity-60 uppercase tracking-widest">Authorized Dealer</p>
                   </div>
                   <div className="text-right">
                     <span className="text-3xl font-black text-[#aec6ff]">{t.approvalRate}%</span>
                     <p className="text-[9px] font-black uppercase text-white/20">ACC Rate</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                     <span className="text-white/20">Target: {t.count} / {t.tTarget}</span>
                     <span className={t.progress >= 100 ? 'text-emerald-500' : 'text-[#aec6ff]'}>{t.progress}%</span>
                   </div>
                   <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                     <div className={`h-full transition-all duration-1000 ${t.progress >= 100 ? 'bg-emerald-400' : 'bg-[#aec6ff]'}`} style={{width: `${Math.min(100, t.progress)}%`}}></div>
                   </div>
                 </div>
                 <div className="flex justify-between items-center border-t border-white/5 pt-6">
                   <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-[#aec6ff]/40 text-sm">location_on</span>
                      <span className="text-[10px] font-bold text-[#aec6ff]/40 uppercase">{t.sator || 'Global'} Area</span>
                   </div>
                   <div className="bg-[#aec6ff]/10 px-4 py-2 rounded-xl">
                     <span className="text-[10px] font-black text-[#aec6ff] uppercase">{t.count} SUBMISSIONS</span>
                   </div>
                 </div>
               </div>
             )) : (
               <div className="col-span-full py-20 text-center">
                  <span className="material-icons-outlined text-6xl text-white/5 mb-4">storefront</span>
                  <p className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">Belum ada data dealer terdaftar.</p>
                  <p className="text-[10px] font-bold text-white/10 uppercase mt-2">Gunakan menu Admin untuk menambah toko baru.</p>
               </div>
             )}
           </div>
         )}

        {/* TAB 5: AI (DARK ANALYTICS) */}
        {tab === "ai" && (
           <div className="space-y-8 pb-20">
              <div className="bg-[#aec6ff] p-12 rounded-[3.5rem] text-[#0c1321] shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 max-w-xl">
                    <h2 className="text-4xl font-black leading-tight tracking-tight">Market Intelligence</h2>
                    <p className="font-bold text-sm uppercase tracking-widest mt-4 opacity-50">Analisa Tipe Produk & Perilaku Konsumen</p>
                 </div>
                 <div className="absolute top-0 right-0 p-12 opacity-20 scale-150">
                    <span className="material-icons-outlined text-[12rem]">insights</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* PRODUCT TYPE ANALYSIS */}
                 <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-[#aec6ff]">
                          <span className="material-icons-outlined">category</span>
                       </div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-[#aec6ff]">Top Popular Units</h3>
                    </div>
                    <div className="space-y-6">
                       {typeAnalysis.topOverall.map(([type, count]: any, i: number) => (
                          <div key={i} className="flex justify-between items-center">
                             <div>
                                <p className="text-sm font-black text-white uppercase">{type}</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Paling Banyak Diminati</p>
                             </div>
                             <div className="text-right">
                                <span className="text-xl font-black text-[#aec6ff]">{count}</span>
                                <span className="block text-[8px] font-black text-white/20 uppercase">Units</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* APPROVAL ANALYSIS */}
                 <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400">
                          <span className="material-icons-outlined">check_circle</span>
                       </div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">High Approval Units</h3>
                    </div>
                    <div className="space-y-4">
                        {typeAnalysis.topAcc.map(([type, count]: any, i: number) => (
                           <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                              <span className="text-lg font-black text-[#aec6ff] w-8">#{i+1}</span>
                              <div className="flex-1">
                                 <p className="text-xs font-black text-white uppercase">{type}</p>
                                 <div className="h-1.5 w-full bg-white/5 rounded-full mt-2">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{width: `${Math.min(100, (count/filteredData.length)*500)}%`}}></div>
                                 </div>
                              </div>
                              <span className="text-xs font-black text-emerald-400">{count} ACC</span>
                           </div>
                        ))}
                    </div>
                 </div>

                 {/* REJECTION ANALYSIS */}
                 <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-rose-400">
                          <span className="material-icons-outlined">cancel</span>
                       </div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-rose-400">High Rejection Units</h3>
                    </div>
                    <div className="space-y-3">
                       {typeAnalysis.topRej.map(([type, count]: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-4 rounded-2xl hover:bg-white/5 transition-all">
                             <span className="text-xs font-black text-white uppercase">{type}</span>
                             <span className="text-xs font-black text-rose-400">{count} REJECTED</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* PENDING ANALYSIS */}
                 <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-amber-400">
                          <span className="material-icons-outlined">history</span>
                       </div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-amber-400">Pending Trends</h3>
                    </div>
                    <div className="space-y-4">
                       {typeAnalysis.topPend.map(([type, count]: any, i: number) => (
                          <div key={i} className="flex justify-between items-center">
                             <span className="text-xs font-black text-white/40 uppercase">{type}</span>
                             <span className="text-xs font-black text-amber-400">{count} PENDING</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* DEEP DIVE: PENDING REASONS */}
                 <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-amber-400">
                          <span className="material-icons-outlined">report_problem</span>
                       </div>
                       <h3 className="text-sm font-black uppercase tracking-widest text-amber-400">Alasan Pending Terbanyak</h3>
                    </div>
                    <div className="space-y-4">
                       {pendingReasons.length > 0 ? pendingReasons.map(([reason, count]: any, i: number) => (
                          <div key={i} className="flex justify-between items-center bg-[#0c1321] p-4 rounded-2xl border border-white/5">
                             <div>
                                <p className="text-xs font-black text-white uppercase">{reason}</p>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Faktor Penghambat</p>
                             </div>
                             <span className="text-sm font-black text-amber-400">{count} Kasus</span>
                          </div>
                       )) : (
                          <p className="text-xs font-bold text-white/10 uppercase italic">Tidak ada data alasan pending.</p>
                       )}
                    </div>
                 </div>

                 {/* PERFORMANCE HALL OF FAME */}
                 <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* VOLUME LEADERS */}
                    <div className="bg-[#151b2a] p-10 rounded-[3.5rem] border border-white/5 space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-400/10 rounded-2xl flex items-center justify-center text-amber-400">
                             <span className="material-icons-outlined text-3xl">emoji_events</span>
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-white uppercase">Volume Leaders</h3>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Pengajuan Kredit Terbanyak</p>
                          </div>
                       </div>
                       <div className="space-y-4">
                          {topPromotorAnalysis.byVolume.map((p, i) => (
                             <div key={i} className="flex items-center gap-4 bg-[#0c1321] p-5 rounded-3xl border border-white/5">
                                <span className="text-2xl font-black text-white/10">#{i+1}</span>
                                <div className="flex-1">
                                   <p className="text-sm font-black text-white uppercase">{p.name}</p>
                                   <p className="text-[10px] font-bold text-[#aec6ff] uppercase">{p.total} TOTAL APPLICATIONS</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* QUALITY MASTERS */}
                    <div className="bg-[#aec6ff] p-10 rounded-[3.5rem] text-[#0c1321] space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-black">
                             <span className="material-icons-outlined text-3xl">verified</span>
                          </div>
                          <div>
                             <h3 className="text-lg font-black uppercase">Quality Masters</h3>
                             <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Highest Approval Rates</p>
                          </div>
                       </div>
                       <div className="space-y-6">
                          {topPromotorAnalysis.byRate.map((p, i) => (
                             <div key={i} className="space-y-3">
                                <div className="flex justify-between items-center">
                                   <p className="text-sm font-black uppercase">{p.name}</p>
                                   <span className="text-lg font-black bg-black/10 px-3 py-1 rounded-xl">{p.rate}% ACC</span>
                                </div>
                                <div className="bg-white/40 p-4 rounded-2xl">
                                   <p className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
                                      💡 Tips: "Pastikan foto dokumen konsumen tidak blur dan verifikasi nomor HP aktif untuk menaikkan rate hingga {p.rate}%."
                                   </p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* TEAM RECOMMENDATIONS */}
                 <div className="lg:col-span-2 bg-[#aec6ff]/10 p-12 rounded-[3.5rem] border border-[#aec6ff]/20">
                    <h3 className="text-xl font-black text-[#aec6ff] uppercase mb-8 flex items-center gap-3">
                       <span className="material-icons-outlined">psychology</span>
                       Strategic Performance Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {teamStats.slice(0, 6).map((p, i) => (
                          <div key={i} className="bg-[#0c1321] p-8 rounded-3xl border border-white/5 space-y-4">
                             <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-white uppercase">{p.nama_promotor}</span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${p.progress >= 80 ? 'bg-emerald-400/20 text-emerald-400' : 'bg-rose-400/20 text-rose-400'}`}>
                                   {p.progress}% Progress
                                </span>
                             </div>
                             <p className="text-xs leading-relaxed text-white/40 font-medium italic">
                                {p.progress < 60 ? `Fokus peningkatan lead unit: ${typeAnalysis.topOverall[0]?.[0] || 'Produk'}. Perlu akselerasi volume.` : 
                                 p.approvalRate < 60 ? `Kualitas input kurang. Perketat verifikasi data untuk mengurangi pending/reject.` :
                                 `Momentum sangat positif. Jadikan mentor untuk rekan area ${p.area}.`}
                             </p>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* TAB 6: TARGET INPUT (DARK MODERN) */}
        {tab === "target" && (
           <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-[#151b2a] p-12 rounded-[3.5rem] border border-white/5 space-y-10">
                 <div className="text-center">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Set Monthly Target</h2>
                    <p className="text-xs font-bold text-[#aec6ff]/40 uppercase mt-2 tracking-widest">Input Target Per Promotor Secara Akurat</p>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black uppercase tracking-widest text-[#aec6ff]/40 ml-1">Nama Promotor</label>
                       <select 
                          className="w-full bg-[#0c1321] border border-white/5 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#aec6ff]/10 text-sm font-bold text-[#aec6ff] appearance-none"
                          value={targetForm.promotor}
                          onChange={(e) => setTargetForm({...targetForm, promotor: e.target.value})}
                       >
                          <option value="" className="bg-[#0c1321]">Pilih Promotor</option>
                          {promotors.map((p, i) => <option key={i} value={p.nama_promotor} className="bg-[#0c1321]">{p.nama_promotor}</option>)}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#aec6ff]/40 ml-1">Tipe Unit</label>
                          <select 
                             className="w-full bg-[#0c1321] border border-white/5 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#aec6ff]/10 text-sm font-bold text-white"
                             value={targetForm.unit}
                             onChange={(e) => setTargetForm({...targetForm, unit: e.target.value})}
                          >
                             <option value="ALL UNITS">SEMUA UNIT</option>
                             {unitTypes.map((u, i) => <option key={i} value={u}>{u}</option>)}
                          </select>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[11px] font-black uppercase tracking-widest text-[#aec6ff]/40 ml-1">Target Angka</label>
                          <input 
                             type="number"
                             placeholder="0"
                             className="w-full bg-[#0c1321] border border-white/5 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#aec6ff]/10 text-sm font-bold text-white"
                             value={targetForm.target}
                             onChange={(e) => setTargetForm({...targetForm, target: e.target.value})}
                          />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[11px] font-black uppercase tracking-widest text-[#aec6ff]/40 ml-1">Bulan Periode</label>
                       <input 
                          type="month"
                          className="w-full bg-[#0c1321] border border-white/5 p-5 rounded-2xl outline-none focus:ring-4 focus:ring-[#aec6ff]/10 text-sm font-bold text-white"
                          value={targetForm.bulan}
                          onChange={(e) => setTargetForm({...targetForm, bulan: e.target.value})}
                       />
                    </div>

                    <button 
                       onClick={saveTarget}
                       disabled={targetLoading}
                       className={`w-full ${editingTargetId ? 'bg-amber-400' : 'bg-[#aec6ff]'} text-[#0c1321] py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-[#aec6ff]/10 active:scale-95 hover:opacity-95 transition-all flex items-center justify-center gap-3 mt-4`}
                    >
                       {targetLoading ? <span className="animate-pulse">SINKRONISASI...</span> : 
                        <><span className="material-icons-outlined">{editingTargetId ? 'edit' : 'save'}</span> <span>{editingTargetId ? 'PERBARUI TARGET' : 'SIMPAN TARGET BARU'}</span></>}
                    </button>
                    {editingTargetId && (
                      <button onClick={() => {setEditingTargetId(null); setTargetForm({promotor: "", target: "", bulan: currentMonthStr, unit: "ALL UNITS"})}} className="w-full text-[10px] font-black text-white/20 uppercase tracking-widest mt-4">Batal Edit</button>
                    )}
                 </div>
              </div>

              <div className="bg-[#151b2a] rounded-[2.5rem] border border-white/5 overflow-hidden">
                 <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#aec6ff]/40">Daftar Target Aktif - {targetForm.bulan}</h3>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-[#0c1321] text-[10px] font-black uppercase opacity-20 tracking-widest border-b border-white/5">
                             <th className="px-8 py-5">Promotor</th>
                             <th className="px-8 py-5">Unit</th>
                             <th className="px-8 py-5 text-right">Target</th>
                             <th className="px-8 py-5 text-right">Aksi</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {targets.filter(t => (t.bulan || "").trim() === targetForm.bulan).map((t, i) => (
                             <tr key={i} className="text-xs font-bold hover:bg-white/5 transition-colors">
                                <td className="px-8 py-5 text-[#aec6ff]">{t.promotor}</td>
                                <td className="px-8 py-5 text-white/40">{t.unit || "ALL UNITS"}</td>
                                <td className="px-8 py-5 text-right font-black text-white">{t.target}</td>
                                <td className="px-8 py-5 text-right">
                                   <button 
                                      onClick={() => {
                                        setEditingTargetId(t.id);
                                        setTargetForm({ promotor: t.promotor, target: t.target.toString(), bulan: t.bulan, unit: t.unit || "ALL UNITS" });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#aec6ff] hover:bg-[#aec6ff] hover:text-[#0c1321] transition-all ml-auto"
                                   >
                                      <span className="material-icons-outlined text-sm">edit</span>
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        )}

        {/* TAB 7: ADMIN / MASTER DATA */}
        {tab === "admin" && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
              <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 space-y-8">
                 <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Master Data Management</h2>
                    <p className="text-[10px] font-bold text-[#aec6ff]/40 uppercase tracking-widest mt-2">Kelola Tim Promotor & Daftar Toko</p>
                 </div>

                 <div className="space-y-6">
                    <div className="flex bg-[#0c1321] p-1.5 rounded-2xl border border-white/5">
                       <button onClick={() => setMasterForm({...masterForm, type: 'promotor'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${masterForm.type === 'promotor' ? 'bg-[#aec6ff] text-[#0c1321]' : 'text-white/20'}`}>Promotor</button>
                       <button onClick={() => setMasterForm({...masterForm, type: 'toko'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${masterForm.type === 'toko' ? 'bg-[#aec6ff] text-[#0c1321]' : 'text-white/20'}`}>Toko / Dealer</button>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-white/20 ml-1">Nama {masterForm.type === 'promotor' ? 'Promotor' : 'Toko'}</label>
                          <input 
                             className="w-full bg-[#0c1321] border border-white/5 p-4 rounded-xl text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[#aec6ff]/20"
                             placeholder={`Input Nama ${masterForm.type === 'promotor' ? 'Promotor' : 'Toko'}...`}
                             value={masterForm.name}
                             onChange={(e) => setMasterForm({...masterForm, name: e.target.value})}
                          />
                       </div>

                       {masterForm.type === 'promotor' && (
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-white/20 ml-1">Penempatan Toko</label>
                             <select 
                                className="w-full bg-[#0c1321] border border-white/5 p-4 rounded-xl text-sm font-bold text-[#aec6ff]"
                                value={masterForm.toko}
                                onChange={(e) => {
                                   const t = tokos.find(x => x.nama_toko === e.target.value);
                                   setMasterForm({...masterForm, toko: e.target.value, sator: t?.sator || "Global", area: t?.area || "Global"});
                                }}
                             >
                                <option value="">Pilih Toko</option>
                                {availableTokos.map((tName, i) => <option key={i} value={tName}>{tName}</option>)}
                             </select>
                          </div>
                       )}

                       {masterForm.type === 'toko' && (
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/20 ml-1">Sator PIC</label>
                                <select 
                                   className="w-full bg-[#0c1321] border border-white/5 p-4 rounded-xl text-sm font-bold text-[#aec6ff]"
                                   value={masterForm.sator}
                                   onChange={(e) => setMasterForm({...masterForm, sator: e.target.value})}
                                >
                                   <option value="">Pilih Sator</option>
                                   {sators.map((s, i) => <option key={i} value={s.nama_sator}>{s.nama_sator}</option>)}
                                </select>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/20 ml-1">Area</label>
                                <select 
                                   className="w-full bg-[#0c1321] border border-white/5 p-4 rounded-xl text-sm font-bold text-[#aec6ff]"
                                   value={masterForm.area}
                                   onChange={(e) => setMasterForm({...masterForm, area: e.target.value})}
                                >
                                   <option value="Flotim">Flotim</option>
                                   <option value="Flobar">Flobar</option>
                                </select>
                             </div>
                          </div>
                       )}

                       <button 
                          onClick={saveMaster}
                          disabled={masterLoading}
                          className="w-full bg-[#aec6ff] text-[#0c1321] py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
                       >
                          {masterLoading ? <span className="animate-pulse">PROCESSING...</span> : <><span className="material-icons-outlined">add_circle</span> SIMPAN DATA MASTER</>}
                       </button>
                    </div>
                 </div>
              </div>

               <div className="bg-[#151b2a] p-10 rounded-[3rem] border border-white/5 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#aec6ff]/40">Daftar {masterForm.type === 'promotor' ? 'Promotor' : 'Toko'} Aktif</h3>
                     <button onClick={() => setMasterForm({type: masterForm.type, name: "", toko: "", sator: "", area: "Flotim"})} className="text-[9px] font-black uppercase text-[#aec6ff] hover:underline">Reset Form</button>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/5">
                     {masterForm.type === 'promotor' ? (
                       promotors.map((p, i) => (
                        <div key={i} className="bg-[#0c1321] p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                           <div className="min-w-0">
                              <p className="text-sm font-black text-white uppercase truncate">{p.nama_promotor}</p>
                              <p className="text-[10px] font-black text-[#aec6ff] uppercase mt-1 truncate">{p.nama_toko}</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <button 
                                 onClick={() => setMasterForm({type: 'promotor', name: p.nama_promotor, toko: p.nama_toko, sator: p.sator, area: p.area})}
                                 className="opacity-0 group-hover:opacity-100 p-3 rounded-xl bg-white/5 text-[#aec6ff] hover:bg-[#aec6ff] hover:text-[#0c1321] transition-all"
                                 title="Rolling / Edit"
                              >
                                 <span className="material-icons-outlined text-sm">swap_horiz</span>
                              </button>
                              <button 
                                 onClick={() => deleteMaster(p.id, 'promotor', p.nama_promotor)}
                                 className="opacity-0 group-hover:opacity-100 p-3 rounded-xl bg-white/5 text-rose-500/40 hover:bg-rose-500 hover:text-white transition-all"
                                 title="Hapus"
                              >
                                 <span className="material-icons-outlined text-sm">delete</span>
                              </button>
                           </div>
                        </div>
                       ))
                     ) : (
                       tokos.map((t, i) => (
                        <div key={i} className="bg-[#0c1321] p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                           <div className="min-w-0">
                              <p className="text-sm font-black text-white uppercase truncate">{t.nama_toko}</p>
                              <p className="text-[10px] font-black text-[#aec6ff] uppercase mt-1 truncate">{t.sator} | {t.area}</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <button 
                                 onClick={() => setMasterForm({type: 'toko', name: t.nama_toko, toko: "", sator: t.sator, area: t.area})}
                                 className="opacity-0 group-hover:opacity-100 p-3 rounded-xl bg-white/5 text-[#aec6ff] hover:bg-[#aec6ff] hover:text-[#0c1321] transition-all"
                                 title="Edit Toko"
                              >
                                 <span className="material-icons-outlined text-sm">edit</span>
                              </button>
                              <button 
                                 onClick={() => deleteMaster(t.id, 'toko', t.nama_toko)}
                                 className="opacity-0 group-hover:opacity-100 p-3 rounded-xl bg-white/5 text-rose-500/40 hover:bg-rose-500 hover:text-white transition-all"
                                 title="Hapus"
                              >
                                 <span className="material-icons-outlined text-sm">delete</span>
                              </button>
                           </div>
                        </div>
                       ))
                     )}
                  </div>
               </div>
           </div>
        )}

      </main>

      <nav className="fixed bottom-0 w-full z-[100] bg-[#0c1321]/80 backdrop-blur-3xl border-t border-white/5 px-6 pb-10 pt-4 flex justify-around items-center">
        {[
          { id: "dashboard", icon: "grid_view", label: "Home" },
          { id: "grafik", icon: "query_stats", label: "Insights" },
          { id: "promotor", icon: "group", label: "Team" },
          { id: "dealer", icon: "storefront", label: "Dealers" },
          { id: "target", icon: "track_changes", label: "Target" },
          { id: "ai", icon: "psychology", label: "AI" },
          { id: "admin", icon: "manage_accounts", label: "Admin" }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`flex flex-col items-center gap-2 transition-all ${tab === item.id ? 'text-[#aec6ff]' : 'text-white/10 hover:text-white/30'}`}>
            <span className="material-icons-outlined text-2xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
