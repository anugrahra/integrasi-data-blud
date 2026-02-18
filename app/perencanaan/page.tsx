'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  ArrowLeft, Ruler, Map, HardHat, FileText, CheckCircle2, 
  Clock, AlertCircle, ChevronRight, Search 
} from 'lucide-react';

// --- DUMMY DATA: PROYEK ---
const projects = [
  {
    id: "PRJ-2026-001",
    nama: "Pemasangan Pipa Distribusi Utama HDPE 6\"",
    lokasi: "Jl. Kolonel Masturi (Segmen 1)",
    jenis: "Jaringan Baru",
    status: "ON PROGRESS",
    progress: 65,
    rab: 450000000,
    deadline: "15 Mar 2026",
    petugas: "Agus S."
  },
  {
    id: "PRJ-2026-002",
    nama: "Rehabilitasi Jembatan Pipa Cisangkuy",
    lokasi: "Kec. Cimahi Selatan",
    jenis: "Perawatan",
    status: "PLANNING",
    progress: 10,
    rab: 125000000,
    deadline: "20 Apr 2026",
    petugas: "Budi Santoso"
  },
  {
    id: "PRJ-2026-003",
    nama: "Survey Sambungan Rumah (SR) MBR",
    lokasi: "Perum. Cipageran Asri",
    jenis: "Survey",
    status: "COMPLETED",
    progress: 100,
    rab: 0, // Swakelola
    deadline: "10 Feb 2026",
    petugas: "Rere"
  },
  {
    id: "PRJ-2026-004",
    nama: "Interkoneksi Pipa PVC 4\" ke 2\"",
    lokasi: "Ps. Atas Baru",
    jenis: "Optimalisasi",
    status: "DELAYED",
    progress: 40,
    rab: 75000000,
    deadline: "28 Feb 2026",
    petugas: "Deden"
  },
];

// --- DUMMY DATA: S-CURVE (KURVA S) ---
// Membandingkan Rencana Progress (Planned) vs Realisasi (Actual)
const sCurveData = [
  { week: 'M1', plan: 5, actual: 5 },
  { week: 'M2', plan: 15, actual: 12 },
  { week: 'M3', plan: 30, actual: 28 },
  { week: 'M4', plan: 50, actual: 45 }, // Ada delay dikit
  { week: 'M5', plan: 70, actual: 65 },
  { week: 'M6', plan: 85, actual: null }, // Belum kejadian
  { week: 'M7', plan: 95, actual: null },
  { week: 'M8', plan: 100, actual: null },
];

export default function PerencanaanPage() {
  const [filterStatus, setFilterStatus] = useState('ALL');

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans pb-20">
      
      {/* --- HEADER --- */}
      <header className="px-6 py-6 bg-white border-b border-neutral-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase">
                <Ruler className="w-6 h-6" /> Perencanaan Teknik
              </h1>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                <span>PROJECT MANAGEMENT DASHBOARD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">

        {/* --- 1. KEY METRICS (Cards) --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardStat 
            label="Proyek Aktif" 
            value="3" 
            sub="Sedang Berjalan" 
            icon={<HardHat className="w-5 h-5 text-neutral-500" />} 
          />
          <CardStat 
            label="Total RAB (Est)" 
            value="Rp 650 Jt" 
            sub="Tahun Anggaran 2026" 
            icon={<FileText className="w-5 h-5 text-neutral-500" />} 
            highlight
          />
          <CardStat 
            label="Antrian Survey" 
            value="12" 
            sub="Permintaan Baru" 
            icon={<Map className="w-5 h-5 text-neutral-500" />} 
          />
          <CardStat 
            label="Realisasi Fisik" 
            value="65%" 
            sub="Target: 70% (Delay -5%)" 
            icon={<CheckCircle2 className="w-5 h-5 text-neutral-500" />} 
            alert
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- 2. MAIN CHART: S-CURVE (Project Progress) --- */}
          <div className="lg:col-span-2 bg-white p-6 border border-neutral-200 shadow-sm rounded-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5" /> KURVA S (PROGRESS FISIK)
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Gabungan Seluruh Proyek Aktif TA 2026</p>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-neutral-300"></div>Rencana</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600"></div>Realisasi</span>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 12, fontFamily: 'monospace'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontFamily: 'monospace'}} domain={[0, 100]} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0' }}
                    itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="plan" stroke="#d4d4d4" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="Rencana (%)" />
                  <Area type="monotone" dataKey="actual" stroke="#2563eb" strokeWidth={3} fill="url(#colorActual)" name="Realisasi (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- 3. QUICK ACTIONS / NOTIFICATIONS --- */}
          <div className="bg-neutral-900 text-white p-6 shadow-sm rounded-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold mb-4 text-white">STATUS LAPANGAN</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-neutral-800 rounded border-l-4 border-yellow-500">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-yellow-500">Izin Gali Tertahan</p>
                    <p className="text-xs text-neutral-400 mt-1">Proyek Jl. Kolonel Masturi, menunggu surat dari Dinas PU.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-neutral-800 rounded border-l-4 border-green-500">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-500">Survey Selesai</p>
                    <p className="text-xs text-neutral-400 mt-1">Lokasi Cipageran Asri siap dibuatkan RAB.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-6 py-3 bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2">
              <FileText className="w-4 h-4" /> BUAT RAB BARU
            </button>
          </div>

        </div>

        {/* --- 4. PROJECT LIST TABLE --- */}
        <div className="bg-white border border-neutral-200 shadow-sm rounded-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-sm font-bold uppercase flex items-center gap-2">
              <HardHat className="w-4 h-4" /> Daftar Pekerjaan
            </h3>
            
            {/* Simple Search & Filter */}
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-grow">
                <input 
                  type="text" 
                  placeholder="Cari proyek..." 
                  className="pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded w-full focus:outline-none focus:border-black transition-colors"
                />
                <Search className="w-3 h-3 absolute left-2.5 top-2 text-neutral-400" />
              </div>
              <select className="text-xs border border-neutral-300 rounded px-2 py-1.5 bg-white focus:outline-none">
                <option>Semua Status</option>
                <option>On Progress</option>
                <option>Planning</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-100 text-neutral-500 font-mono uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID & Nama Proyek</th>
                  <th className="px-4 py-3 font-semibold">Lokasi</th>
                  <th className="px-4 py-3 font-semibold">Progress Fisik</th>
                  <th className="px-4 py-3 font-semibold text-right">RAB (IDR)</th>
                  <th className="px-4 py-3 font-semibold text-center">Deadline</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-sans">
                {projects.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 group transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-900">{item.nama}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{item.id} • {item.jenis}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{item.lokasi}</td>
                    <td className="px-4 py-3 w-48">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold">{item.progress}%</span>
                      </div>
                      <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.status === 'DELAYED' ? 'bg-red-500' : 
                            item.progress === 100 ? 'bg-green-500' : 'bg-blue-600'
                          }`} 
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-600">
                      {item.rab > 0 ? item.rab.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-500">
                      {item.deadline}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-black transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}

// --- SUB COMPONENTS ---

function CardStat({ label, value, sub, icon, highlight, alert }: any) {
  return (
    <div className={`p-5 border rounded-sm flex flex-col justify-between h-32 relative overflow-hidden transition-all hover:shadow-md
      ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-neutral-200'}
    `}>
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold font-mono ${alert ? 'text-red-600' : 'text-neutral-900'}`}>
          {value}
        </div>
        <div className="text-xs text-neutral-400 mt-1">{sub}</div>
      </div>
      {/* Decorative stripe for alert */}
      {alert && <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    'ON PROGRESS': 'bg-blue-100 text-blue-700 border-blue-200',
    'PLANNING': 'bg-neutral-100 text-neutral-600 border-neutral-200',
    'COMPLETED': 'bg-green-100 text-green-700 border-green-200',
    'DELAYED': 'bg-red-100 text-red-700 border-red-200',
  };
  
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold border rounded ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}