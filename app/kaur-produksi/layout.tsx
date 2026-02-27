'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Database, LogOut, Settings, Factory } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function KaurProduksiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white">
      
      {/* SIDEBAR INDUSTRIAL */}
      <aside className="w-64 bg-neutral-900 text-neutral-300 flex flex-col border-r-4 border-neutral-800 shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-100 text-neutral-900 flex items-center justify-center rounded-sm font-black text-xl tracking-tighter">
              P
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-white uppercase">Kaur Produksi</h2>
              <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Control Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-neutral-800 hover:text-white transition-colors text-sm font-medium font-mono">
            <Home className="w-4 h-4" /> Beranda (Home)
          </Link>
          
          <Link href="/kaur-produksi" className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors text-sm font-medium font-mono ${pathname === '/kaur-produksi' ? 'bg-neutral-100 text-neutral-900 font-bold' : 'hover:bg-neutral-800 hover:text-white'}`}>
            <Database className="w-4 h-4" /> Manajemen Data
          </Link>
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-red-900/50 hover:text-red-400 text-neutral-500 transition-colors text-sm font-medium font-mono">
            <LogOut className="w-4 h-4" /> Logout System
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Tipis */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <Factory className="w-4 h-4" /> <span>DASHBOARD URUSAN PRODUKSI</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-red-700 transition-colors text-xs font-bold rounded-sm font-mono group shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              LOGOUT
            </button>
          </div>
        </header>
        
        {/* Area Render Halaman */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

    </div>
  );
}