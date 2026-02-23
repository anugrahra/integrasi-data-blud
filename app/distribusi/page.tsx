'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { 
  ArrowLeft, Map, Filter, Droplets, Calendar, ChevronDown, 
  Activity, FileSpreadsheet, FileText, FolderOpen, Loader2, Users, AlertTriangle, TrendingDown 
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
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
    // Simulasi Data: Distribusi ~200k, Terjual ~140k (NRW ~30%)
    const dist = Math.floor(Math.random() * (220000 - 190000) + 190000); 
    const terjual = Math.floor(dist * (Math.random() * (0.75 - 0.65) + 0.65)); // 65-75% terjual
    const nrwVol = dist - terjual;
    const nrwPersen = (nrwVol / dist) * 100;
    const pelanggan = Math.floor(Math.random() * (15500 - 15000) + 15000); // Pelanggan naik turun dikit

    const dateObj = parseISO(dateStr);

    return {
      tanggal: dateStr,
      bulanLabel: format(dateObj, 'MMM yyyy', { locale: id }),
      fullDateLabel: format(dateObj, 'MMMM yyyy', { locale: id }),
      volume_distribusi: dist,
      volume_terjual: terjual,
      volume_nrw: nrwVol,
      nrw_persen: Number(nrwPersen.toFixed(2)),
      jumlah_pelanggan: pelanggan,
    };
  });
};

const DUMMY_DATA = generateDummyData();

const ZONES_LIST = [
  { id: 'zona_1', name: 'Zona Pelayanan 1 (Pusat)', pel: '15.200 SR' },
  { id: 'zona_2', name: 'Zona Pelayanan 2 (Utara)', pel: '8.400 SR' } 
];

export default function DistributionPage() {
  const [loading, setLoading] = useState(false); // Simulasi loading
  const [selectedZoneId, setSelectedZoneId] = useState('zona_1');
  const [filterMode, setFilterMode] = useState<'default' | 'year'>('default');
  
  // Karena dummy, kita pakai data statis langsung
  const filteredData = useMemo(() => {
    return DUMMY_DATA; 
  }, []);

  const currentZone = ZONES_LIST.find(s => s.id === selectedZoneId) || ZONES_LIST[0];

  const tableTotals = useMemo(() => {
    if (filteredData.length === 0) return null;
    const count = filteredData.length;
    const sum = (key: string) => filteredData.reduce((acc: any, cur: any) => acc + (cur[key] || 0), 0);
    const avg = (key: string) => sum(key) / count;

    return {
      totalDist: sum('volume_distribusi'),
      totalJual: sum('volume_terjual'),
      totalNRW: sum('volume_nrw'),
      avgDist: avg('volume_distribusi'),
      avgJual: avg('volume_terjual'),
      avgNRW: avg('volume_nrw'),
      avgNRWPersen: avg('nrw_persen'), // Rata-rata NRW %
      lastPelanggan: filteredData[filteredData.length - 1].jumlah_pelanggan
    };
  }, [filteredData]);

  const stats = useMemo(() => {
    if (!tableTotals) return null;
    return {
      periodLabel: `${filteredData[0].bulanLabel} - ${filteredData[filteredData.length-1].bulanLabel}`,
      totalDist: tableTotals.totalDist.toLocaleString('id-ID'),
      totalJual: tableTotals.totalJual.toLocaleString('id-ID'),
      avgNRW: tableTotals.avgNRWPersen.toFixed(2),
      pelanggan: tableTotals.lastPelanggan.toLocaleString('id-ID'),
      nrwStatus: tableTotals.avgNRWPersen > 30 ? 'CRITICAL' : (tableTotals.avgNRWPersen > 25 ? 'WARNING' : 'GOOD')
    };
  }, [tableTotals, filteredData]);

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (!filteredData.length || !tableTotals) return;

    const wsData: any[] = [
      [`LAPORAN DISTRIBUSI & NRW - ${currentZone.name.toUpperCase()}`],
      [`Periode: ${stats?.periodLabel}`],
      [''],
      ['BULAN', 'DISTRIBUSI (m3)', 'TERJUAL (m3)', 'KEHILANGAN (m3)', 'NRW (%)', 'PELANGGAN (SR)']
    ];

    filteredData.forEach(item => {
      wsData.push([
        item.fullDateLabel,
        item.volume_distribusi,
        item.volume_terjual,
        item.volume_nrw,
        item.nrw_persen,
        item.jumlah_pelanggan
      ]);
    });

    wsData.push(['']);
    wsData.push([
      'TOTAL / RATA-RATA', 
      tableTotals.totalDist, 
      tableTotals.totalJual, 
      tableTotals.totalNRW, 
      Number(tableTotals.avgNRWPersen.toFixed(2)), 
      tableTotals.lastPelanggan
    ]);

    wsData.push(['']);
    wsData.push(['dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wscols = (wsData[3] as any[]).map((_, i) => ({ wch: i === 0 ? 20 : 15 }));
    (ws as any)['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Distribusi");
    XLSX.writeFile(wb, `Laporan_Distribusi_${currentZone.id}.xlsx`);
  };

  // --- PDF EXPORT ---
  const handleExportPDF = () => {
    if (!filteredData.length || !tableTotals) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN DISTRIBUSI & KEHILANGAN AIR (NRW)", 14, 15);
    
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(`ZONA    : ${currentZone.name.toUpperCase()}`, 14, 22);
    doc.text(`PERIODE : ${stats?.periodLabel.toUpperCase()}`, 14, 27);

    const tableHead = [
      [
        { content: 'BULAN', styles: { halign: 'left', fillColor: [23, 23, 23] } },
        { content: 'DISTRIBUSI (m3)', styles: { halign: 'right', fillColor: [30, 58, 138] } }, // Blue
        { content: 'TERJUAL (m3)', styles: { halign: 'right', fillColor: [21, 128, 61] } }, // Green
        { content: 'KEHILANGAN (m3)', styles: { halign: 'right', fillColor: [185, 28, 28] } }, // Red
        { content: 'NRW (%)', styles: { halign: 'center', fillColor: [185, 28, 28], textColor: [254, 242, 242] } },
        { content: 'PELANGGAN (SR)', styles: { halign: 'right', fillColor: [64, 64, 64] } },
      ]
    ];

    const tableBody = filteredData.map(item => [
      item.fullDateLabel.toUpperCase(),
      item.volume_distribusi.toLocaleString('id-ID'),
      item.volume_terjual.toLocaleString('id-ID'),
      item.volume_nrw.toLocaleString('id-ID'),
      `${item.nrw_persen.toFixed(2)} %`,
      item.jumlah_pelanggan.toLocaleString('id-ID'),
    ]);

    const tableFoot = [
      [
        { content: 'TOTAL / AVG', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: tableTotals.totalDist.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: tableTotals.totalJual.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } },
        { content: tableTotals.totalNRW.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
        { content: `${tableTotals.avgNRWPersen.toFixed(2)} %`, styles: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] } },
        { content: tableTotals.lastPelanggan.toLocaleString('id-ID'), styles: { halign: 'right', fontStyle: 'bold' } },
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
      didParseCell: (data) => {
        // Highlight high NRW
        if (data.section === 'body' && data.column.index === 4) {
          const nrwVal = parseFloat(data.cell.raw as string);
          if (nrwVal > 30) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    } as any);

    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("dicetak langsung dari PUSAT DATA BLUD AM TERINTEGRASI", 14, pageHeight - 10);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 250, pageHeight - 10);

    doc.save(`Laporan_Distribusi_${currentZone.id}.pdf`);
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20 relative">
      
      {/* HEADER */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase"><Map className="w-6 h-6" /> URUSAN DISTRIBUSI</h1>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                <span className="bg-neutral-900 text-white px-2 py-0.5 rounded">ZONA PELAYANAN</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  LIVE MONITORING
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
        {/* ZONE SELECTOR */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-neutral-200 pb-4">
          <div className="relative group">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Pilih Zona Distribusi</label>
            <div className="flex items-center gap-2 cursor-pointer">
              <Map className="w-8 h-8 text-neutral-800" />
              <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)} className="appearance-none bg-transparent text-3xl font-bold font-mono text-neutral-900 cursor-pointer pr-8 focus:outline-none">
                {ZONES_LIST.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
              </select>
              <ChevronDown className="w-6 h-6 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded border border-green-200">PELANGGAN: {currentZone.pel}</span>
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
            {/* 1. DISTRIBUSI */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Vol. Distribusi</p>
                    <p className="text-2xl font-mono font-bold text-blue-700 truncate">{stats?.totalDist} <span className="text-sm text-neutral-400 font-sans">m³</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2">
                    <p className="text-[10px] text-neutral-400 font-mono">Avg: {tableTotals?.avgDist.toLocaleString('id-ID', {maximumFractionDigits:0})}/bln</p>
                </div>
            </div>

            {/* 2. TERJUAL */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Vol. Terjual</p>
                    <p className="text-2xl font-mono font-bold text-green-600 truncate">{stats?.totalJual} <span className="text-sm text-neutral-400 font-sans">m³</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2">
                    <p className="text-[10px] text-neutral-400 font-mono">Avg: {tableTotals?.avgJual.toLocaleString('id-ID', {maximumFractionDigits:0})}/bln</p>
                </div>
            </div>

            {/* 3. NRW (CRITICAL) */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between relative overflow-hidden">
                <div>
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">NRW (Kehilangan)</p>
                        {stats?.nrwStatus === 'CRITICAL' && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                    </div>
                    <p className={`text-3xl font-mono font-bold truncate ${stats?.nrwStatus === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>
                        {stats?.avgNRW} <span className="text-lg font-sans">%</span>
                    </p>
                </div>
                <div className="border-t border-neutral-100 pt-2">
                    <p className="text-[10px] text-neutral-400 font-mono">Status: <span className="font-bold">{stats?.nrwStatus}</span></p>
                </div>
                {/* Background accent */}
                <div className={`absolute right-0 bottom-0 w-16 h-16 opacity-10 rounded-tl-full ${stats?.nrwStatus === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
            </div>

            {/* 4. PELANGGAN */}
            <div className="bg-white p-6 h-[120px] flex flex-col justify-between">
                <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Total Pelanggan</p>
                    <p className="text-2xl font-mono font-bold text-neutral-800 truncate">{stats?.pelanggan} <span className="text-sm text-neutral-400 font-sans">SR</span></p>
                </div>
                <div className="border-t border-neutral-100 pt-2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <Users className="w-3 h-3"/> Active Connections
                </div>
            </div>
        </div>

        {/* CHART: DISTRIBUSI vs TERJUAL */}
        <div className="bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Droplets className="w-5 h-5" /> GRAFIK EFISIENSI DISTRIBUSI</h3>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                        <XAxis dataKey="bulanLabel" axisLine={false} tickLine={false} tick={{fontSize: 11, fontFamily: 'monospace'}} dy={10} />
                        <YAxis yAxisId="left" stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#000'}} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 50]} stroke="transparent" tick={{fontSize: 10, fontFamily: 'monospace', fill: '#dc2626'}} />
                        
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }} itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/>

                        <Bar yAxisId="left" dataKey="volume_distribusi" name="Distribusi (m3)" fill="#2563eb" barSize={30} radius={[4,4,0,0]} />
                        <Bar yAxisId="left" dataKey="volume_terjual" name="Terjual (m3)" fill="#16a34a" barSize={30} radius={[4,4,0,0]} />
                        
                        <Line yAxisId="right" type="monotone" dataKey="nrw_persen" name="NRW (%)" stroke="#dc2626" strokeWidth={3} dot={{r: 4, fill: '#dc2626'}} />
                        {/* Target NRW line */}
                        <ReferenceLine yAxisId="right" y={25} label={{ position: 'right', value: 'Target 25%', fill: 'red', fontSize: 10 }} stroke="red" strokeDasharray="3 3" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-sm overflow-hidden mb-12">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase">Log Data Distribusi Bulanan</h3>
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
                    <th className="px-4 py-3 text-right text-blue-200">DISTRIBUSI (m3)</th>
                    <th className="px-4 py-3 text-right text-green-200">TERJUAL (m3)</th>
                    <th className="px-4 py-3 text-right text-red-200">KEHILANGAN (m3)</th>
                    <th className="px-4 py-3 text-center bg-red-900/50">NRW (%)</th>
                    <th className="px-4 py-3 text-right">PELANGGAN (SR)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                {[...filteredData].reverse().map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-bold">{row.fullDateLabel}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{row.volume_distribusi.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{row.volume_terjual.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-700">{row.volume_nrw.toLocaleString('id-ID')}</td>
                    <td className={`px-4 py-3 text-center font-bold ${row.nrw_persen > 30 ? 'text-red-600 bg-red-50' : 'text-amber-600'}`}>{row.nrw_persen.toFixed(2)} %</td>
                    <td className="px-4 py-3 text-right">{row.jumlah_pelanggan.toLocaleString('id-ID')}</td>
                    </tr>
                ))}
                </tbody>
                {tableTotals && (
                    <tfoot className="bg-neutral-100 border-t-2 border-neutral-300 font-bold">
                        <tr>
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalDist.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalJual.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right">{tableTotals.totalNRW.toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-center">-</td>
                            <td className="px-4 py-3 text-right">{tableTotals.lastPelanggan.toLocaleString('id-ID')}</td>
                        </tr>
                        <tr className="bg-neutral-50 text-neutral-600 italic">
                            <td className="px-4 py-2">RATA-RATA</td>
                            <td className="px-4 py-2 text-right">{tableTotals.avgDist.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                            <td className="px-4 py-2 text-right">{tableTotals.avgJual.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                            <td className="px-4 py-2 text-right">{tableTotals.avgNRW.toLocaleString('id-ID', {maximumFractionDigits:0})}</td>
                            <td className="px-4 py-2 text-center text-red-600 not-italic">{tableTotals.avgNRWPersen.toFixed(2)} %</td>
                            <td className="px-4 py-2 text-right">-</td>
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