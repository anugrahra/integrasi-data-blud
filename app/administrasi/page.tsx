'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ArrowLeft, Briefcase, Filter, Mail, Calendar, ChevronDown, 
  Users, FileSpreadsheet, FileText, FolderOpen, Loader2, DollarSign, Archive, TrendingUp, MousePointerClick, Maximize2 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- DUMMY DATA GENERATOR ---
const generateDummyData = () => {
  const months = [
    '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01',
    '2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01'
  ];

  return months.map(dateStr => {
    // Simulasi Data
    const s_masuk = Math.floor(Math.random() * (150 - 80) + 80); 
    const s_keluar = Math.floor(Math.random() * (120 - 60) + 60);
    const kehadiran = (Math.random() * (99.9 - 92.0) + 92.0); // 92% - 99%
    const realisasi = Math.floor(Math.random() * (85000000 - 45000000) + 45000000); // 45jt - 85jt

    const dateObj = parseISO(dateStr);

    return {
      tanggal: dateStr,
      bulanLabel: format(dateObj, 'MMM yyyy', { locale: id }),
      fullDateLabel: format(dateObj, 'MMMM yyyy', { locale: id }),
      surat_masuk: s_masuk,
      surat_keluar: s_keluar,
      persen_kehadiran: Number(kehadiran.toFixed(2)),
      realisasi_anggaran: realisasi,
    };
  });
};

const DUMMY_DATA = generateDummyData();

const BAGIAN_LIST = [
  { id: 'umum', name: 'Bagian Umum & Kepegawaian', pic: 'Andi Saputra' },
  { id: 'keuangan', name: 'Bagian Keuangan', pic: 'Dewi Ratna' },
  { id: 'aset', name: 'Bagian Aset & Logistik', pic: 'Bambang Pamungkas' }
];

export default function AdministrasiPage() {
  const [loading, setLoading] = useState(false);
  const [selectedBagianId, setSelectedBagianId] = useState('umum');
  const [filterMode, setFilterMode] = useState<'default' | 'year'>('default');
  const [showModal, setShowModal] = useState(false); // Modal state placeholder
  
  const filteredData = useMemo(() => {
    return DUMMY_DATA; 
  }, []);

  const currentBagian = BAGIAN_LIST.find(s => s.id === selectedBagianId) || BAGIAN_LIST[0];

  const tableTotals = useMemo(() => {
    if (filteredData.length === 0) return null;
    const count = filteredData.length;
    const sum = (key: string) => filteredData.reduce((acc: any, cur: any) => acc + (cur[key] || 0), 0);
    const avg = (key: string) => sum(key) / count;

    return {
      totalSuratMasuk: sum('surat_masuk'),
      totalSuratKeluar: sum('surat_keluar'),
      totalAnggaran: sum('realisasi_anggaran'),
      avgSuratMasuk: avg('surat_masuk'),
      avgSuratKeluar: avg('surat_keluar'),
      avgKehadiran: avg('persen_kehadiran'),
      avgAnggaran: avg('realisasi_anggaran'),
    };
  }, [filteredData]);

  const stats = useMemo(() => {
    if (!tableTotals) return null;
    return {
      periodLabel: `${filteredData[0].bulanLabel} - ${filteredData[filteredData.length-1].bulanLabel}`,
      totalSurat: (tableTotals.totalSuratMasuk + tableTotals.totalSuratKeluar).toLocaleString('id-ID'),
      avgKehadiran: tableTotals.avgKehadiran.toFixed(2),
      totalAnggaran: (tableTotals.totalAnggaran / 1000000).toFixed(1) + ' Jt', // Format Juta
      suratRatio: (tableTotals.totalSuratMasuk / tableTotals.totalSuratKeluar).toFixed(1)
    };
  }, [tableTotals, filteredData]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (!filteredData.length || !tableTotals) return;

    const wsData: any[] = [
      [`LAPORAN ADMINISTRASI UMUM - ${currentBagian.name.toUpperCase()}`],
      [`Periode: ${stats?.periodLabel}`],
      [''],
      ['BULAN', 'SURAT MASUK', 'SURAT KELUAR', 'KEHADIRAN (%)', 'REALISASI ANGGARAN (Rp)']
    ];

    filteredData.forEach(item => {
      wsData.push([
        item.fullDateLabel,
        item.surat_masuk,
        item.surat_keluar,
        item.persen_kehadiran,
        item.realisasi_anggaran
      ]);
    });

    wsData.push(['']);
    wsData.push([
      'TOTAL / RATA-RATA', 
      tableTotals.totalSuratMasuk, 
      tableTotals.totalSuratKeluar, 
      Number(tableTotals.avgKehadiran.toFixed(2)), 
      tableTotals.totalAnggaran
    ]);

    wsData.push(['']);
    wsData.push(['dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wscols = (wsData[3] as any[]).map((_, i) => ({ wch: i === 0 ? 20 : 25 }));
    (ws as any)['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Admin");
    XLSX.writeFile(wb, `Laporan_Administrasi_${currentBagian.id}.xlsx`);
  };

  // --- PDF EXPORT ---
  const handleExportPDF = () => {
    if (!filteredData.length || !tableTotals) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN ADMINISTRASI & KEUANGAN", 14, 15);
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`BAGIAN  : ${currentBagian.name.toUpperCase()}`, 14, 22);
    doc.text(`PERIODE : ${stats?.periodLabel.toUpperCase()}`, 14, 27);

    const tableHead = [
      [
        { content: 'BULAN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'SURAT MASUK', styles: { halign: 'right', fillColor: [30, 58, 138] } }, // Blue
        { content: 'SURAT KELUAR', styles: { halign: 'right', fillColor: [234, 88, 12] } }, // Orange
        { content: 'KEHADIRAN (%)', styles: { halign: 'center', fillColor: [15, 118, 110] } }, // Teal
        { content: 'REALISASI ANGGARAN (Rp)', styles: { halign: 'right', fillColor: [64, 64, 64] } },
      ]
    ];

    const tableBody = filteredData.map(item => [
      item.fullDateLabel.toUpperCase(),
      item.surat_masuk.toLocaleString('id-ID'),
      item.surat_keluar.toLocaleString('id-ID'),
      `${item.persen_kehadiran.toFixed(2)} %`,
      `Rp ${item.realisasi_anggaran.toLocaleString('id-ID')}`,
    ]);

    const tableFoot = [
      [
        { content: 'TOTAL / AVG', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: tableTotals.totalSuratMasuk.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: tableTotals.totalSuratKeluar.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `${tableTotals.avgKehadiran.toFixed(2)} %`, styles: { halign: 'center', fontStyle: 'bold', textColor: [15, 118, 110] } },
        { content: `Rp ${tableTotals.totalAnggaran.toLocaleString('id-ID')}`, styles: { halign: 'right', fontStyle: 'bold' } },
      ]
    ];

    autoTable(doc, {
      startY: 35,
      head: tableHead,
      body: tableBody,
      foot: tableFoot,
      theme: 'grid',
      styles: { fontSize: 9, font: 'courier', cellPadding: 3 },
      headStyles: { textColor: [255, 255, 255], fontStyle: 'bold' },
    } as any);

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI", 14, pageHeight - 10);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 250, pageHeight - 10);

    doc.save(`Laporan_Administrasi_${currentBagian.id}.pdf`);
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Briefcase className="w-6 h-6" /> URUSAN ADMINISTRASI</h1>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                <span className="bg-neutral-900 text-white px-2 py-0.5 rounded">TATA USAHA</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  LIVE UPDATE
                </span>
              </div>
            </div>
          </div>

          <div className="flex bg-neutral-100 p-1.5 rounded-lg border border-neutral-200 gap-2">
            <button onClick={() => setFilterMode('default')} className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${filterMode === 'default' ? 'bg-black text-white shadow-md' : 'text-neutral-500 hover:bg-white'}`}>Bulanan</button>
            <button onClick={() => setFilterMode('year')} className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${filterMode === 'year' ? 'bg-black text-white shadow-md' : 'text-neutral-500 hover:bg-white'}`}>Tahunan</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* BAGIAN SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-neutral-200 pb-4">
          <div className="relative group">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Pilih Bagian / Unit Kerja</label>
            <div className="flex items-center gap-2 cursor-pointer">
              <Briefcase className="w-8 h-8 text-neutral-800" />
              <select value={selectedBagianId} onChange={(e) => setSelectedBagianId(e.target.value)} className="appearance-none bg-transparent text-3xl font-bold font-mono text-neutral-900 cursor-pointer pr-8 focus:outline-none">
                {BAGIAN_LIST.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
              </select>
              <ChevronDown className="w-6 h-6 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-neutral-100 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded border border-neutral-200">PIC: {currentBagian.pic}</span>
            </div>
          </div>
          {stats && (
            <div className="flex items-center gap-2 bg-neutral-900 text-white px-3 py-1.5 rounded-sm shadow-sm">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-mono font-bold tracking-widest">{stats.periodLabel}</span>
            </div>
          )}
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-300 border border-neutral-300 rounded-lg overflow-hidden shadow-sm">
            {/* 1. TOTAL SURAT */}
            <div 
                className="bg-white p-6 h-[120px] flex flex-col justify-between cursor-pointer group hover:bg-neutral-50 transition-colors"
                onClick={() => setShowModal(true)} // Dummy interaction
            >
                <div className="relative">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Total Lalu Lintas Surat</p>
                        <Maximize2 className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl font-mono font-bold text-neutral-900 truncate">{stats?.totalSurat} <span className="text-sm text-neutral-400 font-sans">Dok</span></p>
                    <p className="text-[9px] text-teal-600/80 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" /> Klik detail arsip
                    </p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <Mail className="w-3 h-3"/> Masuk : Keluar = {stats?.suratRatio} : 1
                </div>
            </div>

            {/* 2. SURAT MASUK (AVG) */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Rata-rata Surat Masuk</p>
                    <p className="text-2xl font-mono font-bold text-blue-700 truncate">{tableTotals?.avgSuratMasuk.toFixed(0)} <span className="text-sm text-neutral-400 font-sans">/bln</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                    <Archive className="w-3 h-3"/> Dokumen Eksternal
                </div>
            </div>

            {/* 3. KEHADIRAN */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Tingkat Kehadiran</p>
                    <p className="text-2xl font-mono font-bold text-teal-600 truncate">{stats?.avgKehadiran} <span className="text-sm text-neutral-400 font-sans">%</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <Users className="w-3 h-3"/> Absensi Pegawai
                </div>
            </div>

            {/* 4. REALISASI ANGGARAN */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Realisasi Anggaran</p>
                    <p className="text-2xl font-mono font-bold text-neutral-800 truncate">{stats?.totalAnggaran}</p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <DollarSign className="w-3 h-3"/> YTD Expenditure
                </div>
            </div>
        </div>

        {/* CHART 1: DINAMIKA PERSURATAN */}
        <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Mail className="w-5 h-5" /> DINAMIKA PERSURATAN</h3>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                        <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} />
                        
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/>

                        <Bar yAxisId="left" dataKey="surat_masuk" name="Surat Masuk" fill="#2563eb" barSize={20} radius={[4,4,0,0]} />
                        <Bar yAxisId="left" dataKey="surat_keluar" name="Surat Keluar" fill="#f97316" barSize={20} radius={[4,4,0,0]} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* CHART 2: KEHADIRAN & ANGGARAN */}
        <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> KINERJA & KEHADIRAN</h3>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-teal-600 rounded-full"></div>Kehadiran (%)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-neutral-800 rounded-full"></div>Realisasi (Rp)</span>
                </div>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                        <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#0d9488'}} domain={[80, 100]} />
                        <YAxis yAxisId="right" orientation="right" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} tickFormatter={(val) => `${(val/1000000).toFixed(0)}Jt`} />
                        
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                        
                        <Area yAxisId="left" type="monotone" dataKey="persen_kehadiran" name="Kehadiran (%)" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="realisasi_anggaran" name="Realisasi Anggaran" stroke="#171717" strokeWidth={2} dot={{r: 4, fill: '#171717'}} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-sm overflow-hidden mb-12">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase">Log Data Administrasi Bulanan</h3>
            <div className="flex gap-2">
                <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold border border-green-200 rounded hover:bg-green-100 transition-colors"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
                <button onClick={handleExportPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold border border-red-200 rounded hover:bg-red-100 transition-colors"><FileText className="w-3 h-3" /> PDF</button>
            </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs font-mono text-left border-collapse">
                <thead className="bg-neutral-900 text-white sticky top-0 z-10">
                <tr>
                    <th className="px-4 py-3 font-medium">BULAN</th>
                    <th className="px-4 py-3 text-right bg-blue-900/50">SURAT MASUK</th>
                    <th className="px-4 py-3 text-right text-orange-200">SURAT KELUAR</th>
                    <th className="px-4 py-3 text-center text-teal-200">KEHADIRAN (%)</th>
                    <th className="px-4 py-3 text-right">REALISASI ANGGARAN (Rp)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                {[...filteredData].reverse().map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-bold">{row.fullDateLabel}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700 bg-blue-50/20">{row.surat_masuk}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-600">{row.surat_keluar}</td>
                    <td className="px-4 py-3 text-center font-bold text-teal-700">{row.persen_kehadiran}%</td>
                    <td className="px-4 py-3 text-right font-mono">{row.realisasi_anggaran.toLocaleString('id-ID')}</td>
                    </tr>
                ))}
                </tbody>
                {tableTotals && (
                    <tfoot className="bg-neutral-100 border-t-2 border-neutral-300 font-bold">
                        <tr>
                            <td className="px-4 py-3">TOTAL / AVG</td>
                            <td className="px-4 py-3 text-right text-blue-900">{tableTotals.totalSuratMasuk}</td>
                            <td className="px-4 py-3 text-right text-orange-800">{tableTotals.totalSuratKeluar}</td>
                            <td className="px-4 py-3 text-center text-teal-700">{tableTotals.avgKehadiran.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalAnggaran.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
            </div>
        </div>
      </div>
    </main>
  );
}