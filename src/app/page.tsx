"use client";

import { useRouter } from "next/navigation";

/**
 * VAULT FIDELITY LANDING PAGE - FINAL V2
 * Features:
 * 1. Institutional "Monolith of Trust" Design
 * 2. Secure Access Initialization Portals
 * 3. Detailed Security Protocol Showcases
 */

export default function LandingPage() {
  const router = useRouter();

  const navigateToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#0c1321] font-['Manrope'] text-[#dce2f6] antialiased overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-900/10 rounded-full blur-[160px]"></div>
      </div>

      {/* Institutional Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0c1321]/80 backdrop-blur-xl border-b border-white/5 px-8 md:px-16 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#aec6ff] rounded-xl flex items-center justify-center text-[#0c1321] font-black text-xl shadow-[0_0_20px_rgba(174,198,255,0.3)]">V</div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Vault Fidelity</h1>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">
          <a href="#security" className="hover:text-[#aec6ff] transition-colors">Security</a>
          <a href="#portals" className="hover:text-[#aec6ff] transition-colors">Portals</a>
          <a href="#framework" className="hover:text-[#aec6ff] transition-colors">Framework</a>
        </nav>
        <button 
          onClick={navigateToLogin}
          className="bg-[#aec6ff] text-[#0c1321] px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-[#aec6ff]/10"
        >
          Secure Sign In
        </button>
      </header>

      <main className="relative z-10">
        
        {/* Hero Section: The Monolith */}
        <section className="min-h-screen flex flex-col items-center justify-center pt-24 px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8 backdrop-blur-md">
            <span className="w-2 h-2 bg-[#aec6ff] rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Architectural Ledger v2.1</span>
          </div>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 max-w-4xl">
            THE ARCHITECTURAL <span className="text-[#aec6ff]">TRUST.</span>
          </h2>
          <p className="text-sm md:text-lg opacity-40 max-w-2xl leading-relaxed mb-12 font-medium">
            Institutional-grade asset management and credit portfolio tracking protected by zero-knowledge architecture and end-to-end ledger verification.
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={navigateToLogin}
              className="bg-[#aec6ff] text-[#0c1321] px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#aec6ff]/20 hover:scale-105 transition-all"
            >
              Initialize Secure Access
            </button>
            <button className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all">
              Security Protocol Docs
            </button>
          </div>
        </section>

        {/* Security Protocols */}
        <section id="security" className="py-32 px-8 md:px-16 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#aec6ff] mb-4">Verification Standards</h3>
            <h2 className="text-3xl font-black tracking-tight">The Security Stack</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'verified_user', title: 'AES-256 Encrypted', desc: 'Military-grade encryption for all institutional data assets.' },
              { icon: 'fingerprint', title: 'Biometric Gateway', desc: 'Secure multi-factor authentication for PIC & Manager access.' },
              { icon: 'security', title: 'Zero Knowledge', desc: 'Privacy-focused data handling with institutional audit trails.' }
            ].map((p, idx) => (
              <div key={idx} className="bg-[#151b2a] border border-white/5 p-10 rounded-[3rem] space-y-6 hover:border-[#aec6ff]/20 transition-all group">
                <span className="material-icons-outlined text-4xl text-[#aec6ff] group-hover:scale-110 transition-transform">{p.icon}</span>
                <h4 className="text-lg font-black uppercase tracking-tight">{p.title}</h4>
                <p className="text-xs leading-relaxed opacity-40 font-medium">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Entry Portals */}
        <section id="portals" className="py-32 bg-[#151b2a]/30 border-y border-white/5 px-8 md:px-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black tracking-tighter mb-6">PERSONALIZED<br/>ACCESS NODES.</h2>
              <p className="text-sm opacity-40 leading-relaxed mb-10 max-w-md">
                Our role-based routing system ensures that Sators and Managers access isolated, high-performance dashboards tailored to their specific coordination areas.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                  <span className="w-12 h-[1px] bg-[#aec6ff]"></span>
                  <span>Institutional PIC Portal</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest opacity-30">
                  <span className="w-12 h-[1px] bg-white"></span>
                  <span>Executive Oversight Dashboard</span>
                </div>
              </div>
            </div>
            <div className="bg-[#0c1321] p-2 rounded-[3.5rem] border border-white/10 shadow-2xl relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#aec6ff]/5 rounded-full blur-3xl"></div>
              <div className="bg-[#19202e] p-10 rounded-[3rem] border border-white/5 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#aec6ff]/10 rounded-[2rem] flex items-center justify-center mb-8">
                   <span className="material-icons-outlined text-4xl text-[#aec6ff]">lock</span>
                </div>
                <h4 className="text-xl font-black mb-4">SECURE GATEWAY</h4>
                <p className="text-xs opacity-40 mb-10 leading-relaxed">Enter your institutional credentials to initialize your personalized coordination ledger.</p>
                <button 
                  onClick={navigateToLogin}
                  className="w-full bg-[#aec6ff] text-[#0c1321] py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#aec6ff]/10 active:scale-95 transition-all"
                >
                  Enter The Vault
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Institutional Footer */}
      <footer className="py-20 border-t border-white/5 px-8 md:px-16 text-[10px] font-bold uppercase tracking-[0.4em] opacity-30 text-center flex flex-col md:flex-row justify-between items-center gap-8">
        <p>© 2024 Vault Fidelity. Secure Architectural Ledger.</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-[#aec6ff]">Privacy</a>
          <a href="#" className="hover:text-[#aec6ff]">Terms</a>
          <a href="#" className="hover:text-[#aec6ff]">Audit</a>
        </div>
      </footer>
    </div>
  );
}
