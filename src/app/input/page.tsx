"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function InputKreditPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form States
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    sator: "",
    toko: "",
    promotor: "",
    konsumen: "",
    pekerjaan: "",
    no_hp: "",
    type_hp: "",
    harga_hp: "",
    leasing: "",
    limit_kredit: "",
    status: "Pending", // Default status 
    alasan_pending: "",
    keterangan_reject: ""
  });

  // Master Data States
  const [sators, setSators] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);

  useEffect(() => {
    loadSators();
  }, []);

  // API / Supabase Loaders
  async function loadSators() {
    const { data } = await supabase.from("sators").select("*");
    if (data) setSators(data);
  }

  async function loadTokos(selectedSator: string) {
    setFormData(prev => ({ ...prev, sator: selectedSator, toko: "", promotor: "" }));
    const { data } = await supabase.from("tokos").select("*").eq("sator", selectedSator);
    if (data) setTokos(data);
  }

  async function loadPromotors(selectedToko: string) {
    setFormData(prev => ({ ...prev, toko: selectedToko, promotor: "" }));
    const { data } = await supabase.from("promotors").select("*").eq("nama_toko", selectedToko);
    if (data) setPromotors(data);
  }

  // Handle Form Submission
  const handleSubmit = async () => {
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");

    // VALIDASI: Tanggal, Sator, Toko, Promotor, Konsumen wajib
    if (
      !formData.tanggal || 
      !formData.sator || 
      !formData.toko || 
      !formData.promotor || 
      !formData.konsumen
    ) {
      setErrorMsg("Mohon lengkapi semua bidang bertanda bintang (*)");
      return;
    }

    setLoading(true);

    // Persiapan data untuk insert
    const payload = {
      tanggal: formData.tanggal,
      sator: formData.sator,
      toko: formData.toko,
      promotor: formData.promotor,
      konsumen: formData.konsumen,
      pekerjaan: formData.pekerjaan,
      no_hp: formData.no_hp,
      type_hp: formData.type_hp,
      harga_hp: formData.harga_hp ? parseInt(formData.harga_hp.toString()) : 0,
      leasing: formData.leasing,
      limit_kredit: formData.limit_kredit ? parseInt(formData.limit_kredit.toString()) : 0,
      status: formData.status,
      alasan_pending: formData.status === 'Pending' ? formData.alasan_pending : null,
      keterangan_reject: formData.status === 'Reject' ? formData.keterangan_reject : null
    };

    const { error } = await supabase
      .from("kredit_vast")
      .insert([payload]);

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMsg("Gagal menyimpan data ke database. Periksa koneksi atau RLS.");
    } else {
      setSuccessMsg("Data berhasil disimpan!");
      // Reset form fields
      setFormData(prev => ({
        ...prev,
        konsumen: "",
        pekerjaan: "",
        no_hp: "",
        type_hp: "",
        harga_hp: "",
        leasing: "",
        limit_kredit: "",
        status: "Pending",
        alasan_pending: "",
        keterangan_reject: ""
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-['Manrope']">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#002F6C]">Input Kredit</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Bar Mockup */}
        <div className="space-y-2">
           <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
              <span>Progress</span>
              <span>65%</span>
           </div>
           <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#002F6C] w-[65%]"></div>
           </div>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
             <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
             <span className="text-red-700 text-sm font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
             <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
             <span className="text-green-700 text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {/* Section 1: Lokasi */}
        <section className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Lokasi</h2>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tanggal *</label>
            <input 
              type="date" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
              value={formData.tanggal}
              onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">SATOR *</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all appearance-none"
              value={formData.sator}
              onChange={(e) => loadTokos(e.target.value)}
            >
              <option value="">Pilih SATOR</option>
              {sators.map(s => <option key={s.id} value={s.nama_sator}>{s.nama_sator}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Toko *</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all appearance-none"
              value={formData.toko}
              onChange={(e) => loadPromotors(e.target.value)}
              disabled={!formData.sator}
            >
              <option value="">Pilih Toko</option>
              {tokos.map(t => <option key={t.id} value={t.nama_toko}>{t.nama_toko}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Promotor *</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all appearance-none"
              value={formData.promotor}
              onChange={(e) => setFormData({...formData, promotor: e.target.value})}
              disabled={!formData.toko}
            >
              <option value="">Pilih Promotor</option>
              {promotors.map(p => <option key={p.id} value={p.nama_promotor}>{p.nama_promotor}</option>)}
            </select>
          </div>
        </section>

        {/* Section 2: Konsumen */}
        <section className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Konsumen</h2>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nama Konsumen *</label>
            <input 
              placeholder="Sesuai KTP" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
              value={formData.konsumen}
              onChange={(e) => setFormData({...formData, konsumen: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Pekerjaan</label>
              <input 
                placeholder="Contoh: Karyawan" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
                value={formData.pekerjaan}
                onChange={(e) => setFormData({...formData, pekerjaan: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">No. HP</label>
              <input 
                placeholder="0812..." 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
                value={formData.no_hp}
                onChange={(e) => setFormData({...formData, no_hp: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Produk */}
        <section className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Produk</h2>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Type HP</label>
            <input 
              placeholder="Contoh: V70 8+256GB" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
              value={formData.type_hp}
              onChange={(e) => setFormData({...formData, type_hp: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Harga HP (Rp)</label>
            <input 
              type="number"
              placeholder="Rp 0" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
              value={formData.harga_hp}
              onChange={(e) => setFormData({...formData, harga_hp: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Leasing</label>
              <input 
                placeholder="KREDIVO / VAST FINANCE" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
                value={formData.leasing}
                onChange={(e) => setFormData({...formData, leasing: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Limit Kredit</label>
              <input 
                type="number"
                placeholder="0 (Opsional)" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all"
                value={formData.limit_kredit}
                onChange={(e) => setFormData({...formData, limit_kredit: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Status */}
        <section className="bg-white p-5 rounded-2xl shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Pengajuan</h2>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Status *</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all appearance-none"
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="Pending">Pending</option>
              <option value="Closing">Closing</option>
              <option value="Reject">Reject</option>
            </select>
          </div>

          {/* Conditional Rendering: Alasan Pending */}
          {formData.status === 'Pending' && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Alasan Pending</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all appearance-none"
                value={formData.alasan_pending}
                onChange={(e) => setFormData({...formData, alasan_pending: e.target.value})}
              >
                <option value="">Pilih Alasan Pending</option>
                <option value="Stock belum ada">Stock belum ada</option>
                <option value="DP diatas 400k">DP diatas 400k</option>
                <option value="DP diatas 500k">DP diatas 500k</option>
                <option value="DP diatas 600k">DP diatas 600k</option>
                <option value="DP >800k">DP &gt;800k</option>
              </select>
            </div>
          )}

          {/* Conditional Rendering: Keterangan Reject */}
          {formData.status === 'Reject' && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Keterangan Reject</label>
              <textarea 
                placeholder="Isi keterangan reject manual..." 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all min-h-[100px]"
                value={formData.keterangan_reject}
                onChange={(e) => setFormData({...formData, keterangan_reject: e.target.value})}
              />
            </div>
          )}
        </section>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white px-6 pb-8 pt-4 border-t border-slate-100 flex gap-4 items-center z-50">
        <button className="flex-1 text-slate-400 font-bold text-xs uppercase tracking-widest flex flex-col items-center gap-1">
          <span className="text-xl leading-none">?</span>
          <span>Bantuan</span>
        </button>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[2.5] bg-[#002F6C] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#002F6C]/20 active:scale-95 transition-all"
        >
          {loading ? (
             <span className="animate-pulse">Menyimpan...</span>
          ) : (
            <>
              <span className="text-lg">💾</span>
              <span>SIMPAN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}