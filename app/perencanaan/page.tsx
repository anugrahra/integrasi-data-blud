'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, PenTool, Filter, Map as MapIcon, Layers, FileText, FileBadge, 
  BookOpen, FileSpreadsheet, DownloadCloud, Loader2, CheckCircle2, AlertCircle, Clock, Sparkles, Bot, Copy, Check, Ruler 
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/utils/supabase';
import AiTextFormatter from '@/components/AiTextFormatter';

const KATEGORI_ICONS: Record<string, any> = {
  'Peta Jaringan': MapIcon,
  'Data Inventaris Jaringan': Layers,
  'DED': PenTool,
  'Dokumen Perizinan': FileBadge,
  'SOP': BookOpen
};

const STATUS_COLORS: Record<string, string> = {
  'Updated': 'text-green-700 bg-green-50 border-green-200',
  'Final': 'text-blue-700 bg-blue-50 border-blue-200',
  'Active': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Review': 'text-amber-700 bg-amber-50 border-amber-200',
  'Draft': 'text-neutral-600 bg-neutral-100 border-neutral-300',
  'Needs Update': 'text-red-700 bg-red-50 border-red-200',
  'Expiring Soon': 'text-orange-700 bg-orange-50 border-orange-200',
};

export default function PerencanaanPage() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  
  // --- AMBIL DATA DARI SUPABASE ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('dokumen_perencanaan')
        .select('*')
        .order('kategori', { ascending: true }); // Urutkan berdasarkan kategori

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setRawData(data || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // --- FILTER & MAPPING DATA ---
  const filteredData = useMemo(() => {
    let data = activeFilter === 'All' ? rawData : rawData.filter(d => d.kategori === activeFilter);
    
    // Mapping format database ke format UI yang kita butuhkan
    return data.map(item => ({
      id: item.kode_dokumen,
      kategori: item.kategori,
      uraian: item.uraian,
      keterangan: item.keterangan,
      format: item.format_file,
      status: item.status,
      last_update: item.tanggal_update,
      file_url: item.file_url
    }));
  }, [rawData, activeFilter]);

  // --- STATISTIK ---
  const stats = useMemo(() => {
    return {
      totalDoc: rawData.length,
      petaCount: rawData.filter(d => d.kategori === 'Peta Jaringan').length,
      dedCount: rawData.filter(d => d.kategori === 'DED').length,
      needsAttention: rawData.filter(d => ['Needs Update', 'Expiring Soon', 'Review'].includes(d.status)).length,
    };
  }, [rawData]);

  const chartData = useMemo(() => {
    const counts = rawData.reduce((acc, curr) => {
      acc[curr.kategori] = (acc[curr.kategori] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts).map(key => ({
      name: key.replace(' Jaringan', '').replace('Dokumen ', ''), // Singkat nama buat di chart
      total: counts[key]
    }));
  }, [rawData]);

// --- STATE & FUNGSI AI ASSISTANT ---
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!aiSummary) return;
    const plainText = aiSummary.replace(/\*\*/g, '').replace(/\*/g, '-');
    navigator.clipboard.writeText(plainText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleGenerateAiSummary = async () => {
    if (rawData.length === 0) return;
    setIsAiLoading(true);
    setAiSummary(null);

    try {
      const response = await fetch('/api/analyze-perencanaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDate: format(new Date(), 'dd MMMM yyyy', {locale: id}),
          documents: rawData // Kirim semua data mentah ke AI
        })
      });

      const data = await response.json();
      if (response.ok) setAiSummary(data.summary);
      else setAiSummary("Maaf, gagal memuat analisis. Silakan coba lagi.");
    } catch (error) {
      setAiSummary("Terjadi kesalahan jaringan saat memanggil AI.");
    } finally {
      setIsAiLoading(false);
    }
  };
  // -----------------------------------

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (!filteredData.length) return;
    const wsData: any[] = [
      [`INVENTARIS DOKUMEN PERENCANAAN TEKNIK SPAM`],
      [`Tanggal Unduh: ${format(new Date(), 'dd MMM yyyy', {locale: id})}`],
      [''],
      ['KODE DOKUMEN', 'KATEGORI', 'URAIAN', 'KETERANGAN', 'FORMAT', 'STATUS', 'TERAKHIR UPDATE', 'LINK FILE']
    ];

    filteredData.forEach(item => {
      wsData.push([item.id, item.kategori, item.uraian, item.keterangan, item.format, item.status, item.last_update, item.file_url || 'Belum ada file']);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wscols = [{wch: 15}, {wch: 25}, {wch: 40}, {wch: 50}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}];
    (ws as any)['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arsip_Teknik");
    XLSX.writeFile(wb, `Inventaris_Perencanaan_Teknik.xlsx`);
  };

  // --- PDF EXPORT ---
  const handleExportPDF = () => {
    if (!filteredData.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INVENTARIS DOKUMEN PERENCANAAN TEKNIK", 14, 15);
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`KATEGORI : ${activeFilter.toUpperCase()}`, 14, 22);
    doc.text(`TANGGAL  : ${format(new Date(), 'dd MMMM yyyy', {locale: id}).toUpperCase()}`, 14, 27);

    const tableHead = [[
      { content: 'KODE', styles: { halign: 'left', fillColor: [23, 23, 23] } },
      { content: 'URAIAN DOKUMEN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
      { content: 'KETERANGAN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
      { content: 'FORMAT', styles: { halign: 'center', fillColor: [30, 58, 138] } }, 
      { content: 'STATUS', styles: { halign: 'center', fillColor: [23, 23, 23] } },
      { content: 'LAST UPDATE', styles: { halign: 'center', fillColor: [23, 23, 23] } },
    ]];

    const tableBody = filteredData.map(item => [
      item.id,
      item.uraian,
      item.keterangan,
      item.format,
      item.status,
      item.last_update ? format(new Date(item.last_update), 'dd MMM yyyy', {locale: id}) : '-',
    ]);

    autoTable(doc, {
      startY: 35,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
      headStyles: { textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 60, fontStyle: 'bold' },
        2: { cellWidth: 110 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 30 },
        5: { halign: 'center', cellWidth: 30 },
      },
    } as any);

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI", 14, pageHeight - 10);
    doc.save(`Arsip_Teknik_${activeFilter}.pdf`);
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Ruler className="w-6 h-6" /> PERENCANAAN TEKNIK</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-300 border border-neutral-300 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Total Arsip Digital</p>
                    {loading ? <div className="h-8 bg-neutral-200 rounded animate-pulse w-16 mb-1"></div> : <p className="text-3xl font-mono font-bold text-neutral-900 truncate">{stats.totalDoc} <span className="text-sm text-neutral-400 font-sans">Item</span></p>}
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <FileText className="w-3 h-3"/> Tersimpan di Database
                </div>
            </div>

            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Peta Jaringan & Aset</p>
                    {loading ? <div className="h-8 bg-neutral-200 rounded animate-pulse w-16 mb-1"></div> : <p className="text-3xl font-mono font-bold text-blue-700 truncate">{stats.petaCount} <span className="text-sm text-neutral-400 font-sans">Item</span></p>}
                </div>
                <div className="border-t border-neutral-100 pt-2 text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                    <MapIcon className="w-3 h-3"/> Data Spasial & Atribut
                </div>
            </div>

            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Detailed Engineering Design</p>
                    {loading ? <div className="h-8 bg-neutral-200 rounded animate-pulse w-16 mb-1"></div> : <p className="text-3xl font-mono font-bold text-teal-600 truncate">{stats.dedCount} <span className="text-sm text-neutral-400 font-sans">Set</span></p>}
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <PenTool className="w-3 h-3"/> Dokumen Perencanaan
                </div>
            </div>

            <div className="bg-white p-6 h-[120px] flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Perlu Perhatian / Update</p>
                    {loading ? <div className="h-8 bg-neutral-200 rounded animate-pulse w-16 mb-1"></div> : <p className={`text-3xl font-mono font-bold truncate ${stats.needsAttention > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.needsAttention} <span className="text-sm text-neutral-400 font-sans">Doc</span></p>}
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono relative z-10">
                    <AlertCircle className="w-3 h-3"/> Expired, Review, Needs Update
                </div>
                {stats.needsAttention > 0 && <div className="absolute right-0 bottom-0 w-16 h-16 bg-red-500 opacity-10 rounded-tl-full"></div>}
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: FILTER & CHART */}
            <div className="space-y-6">
                <div className="bg-white p-5 border border-neutral-200 shadow-sm rounded-sm">
                    <h3 className="text-sm font-bold uppercase mb-4 flex items-center gap-2"><Filter className="w-4 h-4" /> Kategori Arsip</h3>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={() => setActiveFilter('All')} 
                            className={`px-4 py-3 text-left text-sm font-bold rounded border transition-all flex justify-between items-center ${activeFilter === 'All' ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}
                        >
                            <span>Semua Kategori</span>
                            <span className="text-xs font-mono bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full">{rawData.length}</span>
                        </button>
                        
                        {Object.keys(KATEGORI_ICONS).map(kategori => {
                            const Icon = KATEGORI_ICONS[kategori];
                            const count = rawData.filter(d => d.kategori === kategori).length;
                            const isActive = activeFilter === kategori;
                            return (
                                <button 
                                    key={kategori}
                                    onClick={() => setActiveFilter(kategori)} 
                                    className={`px-4 py-3 text-left text-sm font-medium rounded border transition-all flex justify-between items-center ${isActive ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}
                                >
                                    <span className="flex items-center gap-2"><Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-neutral-400'}`} /> {kategori}</span>
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-200 text-blue-900' : 'bg-neutral-100'}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- AI ASSISTANT PANEL --- */}
                <div className="bg-white border border-indigo-200 shadow-sm rounded-sm p-5 relative overflow-hidden flex flex-col h-fit">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    
                    <div className="flex flex-col gap-3 relative z-10 mb-4 border-b border-indigo-50 pb-4">
                        <div className="flex items-center gap-2 text-indigo-900">
                            <Bot className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-sm font-bold uppercase tracking-tight">AI Assistant</h3>
                        </div>
                        <button 
                            onClick={handleGenerateAiSummary}
                            disabled={isAiLoading || rawData.length === 0}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded transition-colors shadow-sm w-full mt-1"
                        >
                            {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isAiLoading ? 'MENGANALISIS ...' : 'ASSIST ME'}
                        </button>
                    </div>

                    {/* Area Hasil Teks */}
                    {(isAiLoading || aiSummary) && (
                        <div className="relative z-10 animate-in fade-in zoom-in-95 duration-300">
                            {!isAiLoading && aiSummary && (
                                <button 
                                    onClick={handleCopy}
                                    className="absolute -top-2 right-0 p-1.5 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 rounded-md transition-all shadow-sm z-20"
                                    title="Salin Teks"
                                >
                                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span className={`text-[9px] font-bold ${isCopied ? 'text-green-600' : 'text-indigo-700'}`}>
                                        {isCopied ? 'COPIED!' : 'COPY'}
                                    </span>
                                </button>
                            )}

                            {isAiLoading ? (
                                <div className="space-y-2 mt-2">
                                    <div className="h-2.5 bg-indigo-100 rounded animate-pulse w-full"></div>
                                    <div className="h-2.5 bg-indigo-100 rounded animate-pulse w-5/6"></div>
                                    <div className="h-2.5 bg-indigo-100 rounded animate-pulse w-full"></div>
                                    <div className="h-2.5 bg-indigo-100 rounded animate-pulse w-4/6"></div>
                                </div>
                            ) : (
                                <div className="text-xs text-neutral-700 leading-relaxed font-sans pr-14 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <AiTextFormatter text={aiSummary || ''} />
                                </div>
                            )}

                            {/* DISCLAIMER AI */}
                            {!isAiLoading && aiSummary && (
                                <p className="mt-4 text-[10px] text-neutral-400 italic flex items-start gap-1">
                                <span className="text-[12px] leading-none">⚠️</span>
                                Kesimpulan ini dihasilkan oleh AI (Google Gemini), bisa saja keliru.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {/* ----------------------------------- */}
            </div>

            {/* RIGHT: DATA TABLE */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col h-[700px]">
                <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-sm font-bold uppercase">Detail Dokumen</h3>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Menampilkan: {activeFilter}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold border border-green-200 rounded hover:bg-green-100 transition-colors"><FileSpreadsheet className="w-3 h-3" /> EXCEL</button>
                        <button onClick={handleExportPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold border border-red-200 rounded hover:bg-red-100 transition-colors"><FileText className="w-3 h-3" /> PDF</button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p className="text-sm font-bold">MENGAMBIL DATA ARSIP...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400 border-2 border-dashed border-neutral-200 rounded-lg">
                            <FileText className="w-12 h-12 mb-4 text-neutral-300" />
                            <p className="text-sm font-bold">TIDAK ADA DOKUMEN</p>
                            <p className="text-xs">Pilih kategori lain atau tambahkan data baru.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredData.map((doc, idx) => {
                                const CatIcon = KATEGORI_ICONS[doc.kategori] || FileText;
                                const statusColor = STATUS_COLORS[doc.status] || 'text-neutral-600 bg-neutral-100 border-neutral-200';
                                
                                return (
                                    <div key={doc.id} className="group border border-neutral-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all bg-white relative">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            {/* Icon Container */}
                                            <div className="hidden sm:flex shrink-0 w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-md items-center justify-center">
                                                <CatIcon className="w-6 h-6 text-neutral-400" />
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-mono font-bold text-neutral-400">{doc.id}</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">{doc.kategori}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>{doc.status}</span>
                                                </div>
                                                
                                                <h4 className="text-base font-bold text-neutral-900 leading-tight mb-1 group-hover:text-blue-700 transition-colors">{doc.uraian}</h4>
                                                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3">{doc.keterangan}</p>
                                                
                                                <div className="flex flex-wrap gap-4 text-[10px] font-mono text-neutral-400">
                                                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3"/> Format: {doc.format}</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Last Update: {doc.last_update ? format(new Date(doc.last_update), 'dd MMM yyyy', {locale: id}) : '-'}</span>
                                                </div>
                                            </div>

                                            {/* Action Button (Cek URL File) */}
                                            <div className="shrink-0 flex sm:flex-col justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
                                                {doc.file_url ? (
                                                    <a 
                                                        href={doc.file_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-neutral-900 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors"
                                                    >
                                                        <DownloadCloud className="w-4 h-4" /> Unduh
                                                    </a>
                                                ) : (
                                                    <button disabled className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-neutral-100 text-neutral-400 text-xs font-bold rounded cursor-not-allowed" title="File belum diunggah">
                                                        <AlertCircle className="w-4 h-4" /> Belum Ada File
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}