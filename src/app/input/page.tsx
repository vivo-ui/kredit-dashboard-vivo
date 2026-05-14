"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

// Debounce hook untuk cek duplikat saat mengetik
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function InputKreditPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Duplicate detection states
  const [duplicateByName, setDuplicateByName] = useState<any[]>([]);
  const [duplicateByPhone, setDuplicateByPhone] = useState<any[]>([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    tanggal: (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })(),
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
    status: "Pending",
    alasan_pending: "",
    keterangan_reject: ""
  });

  // Master Data States
  const [sators, setSators] = useState<any[]>([]);
  const [tokos, setTokos] = useState<any[]>([]);
  const [promotors, setPromotors] = useState<any[]>([]);

  // Debounce inputs untuk deteksi duplikat
  const debouncedKonsumen = useDebounce(formData.konsumen, 700);
  const debouncedNoHp = useDebounce(formData.no_hp, 700);

  useEffect(() => {
    loadSators();
  }, []);

  // Cek duplikat berdasarkan nama konsumen
  useEffect(() => {
    if (debouncedKonsumen.trim().length < 3) {
      setDuplicateByName([]);
      return;
    }
    checkDuplicateName(debouncedKonsumen.trim());
  }, [debouncedKonsumen]);

  // Cek duplikat berdasarkan nomor HP
  useEffect(() => {
    if (debouncedNoHp.trim().length < 5) {
      setDuplicateByPhone([]);
      return;
    }
    checkDuplicatePhone(debouncedNoHp.trim());
  }, [debouncedNoHp]);

  async function checkDuplicateName(name: string) {
    setCheckingDuplicate(true);
    const { data } = await supabase
      .from("kredit_vast")
      .select("id, tanggal, promotor, konsumen, no_hp, status, toko")
      .ilike("konsumen", `%${name}%`)
      .limit(5);
    setDuplicateByName(data || []);
    setCheckingDuplicate(false);
  }

  async function checkDuplicatePhone(phone: string) {
    setCheckingDuplicate(true);
    const { data } = await supabase
      .from("kredit_vast")
      .select("id, tanggal, promotor, konsumen, no_hp, status, toko")
      .ilike("no_hp", `%${phone}%`)
      .limit(5);
    setDuplicateByPhone(data || []);
    setCheckingDuplicate(false);
  }

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
      setDuplicateByName([]);
      setDuplicateByPhone([]);
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

  async function handleLogout() {
    const confirmLogout = confirm("Apakah Anda yakin ingin keluar?");
    if (!confirmLogout) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error(error);
    window.location.href = "/";
  }

  // Gabungkan semua duplikat dan hapus yang sama
  const allDuplicates = [...duplicateByName, ...duplicateByPhone].filter(
    (item, index, self) => index === self.findIndex(t => t.id === item.id)
  );

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("clos")) return "bg-green-100 text-green-700";
    if (s.includes("pend")) return "bg-yellow-100 text-yellow-700";
    if (s.includes("rej")) return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-['Manrope']">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[#002F6C]">Input Kredit</h1>
        <button
          onClick={handleLogout}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
        >
          <span className="text-xs font-bold uppercase tracking-widest">Logout</span>
          <span className="text-lg">🚪</span>
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Bar */}
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
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">!</div>
            <span className="text-red-700 text-sm font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">✓</div>
            <span className="text-green-700 text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {/* ⚠️ DUPLICATE WARNING BANNER */}
        {allDuplicates.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-amber-800 font-bold text-sm">Konsumen Mungkin Sudah Pernah Diinput!</p>
                <p className="text-amber-600 text-xs">Ditemukan {allDuplicates.length} data yang mirip di database</p>
              </div>
            </div>
            <div className="space-y-2">
              {allDuplicates.map((dup) => (
                <div key={dup.id} className="bg-white border border-amber-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-sm">{dup.konsumen}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getStatusColor(dup.status)}`}>
                      {dup.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">📞 {dup.no_hp || "-"}</p>
                  <p className="text-xs text-slate-500">🏪 {dup.toko || "-"} &middot; 👤 {dup.promotor || "-"}</p>
                  <p className="text-xs text-slate-400">📅 {dup.tanggal?.substring(0, 10) || "-"}</p>
                </div>
              ))}
            </div>
            <p className="text-amber-700 text-xs font-medium">Anda masih bisa menyimpan jika ini adalah konsumen yang berbeda.</p>
          </div>
        )}

        {/* Checking indicator */}
        {checkingDuplicate && (
          <div className="flex items-center gap-2 text-slate-400 text-xs px-1">
            <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <span>Mengecek data duplikat...</span>
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
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
              Nama Konsumen *
            </label>
            <input
              placeholder="Sesuai KTP"
              className={`w-full p-4 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all ${
                duplicateByName.length > 0 ? "border-amber-400 bg-amber-50" : "border-slate-100"
              }`}
              value={formData.konsumen}
              onChange={(e) => setFormData({...formData, konsumen: e.target.value})}
            />
            {duplicateByName.length > 0 && (
              <p className="text-amber-600 text-xs mt-1 font-medium">⚠️ Nama ini sudah ada di database</p>
            )}
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
                className={`w-full p-4 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all ${
                  duplicateByPhone.length > 0 ? "border-amber-400 bg-amber-50" : "border-slate-100"
                }`}
                value={formData.no_hp}
                onChange={(e) => setFormData({...formData, no_hp: e.target.value})}
              />
              {duplicateByPhone.length > 0 && (
                <p className="text-amber-600 text-xs mt-1 font-medium">⚠️ No. HP sudah ada</p>
              )}
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
              <select
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#002F6C] focus:bg-white outline-none transition-all appearance-none"
                value={formData.leasing}
                onChange={(e) => setFormData({...formData, leasing: e.target.value})}
              >
                <option value="">Pilih Leasing</option>
                <option value="Vast finance">Vast finance</option>
                <option value="Kredivo">Kredivo</option>
                <option value="Yess kredit">Yess kredit</option>
                <option value="HCI">HCI</option>
                <option value="Spektra">Spektra</option>
                <option value="Indodana">Indodana</option>
                <option value="Laku6">Laku6</option>
              </select>
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
                <option value="Domisili Konsumen Jauh dari Toko">Domisili Konsumen Jauh dari Toko</option>
              </select>
            </div>
          )}

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
          className={`flex-[2.5] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all ${
            allDuplicates.length > 0
              ? "bg-amber-500 shadow-amber-500/20 text-white"
              : "bg-[#002F6C] shadow-[#002F6C]/20 text-white"
          }`}
        >
          {loading ? (
            <span className="animate-pulse">Menyimpan...</span>
          ) : allDuplicates.length > 0 ? (
            <>
              <span className="text-lg">⚠️</span>
              <span>SIMPAN (Ada Duplikat)</span>
            </>
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