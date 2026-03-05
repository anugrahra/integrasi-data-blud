'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Users, FileSpreadsheet, FileText, Loader2, 
  Search, Briefcase, BadgeCheck, UserCog, Building2,
  X, Mail, Phone, Calendar, MapPin, Fingerprint, Award, Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/utils/supabase'; // <-- WAJIB IMPORT SUPABASE BUAT CEK LOGIN

// --- DATABASE SDM TERPADU (DATA ASLI DARI PDF) ---
const mockPegawai = [
  { id: 1, nama: 'Amat, S.E.', nipb: '197001012000031001', golongan: 'IV/a', urusan: 'Pimpinan', jabatan: 'Kepala BLUD Air Minum', status: 'ASN' },
  { id: 2, nama: 'Hardjono, S.Pd., M.M.', nipb: '196503021990021001', golongan: 'IV/b', urusan: 'Pembina', jabatan: 'Pembina Keuangan', status: 'ASN' },
  { id: 3, nama: 'Endang, S.IP., M.T.', nipb: '196805121995031002', golongan: 'IV/b', urusan: 'Pembina', jabatan: 'Pembina Teknis', status: 'ASN' },
  { id: 4, nama: 'Ajeng Martini Dewi, S.IP., M.T.', nipb: 'B-201001001', golongan: 'III/d', urusan: 'Keuangan & Umum', jabatan: 'Kepala Divisi Keuangan dan Umum', status: 'Tetap' },
  { id: 5, nama: 'Henri Syaefulrahman, S.Sos.', nipb: 'B-201204008', golongan: 'III/a', urusan: 'Keuangan', jabatan: 'Bendahara Penerimaan', status: 'Tetap' },
  { id: 6, nama: 'Intan Puspita Ningrum, S.E.', nipb: 'B-201407009', golongan: 'III/a', urusan: 'Keuangan', jabatan: 'Bendahara Pengeluaran', status: 'Tetap' },
  { id: 7, nama: 'Rizka Nurmalia', nipb: 'K-202101001', golongan: 'II/b', urusan: 'Keuangan', jabatan: 'Teller', status: 'Kontrak' },
  { id: 8, nama: 'Rizkia Aulia Khairunnisa', nipb: 'K-202203002', golongan: 'II/b', urusan: 'Keuangan', jabatan: 'Teller', status: 'Kontrak' },
  { id: 9, nama: 'M. Rizki Putra Wiryawan', nipb: 'K-202101003', golongan: 'II/b', urusan: 'Keuangan', jabatan: 'Staf Keuangan', status: 'Kontrak' },
  { id: 10, nama: 'Kurnia Sociati, S.Pd.', nipb: 'B-201501001', golongan: 'III/b', urusan: 'Administrasi & Umum', jabatan: 'Kaur Administrasi dan Umum', status: 'Tetap' },
  { id: 11, nama: 'Yana Maulana', nipb: 'K-202003004', golongan: 'II/b', urusan: 'Administrasi & Umum', jabatan: 'Staf Administrasi Umum', status: 'Kontrak' },
  { id: 12, nama: 'Dhia Khamiswarra E.P., S.H.', nipb: 'K-202105005', golongan: 'II/b', urusan: 'Administrasi & Umum', jabatan: 'Staf Administrasi Umum', status: 'Kontrak' },
  { id: 13, nama: 'Nunung Untari', nipb: 'K-201801006', golongan: 'I/c', urusan: 'Administrasi & Umum', jabatan: 'Pramu Kebersihan', status: 'Kontrak' },
  { id: 14, nama: 'Hendrian, A.Md.', nipb: 'B-201109012', golongan: 'II/c', urusan: 'Teknik Operasional', jabatan: 'Fungsional Teknik Pengairan', status: 'Tetap' },
  { id: 15, nama: 'Resty Mavita N., S.T.', nipb: 'B-201703003', golongan: 'III/b', urusan: 'Perencanaan Teknik', jabatan: 'Kaur Perencanaan Teknik', status: 'Tetap' },
  { id: 16, nama: 'Yahya Zakariyya', nipb: 'K-202205007', golongan: 'II/b', urusan: 'Perencanaan Teknik', jabatan: 'Staf Perencanaan Teknik', status: 'Kontrak' },
  { id: 17, nama: 'Saepul Rahman', nipb: 'K-202302008', golongan: 'II/b', urusan: 'Perencanaan Teknik', jabatan: 'Staf Perencanaan Teknik', status: 'Kontrak' },
  { id: 18, nama: 'Dimas Viali Ulil Albab, S.E.', nipb: 'K-202008009', golongan: 'II/b', urusan: 'Perencanaan Teknik', jabatan: 'Operator Rusunawa Cibeureum', status: 'Kontrak' },
  { id: 19, nama: 'Asep Suarna, S.Sos.', nipb: 'K-201901010', golongan: 'II/b', urusan: 'Perencanaan Teknik', jabatan: 'Operator Rusunawa Leuwigajah', status: 'Kontrak' },
  { id: 20, nama: 'Erlangga Putra M.', nipb: 'K-202401011', golongan: 'II/a', urusan: 'Perencanaan Teknik', jabatan: 'Operator Rusunawa Cigugur Tengah', status: 'Kontrak' },
  { id: 21, nama: 'Farman Aditya Firani, S.E.', nipb: 'B-201902005', golongan: 'III/b', urusan: 'Pelayanan Langganan', jabatan: 'Kaur Pelayanan Langganan', status: 'Tetap' },
  { id: 22, nama: 'Agus Solihin', nipb: 'K-201908011', golongan: 'II/b', urusan: 'Pelayanan Langganan', jabatan: 'Staf Pelayanan Langganan', status: 'Kontrak' },
  { id: 23, nama: 'Adelia Meyleonita', nipb: 'K-202104012', golongan: 'II/b', urusan: 'Pelayanan Langganan', jabatan: 'Staf Pelayanan Langganan', status: 'Kontrak' },
  { id: 24, nama: 'Riandi Pratama', nipb: 'K-202006013', golongan: 'II/b', urusan: 'Pelayanan Langganan', jabatan: 'Staf Pelayanan Langganan', status: 'Kontrak' },
  { id: 25, nama: 'Riyan Febriaan', nipb: 'K-202209014', golongan: 'II/b', urusan: 'Pelayanan Langganan', jabatan: 'Staf Pelayanan Langganan', status: 'Kontrak' },
  { id: 26, nama: 'Essa Akbar Fahlen', nipb: 'K-202301015', golongan: 'II/b', urusan: 'Pelayanan Langganan', jabatan: 'Staf Pelayanan Langganan', status: 'Kontrak' },
  { id: 27, nama: 'M. Fadly Nuriman', nipb: 'K-202311016', golongan: 'II/b', urusan: 'Pelayanan Langganan', jabatan: 'Staf Pelayanan Langganan', status: 'Kontrak' },
  { id: 28, nama: 'Filippo Usopp Barton', nipb: 'B-201805002', golongan: 'III/b', urusan: 'Produksi', jabatan: 'Kaur Produksi', status: 'Tetap' },
  { id: 29, nama: 'Achmad Maulana', nipb: 'K-202011015', golongan: 'II/b', urusan: 'Produksi', jabatan: 'Staf Produksi', status: 'Kontrak' },
  { id: 30, nama: 'Dida Kusuma Praja', nipb: 'K-202102016', golongan: 'II/b', urusan: 'Produksi', jabatan: 'Staf Produksi', status: 'Kontrak' },
  { id: 31, nama: 'Sofian Witono Nur', nipb: 'K-201905017', golongan: 'II/b', urusan: 'Produksi', jabatan: 'Staf Produksi', status: 'Kontrak' },
  { id: 32, nama: 'Danny Rahardi Kusuma', nipb: 'K-202207018', golongan: 'II/b', urusan: 'Produksi', jabatan: 'Staf Produksi', status: 'Kontrak' },
  { id: 33, nama: 'Dendy Yusetiadi, S.IP.', nipb: 'B-201608004', golongan: 'III/b', urusan: 'Distribusi', jabatan: 'Kaur Distribusi', status: 'Tetap' },
  { id: 34, nama: 'Wiki Septiani', nipb: 'K-202107018', golongan: 'II/b', urusan: 'Distribusi', jabatan: 'Staf Distribusi', status: 'Kontrak' },
  { id: 35, nama: 'Ferdi Adi Nugraha', nipb: 'K-202004019', golongan: 'II/b', urusan: 'Distribusi', jabatan: 'Staf Distribusi', status: 'Kontrak' },
  { id: 36, nama: 'Rangga Herlambang', nipb: 'K-202308020', golongan: 'II/b', urusan: 'Distribusi', jabatan: 'Staf Distribusi', status: 'Kontrak' },
  { id: 37, nama: 'Admin Pusat Data', nipb: 'IT-202409001', golongan: 'III/a', urusan: 'IT & Sistem', jabatan: 'System Administrator', status: 'Tetap' },
];

export default function AdministrasiUmumPublicPage() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPegawai, setSelectedPegawai] = useState<any | null>(null);
  
  // --- STATE INTEL: CEK USER LOGIN ATAU BUKAN ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    // Pantau kalau tiba-tiba dia login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);
  // ----------------------------------------------

  // --- FILTER & STATISTIK ---
  const filteredData = useMemo(() => {
    if (!searchTerm) return mockPegawai;
    const lower = searchTerm.toLowerCase();
    return mockPegawai.filter(p => 
      p.nama.toLowerCase().includes(lower) || 
      p.nipb.toLowerCase().includes(lower) ||
      p.jabatan.toLowerCase().includes(lower) ||
      p.urusan.toLowerCase().includes(lower)
    );
  }, [searchTerm]);

  const stats = useMemo(() => {
    return {
      total: mockPegawai.length,
      tetap: mockPegawai.filter(p => p.status === 'Tetap').length,
      kontrak: mockPegawai.filter(p => p.status === 'Kontrak').length,
      asn: mockPegawai.filter(p => p.status === 'ASN').length,
    };
  }, []);

  // --- EXPORT EXCEL & PDF ---
  const handleExportExcel = () => {
    if (!filteredData.length) return;
    const wsData: any[] = [
      [`DATABASE SDM BLUD AIR MINUM KOTA CIMAHI`],
      [`Tanggal Unduh: ${format(new Date(), 'dd MMM yyyy', {locale: id})}`],
      [''],
      ['NO', 'NAMA LENGKAP', 'NIPB / NIP', 'GOLONGAN', 'URUSAN / DIVISI', 'JABATAN', 'STATUS']
    ];

    filteredData.forEach((item, index) => {
      wsData.push([index + 1, item.nama, item.nipb, item.golongan, item.urusan, item.jabatan, item.status]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    (ws as any)['!cols'] = [{wch: 5}, {wch: 35}, {wch: 25}, {wch: 15}, {wch: 25}, {wch: 35}, {wch: 15}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_SDM");
    XLSX.writeFile(wb, `Database_SDM_BLUD_Cimahi.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredData.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DATABASE SDM BLUD AIR MINUM KOTA CIMAHI", 14, 15);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`TANGGAL CETAK : ${format(new Date(), 'dd MMMM yyyy', {locale: id}).toUpperCase()}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [[
        { content: 'NO', styles: { halign: 'center', fillColor: [23, 23, 23] } },
        { content: 'NAMA LENGKAP', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'NIPB / NIP', styles: { halign: 'center', fillColor: [30, 58, 138] } },
        { content: 'GOL.', styles: { halign: 'center', fillColor: [23, 23, 23] } }, 
        { content: 'URUSAN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'JABATAN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'STATUS', styles: { halign: 'center', fillColor: [23, 23, 23] } },
      ]],
      body: filteredData.map((item, index) => [index + 1, item.nama, item.nipb, item.golongan, item.urusan, item.jabatan, item.status]),
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
      headStyles: { textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 60, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 40, font: 'courier' },
        3: { halign: 'center', cellWidth: 15 },
        4: { cellWidth: 50 },
        5: { cellWidth: 70 },
        6: { halign: 'center', cellWidth: 25 },
      },
    } as any);

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI", 14, pageHeight - 10);
    doc.save(`Database_SDM_BLUD_Cimahi.pdf`);
  };

  const getStatusColor = (status: string) => {
    if (status === 'ASN') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (status === 'Tetap') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (status === 'Kontrak') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-neutral-600 bg-neutral-100 border-neutral-300';
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Briefcase className="w-6 h-6" /> ADMINISTRASI UMUM</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-300 border border-neutral-300 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between group">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Total SDM</p>
                    <p className="text-3xl font-mono font-bold text-neutral-900 truncate">{stats.total} <span className="text-sm text-neutral-400 font-sans">Orang</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <Users className="w-3 h-3"/> Seluruh Karyawan Aktif
                </div>
            </div>
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Pegawai Tetap</p>
                    <p className="text-3xl font-mono font-bold text-emerald-600 truncate">{stats.tetap} <span className="text-sm text-neutral-400 font-sans">Orang</span></p>
                </div>
            </div>
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Pegawai Kontrak</p>
                    <p className="text-3xl font-mono font-bold text-amber-600 truncate">{stats.kontrak} <span className="text-sm text-neutral-400 font-sans">Orang</span></p>
                </div>
            </div>
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Aparatur Sipil Negara</p>
                    <p className="text-3xl font-mono font-bold text-blue-700 truncate">{stats.asn} <span className="text-sm text-neutral-400 font-sans">Orang</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono relative z-10">
                    <Building2 className="w-3 h-3"/> PNS / PPPK
                </div>
            </div>
        </div>

        {/* SECTION DATABASE SDM (TABEL) */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col h-[700px] overflow-hidden mb-12">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h3 className="text-sm font-bold uppercase flex items-center gap-2"><Users className="w-4 h-4"/> Database SDM</h3>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Menampilkan {filteredData.length} data pegawai aktif</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input 
                            type="text" 
                            placeholder="Cari NIPB, Nama, atau Jabatan..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all bg-white shadow-sm" 
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 text-xs font-bold border border-green-200 rounded hover:bg-green-100 transition-colors"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
                        <button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 text-xs font-bold border border-red-200 rounded hover:bg-red-100 transition-colors"><FileText className="w-3 h-3" /> PDF</button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                    <thead className="bg-neutral-900 text-white sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium font-sans">NAMA LENGKAP</th>
                            <th className="px-4 py-3 font-medium font-sans">NIPB / NIP</th>
                            <th className="px-4 py-3 font-medium font-sans text-center">GOL.</th>
                            <th className="px-4 py-3 font-medium font-sans">URUSAN / DIVISI</th>
                            <th className="px-4 py-3 font-medium font-sans">JABATAN</th>
                            <th className="px-6 py-3 font-medium font-sans text-center">STATUS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-20 text-center text-neutral-400">
                                    <Search className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                                    <p className="font-mono font-bold text-sm">DATA PEGAWAI TIDAK DITEMUKAN</p>
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((row) => (
                                <tr 
                                  key={row.id} 
                                  onClick={() => setSelectedPegawai(row)}
                                  className="hover:bg-blue-50/80 transition-colors group cursor-pointer"
                                  title="Klik untuk lihat detail pegawai"
                                >
                                    <td className="px-6 py-3 font-bold text-neutral-900 group-hover:text-blue-700 transition-colors">{row.nama}</td>
                                    <td className="px-4 py-3 font-mono text-neutral-600">{row.nipb}</td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-neutral-700">{row.golongan}</td>
                                    <td className="px-4 py-3 text-neutral-700">{row.urusan}</td>
                                    <td className="px-4 py-3 text-neutral-700">{row.jabatan}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${getStatusColor(row.status)}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>

      {/* --- SLIDE-OVER DETAIL PEGAWAI --- */}
      {selectedPegawai && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedPegawai(null)}></div>
          
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-right duration-300 border-l border-neutral-200">
            
            <div className="relative h-32 bg-neutral-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:12px_12px] shrink-0">
              <button 
                onClick={() => setSelectedPegawai(null)} 
                className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="absolute -bottom-10 left-6">
                <div className="w-24 h-24 bg-white p-1 rounded-full shadow-md">
                  <div className="w-full h-full bg-neutral-200 rounded-full flex items-center justify-center overflow-hidden border border-neutral-100">
                    <span className="text-3xl font-black text-neutral-400">
                      {selectedPegawai.nama.charAt(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-14 pb-6 px-6 custom-scrollbar">
              
              <div className="mb-6">
                <h2 className="text-xl font-black text-neutral-900 leading-tight mb-1">{selectedPegawai.nama}</h2>
                <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4"/> {selectedPegawai.jabatan}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${getStatusColor(selectedPegawai.status)}`}>
                      Status: {selectedPegawai.status}
                  </span>
                  <span className="px-2.5 py-1 rounded border border-neutral-200 bg-neutral-100 text-neutral-600 text-[10px] font-bold font-mono">
                      Gol: {selectedPegawai.golongan}
                  </span>
                </div>
              </div>

              <hr className="border-neutral-200 mb-6" />

              <div className="space-y-5">
                <div>
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">Informasi Kepegawaian</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Fingerprint className="w-4 h-4 text-neutral-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-neutral-500 font-medium">NIPB / Nomor Induk</p>
                        <p className="text-sm font-mono font-bold text-neutral-900">{selectedPegawai.nipb}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-neutral-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-neutral-500 font-medium">Urusan / Divisi</p>
                        <p className="text-sm font-bold text-neutral-900">{selectedPegawai.urusan}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- LOGIKA GEMBOK DIGITAL DI SINI --- */}
                {isLoggedIn ? (
                  <div>
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3 mt-6">Kontak & Penempatan (Terverifikasi)</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-neutral-400" />
                        <p className="text-sm text-blue-600 hover:underline cursor-pointer">
                          {selectedPegawai.nama.split(',')[0].split(' ')[0].toLowerCase()}@bludam.id
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-neutral-400" />
                        <p className="text-sm font-mono text-neutral-700">0812-XXXX-XXXX</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
                        <p className="text-sm text-neutral-700">Kantor Pusat BLUD AM, Jl. Raden Demang Hardjakusumah, Kota Cimahi</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200 mt-6 flex items-start gap-3">
                    <div className="p-2 bg-neutral-200 rounded-full shrink-0 mt-0.5">
                       <Lock className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Informasi Kontak Dilindungi</p>
                      <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">Sesuai kebijakan privasi, nomor telepon dan email hanya dapat diakses oleh internal BLUD AM. Silakan <b>Login</b> untuk melihat.</p>
                      <Link href="/login" className="inline-block mt-3 px-3 py-1.5 bg-neutral-900 hover:bg-blue-600 text-white text-[10px] font-bold rounded-sm transition-colors">
                        LOGIN
                      </Link>
                    </div>
                  </div>
                )}
                {/* --------------------------------------- */}

              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex gap-3 shrink-0">
              <button 
                onClick={() => setSelectedPegawai(null)}
                className="flex-1 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 text-xs font-bold rounded-sm hover:bg-neutral-100 transition-colors"
              >
                TUTUP
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-sm hover:bg-blue-600 transition-colors flex justify-center items-center gap-2"
                title="Fitur ini belum aktif"
              >
                <FileText className="w-3.5 h-3.5" /> CETAK PROFIL
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}