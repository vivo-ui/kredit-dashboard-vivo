"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

/**
 * VAULT FIDELITY LOGIN - ULTIMATE V7 (NULL DATA FIX)
 * Lokasi File: src/app/login/page.tsx
 * 
 * FIX LIST:
 * 1. Strict Email Normalization: Menghapus spasi dan mengubah ke lowercase untuk sinkronisasi database.
 * 2. Robust Metadata Handling: Menangani kasus di mana data di users_role mungkin null atau tidak ditemukan.
 * 3. Atomic Identity Sync: Memastikan localStorage terkunci sebelum router push.
 * 4. Verbose Debugging: Log transparan di konsol untuk melacak alur autentikasi.
 */

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin() {
    setErrorMsg("");
    setLoading(true);

    try {
      // 1. Sanitasi Input Email (PENTING untuk pencocokan database)
      const cleanEmail = email.trim().toLowerCase();
      console.log("--- TERMINAL LOGIN START ---");
      console.log("Input Email Processed:", cleanEmail);

      // 2. Autentikasi Supabase Auth Utama
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        console.error("AUTH_ERROR:", authError.message);
        setErrorMsg("Kredensial institusi tidak valid.");
        setLoading(false);
        return;
      }

      console.log("AUTH_SUCCESS. Mencari metadata di tabel 'users_role'...");

      // 3. Ambil Metadata Role (Menggunakan * untuk fleksibilitas skema)
      const { data: userData, error: userError } = await supabase
        .from("users_role")
        .select("*") 
        .eq("email", cleanEmail)
        .maybeSingle();

      if (userError) {
        console.error("DATABASE_QUERY_ERROR:", userError.message);
      }

      console.log("METADATA_RECEIVED:", userData);

      // 4. LOGIKA PERUTEAN ULTIMATE
      
      // Jalur Khusus: Manager Manual Override
      if (cleanEmail === "manager@vivo.com") {
        console.log("ROUTE: Executing Manager Static Redirect.");
        router.push("/dashboard");
        return;
      }

      // Kasus: Metadata tidak ditemukan di tabel users_role
      if (!userData) {
        console.warn("WARNING: Metadata user tidak ditemukan (NULL). Mengarahkan ke rute dasar.");
        router.push("/input");
        setLoading(false);
        return;
      }

      // Destrukturisasi data dengan Fallback Safe
      const role = (userData.role || "").toLowerCase().trim();
      const satorName = userData.sator_name || userData.name || userData.full_name || "PIC Unknown";
      const area = userData.area || "General Area";

      console.log("ROUTING_ANALYSIS:", { role, satorName, area });

      // Cek Role Sator
      if (role === "sator" || role === "pic") {
        console.log("IDENTITY_LOCKED: Menyiapkan sesi Sator...");
        
        // WAJIB: Simpan ke localStorage agar Dashboard Sator bisa memfilter data
        localStorage.setItem("sator_identity", satorName);
        localStorage.setItem("sator_area", area);
        
        console.log("ROUTE: Navigating to /dashboard-sator");
        router.push("/dashboard-sator");
      } 
      // Cek Role Manager
      else if (role === "manager" || role === "admin") {
        console.log("ROUTE: Navigating to Oversight Dashboard (/dashboard)");
        router.push("/dashboard");
      } 
      // User Biasa / Promotor
      else {
        console.log("ROUTE: Navigating to Default Input Node (/input)");
        router.push("/input");
      }

    } catch (err) {
      console.error("SYSTEM_CRITICAL_FAILURE:", err);
      setErrorMsg("Terminal otorisasi mengalami kegagalan sinkronisasi.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c1321] font-['Manrope'] flex flex-col items-center justify-center p-6 text-[#dce2f6] antialiased">
      {/* Efek Latar Belakang Digital */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Identitas Brand */}
      <div className="text-center mb-10 relative z-10">
        <div className="w-16 h-16 bg-[#aec6ff] rounded-2xl flex items-center justify-center text-[#0c1321] text-3xl font-black mx-auto mb-6 shadow-[0_0_30px_rgba(174,198,255,0.3)]">
          VF
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#aec6ff] mb-2 opacity-60">Tracking Kredit</p>
        <h1 className="text-3xl font-black tracking-tight text-white">VIVO FLORES</h1>
      </div>

      {/* Secure Terminal Card */}
      <div className="w-full max-w-[420px] bg-[#151b2a] rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#aec6ff]/50 to-transparent"></div>
        
        <div className="space-y-8">
          <div className="text-center space-y-1">
             <h2 className="text-lg font-bold text-white">Institutional Access</h2>
             <p className="text-xs text-[#aec6ff]/40">Email required for PIC & Management.</p>
          </div>

          <div className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#aec6ff]/50 ml-1">Institutional Email</label>
              <div className="relative">
                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#aec6ff]/30 text-lg">alternate_email</span>
                <input 
                  type="email"
                  placeholder="name@vaultfidelity.com"
                  className="w-full bg-[#0c1321] border border-white/5 p-4 pl-12 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#aec6ff]/20 transition-all placeholder:text-white/10 text-white"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Passkey Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#aec6ff]/50 ml-1">Security Passkey</label>
              <div className="relative">
                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#aec6ff]/30 text-lg">vpn_key</span>
                <input 
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full bg-[#0c1321] border border-white/5 p-4 pl-12 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#aec6ff]/20 transition-all placeholder:text-white/10 text-white"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
              <span className="material-icons-outlined text-rose-400 text-sm">security</span>
              <p className="text-[11px] text-rose-300 font-bold uppercase tracking-wider">{errorMsg}</p>
            </div>
          )}

          {/* Authorize Button */}
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#aec6ff] text-[#0c1321] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#aec6ff]/10 active:scale-95 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Initializing...</span>
            ) : (
              <>
                <span className="material-icons-outlined text-sm">lock_open</span>
                <span>Authorize Access</span>
              </>
            )}
          </button>
        </div>
      </div>

      <footer className="mt-12 text-[8px] font-bold uppercase tracking-[0.5em] text-center opacity-30">
        © 2026 VIVO FLORES KREDIT TRACKING. <br/> INTERNAL ACCESS ONLY.
      </footer>
    </div>
  );
}