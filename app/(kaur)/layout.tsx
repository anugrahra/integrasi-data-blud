'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Database, LogOut, CircleUser, Smile, Loader2, Globe } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function KaurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [userName, setUserName] = useState<string>('MENGIDENTIFIKASI...');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // STATE BARU: Untuk nampung status pop-up modal logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isPerencanaan = pathname.includes('/kaur-perencanaan');
  const urusanTitle = isPerencanaan ? 'Urusan Perencanaan Teknik' : 'Urusan Produksi';
  const urusanInitial = isPerencanaan ? 'T' : 'P';
  const manajemenLink = isPerencanaan ? '/kaur-perencanaan' : '/kaur-produksi';

  const publicLink = isPerencanaan ? '/perencanaan' : '/produksi';

  // --- FUNGSI SATPAM VERSI MASTER_USERS (DENGAN JALUR TOL ADMIN) ---
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);
      
      // 1. Cek Sesi Google
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/login');
        return;
      }

      const googleName = user.user_metadata?.full_name || user.email?.split('@')[0];
      const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
      setUserAvatar(avatar);

      // 2. Cek ke tabel master_users
      const { data: masterData, error } = await supabase
        .from('master_users')
        .select('nama_lengkap, role_jabatan')
        .eq('email', user.email)
        .single();

      if (error || !masterData) {
        alert('AKSES DITOLAK: Email Anda tidak terdaftar di database kepegawaian (master_users).');
        await supabase.auth.signOut();
        router.replace('/');
        return;
      }

      setUserName(masterData.nama_lengkap || googleName);

      // 3. LOGIKA PENENDANGAN (DENGAN BYPASS ADMIN)
      const jabatan = masterData.role_jabatan.toLowerCase(); 
      const isAdmin = jabatan === 'admin' || jabatan.includes('admin');

      if (!isAdmin) {
        // Logika untuk Kaur Biasa
        if (pathname.includes('/kaur-produksi') && !jabatan.includes('produksi')) {
          alert('AKSES DITOLAK: Area ini khusus untuk Kaur Produksi.');
          if (jabatan.includes('perencanaan')) router.replace('/kaur-perencanaan');
          else router.replace('/');
        } 
        else if (pathname.includes('/kaur-perencanaan') && !jabatan.includes('perencanaan')) {
          alert('AKSES DITOLAK: Area ini khusus untuk Kaur Perencanaan.');
          if (jabatan.includes('produksi')) router.replace('/kaur-produksi');
          else router.replace('/');
        } else {
          // Kaur masuk ke kandang yang benar
          setIsCheckingAccess(false);
        }
      } else {
        // Admin langsung dibukain pintu
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [pathname, router]);

  // --- FUNGSI GANTI JUDUL TAB BROWSER OTOMATIS ---
  useEffect(() => {
    // Kalau dia ada di dashboard kaur, ganti judulnya sesuai urusan
    if (pathname.includes('/kaur-')) {
      document.title = `${urusanTitle} - Pusat Data BLUD AM Terintegrasi`;
    } else {
      // Balikin ke default kalau keluar dari dashboard
      document.title = 'Pusat Data BLUD AM Terintegrasi';
    }
  }, [pathname, urusanTitle]);

  // --- FUNGSI LOGOUT DENGAN MODAL ---
  const confirmLogout = () => setShowLogoutModal(true);
  const cancelLogout = () => setShowLogoutModal(false);
  const executeLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.push('/');
  };

  // --- TAMPILAN LOADING SAAT CEK AKSES ---
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center font-mono text-neutral-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold animate-pulse">MEMVERIFIKASI OTORISASI MASTER USERS...</p>
      </div>
    );
  }

  // --- TAMPILAN UTAMA (SIDEBAR & KONTEN) ---
  return (
    <>
      <div className="min-h-screen bg-neutral-100 flex font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white relative">
        
        {/* SIDEBAR INDUSTRIAL */}
        <aside className="w-64 bg-neutral-900 text-neutral-300 flex flex-col border-r-4 border-neutral-800 shrink-0">
          <div className="h-20 flex items-center px-6 border-b border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-neutral-100 text-neutral-900 flex items-center justify-center rounded-sm font-black text-xl tracking-tighter">
                {urusanInitial}
              </div>
              <div>
                <h2 className="text-xs font-black tracking-widest text-white uppercase">
                  {urusanTitle}
                </h2>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-neutral-800 hover:text-white transition-colors text-sm font-medium font-mono">
              <Home className="w-4 h-4" /> Beranda (Home)
            </Link>

            {/* LINK MENUJU HALAMAN PUBLIK (OTOMATIS) */}
            <Link href={publicLink} className="flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-neutral-800 hover:text-white transition-colors text-sm font-medium font-mono">
              <Globe className="w-4 h-4" /> Lihat Halaman Publik
            </Link>
            
            <Link 
              href={manajemenLink} 
              className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors text-sm font-medium font-mono ${
                pathname === manajemenLink 
                  ? 'bg-neutral-100 text-neutral-900 font-bold' 
                  : 'hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" /> Manajemen Data
            </Link>
          </nav>

          <div className="p-4 border-t border-neutral-800">
            {/* INI YANG BERUBAH: Panggil confirmLogout */}
            <button onClick={confirmLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-sm hover:bg-red-900/50 hover:text-red-400 text-neutral-500 transition-colors text-sm font-medium font-mono">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-3 text-xs font-mono text-neutral-500 capitalize">
              {userAvatar ? (
                <img src={userAvatar} alt="Profile" className="w-7 h-7 rounded-full border border-neutral-200 shadow-sm object-cover" referrerPolicy="no-referrer" />
              ) : (
                <CircleUser className="w-4 h-4" />
              )}
              
              <span className="flex items-center gap-1.5 font-bold tracking-wider text-neutral-700">
                Halo, {userName} 
              </span>
            </div>
            {/* <div className="flex items-center gap-4">
              <button onClick={confirmLogout} className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-red-700 transition-colors text-xs font-bold rounded-sm font-mono group shadow-sm">
                <LogOut className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                LOGOUT
              </button>
            </div> */}
          </header>
          
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>

      </div>

      {/* --- CUSTOM POP-UP MODAL LOGOUT --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white w-full max-w-sm rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full shrink-0 bg-red-100 text-red-600">
                  <LogOut className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 mb-1">
                    Logout
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                    Anda yakin ingin mengakhiri sesi dan keluar dari sistem?
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
              <button 
                onClick={cancelLogout} 
                className="px-4 py-2 text-xs font-bold font-mono text-neutral-600 hover:bg-neutral-200 rounded-sm transition-colors"
              >
                BATAL
              </button>
              <button 
                onClick={executeLogout} 
                className="px-4 py-2 text-xs font-bold font-mono bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors shadow-sm"
              >
                YA, LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}