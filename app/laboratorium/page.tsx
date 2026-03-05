'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, FileSpreadsheet, FileText, Loader2, 
  Search, ShieldCheck, TestTubes, AlertTriangle, Activity, FlaskConical, Sparkles, Copy, Droplets, Map, Info, Check, TrendingUp, TrendingDown, Minus, CalendarDays, Bug, History, Droplet, Bot
} from 'lucide-react';
import { 
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Line
} from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AiTextFormatter from '@/components/AiTextFormatter';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

// --- CONFIG PARAMETER DINAMIS (FULL) ---
const PARAMETERS = [
  // Fisika
  { id: 'tds', label: 'TDS (Padatan)', group: 'Fisika', max: 300, unit: 'mg/l', color: '#4c5f7f' },
  { id: 'kekeruhan', label: 'Kekeruhan', group: 'Fisika', max: 3, unit: 'NTU', color: '#0ea5e9' },
  { id: 'suhu', label: 'Suhu', group: 'Fisika', max: 30, unit: '°C', color: '#0284c7' },
  { id: 'warna', label: 'Warna', group: 'Fisika', max: 10, unit: 'TCU', color: '#38bdf8' },
  // Anorganik
  { id: 'ph', label: 'pH (Tingkat Asam)', group: 'Anorganik', min: 6.5, max: 8.5, unit: '', color: '#8b5cf6' },
  { id: 'klorin', label: 'Sisa Klorin', group: 'Anorganik', min: 0.2, max: 1.0, unit: 'mg/l', color: '#a855f7' },
  { id: 'fe', label: 'Besi (Fe)', group: 'Anorganik', max: 0.2, unit: 'mg/l', color: '#d946ef' },
  { id: 'mn', label: 'Mangan (Mn)', group: 'Anorganik', max: 0.1, unit: 'mg/l', color: '#c026d3' },
  { id: 'flourida', label: 'Flourida', group: 'Anorganik', max: 1.5, unit: 'mg/l', color: '#e879f9' },
  { id: 'nitrat', label: 'Nitrat', group: 'Anorganik', max: 20, unit: 'mg/l', color: '#f472b6' },
  { id: 'nitrit', label: 'Nitrit', group: 'Anorganik', max: 3, unit: 'mg/l', color: '#fb7185' },
  // Mikrobiologi
  { id: 'coliform', label: 'Total Coliform', group: 'Mikrobiologi', max: 0, unit: 'CFU', color: '#e11d48' },
  { id: 'ecoli', label: 'Bakteri E.Coli', group: 'Mikrobiologi', max: 0, unit: 'CFU', color: '#be123c' },
];

// --- TOPOGRAFI PIPA (URUTAN HULU KE HILIR) ---
const PIPELINE_ORDER = [
  'Reservoir (Hulu)', 
  'Citeureup', 
  'Cimahi', 
  'Karang Mekar', 
  'Kasih Bunda', 
  'Cigugur', 
  'Rusunawa Cibeureum (Hilir)'
];

export default function LaboratoriumPublicPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // --- STATE UNTUK MODAL DETAIL ---
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  
  // --- STATE REAL DATABASE & FILTER MULTI-LEVEL ---
  const [labData, setLabData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(''); 
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // 'ALL' = Sepanjang Tahun
  
  const [activeParam, setActiveParam] = useState('kekeruhan');
  const [showComparison, setShowComparison] = useState(false);
  
  // --- STATE AUTO-CAROUSEL ---
  const [activeSlide, setActiveSlide] = useState(0);

  // --- AI STATE ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // --- FETCH DATA DARI SUPABASE ---
  useEffect(() => {
    const fetchSupabaseData = async () => {
      const { data, error } = await supabase
        .from('lab_kualitas_air')
        .select('*')
        .order('tgl_uji', { ascending: false });

      if (error) {
        console.error('Gagal narik data dari Supabase:', error);
      } else if (data && data.length > 0) {
        setLabData(data);
        // Otomatis set filter ke tahun dan bulan terbaru dari database
        const latestDate = data[0].tgl_uji; // YYYY-MM-DD
        setSelectedYear(latestDate.substring(0, 4));
        setSelectedMonth(latestDate.substring(5, 7));
      }
    };
    fetchSupabaseData();
  }, []);

  // --- LOGIKA FILTER WAKTU (TAHUN & BULAN) ---
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(labData.map(d => d.tgl_uji.substring(0, 4))));
    return years.sort((a, b) => b.localeCompare(a)); // Descending
  }, [labData]);

  const availableMonthsInYear = useMemo(() => {
    if (!selectedYear) return [];
    const dataYear = labData.filter(d => d.tgl_uji.startsWith(selectedYear));
    const months = Array.from(new Set(dataYear.map(d => d.tgl_uji.substring(5, 7))));
    return months.sort((a, b) => a.localeCompare(b)); // Ascending (Jan - Des)
  }, [labData, selectedYear]);

  // Prefix pencarian data (Misal: '2025' atau '2025-11')
  const currentPeriodPrefix = selectedMonth === 'ALL' ? selectedYear : `${selectedYear}-${selectedMonth}`;
  
  // Prefix pencarian perbandingan (Tahun Lalu atau Bulan Lalu)
  const prevPeriodPrefix = useMemo(() => {
    if (!selectedYear) return '';
    if (selectedMonth === 'ALL') return String(Number(selectedYear) - 1);
    
    const d = parseISO(`${selectedYear}-${selectedMonth}-01`);
    return format(subMonths(d, 1), 'yyyy-MM');
  }, [selectedYear, selectedMonth]);

  // Label untuk Banner & PDF
  const periodLabel = useMemo(() => {
    if (!selectedYear) return '';
    return selectedMonth === 'ALL' 
      ? `TAHUN ${selectedYear}` 
      : format(parseISO(`${selectedYear}-${selectedMonth}-01`), 'MMMM yyyy', {locale: id}).toUpperCase();
  }, [selectedYear, selectedMonth]);

  const prevPeriodLabel = useMemo(() => {
    if (!selectedYear) return '';
    return selectedMonth === 'ALL' 
      ? `TAHUN ${prevPeriodPrefix}` 
      : format(parseISO(`${prevPeriodPrefix}-01`), 'MMMM yyyy', {locale: id}).toUpperCase();
  }, [selectedYear, selectedMonth, prevPeriodPrefix]);

  const currentParamConfig = useMemo(() => PARAMETERS.find(p => p.id === activeParam) || PARAMETERS[0], [activeParam]);

  // --- STATISTIK UMUM (Berdasarkan Prefix Aktif) ---
  const stats = useMemo(() => {
    const dataPeriod = labData.filter(d => d.tgl_uji.startsWith(currentPeriodPrefix));
    const total = dataPeriod.length;
    const aman = dataPeriod.filter(d => d.status === 'Memenuhi' || d.status === 'Peringatan').length;
    const persentase = total > 0 ? Math.round((aman / total) * 100) : 0;
    
    return { total, aman, persentase };
  }, [labData, currentPeriodPrefix]);

  // --- FUNGSI DELTA UNTUK CAROUSEL ---
  const getDelta = (key: string, invertedLogic = false) => {
    const dataCurr = labData.filter(d => d.tgl_uji.startsWith(currentPeriodPrefix));
    const dataPrev = labData.filter(d => d.tgl_uji.startsWith(prevPeriodPrefix));
    
    const avgCurr = dataCurr.length ? dataCurr.reduce((a, c) => a + Number((c as any)[key] || 0), 0) / dataCurr.length : 0;
    const avgPrev = dataPrev.length ? dataPrev.reduce((a, c) => a + Number((c as any)[key] || 0), 0) / dataPrev.length : 0;
    
    const diff = avgCurr - avgPrev;
    const isGood = invertedLogic ? diff <= 0 : diff >= 0; 
    
    return {
      avg: avgCurr.toFixed(2),
      diff: Math.abs(diff).toFixed(2),
      trend: diff < 0 ? 'down' : diff > 0 ? 'up' : 'flat',
      isGood: diff === 0 ? true : isGood
    };
  };

  const kpiSlides = useMemo(() => {
    const turbidity = getDelta('kekeruhan', true);
    const ecoli = getDelta('ecoli', true);
    const ph = getDelta('ph');
    const color = getDelta('warna', true);

    return [
      { title: 'Tingkat Kejernihan', value: turbidity.avg, unit: 'NTU', icon: Activity, desc: 'Batas Maks. 3 NTU', diff: turbidity, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Bebas Kuman & Bakteri', value: ecoli.avg, unit: 'CFU', icon: Bug, desc: 'Harus 0 CFU', diff: ecoli, color: 'text-red-600', bg: 'bg-red-50' },
      { title: 'Keseimbangan Air (pH)', value: ph.avg, unit: '', icon: FlaskConical, desc: 'Ideal di angka 6.5 - 8.5', diff: ph, color: 'text-purple-600', bg: 'bg-purple-50' },
      { title: 'Warna & Estetika', value: color.avg, unit: 'TCU', icon: Droplets, desc: 'Air Jernih Tidak Berwarna', diff: color, color: 'text-teal-600', bg: 'bg-teal-50' },
    ];
  }, [currentPeriodPrefix, prevPeriodPrefix, labData]);

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((p) => (p + 1) % kpiSlides.length), 6000);
    return () => clearInterval(timer);
  }, [kpiSlides.length]);

  // --- DATA GRAFIK TOPOGRAFI PIPA (HULU KE HILIR) DENGAN RATA-RATA ---
  const chartData = useMemo(() => {
    const currentData = labData.filter(d => d.tgl_uji.startsWith(currentPeriodPrefix));
    const compareData = labData.filter(d => d.tgl_uji.startsWith(prevPeriodPrefix));

    return PIPELINE_ORDER.map(lokasi => {
      // 1. Ambil kata kunci utama (hapus embel-embel Hulu/Hilir biar gampang dicari)
      const keyword = lokasi.replace(' (Hulu)', '').replace(' (Hilir)', '').toLowerCase();

      // 2. Filter data yang LOKASI-nya MENGANDUNG kata kunci tersebut
      const currMatches = currentData.filter(d => d.lokasi.toLowerCase().includes(keyword));
      const prevMatches = compareData.filter(d => d.lokasi.toLowerCase().includes(keyword));
      
      // 3. Fungsi untuk menghitung nilai RATA-RATA jika ada >1 data
      const getAvg = (matches: any[]) => {
        if (matches.length === 0) return null;
        const sum = matches.reduce((acc, curr) => acc + Number(curr[activeParam] || 0), 0);
        return Number((sum / matches.length).toFixed(2));
      };

      const currentValue = getAvg(currMatches);
      const prevValue = getAvg(prevMatches);

      // 4. Cek apakah nilai rata-rata menembus ambang batas Kemenkes
      const isBreach = currentValue !== null && currentParamConfig.max !== undefined 
                       ? currentValue > currentParamConfig.max 
                       : false;

      return {
        lokasi: lokasi.replace(' (Hulu)', '').replace(' (Hilir)', ''), // Label cantik untuk sumbu X
        currentValue,
        prevValue,
        isBreach
      };
    });
  }, [currentPeriodPrefix, prevPeriodPrefix, activeParam, currentParamConfig.max, labData]);

  // --- AI HANDLER ---
  const handleGenerateAiSummary = async () => {
    setIsAiLoading(true);
    setAiSummary(null);
    try {
      const response = await fetch('/api/analyze-laboratorium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthLabel: periodLabel,
          labData: filteredData
        })
      });

      if (!response.ok) throw new Error('Gagal memanggil API AI');
      
      const data = await response.json();
      setAiSummary(data.insight);
      
    } catch (e) {
      console.error(e);
      setAiSummary("Koneksi ke otak AI terputus. Pastikan API Key valid dan server menyala.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiSummary) return;
    navigator.clipboard.writeText(aiSummary.replace(/\*\*/g, '').replace(/\*/g, '-'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // --- TABEL DATA ---
  const filteredData = useMemo(() => {
    let data = labData.filter(d => d.tgl_uji.startsWith(currentPeriodPrefix)); 
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(d => d.lokasi.toLowerCase().includes(lower) || d.id.toLowerCase().includes(lower));
    }
    return data;
  }, [searchTerm, currentPeriodPrefix, labData]);

  // --- KALKULASI RATA-RATA TABEL ---
  const tableAverages = useMemo(() => {
    if (filteredData.length === 0) return null;
    const sum = (key: string) => filteredData.reduce((acc, row) => acc + Number(row[key] || 0), 0);
    const len = filteredData.length;
    
    return {
      ph: (sum('ph') / len).toFixed(2),
      suhu: (sum('suhu') / len).toFixed(2),
      klorin: (sum('klorin') / len).toFixed(2),
      kekeruhan: (sum('kekeruhan') / len).toFixed(2),
      tds: (sum('tds') / len).toFixed(0),
      warna: (sum('warna') / len).toFixed(0),
      fe: (sum('fe') / len).toFixed(4),
      mn: (sum('mn') / len).toFixed(4),
      flourida: (sum('flourida') / len).toFixed(2),
      nitrat: (sum('nitrat') / len).toFixed(2),
      nitrit: (sum('nitrit') / len).toFixed(4),
      coliform: Math.round(sum('coliform') / len),
      ecoli: Math.round(sum('ecoli') / len),
    };
  }, [filteredData]);

  const handleExportExcel = () => {
    if (!filteredData.length) return;
    const wsData: any[] = [
      [`REKAPITULASI HASIL UJI LABORATORIUM BLUD AM KOTA CIMAHI - ${periodLabel}`],
      [`Tanggal Unduh: ${format(new Date(), 'dd MMMM yyyy', {locale: id})}`],
      [''],
      ['KODE', 'LOKASI UJI', 'TANGGAL', 'pH', 'SUHU', 'KLORIN', 'KEKERUHAN', 'TDS', 'BAU', 'WARNA', 'Fe', 'Mn', 'FLOURIDA', 'NITRAT', 'NITRIT', 'COLIFORM', 'E.COLI', 'STATUS']
    ];
    filteredData.forEach(d => {
      wsData.push([d.id, d.lokasi, d.tgl_uji, d.ph, d.suhu, d.klorin, d.kekeruhan, d.tds, d.bau, d.warna, d.fe, d.mn, d.flourida, d.nitrat, d.nitrit, d.coliform, d.ecoli, d.status]);
    });
    
    // Tambahin baris rata-rata di Excel
    if (tableAverages) {
      wsData.push(['', 'RATA-RATA KESELURUHAN', '', tableAverages.ph, tableAverages.suhu, tableAverages.klorin, tableAverages.kekeruhan, tableAverages.tds, '-', tableAverages.warna, tableAverages.fe, tableAverages.mn, tableAverages.flourida, tableAverages.nitrat, tableAverages.nitrit, tableAverages.coliform, tableAverages.ecoli, '-']);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Lab");
    XLSX.writeFile(wb, `Hasil_Uji_Lab_${periodLabel.replace(/ /g, '_')}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredData.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`DATABASE HASIL UJI LABORATORIUM - ${periodLabel}`, 14, 15);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy')}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [[
        { content: 'LOKASI UJI', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'TANGGAL', styles: { halign: 'center', fillColor: [23, 23, 23] } },
        { content: 'pH', styles: { halign: 'center', fillColor: [30, 58, 138] } },
        { content: 'KEKERUHAN', styles: { halign: 'center', fillColor: [30, 58, 138] } }, 
        { content: 'TDS', styles: { halign: 'center', fillColor: [30, 58, 138] } },
        { content: 'Fe', styles: { halign: 'center', fillColor: [30, 58, 138] } },
        { content: 'E.COLI', styles: { halign: 'center', fillColor: [30, 58, 138] } },
        { content: 'STATUS', styles: { halign: 'center', fillColor: [23, 23, 23] } },
      ]],
      body: filteredData.map(d => [d.lokasi, format(parseISO(d.tgl_uji), 'dd/MM/yy'), d.ph, d.kekeruhan, d.tds, d.fe, d.ecoli, d.status]),
      
      // Tambahin baris rata-rata hitam elegan di PDF
      foot: tableAverages ? [[
        { content: 'RATA-RATA KESELURUHAN', colSpan: 2, styles: { halign: 'right', fillColor: [23, 23, 23], textColor: [255,255,255], fontStyle: 'bold' } },
        { content: tableAverages.ph, styles: { halign: 'center', fillColor: [23, 23, 23], textColor: [255,255,255], fontStyle: 'bold' } },
        { content: tableAverages.kekeruhan, styles: { halign: 'center', fillColor: [23, 23, 23], textColor: [255,255,255], fontStyle: 'bold' } },
        { content: tableAverages.tds, styles: { halign: 'center', fillColor: [23, 23, 23], textColor: [255,255,255], fontStyle: 'bold' } },
        { content: tableAverages.fe, styles: { halign: 'center', fillColor: [23, 23, 23], textColor: [255,255,255], fontStyle: 'bold' } },
        { content: tableAverages.ecoli, styles: { halign: 'center', fillColor: [23, 23, 23], textColor: [255,255,255], fontStyle: 'bold' } },
        { content: '-', styles: { halign: 'center', fillColor: [23, 23, 23], textColor: [255,255,255] } }
      ]] : undefined,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { textColor: [255, 255, 255] },
    } as any);
    doc.save(`Data_Lab_BLUD_${periodLabel.replace(/ /g, '_')}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Memenuhi') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Peringatan') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  // --- PERBAIKAN FATAL CUSTOM DOT ---
  // Recharts akan ngasih titik (cx, cy) error/NaN kalau nilainya null, ini bikin grafik nge-blank
  const CustomDot = (props: any) => {
    const { cx, cy, payload, value } = props;
    
    // Safety check: Jangan gambar SVG-nya kalau datanya nggak ada
    if (value === null || cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) {
       return null;
    }

    if (payload.isBreach) {
      return (
        <svg x={cx - 6} y={cy - 6} width={12} height={12} fill="#ef4444" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
        </svg>
      );
    }
    return <circle cx={cx} cy={cy} r={5} fill={currentParamConfig.color} stroke="white" strokeWidth={2} />;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
        <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase">
                  <FlaskConical className="w-6 h-6 text-teal-600" /> LABORATORIUM
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4"/> Filter:
               </span>
               <div className="flex bg-neutral-900 rounded-md shadow-sm overflow-hidden border border-neutral-800">
                  <select 
                    value={selectedYear} 
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setSelectedMonth('ALL'); 
                    }}
                    className="bg-transparent text-white text-sm font-bold px-4 py-2 outline-none cursor-pointer hover:bg-neutral-800 transition-colors"
                  >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  
                  <div className="w-px bg-neutral-700"></div>
                  
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-teal-400 text-sm font-bold px-4 py-2 outline-none cursor-pointer hover:bg-neutral-800 transition-colors"
                  >
                    <option value="ALL">SEPANJANG TAHUN</option>
                    {availableMonthsInYear.map(month => (
                        <option key={month} value={month}>
                            {format(parseISO(`2000-${month}-01`), 'MMMM', {locale: id}).toUpperCase()}
                        </option>
                    ))}
                  </select>
               </div>
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto px-6 mt-8 space-y-8">
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-blue-800/70 uppercase tracking-widest mb-0.5">Menampilkan Data Pemantauan</h2>
                <p className="text-2xl font-black text-blue-700 uppercase tracking-tight">
                  PERIODE: {periodLabel || '-'}
                </p>
              </div>
            </div>
            
            {showComparison && (
               <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-100 px-4 py-2 rounded-lg border border-amber-200 animate-in fade-in zoom-in duration-300">
                 <History className="w-4 h-4" /> 
                 Vs. {prevPeriodLabel}
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-emerald-600 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-center items-center p-8 text-white border border-emerald-500 group">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col items-center w-full text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-800/50 rounded-full text-[10px] font-bold font-mono border border-emerald-400/50 mb-3 backdrop-blur-sm tracking-widest uppercase">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Kepatuhan Standar
                      </div>
                      
                      <h2 className="text-6xl lg:text-7xl font-black tracking-tighter leading-none mb-1 drop-shadow-md">
                          {stats.persentase}<span className="text-3xl text-emerald-200 ml-1">%</span>
                      </h2>
                      
                      <div className="bg-white text-emerald-800 px-5 py-1.5 rounded-full font-black text-lg font-mono mt-2 mb-4 shadow-sm border-2 border-emerald-300">
                         {stats.aman} / {stats.total} SAMPEL
                      </div>

                      <p className="text-emerald-100 text-xs leading-relaxed font-medium">
                          Sesuai Permenkes RI No. 2 Th 2023.
                      </p>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 relative overflow-hidden flex flex-col h-[300px] lg:h-auto">
                  <div className="absolute top-0 left-0 h-1 bg-neutral-100 w-full z-20">
                    <div key={activeSlide} className="h-full bg-blue-500 transition-all duration-[6000ms] ease-linear" style={{ width: '100%' }}></div>
                  </div>

                  <div className="flex-1 relative">
                    {kpiSlides.map((slide, index) => {
                      const Icon = slide.icon;
                      return (
                        <div key={index} className={`absolute inset-0 p-6 flex flex-col items-center justify-center text-center transition-all duration-500 transform ${index === activeSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                          
                          <div className={`w-14 h-14 rounded-full ${slide.bg} flex items-center justify-center mb-4`}>
                            <Icon className={`w-7 h-7 ${slide.color}`} />
                          </div>
                          
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">{slide.title}</p>
                          <div className="flex items-baseline gap-1.5 mb-4">
                              <p className={`text-5xl font-mono font-black tracking-tighter ${slide.color}`}>{slide.value}</p>
                              <p className="text-sm font-bold text-neutral-400">{slide.unit}</p>
                          </div>

                          <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${slide.diff.isGood ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            {slide.diff.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : slide.diff.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                            <div className="text-left">
                              <p className="text-xs font-black font-mono leading-none">{slide.diff.diff} {slide.unit}</p>
                              <p className="text-[9px] font-bold mt-0.5 opacity-80 uppercase">
                                 Vs {selectedMonth === 'ALL' ? 'Tahun Lalu' : 'Bulan Lalu'}
                              </p>
                            </div>
                          </div>

                        </div>
                      )
                    })}
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                    {kpiSlides.map((_, i) => (
                      <div key={i} onClick={() => setActiveSlide(i)} className={`h-1.5 rounded-full cursor-pointer transition-all ${i === activeSlide ? 'bg-blue-600 w-6' : 'bg-neutral-200 w-2 hover:bg-neutral-300'}`}></div>
                    ))}
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                     <Droplet className="w-48 h-48" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Water Quality Index</h3>
                    
                    {(() => {
                        const score = stats.persentase === 100 ? 98 : stats.persentase;
                        const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : 'C';
                        const colorCode = grade === 'A' ? 'text-blue-500' : grade === 'B' ? 'text-amber-500' : 'text-red-500';
                        const borderCode = grade === 'A' ? 'border-blue-100' : grade === 'B' ? 'border-amber-100' : 'border-red-100';
                        const desc = grade === 'A' ? 'Kualitas Prima (Excellent)' : grade === 'B' ? 'Kualitas Baik (Good)' : 'Perlu Perhatian (Fair)';

                        return (
                          <>
                            <div className={`w-28 h-28 rounded-full border-8 ${borderCode} flex items-center justify-center mb-4 bg-white shadow-inner`}>
                                <span className={`text-6xl font-black ${colorCode} drop-shadow-sm`}>{grade}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className={`w-4 h-4 ${colorCode}`} />
                                <p className="text-2xl font-black text-neutral-800">Skor: {score}</p>
                            </div>
                            
                            <p className="text-xs text-neutral-500 font-bold bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-200 mt-1">
                                {desc}
                            </p>
                          </>
                        )
                    })()}
                  </div>
              </div>
          </div>

          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl flex flex-col overflow-hidden">
              
              <div className="p-5 border-b border-neutral-200 bg-neutral-50 shrink-0">
                  <div className="flex flex-col md:flex-row justify-between md:items-end mb-5 gap-4">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight text-neutral-900">
                            <Map className="w-5 h-5 text-blue-600" /> Topografi Pengaliran (HULU KE HILIR)
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">Mengurutkan titik *sampling* berdasarkan jarak alami aliran air dari reservoir.</p>
                    </div>
                    
                    {/* <label className="flex items-center gap-3 cursor-pointer shrink-0 bg-white px-4 py-2 rounded-lg border border-neutral-300 shadow-sm hover:border-blue-400 transition-colors">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={showComparison} onChange={() => setShowComparison(!showComparison)} />
                        <div className={`block w-10 h-5 rounded-full transition-colors ${showComparison ? 'bg-indigo-500' : 'bg-neutral-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showComparison ? 'transform translate-x-5' : ''}`}></div>
                      </div>
                      <span className="text-xs font-bold text-neutral-700">
                         Bandingkan {selectedMonth === 'ALL' ? 'Tahun Lalu' : 'Bulan Sebelumnya'}
                      </span>
                    </label> */}
                  </div>

                  <div className="flex gap-8 overflow-x-auto hide-scroll pb-2">
                    {['Fisika', 'Anorganik', 'Mikrobiologi'].map(group => (
                      <div key={group} className="flex flex-col gap-2 shrink-0">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">{group}</p>
                        <div className="flex gap-2">
                          {PARAMETERS.filter(p => p.group === group).map(p => (
                            <button 
                              key={p.id} 
                              onClick={() => setActiveParam(p.id)} 
                              className={`px-4 py-2.5 rounded-md text-[11px] font-bold transition-all border ${activeParam === p.id ? 'bg-neutral-900 text-white border-neutral-900 shadow-md transform -translate-y-0.5' : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400'}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
              
              <div className="flex flex-col">
                
                {/* 1. PIPELINE CHART (Lebar Full 100%, Tinggi Fix 400px) */}
                <div className="w-full h-[400px] p-6 relative bg-white border-b border-neutral-200">
                  <div className="absolute top-6 left-12 flex gap-4 text-[10px] font-mono bg-neutral-50 px-3 py-2 rounded border border-neutral-200 z-10 opacity-90 hover:opacity-100 transition-opacity shadow-sm">
                      <span className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full`} style={{backgroundColor: currentParamConfig.color}}></div>Area Terpilih</span>
                      {showComparison && <span className="flex items-center gap-1.5 ml-2"><div className="w-4 h-0.5 border-t-2 border-dashed border-neutral-400"></div>Data Historis</span>}
                      <span className="flex items-center gap-1.5 ml-2"><div className="w-4 h-0.5 border-t-2 border-solid border-red-500"></div>Batas Maks/Min</span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 60, right: 20, left: -10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="lokasi" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fontFamily: 'sans-serif', fontWeight: 'bold', fill: '#404040'}} 
                            dy={15} 
                          />
                          <YAxis 
                              stroke="transparent" 
                              tick={{fontSize: 10, fontFamily: 'monospace', fill: '#737373'}} 
                              domain={[
                                  (dataMin: number) => currentParamConfig.min !== undefined ? Number((Math.min(dataMin, currentParamConfig.min) * 0.8).toFixed(2)) : 0,
                                  (dataMax: number) => {
                                      const maxVal = currentParamConfig.max !== undefined ? Math.max(dataMax, currentParamConfig.max) : dataMax;
                                      return Number((maxVal * 1.2).toFixed(3)); // Tambah ruang kosong 20% di atas garis merah biar lega
                                  }
                              ]}
                          />
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                              itemStyle={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold' }}
                              labelStyle={{ fontWeight: 'black', marginBottom: '8px', color: '#171717', textTransform: 'uppercase' }}
                          />
                          
                          {/* connectNulls=true bikin garis otomatis ngelewatin lokasi yang datanya bolong */}
                          {showComparison && (
                            <Line 
                              type="monotone" 
                              dataKey="prevValue" 
                              name={`Data ${selectedMonth === 'ALL' ? 'Tahun Lalu' : 'Bulan Sebelumnya'}`} 
                              stroke="#a3a3a3" 
                              strokeWidth={3} 
                              strokeDasharray="5 5"
                              dot={{ r: 4, fill: '#a3a3a3', strokeWidth: 0 }} 
                              activeDot={{ r: 6 }} 
                              connectNulls={true} 
                            />
                          )}

                          <defs>
                            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={currentParamConfig.color} stopOpacity={0.6}/>
                              <stop offset="95%" stopColor={currentParamConfig.color} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          {/* connectNulls=true bikin grafik area otomatis ngelewatin lokasi yang datanya bolong */}
                          <Area 
                            type="monotone" 
                            dataKey="currentValue" 
                            name={`Hasil Pengujian`} 
                            stroke={currentParamConfig.color} 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorArea)" 
                            dot={<CustomDot />}
                            activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                            animationDuration={1500}
                            connectNulls={true}
                          />

                          {currentParamConfig.max !== undefined && (
                            <ReferenceLine 
                              y={currentParamConfig.max} 
                              stroke="#ef4444" 
                              strokeWidth={1.5} 
                              strokeDasharray="6 4"
                              label={{ position: 'top', value: `MAKS: ${currentParamConfig.max} ${currentParamConfig.unit}`, fill: '#ef4444', fontSize: 10, fontWeight: '900', fontFamily: 'monospace' }} 
                            />
                          )}
                          {currentParamConfig.min !== undefined && (
                            <ReferenceLine 
                              y={currentParamConfig.min} 
                              stroke="#f59e0b" 
                              strokeWidth={1.5} 
                              strokeDasharray="6 4"
                              label={{ position: 'bottom', value: `MIN: ${currentParamConfig.min} ${currentParamConfig.unit}`, fill: '#f59e0b', fontSize: 10, fontWeight: '900', fontFamily: 'monospace' }} 
                            />
                          )}
                      </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* 2. HOLISTIC AI CHIEF CHEMIST (COMPACT ROW DI BAWAH GRAFIK) */}
                <div className="p-4 sm:p-5 bg-white flex flex-col md:flex-row items-start md:items-center gap-6">
                  
                  {/* Bagian Kiri: Header & Tombol */}
                  <div className="shrink-0 w-full md:w-[220px] flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-neutral-900">
                          <Bot className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-xs font-black uppercase tracking-widest">AI Lab Assistant</h3>
                      </div>
                      <button 
                          onClick={handleGenerateAiSummary}
                          disabled={isAiLoading || filteredData.length === 0}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-neutral-100 disabled:text-neutral-400 text-[11px] font-black rounded-md transition-colors w-full shadow-sm"
                      >
                          {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isAiLoading ? 'MENGANALISA...' : `ANALISA DATA`}
                      </button>
                  </div>

                  {/* Bagian Kanan: Hasil Teks AI */}
                  <div className="flex-1 w-full bg-neutral-50/70 border border-neutral-200 rounded-lg p-4 text-xs text-neutral-700 h-[140px] overflow-y-auto custom-scrollbar relative">
                    {isAiLoading ? (
                        <div className="space-y-2 mt-1">
                            <div className="h-2 bg-neutral-200 rounded animate-pulse w-full"></div>
                            <div className="h-2 bg-neutral-200 rounded animate-pulse w-5/6"></div>
                            <div className="h-2 bg-neutral-200 rounded animate-pulse w-4/6"></div>
                        </div>
                    ) : aiSummary ? (
                      <div className="pr-8">
                        <AiTextFormatter text={aiSummary} />
                        <button 
                            onClick={handleCopy} 
                            className="absolute top-3 right-3 p-1.5 bg-white border border-neutral-200 rounded text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm" 
                            title="Salin Analisis"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-neutral-400 h-full">
                        <Info className="w-4 h-4 shrink-0 opacity-50" />
                        <p className="text-[10px] font-mono leading-relaxed">
                          Klik tombol di sebelah kiri untuk menghasilkan ringkasan kausalitas kualitas air.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
          </div>

          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl flex flex-col overflow-hidden mb-12">
              <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                  <div>
                      <h3 className="text-sm font-bold uppercase flex items-center gap-2"><TestTubes className="w-4 h-4"/> Database Uji Laboratorium</h3>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Menampilkan {filteredData.length} data uji lab pada periode terpilih.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input 
                              type="text" 
                              placeholder="Cari lokasi uji..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-neutral-300 rounded-sm focus:border-teal-600 outline-none transition-all bg-white shadow-sm" 
                          />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 text-[10px] font-bold border border-green-200 rounded hover:bg-green-100 transition-colors shadow-sm"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
                          <button onClick={handleExportPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 rounded hover:bg-red-100 transition-colors shadow-sm"><FileText className="w-3 h-3" /> PDF</button>
                      </div>
                  </div>
              </div>
              
              <div className="flex-1 overflow-x-auto custom-scrollbar bg-neutral-50/30">
                  <table className="min-w-max w-full text-left border-collapse bg-white">
                      <thead className="sticky top-0 z-20 shadow-sm">
                          <tr className="bg-neutral-900 text-white text-[10px] uppercase tracking-wider font-bold">
                              <th colSpan={3} className="px-4 py-2 border-r border-neutral-700 text-center">INFORMASI UMUM</th>
                              <th colSpan={4} className="px-4 py-2 border-r border-neutral-700 text-center bg-teal-900">PENGUKURAN LAPANGAN</th>
                              <th colSpan={9} className="px-4 py-2 border-r border-neutral-700 text-center bg-blue-900">PENGUJIAN LABORATORIUM</th>
                              <th colSpan={1} className="px-4 py-2 text-center bg-neutral-800">KESIMPULAN</th>
                          </tr>
                          <tr className="bg-neutral-100 text-neutral-800 text-[10px] font-bold border-b border-neutral-300">
                              <th rowSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center">NO</th>
                              <th rowSpan={2} className="px-4 py-2 border-r border-neutral-300">LOKASI UJI</th>
                              <th rowSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center">TGL UJI</th>
                              
                              <th rowSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center bg-teal-50">pH</th>
                              <th rowSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center bg-teal-50">Suhu<br/><span className="text-[9px] font-mono text-teal-600 font-normal">°C</span></th>
                              <th rowSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center bg-teal-50">Klorin<br/><span className="text-[9px] font-mono text-teal-600 font-normal">mg/l</span></th>
                              <th rowSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center bg-teal-50">Kekeruhan<br/><span className="text-[9px] font-mono text-teal-600 font-normal">NTU</span></th>
                              
                              <th colSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center bg-blue-50">FISIKA</th>
                              <th colSpan={5} className="px-3 py-2 border-r border-neutral-300 text-center bg-indigo-50">ANORGANIK</th>
                              <th colSpan={2} className="px-3 py-2 border-r border-neutral-300 text-center bg-purple-50">MIKROBIOLOGI</th>
                              <th rowSpan={2} className="px-4 py-2 text-center">STATUS</th>
                          </tr>
                          <tr className="bg-neutral-50 text-neutral-600 text-[9px] font-bold border-b border-neutral-300 shadow-sm">
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-blue-50/50">TDS<br/><span className="font-normal text-blue-500 font-mono">mg/l</span></th>
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-blue-50/50">Warna<br/><span className="font-normal text-blue-500 font-mono">TCU</span></th>

                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-indigo-50/50">Fe<br/><span className="font-normal text-indigo-500 font-mono">mg/l</span></th>
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-indigo-50/50">Mn<br/><span className="font-normal text-indigo-500 font-mono">mg/l</span></th>
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-indigo-50/50">Flourida<br/><span className="font-normal text-indigo-500 font-mono">mg/l</span></th>
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-indigo-50/50">Nitrat<br/><span className="font-normal text-indigo-500 font-mono">mg/l</span></th>
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-indigo-50/50">Nitrit<br/><span className="font-normal text-indigo-500 font-mono">mg/l</span></th>

                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-purple-50/50">Coliform<br/><span className="font-normal text-purple-500 font-mono">CFU</span></th>
                              <th className="px-2 py-2 border-r border-neutral-300 text-center bg-purple-50/50">E.Coli<br/><span className="font-normal text-purple-500 font-mono">CFU</span></th>
                          </tr>
                      </thead>
                      
                      <tbody className="divide-y divide-neutral-200 text-xs text-neutral-800">
                          {filteredData.length === 0 ? (
                              <tr>
                                  <td colSpan={18} className="px-4 py-20 text-center text-neutral-400 bg-white">
                                      <Search className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                                      <p className="font-mono font-bold text-sm">DATA TIDAK DITEMUKAN / BELUM ADA DATA PADA PERIODE INI</p>
                                  </td>
                              </tr>
                          ) : (
                              filteredData.map((row, index) => (
                                  <tr 
                                      key={row.id} 
                                      onClick={() => setSelectedRow(row)}
                                      className="cursor-pointer transition-all duration-300 hover:bg-blue-50/40 hover:shadow-[inset_4px_0_0_0_#2563eb] group"
                                    >
                                      <td className="px-3 py-3 text-center border-r border-neutral-100">{index + 1}</td>
                                      <td className="px-4 py-3 font-bold text-neutral-900 border-r border-neutral-100 whitespace-nowrap">{row.lokasi}</td>
                                      <td className="px-2 py-3 text-center font-mono text-[10px] text-neutral-500 border-r border-neutral-100">{format(parseISO(row.tgl_uji), 'dd/MM/yy')}</td>
                                      
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100 bg-teal-50/10">{row.ph}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100 bg-teal-50/10">{row.suhu}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100 bg-teal-50/10">{row.klorin}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100 bg-teal-50/10">{row.kekeruhan}</td>

                                      <td className="px-3 py-3 text-center font-mono font-bold text-blue-700 border-r border-neutral-100">{row.tds}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100">{row.warna}</td>

                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100">{row.fe}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100">{row.mn}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100">{row.flourida}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100">{row.nitrat}</td>
                                      <td className="px-3 py-3 text-center font-mono border-r border-neutral-100">{row.nitrit}</td>

                                      <td className={`px-3 py-3 text-center font-mono font-bold border-r border-neutral-100 ${row.coliform > 0 ? 'text-red-600 bg-red-50' : 'text-neutral-700'}`}>{row.coliform}</td>
                                      <td className={`px-3 py-3 text-center font-mono font-bold border-r border-neutral-100 ${row.ecoli > 0 ? 'text-red-600 bg-red-50' : 'text-neutral-700'}`}>{row.ecoli}</td>

                                      <td className="px-4 py-3 text-center bg-neutral-50/50">
                                          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(row.status)}`}>
                                              {row.status}
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                      {tableAverages && (
                        <tfoot className="bg-neutral-900 text-white font-bold text-[11px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-20">
                            <tr>
                                <td colSpan={3} className="px-4 py-3.5 text-right border-r border-neutral-700 uppercase tracking-widest text-neutral-400">Rata-Rata Keseluruhan</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-teal-300">{tableAverages.ph}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-teal-300">{tableAverages.suhu}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-teal-300">{tableAverages.klorin}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-teal-300">{tableAverages.kekeruhan}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-blue-300">{tableAverages.tds}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-blue-300">{tableAverages.warna}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-indigo-300">{tableAverages.fe}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-indigo-300">{tableAverages.mn}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-indigo-300">{tableAverages.flourida}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-indigo-300">{tableAverages.nitrat}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-indigo-300">{tableAverages.nitrit}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-purple-300">{tableAverages.coliform}</td>
                                <td className="px-3 py-3.5 text-center border-r border-neutral-700 font-mono text-purple-300">{tableAverages.ecoli}</td>
                                <td className="px-4 py-3.5 text-center text-neutral-500">-</td>
                            </tr>
                        </tfoot>
                      )}
                  </table>
              </div>
          </div>

        </div>
        {/* --- MODAL POPUP DETAIL (MUNcUL SAAT BARIS DIKLIK) --- */}
          {selectedRow && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-neutral-200">
                
                {/* Header Modal */}
                <div className="bg-neutral-900 p-6 sm:p-8 text-white flex justify-between items-start relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(selectedRow.status)}`}>
                          {selectedRow.status}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-1 rounded-md border border-neutral-700">ID: {selectedRow.id}</span>
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedRow.lokasi}</h2>
                    <p className="text-sm text-neutral-400 font-mono mt-2 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-neutral-500" /> {format(parseISO(selectedRow.tgl_uji), 'dd MMMM yyyy', {locale: id})}
                    </p>
                  </div>
                  <button onClick={() => setSelectedRow(null)} className="p-2.5 bg-neutral-800 hover:bg-red-500 hover:text-white rounded-full transition-colors relative z-10 shadow-sm group">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:rotate-90 transition-transform"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>

                {/* Body Modal (Grid Data) */}
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-neutral-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Panel Fisika */}
                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-neutral-100 pb-3">
                        <Droplets className="w-4 h-4" /> Parameter Fisika
                      </h3>
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Suhu</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.suhu} <span className="text-[10px] text-neutral-400 font-normal">°C</span></span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Kekeruhan</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.kekeruhan} <span className="text-[10px] text-neutral-400 font-normal">NTU</span></span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">TDS (Padatan)</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.tds} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                        <div className="flex justify-between items-end"><span className="text-xs text-neutral-500 font-bold">Warna</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.warna} <span className="text-[10px] text-neutral-400 font-normal">TCU</span></span></div>
                      </div>
                    </div>

                    {/* Panel Anorganik */}
                    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                      <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-neutral-100 pb-3">
                        <FlaskConical className="w-4 h-4" /> Kimia Anorganik
                      </h3>
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">pH Air</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.ph}</span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Sisa Klorin</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.klorin} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Zat Besi (Fe)</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.fe} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Mangan (Mn)</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.mn} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Flourida</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.flourida} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                        <div className="flex justify-between items-end border-b border-neutral-50 pb-1.5"><span className="text-xs text-neutral-500 font-bold">Nitrat</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.nitrat} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                        <div className="flex justify-between items-end"><span className="text-xs text-neutral-500 font-bold">Nitrit</span><span className="font-mono font-black text-sm text-neutral-800">{selectedRow.nitrit} <span className="text-[10px] text-neutral-400 font-normal">mg/l</span></span></div>
                      </div>
                    </div>

                    {/* Panel Mikrobiologi & Info Lab */}
                    <div className="flex flex-col gap-6">
                      <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                        <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-neutral-100 pb-3">
                          <Bug className="w-4 h-4" /> Mikrobiologi
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                             <span className="text-xs text-neutral-600 font-bold">Total Coliform</span>
                             <span className={`font-mono font-black text-lg ${selectedRow.coliform > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{selectedRow.coliform} <span className="text-[10px] text-neutral-400 font-normal">CFU</span></span>
                          </div>
                          <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                             <span className="text-xs text-neutral-600 font-bold">Bakteri E.Coli</span>
                             <span className={`font-mono font-black text-lg ${selectedRow.ecoli > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{selectedRow.ecoli} <span className="text-[10px] text-neutral-400 font-normal">CFU</span></span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-neutral-900 p-5 rounded-xl border border-neutral-800 text-white shadow-inner flex-1 flex flex-col justify-center">
                        <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <ShieldCheck className="w-3.5 h-3.5" /> Laboratorium Penguji
                        </h3>
                        <p className="text-sm font-bold leading-relaxed">{selectedRow.lab}</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
          {/* --- END MODAL POPUP --- */}
      </main>
    </>
  );
}