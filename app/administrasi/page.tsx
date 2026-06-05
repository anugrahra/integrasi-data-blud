'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Users, FileSpreadsheet, FileText, Loader2, 
  Search, Briefcase, BadgeCheck, UserCog, Building2,
  X, Mail, Phone, Calendar, MapPin, Fingerprint, Award, Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/utils/supabase';

export default function AdministrasiUmumPublicPage() {
  const [pegawai, setPegawai] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPegawai, setSelectedPegawai] = useState<any | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- FETCH DATA DARI SUPABASE ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pegawai_air_minum')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        setPegawai(data);
      }
      setLoading(false);
    };

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };

    fetchData();
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- FILTER & STATISTIK ---
// --- FILTER & MULTI-LEVEL SORTING ---
// --- FILTER & MULTI-LEVEL SORTING (PNS > TETAP > KONTRAK > PENDUKUNG) ---
  const filteredData = useMemo(() => {
    // 1. Bobot Status Kepegawaian (Prioritas Utama)
    const getStatusWeight = (status: string) => {
      const s = status?.toLowerCase() || '';
      if (s.includes('pns')) return 1;
      if (s.includes('tetap')) return 2;
      if (s.includes('kontrak')) return 3;
      if (s.includes('pendukung')) return 4;
      return 5;
    };

    // 2. Bobot Hirarki Jabatan
    const getHierarchyWeight = (jabatan: string) => {
      const j = jabatan?.toLowerCase() || '';
      if (j.includes('kepala blud')) return 1;
      if (j.includes('kepala divisi')) return 2;
      if (j.includes('kepala urusan') || j.includes('ka. ur')) return 3;
      if (j.includes('staf')) return 4;
      return 5;
    };

    // 3. Bobot Urusan/Bagian
    const getUrusanWeight = (jabatan: string) => {
      const j = jabatan?.toLowerCase() || '';
      if (j.includes('keuangan')) return 1;
      if (j.includes('umum') || j.includes('administrasi')) return 2;
      if (j.includes('langganan') || j.includes('hubungan')) return 3;
      if (j.includes('produksi')) return 4;
      if (j.includes('distribusi')) return 5;
      return 6;
    };

    let result = [...pegawai];

    // Filter Pencarian
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.nama_lengkap?.toLowerCase() || '').includes(lower) || 
        (p.nip_nipb?.toLowerCase() || '').includes(lower) ||
        (p.tugas_jabatan?.toLowerCase() || '').includes(lower)
      );
    }

    // Sort Bertingkat
    return result.sort((a, b) => {
      // 1. Berdasarkan Status (PNS, Tetap, Kontrak, Pendukung)
      const statusA = getStatusWeight(a.status_pegawai);
      const statusB = getStatusWeight(b.status_pegawai);
      if (statusA !== statusB) return statusA - statusB;

      // 2. Berdasarkan Hirarki
      const hierA = getHierarchyWeight(a.tugas_jabatan);
      const hierB = getHierarchyWeight(b.tugas_jabatan);
      if (hierA !== hierB) return hierA - hierB;

      // 3. Berdasarkan Urusan
      const urusanA = getUrusanWeight(a.tugas_jabatan);
      const urusanB = getUrusanWeight(b.tugas_jabatan);
      if (urusanA !== urusanB) return urusanA - urusanB;

      // 4. Berdasarkan NIP/NIPB
      const nipA = a.nip_nipb || 'ZZZZ';
      const nipB = b.nip_nipb || 'ZZZZ';
      if (nipA !== nipB) return nipA.localeCompare(nipB);

      // 5. Berdasarkan Nama
      return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '');
    });
  }, [searchTerm, pegawai]);

  const stats = useMemo(() => {
  const kontrak = pegawai.filter(p => p.status_pegawai === 'Pegawai Kontrak').length;
  const pendukung = pegawai.filter(p => p.status_pegawai === 'Tenaga Pendukung').length;

  return {
    total: pegawai.length,
    tetap: pegawai.filter(p => p.status_pegawai === 'Pegawai Tetap').length,
    kontrak,
    pendukung,
    nonTetap: kontrak + pendukung,
    asn: pegawai.filter(p => p.status_pegawai === 'PNS').length,
  };
}, [pegawai]);

  // --- EXPORT EXCEL & PDF ---
  const handleExportExcel = () => {
    if (!filteredData.length) return;
    const wsData: any[] = [
      [`DATABASE PEGAWAI BLUD AIR MINUM KOTA CIMAHI`],
      [`Tanggal Unduh: ${format(new Date(), 'dd MMM yyyy', {locale: localeId})}`],
      [''],
      ['ID', 'NAMA LENGKAP', 'NIP / NIPB', 'JABATAN', 'GOLONGAN', 'STATUS', 'PENDIDIKAN']
    ];

    filteredData.forEach((item) => {
      wsData.push([item.id, item.nama_lengkap, item.nip_nipb, item.tugas_jabatan, item.pangkat_gol, item.status_pegawai, item.pendidikan_terakhir]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Pegawai");
    XLSX.writeFile(wb, `Database_Pegawai_Cimahi_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredData.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("DATABASE PEGAWAI BLUD AIR MINUM KOTA CIMAHI", 14, 15);
    
    autoTable(doc, {
      startY: 25,
      head: [['ID', 'NAMA LENGKAP', 'NIP / NIPB', 'JABATAN', 'GOL', 'STATUS']],
      body: filteredData.map(item => [item.id, item.nama_lengkap, item.nip_nipb, item.tugas_jabatan, item.pangkat_gol, item.status_pegawai]),
      headStyles: { fillColor: [31, 41, 55] }
    });

    doc.save(`Database_Pegawai_Cimahi.pdf`);
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('pns')) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (s.includes('tetap')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s.includes('kontrak') || s.includes('pendukung')) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-neutral-600 bg-neutral-100 border-neutral-300';
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Briefcase className="w-6 h-6" /> ADMINISTRASI UMUM</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-300 border border-neutral-300 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Total SDM</p>
              <p className="text-3xl font-mono font-bold text-neutral-900">{stats.total}</p>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1"><Users className="w-3 h-3"/> Karyawan Aktif</div>
          </div>
          <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Pegawai Tetap</p>
              <p className="text-3xl font-mono font-bold text-emerald-600">{stats.tetap}</p>
            </div>
          </div>
<div className="bg-white p-6 h-[120px] flex flex-col justify-between">
  <div>
    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1 tracking-wider">Non-Tetap</p>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-mono font-bold text-amber-600">{stats.nonTetap}</p>
    </div>
  </div>

  {/* Breakdown Section: Horizontal Row */}
  <div className="flex items-center gap-4 pt-2 border-t border-neutral-50">
    <div className="flex flex-col">
      <span className="text-[9px] text-neutral-400 uppercase leading-none mb-1">Kontrak</span>
      <span className="text-xs font-mono font-bold text-neutral-700">{stats.kontrak}</span>
    </div>
    
    <div className="h-6 w-px bg-neutral-200"></div>
    
    <div className="flex flex-col">
      <span className="text-[9px] text-neutral-400 uppercase leading-none mb-1">Pendukung</span>
      <span className="text-xs font-mono font-bold text-neutral-700">{stats.pendukung}</span>
    </div>
  </div>
</div>


          <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">PNS</p>
              <p className="text-3xl font-mono font-bold text-blue-700">{stats.asn}</p>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1"><Building2 className="w-3 h-3"/> Aparatur Negara</div>
          </div>
        </div>

        {/* TABEL DATABASE */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col h-[700px] overflow-hidden mb-12">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase flex items-center gap-2"><Users className="w-4 h-4"/> Database SDM</h3>
              <p className="text-[10px] text-neutral-500 font-mono">Menampilkan {filteredData.length} data riil</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Cari Nama atau Jabatan..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none" 
                />
              </div>
              <button onClick={handleExportExcel} className="px-3 py-2 bg-green-50 text-green-700 text-xs font-bold border border-green-200 rounded hover:bg-green-100 transition-colors flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-xs font-mono">Sinkronisasi Pusat Data...</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                <thead className="bg-neutral-900 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-medium">NAMA LENGKAP</th>
                    <th className="px-4 py-3 font-medium">NIP / NIPB</th>
                    <th className="px-4 py-3 font-medium text-center">GOL.</th>
                    <th className="px-4 py-3 font-medium">JABATAN</th>
                    <th className="px-6 py-3 font-medium text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredData.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedPegawai(row)} className="hover:bg-blue-50/80 transition-colors cursor-pointer group">
                      <td className="px-6 py-3 font-bold text-neutral-900 group-hover:text-blue-700">{row.nama_lengkap}</td>
                      <td className="px-4 py-3 font-mono text-neutral-600">{row.nip_nipb}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-neutral-700">{row.pangkat_gol || '-'}</td>
                      <td className="px-4 py-3 text-neutral-700">{row.tugas_jabatan}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${getStatusColor(row.status_pegawai)}`}>
                          {row.status_pegawai}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* SIDE PANEL DETAIL */}
      {selectedPegawai && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedPegawai(null)}></div>
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-right duration-300">
            <div className="h-32 bg-neutral-900 flex items-end px-6 pb-4 relative">
              <button onClick={() => setSelectedPegawai(null)} className="absolute top-4 right-4 p-1.5 bg-white/10 text-white rounded-full hover:bg-white/20"><X className="w-5 h-5"/></button>
              <div className="w-20 h-20 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center overflow-hidden absolute -bottom-10">
                <span className="text-2xl font-black text-neutral-300">{selectedPegawai.nama_lengkap.charAt(0)}</span>
              </div>
            </div>

            <div className="mt-12 px-6 flex-1 overflow-y-auto">
              <h2 className="text-xl font-black text-neutral-900 leading-tight">{selectedPegawai.nama_lengkap}</h2>
              <p className="text-sm font-bold text-blue-600 mb-4">{selectedPegawai.tugas_jabatan}</p>
              
              <div className="space-y-4 py-4 border-t border-neutral-100">
                {/* Row: NIP & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">NIP / NIPB</p>
                    <p className="text-sm font-mono font-bold">{selectedPegawai.nip_nipb || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">Status Pegawai</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded border text-[10px] font-bold ${getStatusColor(selectedPegawai.status_pegawai)}`}>
                      {selectedPegawai.status_pegawai}
                    </span>
                  </div>
                </div>

                {/* Row: Golongan & Pendidikan */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">Pangkat / Golongan</p>
                    <p className="text-sm font-bold text-neutral-800">{selectedPegawai.pangkat_gol || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">Pendidikan Terakhir</p>
                    <p className="text-sm font-bold">{selectedPegawai.pendidikan_terakhir}</p>
                  </div>
                </div>

                {/* Jurusan (Jika ada) */}
                {selectedPegawai.jurusan && (
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">Jurusan</p>
                    <p className="text-sm font-bold">{selectedPegawai.jurusan}</p>
                  </div>
                )}

                {/* Riwayat Pelatihan */}
                {selectedPegawai.pelatihan && (
                  <div className="pt-2 border-t border-neutral-50">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Riwayat Pelatihan</p>
                    <p className="text-xs italic text-neutral-600 leading-relaxed bg-neutral-50 p-2 rounded border border-neutral-100">
                      {selectedPegawai.pelatihan}
                    </p>
                  </div>
                )}
              </div>

              {isLoggedIn ? (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1.5"><BadgeCheck className="w-4 h-4"/> Data Kontak Internal</h4>
                  <div className="space-y-2">
                    <p className="text-xs flex items-center gap-2"><Mail className="w-3.5 h-3.5"/> {selectedPegawai.nama_lengkap.split(' ')[0].toLowerCase()}@cimahi.go.id</p>
                    <p className="text-xs flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> +62 8xx-xxxx-xxxx</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex gap-3">
                    <Lock className="w-5 h-5 text-neutral-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Kontak Terkunci</p>
                      <p className="text-[10px] text-neutral-500 leading-relaxed mt-1">Silakan login sebagai staf internal untuk melihat informasi kontak dan detail sensitif lainnya.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 flex gap-2">
              <button onClick={() => setSelectedPegawai(null)} className="flex-1 py-2 text-xs font-bold border border-neutral-200 rounded hover:bg-neutral-50">TUTUP</button>
              <button className="flex-1 py-2 text-xs font-bold bg-neutral-900 text-white rounded hover:bg-blue-600">CETAK PROFIL</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}