'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ArrowLeft, Factory, Filter, Droplets, Calendar, ChevronDown, 
  FlaskConical, FileSpreadsheet, FileText, FolderOpen, Loader2, Waves, X, Maximize2, MousePointerClick, Clock, Activity, Sparkles, Bot, Copy, Check
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/utils/supabase';
import AiTextFormatter from '@/components/AiTextFormatter';

const SPAM_LIST = [
  { id: 'cimahi_utara', name: 'SPAM Cimahi Utara', capacity: '80 LPS' },
  { id: 'pasirkaliki', name: 'SPAM Pasirkaliki', capacity: '100 LPS' } 
];

export default function ProductionPage() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  
  // MODAL STATE
  const [showAirBakuModal, setShowAirBakuModal] = useState(false);

  // --- AI STATE ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  // ---------------

  // --- STATE & FUNGSI COPY DI SINI ---
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!aiSummary) return;
    // Bersihkan tanda bintang (markdown) supaya pas di-paste teksnya rapi (gak ada **)
    const plainText = aiSummary.replace(/\*\*/g, '').replace(/\*/g, '-');
    navigator.clipboard.writeText(plainText);
    
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Balik ke icon copy setelah 2 detik
  };
  // ----------------------------------------------

  // Filter State
  const [filterMode, setFilterMode] = useState<'default' | '3bulan' | 'year' | 'all' | 'custom'>('default');
  const [selectedYear, setSelectedYear] = useState<string>('2025'); 
  const [customStart, setCustomStart] = useState<string>('2025-01');
  const [customEnd, setCustomEnd] = useState<string>('2026-01');
  
  const [chemView, setChemView] = useState<'all' | 'pac' | 'kap'>('all');
  const [selectedSpamId, setSelectedSpamId] = useState('cimahi_utara');
  
  const currentSpam = SPAM_LIST.find(s => s.id === selectedSpamId) || SPAM_LIST[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('laporan_produksi')
        .select('*')
        .eq('spam_id', selectedSpamId)
        .order('tanggal', { ascending: true });

      if (error) console.error("Error fetching:", error);
      else setRawData(data || []);
      setLoading(false);
    };
    fetchData();
  }, [selectedSpamId]);

  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];
    let data = [...rawData];

    if (filterMode === 'all') {
      // Pass
    } else if (filterMode === 'year') {
      data = data.filter(d => d.tanggal.startsWith(selectedYear));
    } else {
      const lastDataDate = parseISO(data[data.length - 1].tanggal); 
      let startDate: Date;
      let endDate: Date = endOfMonth(lastDataDate);

      if (filterMode === 'default') {
        startDate = startOfMonth(subMonths(lastDataDate, 11)); 
      } else if (filterMode === '3bulan') {
        startDate = startOfMonth(subMonths(lastDataDate, 2)); 
      } else { 
        startDate = startOfMonth(parseISO(customStart + '-01'));
        endDate = endOfMonth(parseISO(customEnd + '-01'));
      }
      data = data.filter(item => isWithinInterval(parseISO(item.tanggal), { start: startDate, end: endDate }));
    }

    return data.map(item => {
      const dateObj = parseISO(item.tanggal);
      const days = Number(item.jumlah_hari) || getDaysInMonth(dateObj);
      const m3 = Number(item.volume_produksi) || 0;
      const jam = Number(item.jam_operasi) || 0;
      const pac = Number(item.pemakaian_pac) || 0;
      const kaporit = Number(item.pemakaian_kaporit) || 0;

      return {
        ...item,
        bulanLabel: format(dateObj, 'MMM yyyy', { locale: id }),
        fullDateLabel: format(dateObj, 'MMMM yyyy', { locale: id }),
        m3,
        // lps: jam > 0 ? Number(((m3 * 1000) / (jam * 3600)).toFixed(2)) : 0,
        lps: Number((m3 / days / 24 / 3.6).toFixed(2)),
        avgProdDay: Number((m3 / days).toFixed(0)),
        jam, // added
        avgJamDay: Number((jam / days).toFixed(1)), // added logic
        pacKg: pac,
        avgPacDay: Number((pac / days).toFixed(1)),
        dosePac: m3 > 0 ? Number(((pac * 1000) / m3).toFixed(2)) : 0,
        kapKg: kaporit,
        avgKapDay: Number((kaporit / days).toFixed(1)),
        doseKap: m3 > 0 ? Number(((kaporit * 1000) / m3).toFixed(2)) : 0,
        airBaku: Number(item.debit_air_baku) || 0, 
      };
    });
  }, [rawData, filterMode, selectedYear, customStart, customEnd]);

  const tableTotals = useMemo(() => {
    if (filteredData.length === 0) return null;
    const count = filteredData.length;
    const sum = (key: string) => filteredData.reduce((acc, cur) => acc + (cur[key] || 0), 0);
    const avg = (key: string) => sum(key) / count;

    return {
      totalM3: sum('m3'),
      avgM3: avg('m3'),
      avgLps: avg('lps'),
      avgLps24 : avg ('Lps24'),
      totalPac: sum('pacKg'),
      totalJam: sum('jam'),
      avgPacKg: avg('pacKg'),
      avgDosePac: avg('dosePac'),
      totalKap: sum('kapKg'),
      avgKapKg: avg('kapKg'),
      avgDoseKap: avg('doseKap'),
      avgAirBaku: avg('airBaku'),
      avgProdDaily: avg('avgProdDay'),
      avgJamDaily: avg('avgJamDay'),
      avgJam: avg('jam'),
      avgPacDaily: avg('avgPacDay'),
      avgKapDaily: avg('avgKapDay')
    };
  }, [filteredData]);

  const stats = useMemo(() => {
    if (!tableTotals) return null;
    return {
      totalProd: tableTotals.totalM3.toLocaleString('id-ID'),
      totalJam: tableTotals.totalJam.toLocaleString('id-ID'),
      avgLps: tableTotals.avgLps.toFixed(2),
      avgAirBaku: tableTotals.avgAirBaku.toFixed(0),
      totalPac: tableTotals.totalPac.toLocaleString('id-ID'),
      totalKap: tableTotals.totalKap.toLocaleString('id-ID'),
      periodLabel: filteredData.length > 0 ? `${filteredData[0].bulanLabel} - ${filteredData[filteredData.length-1].bulanLabel}` : '',
      avgProdDay: tableTotals.avgProdDaily.toLocaleString('id-ID', {maximumFractionDigits: 0}),
      avgJamDay: tableTotals.avgJamDaily.toFixed(1),
      avgJam: tableTotals.avgJam.toFixed(1),
      avgPacDay: tableTotals.avgPacDaily.toFixed(1),
      avgDosePac: tableTotals.avgDosePac.toFixed(2),
      avgKapDay: tableTotals.avgKapDaily.toFixed(1),
      avgDoseKap: tableTotals.avgDoseKap.toFixed(2),
    };
  }, [tableTotals, filteredData]);

  const handleExportExcel = () => {
    if (!filteredData.length || !tableTotals) return;

    const wsData: any[] = [
      [`LAPORAN OPERASIONAL & PRODUKSI - ${currentSpam.name.toUpperCase()}`],
      [`Periode: ${stats?.periodLabel}`],
      [''],
      ['BULAN', 'AIR BAKU (LPS)', 'PRODUKSI (m3)', 'AVG (m3/hari)', 'LPS', 'PAC (Kg)', 'AVG PAC (Kg/hari)', 'DOSIS PAC', 'KAP (Kg)', 'AVG KAP (Kg/hari)', 'DOSIS KAP']
    ];

    filteredData.forEach(item => {
      wsData.push([
        item.fullDateLabel,
        item.airBaku,
        item.m3,
        item.avgProdDay,
        item.lps,
        item.pacKg,
        item.avgPacDay,
        item.dosePac,
        item.kapKg,
        item.avgKapDay,
        item.doseKap
      ]);
    });

    wsData.push(['']);
    wsData.push([
      'TOTAL', 
      '-', 
      tableTotals.totalM3, 
      '-', 
      '-', 
      tableTotals.totalPac, 
      '-', 
      '-', 
      tableTotals.totalKap, 
      '-', 
      '-'
    ]);
    wsData.push([
      'RATA-RATA', 
      Number(tableTotals.avgAirBaku.toFixed(2)), 
      Number(tableTotals.avgM3.toFixed(0)), 
      '-', 
      Number(tableTotals.avgLps.toFixed(2)), 
      Number(tableTotals.avgPacKg.toFixed(0)), 
      '-', 
      Number(tableTotals.avgDosePac.toFixed(2)), 
      Number(tableTotals.avgKapKg.toFixed(0)), 
      '-', 
      Number(tableTotals.avgDoseKap.toFixed(2))
    ]);

    wsData.push(['']);
    wsData.push(['']);
    wsData.push(['dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    const wscols = (wsData[3] as any[]).map((_, i) => ({ wch: i === 0 ? 20 : 15 }));
    (ws as any)['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_Produksi_${currentSpam.id}.xlsx`);
  };

  const handleExportPDF = () => {
    // Kertas A4 ganti jadi posisi 'l' (Landscape) biar lega
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    // --- 1. LOGIKA AMBIL INFO KOP SURAT ---
    // Cek SPAM apa yang lagi dipilih (ngecek dari id spam di data tabel)
    const uniqueSpam = Array.from(new Set(filteredData.map((item: any) => item.spam_id)));
    let namaSpam = "SEMUA LOKASI SPAM";
    if (uniqueSpam.length === 1) {
      namaSpam = uniqueSpam[0] === 'cimahi_utara' ? 'SPAM CIMAHI UTARA' : 'SPAM PASIRKALIKI';
    }

    // Ambil periode dari data terlama ke data terbaru (karena di UI posisinya dibalik)
    const dataUrut = [...filteredData].reverse();
    const periodeBulan = dataUrut.length > 0 
      ? `${dataUrut[0].fullDateLabel} s/d ${dataUrut[dataUrut.length - 1].fullDateLabel}`
      : '-';

    // --- 2. RENDER KOP SURAT ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text('LAPORAN PRODUKSI AIR BERSIH', 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Lokasi SPAM : ${namaSpam}`, 14, 22);
    doc.text(`Periode     : ${periodeBulan}`, 14, 27);
    doc.text(`Waktu Cetak : ${new Date().toLocaleDateString('id-ID')} - ${new Date().toLocaleTimeString('id-ID')}`, 14, 32);

    // --- 3. SIAPIN DATA TABEL ---
    const tableColumn = ["BULAN", "AIR BAKU (LPS)", "PRODUKSI (m³)", "LPS", "TOTAL PAC (Kg)", "TOTAL KAPORIT (Kg)"];
    const tableRows: any[] = [];
    dataUrut.forEach(row => {
      tableRows.push([
        row.fullDateLabel,
        row.airBaku > 0 ? row.airBaku.toLocaleString('id-ID') : '-',
        row.m3.toLocaleString('id-ID'),
        row.lps,
        row.pacKg.toLocaleString('id-ID'),
        row.kapKg.toLocaleString('id-ID')
      ]);
    });

    const tableFoot: any[] = [];
    if (tableTotals) {
      tableFoot.push([
        "TOTAL",
        "-",
        tableTotals.totalM3.toLocaleString('id-ID'),
        "-",
        tableTotals.totalPac.toLocaleString('id-ID'),
        tableTotals.totalKap.toLocaleString('id-ID')
      ]);
      tableFoot.push([
        "RATA-RATA",
        tableTotals.avgAirBaku?.toFixed(2) || 0,
        tableTotals.avgM3?.toLocaleString('id-ID', {maximumFractionDigits: 0}) || 0,
        tableTotals.avgLps?.toFixed(2) || 0,
        tableTotals.avgPacKg?.toLocaleString('id-ID', {maximumFractionDigits: 0}) || 0,
        tableTotals.avgKapKg?.toLocaleString('id-ID', {maximumFractionDigits: 0}) || 0
      ]);
    }

    // --- 4. EKSEKUSI CETAK TABEL ---
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      foot: tableFoot,
      startY: 38, // Tabel diturunin dikit biar nggak nabrak Kop
      theme: 'grid',
      headStyles: { 
        fillColor: [23, 23, 23], 
        textColor: 255,
        halign: 'center'
      },
      footStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold' 
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      }
    });

    // --- 5. RENDER FOOTER PUSAT DATA ---
    // Ambil koordinat Y pas di bawah tabel persis (biar dinamis ngikutin panjang tabel)
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120); // Warna abu-abu biar elegan
    doc.text('* Dokumen ini dicetak otomatis dari PUSAT DATA BLUD AM TERINTEGRASI.', 14, finalY + 10);

    // Download PDF-nya!
    doc.save(`Laporan_Produksi_BLUD_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- FUNGSI AI ---
  const handleGenerateAiSummary = async () => {
    if (!stats || !tableTotals) return;
    
    setIsAiLoading(true);
    setAiSummary(null);

    try {
      const response = await fetch('/api/analyze-produksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spamName: currentSpam.name,         
          spamCapacity: currentSpam.capacity,
          periodLabel: stats.periodLabel,
          stats: {
            totalProd: stats.totalProd,
            avgProdDay: stats.avgProdDay,
            avgAirBaku: stats.avgAirBaku,
            avgLps: stats.avgLps,
            totalPac: stats.totalPac,
            avgDosePac: stats.avgDosePac,
            totalKap: stats.totalKap,
            avgDoseKap: stats.avgDoseKap,
          },
          monthlyData: filteredData.map(item => ({
            bulan: item.bulanLabel,
            airBakuLPS: item.airBaku,
            produksiM3: item.m3,
            lps: item.lps,
            pacKg: item.pacKg,
            dosisPac: item.dosePac,
            kapKg: item.kapKg,
            dosisKap: item.doseKap
          }))
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAiSummary(data.summary);
      } else {
        setAiSummary("Maaf, gagal memuat analisis. Silakan coba lagi.");
      }
    } catch (error) {
      setAiSummary("Terjadi kesalahan jaringan saat memanggil AI.");
    } finally {
      setIsAiLoading(false);
    }
  };
  // ----------------------------------

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Droplets className="w-6 h-6" /> URUSAN PRODUKSI</h1>
            </div>
          </div>

          {/* CONTROL BAR */}
          <div className="flex flex-col sm:flex-row bg-neutral-100 p-1.5 rounded-lg border border-neutral-200 gap-2">
            <button onClick={() => setFilterMode('3bulan')} className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${filterMode === '3bulan' ? 'bg-black text-white shadow-md' : 'text-neutral-500 hover:bg-white'}`}>3 Bulan</button>
            <button onClick={() => setFilterMode('default')} className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${filterMode === 'default' ? 'bg-black text-white shadow-md' : 'text-neutral-500 hover:bg-white'}`}>12 Bulan</button>
            <div className="relative flex items-center">
              <button onClick={() => setFilterMode('year')} className={`px-3 py-1.5 text-xs font-bold uppercase rounded-l transition-colors flex items-center gap-1 ${filterMode === 'year' ? 'bg-black text-white shadow-md z-10' : 'text-neutral-500 hover:bg-white'}`}>Tahunan</button>
              {filterMode === 'year' && (
                <div className="bg-white border border-neutral-300 -ml-1 py-1 px-1 rounded-r h-full flex items-center">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="text-xs font-mono font-bold bg-transparent outline-none cursor-pointer pr-1">
                    {['2026', '2025', '2024'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button onClick={() => setFilterMode('all')} className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors ${filterMode === 'all' ? 'bg-black text-white shadow-md' : 'text-neutral-500 hover:bg-white'}`}>All Data</button>
            <div className="w-px bg-neutral-300 hidden sm:block mx-1"></div>
            <div className={`flex items-center gap-2 px-2 transition-all ${filterMode === 'custom' ? 'bg-white rounded border border-neutral-300 shadow-sm' : ''}`}>
               <button onClick={() => setFilterMode('custom')} className={`p-1 rounded-full ${filterMode === 'custom' ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-200'}`} title="Pilih Rentang"><Filter className="w-3 h-3" /></button>
              {filterMode === 'custom' && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                  <input type="month" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-transparent text-xs font-mono focus:outline-none w-24 py-1" />
                  <span className="text-neutral-400 text-[10px]">&rarr;</span>
                  <input type="month" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-transparent text-xs font-mono focus:outline-none w-24 py-1" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-neutral-200 pb-4">
          <div className="relative group">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Pilih Lokasi Instalasi (IPA)</label>
            <div className="flex items-center gap-2 cursor-pointer">
              <Factory className="w-8 h-8 text-neutral-800" />
              <select value={selectedSpamId} onChange={(e) => setSelectedSpamId(e.target.value)} className="appearance-none bg-transparent text-3xl font-bold font-mono text-neutral-900 cursor-pointer pr-8 focus:outline-none">
                {SPAM_LIST.map(spam => (<option key={spam.id} value={spam.id}>{spam.name}</option>))}
              </select>
              <ChevronDown className="w-6 h-6 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded border border-blue-200">KAPASITAS: {currentSpam.capacity}</span>
            </div>
          </div>
          {stats && (
            <div className="flex items-center gap-2 bg-neutral-900 text-white px-3 py-1.5 rounded-sm shadow-sm">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-mono font-bold tracking-widest">{stats.periodLabel}</span>
            </div>
          )}
        </div>

        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
            <FolderOpen className="w-10 h-10 text-neutral-400 mb-4" />
            <h3 className="text-lg font-bold text-neutral-600">Belum Ada Data</h3>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-neutral-300 border border-neutral-300 rounded-lg overflow-hidden shadow-sm">
              {/* CARD 1: AIR BAKU (CLICKABLE) */}
              <div 
                onClick={() => setShowAirBakuModal(true)}
                className="bg-white relative overflow-hidden h-[100px] cursor-pointer group hover:bg-neutral-50 transition-colors"
              >
                <div className="absolute top-4 left-6 z-10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1 flex items-center gap-1"><Waves className="w-3 h-3 text-teal-600"/> Air Baku (Avg)</p>
                    <Maximize2 className="w-3 h-3 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-mono font-bold text-teal-700">{stats?.avgAirBaku} <span className="text-sm text-neutral-400 font-sans">LPS</span></p>
                  
                  <p className="text-[9px] text-teal-600/80 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" /> Klik untuk lihat detail
                  </p>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-40 transition-opacity">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData}><Area type="monotone" dataKey="airBaku" stroke="#0d9488" fill="#14b8a6" strokeWidth={2} /></AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-teal-500 transition-colors pointer-events-none"></div>
              </div>
              
              {/* CARD 2: KAPASITAS DIMANFAATKAN (UPDATED) */}
              <div className="bg-white px-4 py-3 h-[100px] flex flex-col justify-between border border-transparent hover:border-blue-100 transition-colors shadow-sm">
                <div>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase mb-0">Kapasitas Dimanfaatkan</p>
                  <p className="text-xl font-mono font-bold text-blue-600 truncate tracking-tight">{stats?.avgLps} <span className="text-sm text-neutral-400 font-sans">LPS</span></p>
                </div>
                <div className="flex justify-between items-center border-t border-neutral-100 pt-1 text-[9px] font-mono text-neutral-500">
                  <span title="Total Jam Operasi">Total: <span className="font-bold text-neutral-800">{stats?.totalJam}</span> jam</span>
                  <span title="Rata-rata Jam Operasi" className="flex items-center gap-1"><Clock className="w-2.5 h-2.5"/> {stats?.avgJamDay} jam/hari</span>
                </div>
              </div>

              {/* CARD 3: TOTAL PRODUKSI (UPDATED) */}
              <div className="bg-white px-4 py-3 h-[100px] flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase mb-0">Total Produksi</p>
                  <p className="text-xl font-mono font-bold text-neutral-900 truncate tracking-tight">{stats?.totalProd} <span className="text-sm text-neutral-400 font-sans">m³</span></p>
                </div>
                <div className="flex items-center border-t border-neutral-100 pt-1 text-[9px] font-mono text-neutral-500">
                  <span title="Rata-rata Produksi / Hari">Avg: <span className="font-bold text-neutral-800">{stats?.avgProdDay}</span> m³/hari</span>
                </div>
              </div>

              {/* CARD 4: TOTAL PAC (UPDATED) */}
              <div className="bg-white px-4 py-3 h-[100px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-0">Total PAC</p>
                    <p className="text-xl font-mono font-bold text-neutral-900 truncate tracking-tight">{stats?.totalPac} <span className="text-sm text-neutral-400 font-sans">Kg</span></p>
                </div>
                <div className="flex justify-between items-center border-t border-neutral-100 pt-1 text-[9px] font-mono text-neutral-500">
                    <span title="Rata-rata Pemakaian / Hari">Avg: <span className="font-bold text-neutral-800">{stats?.avgPacDay}</span> Kg/hr</span>
                    <span title="Dosis Rata-rata" className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-amber-600"/> {stats?.avgDosePac} mg/l</span>
                </div>
              </div>

              {/* CARD 5: TOTAL KAPORIT (UPDATED) */}
              <div className="bg-white px-4 py-3 h-[100px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-0">Total Kaporit</p>
                    <p className="text-xl font-mono font-bold text-neutral-900 truncate tracking-tight">{stats?.totalKap} <span className="text-sm text-neutral-400 font-sans">Kg</span></p>
                </div>
                <div className="flex justify-between items-center border-t border-neutral-100 pt-1 text-[9px] font-mono text-neutral-500">
                    <span title="Rata-rata Pemakaian / Hari">Avg: <span className="font-bold text-neutral-800">{stats?.avgKapDay}</span> Kg/hr</span>
                    <span title="Dosis Rata-rata" className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-neutral-600"/> {stats?.avgDoseKap} mg/l</span>
                </div>
              </div>
            </div>

            {/* --- UI AI SECTION --- */}
            <div className="bg-white border border-indigo-200 shadow-sm rounded-sm p-5 relative overflow-hidden">
              {/* Efek glow tipis di background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold uppercase tracking-tight">AI Executive Summary</h3>
                </div>
                
                <button 
                  onClick={handleGenerateAiSummary}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded transition-colors shadow-sm"
                >
                  {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAiLoading ? 'MENGANALISIS DATA...' : 'GENERATE INSIGHT'}
                </button>
              </div>

              {/* Area Hasil Teks */}
              {(isAiLoading || aiSummary) && (
                <div className="mt-4 pt-4 border-t border-indigo-50 relative z-10 animate-in fade-in duration-300">

                  {/* --- TOMBOL COPY --- */}
                  {!isAiLoading && aiSummary && (
                    <button 
                      onClick={handleCopy}
                      className="absolute top-2 right-0 p-1.5 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 rounded-md transition-all shadow-sm z-20"
                      title="Salin Teks"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      <span className={`text-[10px] font-bold ${isCopied ? 'text-green-600' : 'text-indigo-700'}`}>
                        {isCopied ? 'COPIED!' : 'COPY'}
                      </span>
                    </button>
                  )}
                  {/* ------------------- */}

                  {isAiLoading ? (
                     <div className="space-y-2">
                        <div className="h-3 bg-indigo-100 rounded animate-pulse w-full"></div>
                        <div className="h-3 bg-indigo-100 rounded animate-pulse w-5/6"></div>
                        <div className="h-3 bg-indigo-100 rounded animate-pulse w-4/6"></div>
                     </div>
                  ) : (
                    <div className="text-sm text-neutral-700 leading-relaxed font-sans">
                      <AiTextFormatter text={aiSummary || ''} />
                    </div>
                  )}
                  
                  {/* DISCLAIMER AI */}
                  {!isAiLoading && aiSummary && (
                    <p className="mt-4 text-[10px] text-neutral-400 italic flex items-start gap-1">
                       <span className="text-[12px] leading-none">⚠️</span>
                       Kesimpulan ini dihasilkan oleh AI (Google Gemini), Kesimpulan ini dihasilkan oleh AI (Google Gemini), bisa saja salah.
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* ---------------------------------------- */}

            {/* CHART 1: PRODUKSI */}
            <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Droplets className="w-5 h-5" /> GRAFIK PRODUKSI & KAPASITAS</h3>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-neutral-800"></div>Vol. Produksi (m³)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500"></div>Kapasitas (LPS)</span>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                    <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} />
                    <YAxis yAxisId="right" orientation="right" stroke="transparent" domain={[0, 100]} tick={{fontSize: 10, fontFamily: 'monospace', fill: '#2563eb'}} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    <Bar yAxisId="left" dataKey="m3" name="Produksi (m3)" fill="#171717" barSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="lps" name="Kapasitas (LPS)" stroke="#2563eb" strokeWidth={3} dot={{r: 3}} />
                    <Line yAxisId="right" type="monotone" dataKey={() => 80} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Kapasitas Terpasang" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: DOSIS KIMIA & JUMLAH KG (UPDATED) */}
            <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><FlaskConical className="w-5 h-5" /> PEMAKAIAN KIMIA & DOSIS</h3>
                    <p className="text-xs text-neutral-500 mt-1">Bar: Jumlah (Kg) | Line: Dosis (mg/l)</p>
                </div>
                <div className="flex bg-neutral-100 p-1 rounded-md">
                  <button onClick={() => setChemView('all')} className={`px-3 py-1 text-xs font-bold rounded-sm ${chemView === 'all' ? 'bg-white shadow-sm' : 'text-neutral-500'}`}>ALL</button>
                  <button onClick={() => setChemView('pac')} className={`px-3 py-1 text-xs font-bold rounded-sm ${chemView === 'pac' ? 'bg-amber-100 text-amber-800' : 'text-neutral-500'}`}>PAC</button>
                  <button onClick={() => setChemView('kap')} className={`px-3 py-1 text-xs font-bold rounded-sm ${chemView === 'kap' ? 'bg-neutral-200 text-neutral-800' : 'text-neutral-500'}`}>KAPORIT</button>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                    
                    {/* Y-Axis Left (Kg) */}
                    <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} />
                    {/* Y-Axis Right (Dosis) */}
                    <YAxis yAxisId="right" orientation="right" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#666'}} />
                    
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/>

                    {/* PAC SERIES */}
                    {(chemView === 'all' || chemView === 'pac') && (
                        <>
                            <Bar yAxisId="left" dataKey="pacKg" name="PAC (Kg)" fill="#fbbf24" barSize={20} radius={[4,4,0,0]} />
                            <Line yAxisId="right" type="monotone" dataKey="dosePac" name="Dosis PAC (mg/l)" stroke="#b45309" strokeWidth={2} dot={{r: 4, fill: '#b45309'}} />
                        </>
                    )}

                    {/* KAPORIT SERIES */}
                    {(chemView === 'all' || chemView === 'kap') && (
                        <>
                            <Bar yAxisId="left" dataKey="kapKg" name="Kaporit (Kg)" fill="#a3a3a3" barSize={20} radius={[4,4,0,0]} />
                            <Line yAxisId="right" type="monotone" dataKey="doseKap" name="Dosis Kap (mg/l)" stroke="#404040" strokeWidth={2} dot={{r: 4, fill: '#404040'}} />
                        </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div id="area-cetak-tabel" className="bg-white border border-neutral-200 shadow-sm rounded-sm overflow-hidden mb-12 p-4">
              <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase">Log Data</h3>
                <div className="flex gap-2">
                   <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold border border-green-200 rounded hover:bg-green-100 transition-colors"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
                  <button onClick={handleExportPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold border border-red-200 rounded hover:bg-red-100 transition-colors"><FileText className="w-3 h-3" /> PDF</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead className="bg-neutral-900 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium align-top">BULAN</th>
                      <th className="px-4 py-3 text-center align-top bg-teal-900 border-x border-teal-800">AIR BAKU<br/><span className="text-[10px] font-normal text-teal-300">(LPS)</span></th>
                      
                      {/* KOLOM PRODUKSI & LPS DIGABUNG */}
                      <th className="px-4 py-3 text-right align-top"><div>PRODUKSI (m³)</div><div className="text-[10px] text-neutral-400 font-normal">Avg & LPS</div></th>
                      
                      {/* KOLOM JAM OPERASI */}
                      <th className="px-4 py-3 text-right align-top border-l border-r border-neutral-700"><div>JAM OPR</div><div className="text-[10px] text-neutral-400 font-normal">Avg (jam/hari)</div></th>
                      
                      <th className="px-4 py-3 text-right text-amber-200 align-top border-r border-amber-800/30"><div>PAC (Kg)</div><div className="text-[10px] text-amber-100/60 font-normal">Avg & Dosis</div></th>
                      <th className="px-4 py-3 text-right text-neutral-300 align-top"><div>KAP (Kg)</div><div className="text-[10px] text-neutral-400 font-normal">Avg & Dosis</div></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {[...filteredData].reverse().map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 font-bold align-middle whitespace-nowrap">{row.fullDateLabel}</td>
                        <td className="px-4 py-3 text-center font-bold text-teal-700 bg-teal-50/20 align-middle">{row.airBaku > 0 ? row.airBaku.toLocaleString('id-ID') : '-'}</td>
                        
                        {/* DATA PRODUKSI & LPS DIGABUNG */}
                        <td className="px-4 py-2 text-right align-middle">
                          <div className="font-bold text-neutral-900">{row.m3.toLocaleString('id-ID')}</div>
                          <div className="text-[10px] text-neutral-500">{row.avgProdDay.toLocaleString('id-ID')} / hari</div>
                          <div className={`text-[10px] font-bold mt-0.5 ${row.lps > 80 ? 'text-red-600' : 'text-blue-600'}`}>{row.lps} LPS</div>
                        </td>
                        
                        {/* DATA JAM OPERASI */}
                        <td className="px-4 py-2 text-right align-middle border-l border-r border-neutral-100 bg-neutral-50/50">
                          <div className="font-bold text-neutral-900">{row.jam?.toLocaleString('id-ID') || 0}</div>
                          <div className="text-[10px] text-neutral-500">{row.avgJamDay} / hari</div>
                        </td>

                        <td className="px-4 py-2 text-right bg-amber-50/30 align-middle">
                          <div className="font-bold text-neutral-900">{row.pacKg.toLocaleString('id-ID')}</div>
                          <div className="text-[10px] text-neutral-500">{row.avgPacDay} / hari</div>
                          <div className="text-[10px] font-bold text-amber-700 mt-0.5">{row.dosePac} mg/l</div>
                        </td>
                        <td className="px-4 py-2 text-right align-middle">
                          <div className="font-bold text-neutral-900">{row.kapKg}</div>
                          <div className="text-[10px] text-neutral-500">{row.avgKapDay} / hari</div>
                          <div className="text-[10px] font-bold text-neutral-600 mt-0.5">{row.doseKap} mg/l</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {tableTotals && (
                    <tfoot className="bg-neutral-100 border-t-2 border-neutral-300 font-bold">
                      <tr className="text-neutral-900">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-center">-</td>
                        
                        {/* TOTAL PRODUKSI */}
                        <td className="px-4 py-3 text-right align-middle">{tableTotals.totalM3.toLocaleString('id-ID')}</td>
                        
                        {/* TOTAL JAM OPERASI */}
                        <td className="px-4 py-3 text-right align-middle border-l border-r border-neutral-200">{tableTotals.totalJam?.toLocaleString('id-ID') || 0}</td>

                        <td className="px-4 py-3 text-right align-middle">{tableTotals.totalPac.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right align-middle">{tableTotals.totalKap.toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="text-neutral-700 bg-neutral-50 border-t border-neutral-200">
                        <td className="px-4 py-3 italic align-middle">RATA-RATA</td>
                        <td className="px-4 py-3 text-center text-teal-700 align-middle">{tableTotals.avgAirBaku?.toFixed(2) || 0}</td>
                        
                        {/* RATA-RATA PRODUKSI & LPS DIGABUNG */}
                        <td className="px-4 py-3 text-right align-middle">
                          <div>{tableTotals.avgM3?.toLocaleString('id-ID', {maximumFractionDigits: 0}) || 0}</div>
                          <div className="text-[10px] font-bold text-blue-600 mt-0.5">{tableTotals.avgLps?.toFixed(2) || 0} LPS</div>
                        </td>
                        
                        {/* RATA-RATA JAM OPERASI */}
                        <td className="px-4 py-3 text-right align-middle border-l border-r border-neutral-200">
                          <div>{tableTotals.avgJam?.toFixed(0) || 0}</div>
                          <div className="text-[10px] text-neutral-600 mt-0.5">{tableTotals.avgJamDaily?.toFixed(1) || 0} / hari</div>
                        </td>

                        <td className="px-4 py-3 text-right align-middle">
                          <div>{tableTotals.avgPacKg?.toLocaleString('id-ID', {maximumFractionDigits: 0}) || 0} Kg</div>
                          <div className="text-[10px] text-amber-700 mt-0.5">{tableTotals.avgDosePac?.toFixed(2) || 0} mg/l</div>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <div>{tableTotals.avgKapKg?.toLocaleString('id-ID', {maximumFractionDigits: 0}) || 0} Kg</div>
                          <div className="text-[10px] text-neutral-600 mt-0.5">{tableTotals.avgDoseKap?.toFixed(2) || 0} mg/l</div>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- AIR BAKU MODAL --- */}
      {showAirBakuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAirBakuModal(false)}>
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl border border-neutral-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-neutral-200 bg-neutral-50">
               <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight text-teal-900">
                    <Waves className="w-6 h-6 text-teal-600"/> Detail Debit Air Baku
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-1">Periode: {stats?.periodLabel}</p>
               </div>
               <button onClick={() => setShowAirBakuModal(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-500 hover:text-red-600">
                 <X className="w-6 h-6" />
               </button>
            </div>
            <div className="p-6">
               <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData}>
                      <defs>
                        <linearGradient id="colorAirBaku" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                      <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 12, fontFamily: 'monospace'}} dy={10} />
                      <YAxis stroke="transparent" tick={{fontSize: 12, fontFamily: 'monospace', fill: '#0f766e'}} domain={[0, 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #14b8a6', borderRadius: '4px' }} 
                        itemStyle={{ fontFamily: 'monospace', fontSize: '13px', color: '#0f766e', fontWeight: 'bold' }} 
                        formatter={(value: any) => [`${value} LPS`, 'Debit Air Baku']}
                      />
                      <Area type="monotone" dataKey="airBaku" stroke="#0d9488" fillOpacity={1} fill="url(#colorAirBaku)" strokeWidth={3} activeDot={{r: 6}} />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-6 flex gap-4 text-xs font-mono text-neutral-500 justify-center border-t border-neutral-100 pt-4">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-teal-600 rounded-full"></div> 
                    Rata-rata: <span className="text-neutral-900 font-bold text-sm">{stats?.avgAirBaku} LPS</span>
                  </span>
               </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}