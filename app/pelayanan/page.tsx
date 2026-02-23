'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ArrowLeft, Users, Filter, UserPlus, MessageSquareWarning, CheckCircle, 
  FileSpreadsheet, FileText, FolderOpen, Loader2, PhoneIncoming, TrendingUp, ChevronDown, Calendar 
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

  let currentSR = 14500; // Start SR awal tahun

  return months.map(dateStr => {
    const pasangBaru = Math.floor(Math.random() * (120 - 50) + 50); // 50-120 Pasang Baru
    const putus = Math.floor(Math.random() * (30 - 5) + 5); // 5-30 Pemutusan
    
    currentSR = currentSR + pasangBaru - putus; // Update Total SR

    const aduanMasuk = Math.floor(Math.random() * (80 - 40) + 40); // 40-80 Aduan
    // Penyelesaian biasanya tinggi (90-100%)
    const aduanSelesai = Math.floor(aduanMasuk * (Math.random() * (1.0 - 0.9) + 0.9)); 
    const rasioSelesai = (aduanSelesai / aduanMasuk) * 100;

    const dateObj = parseISO(dateStr);

    return {
      tanggal: dateStr,
      bulanLabel: format(dateObj, 'MMM yyyy', { locale: id }),
      fullDateLabel: format(dateObj, 'MMMM yyyy', { locale: id }),
      total_sr: currentSR,
      pasang_baru: pasangBaru,
      pemutusan: putus,
      aduan_masuk: aduanMasuk,
      aduan_selesai: aduanSelesai,
      rasio_selesai: Number(rasioSelesai.toFixed(1)),
    };
  });
};

const DUMMY_DATA = generateDummyData();

const WILAYAH_LIST = [
  { id: 'pusat', name: 'Cabang Pusat', manager: 'Budi Santoso' },
  { id: 'utara', name: 'Cabang Utara', manager: 'Siti Aminah' } 
];

export default function PelayananPage() {
  const [loading, setLoading] = useState(false);
  const [selectedWilayahId, setSelectedWilayahId] = useState('pusat');
  const [filterMode, setFilterMode] = useState<'default' | 'year'>('default');
  
  const filteredData = useMemo(() => {
    return DUMMY_DATA; 
  }, []);

  const currentWilayah = WILAYAH_LIST.find(s => s.id === selectedWilayahId) || WILAYAH_LIST[0];

  const tableTotals = useMemo(() => {
    if (filteredData.length === 0) return null;
    const count = filteredData.length;
    const sum = (key: string) => filteredData.reduce((acc: any, cur: any) => acc + (cur[key] || 0), 0);
    const avg = (key: string) => sum(key) / count;

    return {
      totalPasangBaru: sum('pasang_baru'),
      totalPutus: sum('pemutusan'),
      totalAduanMasuk: sum('aduan_masuk'),
      totalAduanSelesai: sum('aduan_selesai'),
      avgRasioSelesai: avg('rasio_selesai'),
      lastSR: filteredData[filteredData.length - 1].total_sr,
      startSR: filteredData[0].total_sr
    };
  }, [filteredData]);

  const stats = useMemo(() => {
    if (!tableTotals) return null;
    return {
      periodLabel: `${filteredData[0].bulanLabel} - ${filteredData[filteredData.length-1].bulanLabel}`,
      totalSR: tableTotals.lastSR.toLocaleString('id-ID'),
      growth: ((tableTotals.lastSR - tableTotals.startSR) / tableTotals.startSR * 100).toFixed(1),
      pbYTD: tableTotals.totalPasangBaru.toLocaleString('id-ID'),
      complaintRate: tableTotals.avgRasioSelesai.toFixed(1)
    };
  }, [tableTotals, filteredData]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (!filteredData.length || !tableTotals) return;

    const wsData: any[] = [
      [`LAPORAN PELAYANAN LANGGANAN - ${currentWilayah.name.toUpperCase()}`],
      [`Periode: ${stats?.periodLabel}`],
      [''],
      ['BULAN', 'TOTAL SR (Aktif)', 'PASANG BARU', 'PEMUTUSAN', 'ADUAN MASUK', 'ADUAN SELESAI', 'RASIO PENYELESAIAN (%)']
    ];

    filteredData.forEach(item => {
      wsData.push([
        item.fullDateLabel,
        item.total_sr,
        item.pasang_baru,
        item.pemutusan,
        item.aduan_masuk,
        item.aduan_selesai,
        item.rasio_selesai
      ]);
    });

    wsData.push(['']);
    wsData.push([
      'TOTAL / DIAKHIR', 
      tableTotals.lastSR, 
      tableTotals.totalPasangBaru, 
      tableTotals.totalPutus, 
      tableTotals.totalAduanMasuk, 
      tableTotals.totalAduanSelesai, 
      Number(tableTotals.avgRasioSelesai.toFixed(2))
    ]);

    wsData.push(['']);
    wsData.push(['dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wscols = (wsData[3] as any[]).map((_, i) => ({ wch: i === 0 ? 20 : 15 }));
    (ws as any)['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Pelayanan");
    XLSX.writeFile(wb, `Laporan_Pelayanan_${currentWilayah.id}.xlsx`);
  };

  // --- PDF EXPORT ---
  const handleExportPDF = () => {
    if (!filteredData.length || !tableTotals) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN PELAYANAN LANGGANAN & ADUAN", 14, 15);
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`CABANG  : ${currentWilayah.name.toUpperCase()}`, 14, 22);
    doc.text(`PERIODE : ${stats?.periodLabel.toUpperCase()}`, 14, 27);

    const tableHead = [
      [
        { content: 'BULAN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'TOTAL SR', styles: { halign: 'right', fillColor: [15, 118, 110] } }, // Teal
        { content: 'PASANG BARU', styles: { halign: 'right', fillColor: [21, 128, 61] } }, // Green
        { content: 'PEMUTUSAN', styles: { halign: 'right', fillColor: [185, 28, 28] } }, // Red
        { content: 'ADUAN MASUK', styles: { halign: 'right', fillColor: [234, 88, 12] } }, // Orange
        { content: 'ADUAN SELESAI', styles: { halign: 'right', fillColor: [21, 128, 61] } },
        { content: 'RASIO (%)', styles: { halign: 'center', fillColor: [64, 64, 64] } },
      ]
    ];

    const tableBody = filteredData.map(item => [
      item.fullDateLabel.toUpperCase(),
      item.total_sr.toLocaleString('id-ID'),
      item.pasang_baru.toLocaleString('id-ID'),
      item.pemutusan.toLocaleString('id-ID'),
      item.aduan_masuk.toLocaleString('id-ID'),
      item.aduan_selesai.toLocaleString('id-ID'),
      `${item.rasio_selesai.toFixed(1)} %`,
    ]);

    const tableFoot = [
      [
        { content: 'TOTAL / AVG', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: tableTotals.lastSR.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: tableTotals.totalPasangBaru.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } },
        { content: tableTotals.totalPutus.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
        { content: tableTotals.totalAduanMasuk.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: tableTotals.totalAduanSelesai.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `${tableTotals.avgRasioSelesai.toFixed(1)} %`, styles: { halign: 'center', fontStyle: 'bold' } },
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

    doc.save(`Laporan_Pelayanan_${currentWilayah.id}.pdf`);
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Users className="w-6 h-6" /> URUSAN PELAYANAN</h1>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                <span className="bg-neutral-900 text-white px-2 py-0.5 rounded">CUSTOMER CARE</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  ONLINE
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
        {/* WILAYAH SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-neutral-200 pb-4">
          <div className="relative group">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Pilih Wilayah Pelayanan</label>
            <div className="flex items-center gap-2 cursor-pointer">
              <Users className="w-8 h-8 text-neutral-800" />
              <select value={selectedWilayahId} onChange={(e) => setSelectedWilayahId(e.target.value)} className="appearance-none bg-transparent text-3xl font-bold font-mono text-neutral-900 cursor-pointer pr-8 focus:outline-none">
                {WILAYAH_LIST.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
              </select>
              <ChevronDown className="w-6 h-6 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-neutral-100 text-neutral-600 text-xs font-bold px-2 py-0.5 rounded border border-neutral-200">MANAGER: {currentWilayah.manager}</span>
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
            {/* 1. TOTAL SR */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Total Pelanggan (SR)</p>
                    <p className="text-2xl font-mono font-bold text-teal-700 truncate">{stats?.totalSR} <span className="text-sm text-neutral-400 font-sans">SR</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-green-600 font-mono font-bold">
                    <TrendingUp className="w-3 h-3"/> +{stats?.growth}% Growth
                </div>
            </div>

            {/* 2. PASANG BARU */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Pasang Baru (YTD)</p>
                    <p className="text-2xl font-mono font-bold text-green-600 truncate">{stats?.pbYTD} <span className="text-sm text-neutral-400 font-sans">SR</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                    <UserPlus className="w-3 h-3"/> Akumulasi Tahun Ini
                </div>
            </div>

            {/* 3. ADUAN MASUK */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Aduan Masuk</p>
                    <p className="text-2xl font-mono font-bold text-amber-600 truncate">{tableTotals?.totalAduanMasuk}</p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <MessageSquareWarning className="w-3 h-3"/> Total Keluhan
                </div>
            </div>

            {/* 4. SERVICE LEVEL */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Service Level</p>
                    <p className="text-2xl font-mono font-bold text-blue-700 truncate">{stats?.complaintRate} <span className="text-sm text-neutral-400 font-sans">%</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <CheckCircle className="w-3 h-3"/> Rasio Penyelesaian
                </div>
            </div>
        </div>

        {/* CHART 1: PERTUMBUHAN PELANGGAN */}
        <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /> DINAMIKA SAMBUNGAN RUMAH (SR)</h3>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                        <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} domain={['auto', 'auto']} />
                        <YAxis yAxisId="right" orientation="right" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#16a34a'}} />
                        
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/>

                        <Area yAxisId="left" type="monotone" dataKey="total_sr" name="Total Pelanggan Aktif" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
                        <Bar yAxisId="right" dataKey="pasang_baru" name="Pasang Baru" fill="#16a34a" barSize={30} radius={[4,4,0,0]} />
                        <Bar yAxisId="right" dataKey="pemutusan" name="Pemutusan" fill="#dc2626" barSize={30} radius={[4,4,0,0]} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* CHART 2: ADUAN */}
        <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><PhoneIncoming className="w-5 h-5" /> TREN PENANGANAN ADUAN</h3>
            </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                        <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} />
                        <YAxis yAxisId="right" orientation="right" stroke="transparent" domain={[0, 100]} tick={{fontSize: 10, fontFamily: 'monospace', fill: '#2563eb'}} />
                        
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/>

                        <Bar yAxisId="left" dataKey="aduan_masuk" name="Aduan Masuk" fill="#f59e0b" barSize={20} radius={[4,4,0,0]} />
                        <Bar yAxisId="left" dataKey="aduan_selesai" name="Aduan Selesai" fill="#10b981" barSize={20} radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="rasio_selesai" name="Rasio Selesai (%)" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-sm overflow-hidden mb-12">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase">Log Data Pelayanan Bulanan</h3>
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
                    <th className="px-4 py-3 text-right bg-teal-900/50">TOTAL SR</th>
                    <th className="px-4 py-3 text-right text-green-200">PASANG BARU</th>
                    <th className="px-4 py-3 text-right text-red-200">PEMUTUSAN</th>
                    <th className="px-4 py-3 text-right text-amber-200">ADUAN MASUK</th>
                    <th className="px-4 py-3 text-right text-green-200">ADUAN SELESAI</th>
                    <th className="px-4 py-3 text-center">RASIO (%)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                {[...filteredData].reverse().map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-bold">{row.fullDateLabel}</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-700 bg-teal-50/20">{row.total_sr.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{row.pasang_baru}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">{row.pemutusan}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">{row.aduan_masuk}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{row.aduan_selesai}</td>
                    <td className={`px-4 py-3 text-center font-bold ${row.rasio_selesai < 90 ? 'text-red-600' : 'text-blue-600'}`}>{row.rasio_selesai}%</td>
                    </tr>
                ))}
                </tbody>
                {tableTotals && (
                    <tfoot className="bg-neutral-100 border-t-2 border-neutral-300 font-bold">
                        <tr>
                            <td className="px-4 py-3">TOTAL / DIAKHIR</td>
                            <td className="px-4 py-3 text-right text-teal-900">{tableTotals.lastSR.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalPasangBaru.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalPutus.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalAduanMasuk.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalAduanSelesai.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-center text-blue-700">{tableTotals.avgRasioSelesai.toFixed(1)}%</td>
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