'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { LogOut, LayoutDashboard, CircleUser } from 'lucide-react';

export default function KaurFloatingNav() {
  const router = useRouter();
  const pathname = usePathname();
  
  // State untuk sesi dan data profil
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    // Fungsi untuk cek sesi dan tarik data profil
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kaur Produksi';
        const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
        
        setUserName(name);
        setUserAvatar(avatar);
      }
    };
    checkSession();

    // Listener otomatis jika status login berubah
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Kaur Produksi');
        setUserAvatar(session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null);
      } else {
        setUserName('');
        setUserAvatar(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Anda yakin ingin keluar dari sesi Kaur?")) {
      await supabase.auth.signOut();
      router.push('/');
    }
  };

  // Sembunyikan jika belum login atau sedang berada di dalam dashboard kaur
  if (!isLoggedIn || pathname.includes('/kaur-')) {
    return null;
  }

  return (
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
          onClick={() => router.push('/kaur-produksi')}
          className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-blue-600 text-white border border-neutral-700 hover:border-blue-500 text-xs font-bold font-mono rounded-sm transition-all shadow-sm"
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> DASHBOARD
        </button>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-red-600 text-white border border-neutral-700 hover:border-red-500 text-xs font-bold font-mono rounded-sm transition-all shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" /> LOGOUT
        </button>
      </div>
      
    </div>
  );
}