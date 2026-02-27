'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Edit2, Trash2, Loader2, Search, X, Save, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export default function DataManajemenPage() {
  const [loading, setLoading] = useState(true);
  const [dataLaporan, setDataLaporan] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE UNTUK PENCARIAN & PAGINASI ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // --- STATE UNTUK MODAL FORM ---
  // Tambahkan mode 'detail'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'tambah' | 'edit' | 'detail'>('tambah');
  
  const formKosong = {
    id: '',
    tanggal: '',
    spam_id: 'cimahi_utara',
    debit_air_baku: '',
    volume_produksi: '',
    jam_operasi: '',
    pemakaian_pac: '',
    pemakaian_kaporit: ''
  };
  const [formData, setFormData] = useState(formKosong);

  // --- STATE UNTUK CUSTOM ALERT/KONFIRMASI ---
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    targetId: '' 
  });

  // --- FUNGSI AMBIL DATA ---
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

  // --- LOGIKA FILTER & PAGINASI ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredData = dataLaporan.filter((row) => {
    const formattedDate = format(parseISO(row.tanggal), 'MMMM yyyy', { locale: id }).toLowerCase();
    const spamName = row.spam_id === 'cimahi_utara' ? 'spam cimahi utara' : 'spam pasirkaliki';
    const searchLower = searchTerm.toLowerCase();
    
    return formattedDate.includes(searchLower) || spamName.includes(searchLower);
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  // --- FUNGSI KONTROL MODAL FORM ---
  const handleOpenModal = (mode: 'tambah' | 'edit' | 'detail', data: any = null) => {
    setModalMode(mode);
    if ((mode === 'edit' || mode === 'detail') && data) {
      setFormData({
        id: data.id,
        tanggal: data.tanggal,
        spam_id: data.spam_id,
        debit_air_baku: data.debit_air_baku,
        volume_produksi: data.volume_produksi,
        jam_operasi: data.jam_operasi || '',
        pemakaian_pac: data.pemakaian_pac || '',
        pemakaian_kaporit: data.pemakaian_kaporit || ''
      });
    } else {
      setFormData(formKosong);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(formKosong);
  };

  // --- FUNGSI KONTROL ALERT ---
  const closeAlert = () => setAlertConfig({ ...alertConfig, isOpen: false });

  const showNotification = (type: string, title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message, targetId: '' });
  };

  // --- FUNGSI SIMPAN DATA (CREATE & UPDATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      tanggal: formData.tanggal,
      spam_id: formData.spam_id,
      debit_air_baku: Number(formData.debit_air_baku),
      volume_produksi: Number(formData.volume_produksi),
      jam_operasi: Number(formData.jam_operasi),
      pemakaian_pac: Number(formData.pemakaian_pac),
      pemakaian_kaporit: Number(formData.pemakaian_kaporit)
    };

    if (modalMode === 'tambah') {
      const { error } = await supabase.from('laporan_produksi').insert([payload]);
      if (error) {
        showNotification('error', 'Gagal Menyimpan Data', error.message);
      } else {
        fetchData(); 
        closeModal();
        showNotification('success', 'Data Tersimpan', 'Data laporan produksi baru berhasil ditambahkan.');
      }
    } else if (modalMode === 'edit') {
      const { error } = await supabase.from('laporan_produksi').update(payload).eq('id', formData.id);
      if (error) {
        showNotification('error', 'Gagal Memperbarui Data', error.message);
      } else {
        fetchData(); 
        closeModal();
        showNotification('success', 'Data Diperbarui', 'Pembaruan log operasional telah berhasil disimpan.');
      }
    }
    
    setIsSubmitting(false);
  };

  // --- FUNGSI HAPUS DATA ---
  const requestDelete = (id: string) => {
    setAlertConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Konfirmasi Penghapusan',
      message: 'Apakah Anda yakin ingin menghapus log operasional ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.',
      targetId: id
    });
  };

  const executeDelete = async () => {
    const { error } = await supabase.from('laporan_produksi').delete().eq('id', alertConfig.targetId);
    closeAlert();
    
    if (error) {
      setTimeout(() => showNotification('error', 'Gagal Menghapus Data', error.message), 300);
    } else {
      fetchData();
      setTimeout(() => showNotification('success', 'Data Dihapus', 'Log operasional berhasil dihapus dari sistem.'), 300);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900 mb-1">Manajemen Data</h1>
        </div>
        <button 
          onClick={() => handleOpenModal('tambah')}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-blue-600 text-white text-sm font-bold rounded-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> INPUT DATA BARU
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col">
        {/* Header Tabel dengan Search Bar */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari bulan atau lokasi SPAM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-mono border border-neutral-300 rounded-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            />
          </div>
          <div className="text-xs font-mono text-neutral-500 font-bold">
            Total Record: {filteredData.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">TANGGAL/BULAN</th>
                <th className="px-4 py-3 font-medium">LOKASI IPA</th>
                <th className="px-4 py-3 font-medium text-right">AIR BAKU (LPS)</th>
                <th className="px-4 py-3 font-medium text-right">PRODUKSI (m³)</th>
                <th className="px-4 py-3 font-medium text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-400">Belum ada data laporan yang sesuai.</td></tr>
              ) : (
                paginatedData.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => handleOpenModal('detail', row)} // KLIK BARIS UNTUK DETAIL
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-bold text-neutral-900 group-hover:text-blue-700 transition-colors">
                      {format(parseISO(row.tanggal), 'MMMM yyyy', { locale: id }).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {row.spam_id === 'cimahi_utara' ? 'SPAM Cimahi Utara' : 'SPAM Pasirkaliki'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-teal-700">{row.debit_air_baku}</td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900">{Number(row.volume_produksi).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', row); }} // STOP PROPAGATION BIAR BARIS GAK KE KLIK
                          className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-100 border border-transparent hover:border-blue-200 rounded transition-all" 
                          title="Edit Data"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); requestDelete(row.id); }} // STOP PROPAGATION
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-100 border border-transparent hover:border-red-200 rounded transition-all" 
                          title="Hapus Data"
                        >
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

        {/* Footer Paginasi */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">
              Menampilkan halaman <span className="font-bold text-neutral-900">{currentPage}</span> dari <span className="font-bold text-neutral-900">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-mono font-bold text-neutral-600 border border-neutral-300 rounded-sm disabled:opacity-50 disabled:bg-neutral-100 disabled:text-neutral-400 hover:bg-neutral-200 transition-colors bg-white shadow-sm"
              >
                SEBELUMNYA
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-mono font-bold text-neutral-600 border border-neutral-300 rounded-sm disabled:opacity-50 disabled:bg-neutral-100 disabled:text-neutral-400 hover:bg-neutral-200 transition-colors bg-white shadow-sm"
              >
                SELANJUTNYA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* POPUP MODAL (FORM INPUT, EDIT & DETAIL) */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                {modalMode === 'tambah' && <Plus className="w-5 h-5 text-blue-600" />}
                {modalMode === 'edit' && <Edit2 className="w-5 h-5 text-amber-600" />}
                {modalMode === 'detail' && <Info className="w-5 h-5 text-teal-600" />}
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-900">
                  {modalMode === 'tambah' ? 'Input Data Produksi Baru' : 
                   modalMode === 'edit' ? 'Edit Data Produksi' : 'Detail Laporan Produksi'}
                </h2>
              </div>
              <button onClick={closeModal} className="p-1 hover:bg-neutral-200 rounded transition-colors text-neutral-500 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* JIKA MODE DETAIL (READ ONLY) */}
            {modalMode === 'detail' ? (
              <div className="p-6 flex flex-col gap-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 border-b border-neutral-100 pb-6">
                  
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Bulan Laporan</p>
                    <p className="text-base font-bold text-neutral-900">
                      {formData.tanggal ? format(parseISO(formData.tanggal), 'MMMM yyyy', { locale: id }).toUpperCase() : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Lokasi SPAM</p>
                    <p className="text-base font-bold text-neutral-900">
                      {formData.spam_id === 'cimahi_utara' ? 'SPAM Cimahi Utara' : 'SPAM Pasirkaliki'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-teal-600 font-mono mb-1">Debit Air Baku</p>
                    <p className="text-2xl font-mono font-bold text-teal-700">{formData.debit_air_baku} <span className="text-sm font-sans text-neutral-500 font-normal">LPS</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-blue-600 font-mono mb-1">Volume Produksi Total</p>
                    <p className="text-2xl font-mono font-bold text-blue-700">{Number(formData.volume_produksi).toLocaleString('id-ID')} <span className="text-sm font-sans text-neutral-500 font-normal">m³</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Total Jam Operasi</p>
                    <p className="text-lg font-mono font-bold text-neutral-800">{Number(formData.jam_operasi).toLocaleString('id-ID')} <span className="text-sm font-sans text-neutral-500 font-normal">Jam</span></p>
                  </div>
                  
                </div>

                <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-4 border border-amber-100 rounded-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-amber-600 font-mono mb-1">Pemakaian PAC</p>
                    <p className="text-xl font-mono font-bold text-amber-700">{Number(formData.pemakaian_pac).toLocaleString('id-ID')} <span className="text-sm font-sans text-amber-600/60 font-normal">Kg</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-500 font-mono mb-1">Pemakaian Kaporit</p>
                    <p className="text-xl font-mono font-bold text-neutral-700">{Number(formData.pemakaian_kaporit).toLocaleString('id-ID')} <span className="text-sm font-sans text-neutral-400 font-normal">Kg</span></p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={closeModal} className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold font-mono rounded-sm transition-colors shadow-sm">
                    TUTUP DETAIL
                  </button>
                </div>
              </div>

            // JIKA MODE TAMBAH / EDIT (FORM)
            ) : (
              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
                <div className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-sm text-blue-800 text-xs font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>Pastikan data yang diinput adalah akumulasi/rekapitulasi total untuk bulan yang dipilih.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Tanggal/Bulan Log</label>
                    <input type="date" required value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Lokasi Instalasi (SPAM)</label>
                    <select required value={formData.spam_id} onChange={(e) => setFormData({...formData, spam_id: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all bg-white">
                      <option value="cimahi_utara">SPAM Cimahi Utara</option>
                      <option value="pasirkaliki">SPAM Pasirkaliki</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Debit Air Baku (LPS)</label>
                    <input type="number" step="any" required placeholder="Contoh: 125.5" value={formData.debit_air_baku} onChange={(e) => setFormData({...formData, debit_air_baku: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Total Produksi (m³)</label>
                    <input type="number" step="any" required placeholder="Contoh: 85000" value={formData.volume_produksi} onChange={(e) => setFormData({...formData, volume_produksi: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Total Jam Operasi</label>
                    <input type="number" step="any" required placeholder="Contoh: 720" value={formData.jam_operasi} onChange={(e) => setFormData({...formData, jam_operasi: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 space-y-0">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-amber-600 font-mono">Total PAC (Kg)</label>
                      <input type="number" step="any" required placeholder="0" value={formData.pemakaian_pac} onChange={(e) => setFormData({...formData, pemakaian_pac: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-amber-200 bg-amber-50/30 rounded-sm focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Total Kaporit (Kg)</label>
                      <input type="number" step="any" required placeholder="0" value={formData.pemakaian_kaporit} onChange={(e) => setFormData({...formData, pemakaian_kaporit: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 bg-neutral-50 rounded-sm focus:border-neutral-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100 mt-2">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-xs font-bold font-mono text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-sm transition-colors">
                    BATAL
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-blue-600 text-white text-xs font-bold font-mono rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {modalMode === 'tambah' ? 'SIMPAN DATA' : 'UPDATE DATA'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* CUSTOM ALERT OMITTED FOR BREVITY, BUT KEPT IN CODE */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${
                  alertConfig.type === 'confirm' ? 'bg-red-100 text-red-600' : 
                  alertConfig.type === 'success' ? 'bg-green-100 text-green-600' : 
                  'bg-amber-100 text-amber-600'
                }`}>
                  {alertConfig.type === 'confirm' && <AlertTriangle className="w-6 h-6" />}
                  {alertConfig.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                  {alertConfig.type === 'error' && <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-1">
                    {alertConfig.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {alertConfig.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
              {alertConfig.type === 'confirm' ? (
                <>
                  <button onClick={closeAlert} className="px-4 py-2 text-xs font-bold font-mono text-neutral-600 hover:bg-neutral-200 rounded-sm transition-colors">
                    BATAL
                  </button>
                  <button onClick={executeDelete} className="px-4 py-2 text-xs font-bold font-mono bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors shadow-sm">
                    YA, HAPUS DATA
                  </button>
                </>
              ) : (
                <button onClick={closeAlert} className="px-6 py-2 text-xs font-bold font-mono bg-neutral-900 hover:bg-neutral-800 text-white rounded-sm transition-colors shadow-sm">
                  TUTUP
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}