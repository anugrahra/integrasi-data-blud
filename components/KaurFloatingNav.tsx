'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { LogOut, LayoutDashboard, CircleUser, AlertTriangle } from 'lucide-react';

export default function KaurFloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  
  // State untuk sesi dan data profil
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  // STATE BARU: Untuk nampung link dinamis ke dashboard masing-masing
  const [dashboardUrl, setDashboardUrl] = useState<string>('/');

  // STATE MODAL LOGOUT
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // Fungsi untuk cek sesi dan tarik data profil + jabatan
    const checkSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      if (session?.user) {
        // 1. Tarik data dasar dari Google
        const defaultName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kaur';
        const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
        
        setUserAvatar(avatar);
        setUserName(defaultName);

        // 2. Cek ke master_users buat nentuin ruangannya!
        const { data: masterData } = await supabase
          .from('master_users')
          .select('role_jabatan, nama_lengkap')
          .eq('email', session.user.email)
          .single();

        if (masterData) {
          // Update nama pakai yang resmi dari database kalau ada
          if (masterData.nama_lengkap) setUserName(masterData.nama_lengkap);

          // Tentukan rute lemparan berdasarkan jabatan
          const role = masterData.role_jabatan.toLowerCase();
          if (role.includes('produksi')) {
            setDashboardUrl('/kaur-produksi');
          } else if (role.includes('perencanaan')) {
            setDashboardUrl('/kaur-perencanaan');
          } else if (role.includes('administrasi')) {
            setDashboardUrl('/kaur-administrasi');
          } else {
            setDashboardUrl('/'); // Admin lempar ke Beranda
          }
        }
      }
    };

    checkSessionAndRole();

    // Listener otomatis jika status login berubah
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        checkSessionAndRole(); // Panggil ulang biar rolenya ke-fetch lagi
      } else {
        setUserName('');
        setUserAvatar(null);
        setDashboardUrl('/');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- FUNGSI LOGOUT YANG SUDAH DI-UPGRADE ---
  const confirmLogout = () => {
    setShowLogoutModal(true); // Tampilkan modal keren kita
  };

  const cancelLogout = () => {
    setShowLogoutModal(false); // Sembunyikan modal
  };

  const executeLogout = async () => {
    setShowLogoutModal(false);
    await supabase.auth.signOut();
    router.push('/');
  };

  // Sembunyikan jika belum login atau sedang berada di dalam dashboard kaur
  if (!isLoggedIn || pathname.includes('/kaur-')) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-neutral-900 border-b border-neutral-800 px-6 py-2 flex justify-between items-center animate-in slide-in-from-top-2">
        
        {/* Indikator Profil (FOTO & NAMA) */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt="Profile" 
                className="w-7 h-7 rounded-full border border-neutral-700 shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <CircleUser className="w-7 h-7 text-neutral-400" />
            )}
            {/* Titik hijau kecil penanda online */}
            <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-neutral-900"></span>
          </div>
          
          <span className="text-xs font-mono font-bold text-neutral-300 tracking-wider capitalize">
            Halo, {userName}
          </span>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(dashboardUrl)}
            className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-blue-600 text-white border border-neutral-700 hover:border-blue-500 text-xs font-bold font-mono rounded-sm transition-all shadow-sm"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> DASHBOARD
          </button>
          <button 
            onClick={confirmLogout}
            className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-red-600 text-white border border-neutral-700 hover:border-red-500 text-xs font-bold font-mono rounded-sm transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" /> LOGOUT
          </button>
        </div>
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