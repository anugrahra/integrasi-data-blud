'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Swords, Database, Loader2, TerminalSquare } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
      
    } catch (error: any) {
      console.error("Error saat login:", error.message);
      setErrorMsg("Gagal terhubung ke Google. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    // BACKGROUND INDUSTRIAL DENGAN POLA GRID HALUS
    <main className="min-h-screen flex items-center justify-center bg-neutral-100 relative overflow-hidden font-sans bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      
      <div className="w-full max-w-[400px] p-4 relative z-10">
        
        {/* Kartu Login ala Panel Kontrol */}
        <div className="bg-white rounded-sm shadow-md border-2 border-neutral-300 overflow-hidden relative">
          
          {/* Aksen Garis Striping Teknikal di Atas */}
          <div className="h-2 w-full bg-neutral-900 bg-[repeating-linear-gradient(45deg,#171717,#171717_10px,#262626_10px,#262626_20px)]"></div>

          {/* Header Card */}
          <div className="p-8 pb-6 text-center border-b-2 border-neutral-200 bg-neutral-50">
            <div className="mx-auto w-14 h-14 bg-white border-2 border-neutral-800 rounded flex items-center justify-center mb-4 shadow-sm">
              <Swords className="w-7 h-7 text-neutral-900" strokeWidth={2} />
            </div>
            
            <h1 className="text-xl font-black tracking-widest text-neutral-900 uppercase font-mono">LOG IN</h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="h-px w-8 bg-neutral-300"></span>
              <p className="text-xs text-neutral-500 font-bold tracking-wider uppercase">Pusat Data BLUD AM Terintegrasi</p>
              <span className="h-px w-8 bg-neutral-300"></span>
            </div>
          </div>

          {/* Body Card */}
          <div className="p-8 pt-6 bg-white relative">
            {/* Efek Sekrup di pojok-pojok (Visual Only) */}
            <div className="absolute top-2 left-2 w-2 h-2 border border-neutral-300 rounded-full bg-neutral-100 flex items-center justify-center"><div className="w-1 h-px bg-neutral-400 transform rotate-45"></div></div>
            <div className="absolute top-2 right-2 w-2 h-2 border border-neutral-300 rounded-full bg-neutral-100 flex items-center justify-center"><div className="w-1 h-px bg-neutral-400 transform -rotate-45"></div></div>

            <div className="mb-6 flex items-start gap-3 text-xs font-medium text-neutral-600 bg-neutral-100 p-3 rounded-sm border border-neutral-300 font-mono leading-relaxed">
              <Database className="w-5 h-5 text-neutral-900 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1 text-neutral-900">SELAMAT DATANG</p>
                <p>Mohon gunakan akun Google Anda untuk mengakses.</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-sm border-2 border-red-200 text-center font-mono flex items-center justify-center gap-2">
                <TerminalSquare className="w-4 h-4"/> ERROR: {errorMsg}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-neutral-800 text-neutral-900 font-bold rounded-sm transition-all shadow-[2px_2px_0px_0px_rgba(23,23,23,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 group font-mono tracking-tight uppercase"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
              ) : (
                <>
                  <svg className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>AUTHENTICATE WITH GOOGLE</span>
                </>
              )}
            </button>
            
            <div className="mt-8 text-center text-[9px] text-neutral-400 font-mono flex flex-col gap-1">
              <p>H▲A // V.1.0.2 2026</p>
              <p>ENGINEERED FOR BLUD AM CIMAHI</p>
            </div>
          </div>
        </div>
        
      </div>
    </main>
  );
}