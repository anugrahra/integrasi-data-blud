'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Edit2, Trash2, Loader2, Search, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export default function DataManajemenPage() {
  const [loading, setLoading] = useState(true);
  const [dataLaporan, setDataLaporan] = useState<any[]>([]);

  // Fungsi Ambil Data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('laporan_produksi')
      .select('*')
      .order('tanggal', { ascending: false });

    if (error) console.error("Error fetching:", error);
    else setDataLaporan(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fungsi Hapus (Buat persiapan)
  const handleDelete = async (id: string) => {
    if (window.confirm("Yakin ingin menghapus data ini? Aksi ini tidak dapat dibatalkan.")) {
      const { error } = await supabase.from('laporan_produksi').delete().eq('id', id);
      if (!error) {
        fetchData(); // Refresh tabel setelah hapus
      } else {
        alert("Gagal menghapus data!");
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900 mb-1">Manajemen Data</h1>
          <p className="text-xs font-mono text-neutral-500">Kelola input produksi, edit, dan hapus log operasional SPAM.</p>
        </div>
        
        <div className="flex gap-3">
          {/* TOMBOL INPUT DATA BARU */}
          <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-blue-600 text-white text-sm font-bold rounded-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> INPUT DATA BARU
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Cari bulan atau SPAM..." 
              className="pl-9 pr-4 py-1.5 text-xs font-mono border border-neutral-300 rounded-sm focus:outline-none focus:border-neutral-900 w-64 bg-white"
            />
          </div>
          <div className="text-xs font-mono text-neutral-500 font-bold">
            Total Record: {dataLaporan.length}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">BULAN/TGL</th>
                <th className="px-4 py-3 font-medium">LOKASI IPA</th>
                <th className="px-4 py-3 font-medium text-right">AIR BAKU (LPS)</th>
                <th className="px-4 py-3 font-medium text-right">PRODUKSI (m³)</th>
                <th className="px-4 py-3 font-medium text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : dataLaporan.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">Belum ada data laporan.</td>
                </tr>
              ) : (
                dataLaporan.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-900">
                      {format(parseISO(row.tanggal), 'MMMM yyyy', { locale: id }).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {row.spam_id === 'cimahi_utara' ? 'SPAM Cimahi Utara' : 'SPAM Pasirkaliki'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-teal-700">
                      {row.debit_air_baku}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900">
                      {Number(row.volume_produksi).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* TOMBOL EDIT */}
                        <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded transition-all" title="Edit Data">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* TOMBOL HAPUS */}
                        <button 
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition-all" title="Hapus Data">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}