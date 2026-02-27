'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { Plus, Edit2, Trash2, Loader2, Search, X, Save, AlertCircle, AlertTriangle, CheckCircle2, Info, Link as LinkIcon, UploadCloud, File, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  'Updated': 'text-green-700 bg-green-50 border-green-200',
  'Final': 'text-blue-700 bg-blue-50 border-blue-200',
  'Active': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'Review': 'text-amber-700 bg-amber-50 border-amber-200',
  'Draft': 'text-neutral-600 bg-neutral-100 border-neutral-300',
  'Needs Update': 'text-red-700 bg-red-50 border-red-200',
  'Expiring Soon': 'text-orange-700 bg-orange-50 border-orange-200',
};

export default function PerencanaanManajemenPage() {
  const [loading, setLoading] = useState(true);
  const [dataDokumen, setDataDokumen] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'tambah' | 'edit' | 'detail'>('tambah');
  
  const formKosong = {
    id: '', 
    kode_dokumen: '',
    kategori: 'Peta Jaringan',
    uraian: '',
    keterangan: '',
    format_file: 'PDF',
    status: 'Draft',
    tanggal_update: format(new Date(), 'yyyy-MM-dd'),
    file_url: ''
  };
  const [formData, setFormData] = useState(formKosong);

  // --- STATE KHUSUS UPLOAD FILE ---
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState('');

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'info', title: '', message: '', targetId: '' 
  });

  const generateKodeDokumen = (kategori: string) => {
    const prefixes: Record<string, string> = {
      'Peta Jaringan': 'PETA',
      'Data Inventaris Jaringan': 'INV',
      'DED': 'DED',
      'Dokumen Perizinan': 'IZIN',
      'SOP': 'SOP'
    };
    const prefix = prefixes[kategori] || 'DOC';
    const yearMonth = format(new Date(), 'yyyyMM');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${yearMonth}-${randomHex}`;
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('dokumen_perencanaan').select('*').order('tanggal_update', { ascending: false });
    if (error) console.error("Error fetching:", error);
    else setDataDokumen(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const filteredData = dataDokumen.filter((row) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (row.kode_dokumen?.toLowerCase() || '').includes(searchLower) ||
      (row.uraian?.toLowerCase() || '').includes(searchLower) ||
      (row.kategori?.toLowerCase() || '').includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handleOpenModal = (mode: 'tambah' | 'edit' | 'detail', data: any = null) => {
    setModalMode(mode);
    setUploadMethod(data?.file_url?.includes('supabase.co') ? 'upload' : 'url'); // Cerdas deteksi sumber link
    setSelectedFile(null);
    setUploadStatusText('');

    if ((mode === 'edit' || mode === 'detail') && data) {
      setFormData({
        id: data.id,
        kode_dokumen: data.kode_dokumen || '',
        kategori: data.kategori || 'Peta Jaringan',
        uraian: data.uraian || '',
        keterangan: data.keterangan || '',
        format_file: data.format_file || 'PDF',
        status: data.status || 'Draft',
        tanggal_update: data.tanggal_update || format(new Date(), 'yyyy-MM-dd'),
        file_url: data.file_url || ''
      });
    } else {
      setFormData({
        ...formKosong,
        kode_dokumen: generateKodeDokumen(formKosong.kategori)
      });
      setUploadMethod('upload'); // Default mode tambah adalah upload lokal
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(formKosong);
    setSelectedFile(null);
  };

  const closeAlert = () => setAlertConfig({ ...alertConfig, isOpen: false });
  const showNotification = (type: string, title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message, targetId: '' });
  };

  // --- HANDLER PILIH FILE (Validasi Lapis 1) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validasi Ukuran (Max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      showNotification('error', 'Ukuran File Ditolak', 'Ukuran file melebihi batas 25MB. Silakan gunakan opsi Link Eksternal.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    // 2. Validasi Ekstensi
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip'];
    if (!allowedExt.includes(ext)) {
      showNotification('error', 'Format Tidak Didukung', 'Hanya menerima file PDF, Word, Excel, dan ZIP.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    // Auto-update text format_file berdasarkan ekstensi
    setFormData(prev => ({ ...prev, format_file: ext.toUpperCase() }));
  };

  // --- FUNGSI SUBMIT (DENGAN LOGIC UPLOAD) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalFileUrl = formData.file_url;

    // JIKA USER MILIH UPLOAD DAN ADA FILE BARU YANG DIPILIH
    if (uploadMethod === 'upload' && selectedFile) {
      setUploadStatusText('Mengunggah file ke server...');
      
      // Auto-Rename: Gunakan Kode Dokumen + Ekstensi Asli
      const fileExt = selectedFile.name.split('.').pop();
      const newFileName = `${formData.kode_dokumen}.${fileExt}`;

      // Tembak ke Supabase Storage (Bucket: arsip-teknik)
      const { error: uploadError } = await supabase.storage
        .from('arsip-teknik')
        .upload(newFileName, selectedFile, { 
          upsert: true, // Timpa file lama kalau namanya sama
          cacheControl: '3600'
        });

      if (uploadError) {
        setIsSubmitting(false);
        setUploadStatusText('');
        showNotification('error', 'Gagal Mengunggah File', uploadError.message);
        return; // Batal simpan ke database kalau upload gagal
      }

      // Ambil URL Public nya
      const { data: publicUrlData } = supabase.storage
        .from('arsip-teknik')
        .getPublicUrl(newFileName);
        
      finalFileUrl = publicUrlData.publicUrl;
      setUploadStatusText('Menyimpan data arsip...');
    } else if (uploadMethod === 'upload' && !selectedFile && modalMode === 'tambah') {
       // Opsional: Paksa user pilih file kalau mode tambah dan pilih 'upload'
       setIsSubmitting(false);
       showNotification('error', 'File Belum Dipilih', 'Silakan pilih file untuk diunggah atau gunakan opsi Link Eksternal.');
       return;
    }

    // OTOMATISASI FORMAT DATA
    let finalFormat = 'DOC';
    if (uploadMethod === 'upload' && selectedFile) {
      finalFormat = selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
    } else if (uploadMethod === 'url') {
      // Deteksi kalau linknya Google Drive, dll
      finalFormat = formData.file_url.includes('drive.google') ? 'G-DRIVE' : 'LINK';
    } else if (modalMode === 'edit') {
      finalFormat = formData.format_file; // Pertahankan yang lama kalau gak ada perubahan file
    }

    const payload = {
      kode_dokumen: formData.kode_dokumen,
      kategori: formData.kategori,
      uraian: formData.uraian,
      keterangan: formData.keterangan,
      format_file: finalFormat, // <-- Sekarang otomatis!
      status: formData.status,
      tanggal_update: formData.tanggal_update,
      file_url: finalFileUrl 
    };

    if (modalMode === 'tambah') {
      const { error } = await supabase.from('dokumen_perencanaan').insert([payload]);
      if (error) showNotification('error', 'Gagal Menyimpan Data', error.message);
      else {
        fetchData(); closeModal();
        showNotification('success', 'Arsip Tersimpan', 'Dokumen berhasil diunggah dan ditambahkan ke database.');
      }
    } else if (modalMode === 'edit') {
      const { error } = await supabase.from('dokumen_perencanaan').update(payload).eq('id', formData.id);
      if (error) showNotification('error', 'Gagal Memperbarui Data', error.message);
      else {
        fetchData(); closeModal();
        showNotification('success', 'Arsip Diperbarui', 'Pembaruan detail dokumen telah berhasil disimpan.');
      }
    }
    
    setIsSubmitting(false);
    setUploadStatusText('');
  };

  const requestDelete = (id: string) => {
    setAlertConfig({
      isOpen: true, type: 'confirm', title: 'Konfirmasi Penghapusan',
      message: 'Menghapus data ini hanya menghapus log di database. File fisik di storage mungkin perlu dihapus manual.', targetId: id
    });
  };

  const executeDelete = async () => {
    const { error } = await supabase.from('dokumen_perencanaan').delete().eq('id', alertConfig.targetId);
    closeAlert();
    if (error) setTimeout(() => showNotification('error', 'Gagal Menghapus Data', error.message), 300);
    else {
      fetchData();
      setTimeout(() => showNotification('success', 'Arsip Dihapus', 'Dokumen berhasil dihapus dari sistem pusat.'), 300);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900 mb-1">Manajemen Data</h1>
        </div>
        <button onClick={() => handleOpenModal('tambah')} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-blue-600 text-white text-sm font-bold rounded-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> TAMBAH ARSIP BARU
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" placeholder="Cari kode, uraian..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs font-mono border border-neutral-300 rounded-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all" />
          </div>
          <div className="text-xs font-mono text-neutral-500 font-bold">Total Arsip: {filteredData.length} Dokumen</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="px-4 py-3 font-medium w-32">KODE DOKUMEN</th>
                <th className="px-4 py-3 font-medium">KATEGORI & URAIAN</th>
                <th className="px-4 py-3 font-medium text-center">STATUS</th>
                <th className="px-4 py-3 font-medium text-center">TGL UPDATE</th>
                <th className="px-4 py-3 font-medium text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Memuat arsip...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-400">Arsip tidak ditemukan.</td></tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} onClick={() => handleOpenModal('detail', row)} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 font-bold text-neutral-900 group-hover:text-blue-700 transition-colors">{row.kode_dokumen}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-neutral-900 mb-0.5 truncate max-w-sm">{row.uraian}</div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <span className="bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">{row.kategori}</span>
                        • {row.format_file}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded border text-[10px] font-bold ${STATUS_COLORS[row.status] || 'bg-neutral-100 text-neutral-600'}`}>{row.status}</span></td>
                    <td className="px-4 py-3 text-center text-neutral-600">{row.tanggal_update ? format(parseISO(row.tanggal_update), 'dd MMM yyyy', { locale: id }) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', row); }} className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-100 border border-transparent hover:border-blue-200 rounded transition-all" title="Edit Arsip"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); requestDelete(row.id); }} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-100 border border-transparent hover:border-red-200 rounded transition-all" title="Hapus Arsip"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-between items-center">
            <span className="text-xs font-mono text-neutral-500">Halaman <span className="font-bold text-neutral-900">{currentPage}</span> / <span className="font-bold text-neutral-900">{totalPages}</span></span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-mono font-bold text-neutral-600 border border-neutral-300 rounded-sm disabled:opacity-50 hover:bg-neutral-200 bg-white">SEBELUMNYA</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-mono font-bold text-neutral-600 border border-neutral-300 rounded-sm disabled:opacity-50 hover:bg-neutral-200 bg-white">SELANJUTNYA</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM & DETAIL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                {modalMode === 'tambah' && <Plus className="w-5 h-5 text-blue-600" />}
                {modalMode === 'edit' && <Edit2 className="w-5 h-5 text-amber-600" />}
                {modalMode === 'detail' && <Info className="w-5 h-5 text-teal-600" />}
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-900">
                  {modalMode === 'tambah' ? 'Input Arsip Baru' : modalMode === 'edit' ? 'Edit Data Arsip' : 'Detail Arsip'}
                </h2>
              </div>
              <button onClick={closeModal} className="p-1 hover:bg-neutral-200 rounded transition-colors text-neutral-500 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>

            {modalMode === 'detail' ? (
              <div className="p-6 flex flex-col gap-6 bg-white">
                <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Kategori Arsip</p>
                    <p className="text-sm font-bold text-neutral-900">{formData.kategori}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Status Dokumen</p>
                    <span className={`px-2 py-1 rounded border text-[10px] font-bold ${STATUS_COLORS[formData.status] || 'bg-neutral-100'}`}>{formData.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-blue-600 font-mono mb-1">Kode Dokumen</p>
                    <p className="text-xl font-mono font-bold text-blue-700">{formData.kode_dokumen || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Uraian / Judul Dokumen</p>
                    <p className="text-base font-bold text-neutral-900 leading-snug">{formData.uraian || '-'}</p>
                  </div>
                  <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-sm">
                    <p className="text-[10px] font-bold uppercase text-neutral-500 font-mono mb-2">Keterangan Detail</p>
                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{formData.keterangan || 'Tidak ada keterangan tambahan.'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-neutral-100 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Format File</p>
                    <p className="text-sm font-mono font-bold text-neutral-800">{formData.format_file}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Terakhir Diupdate</p>
                    <p className="text-sm font-mono font-bold text-neutral-800">{formData.tanggal_update ? format(parseISO(formData.tanggal_update), 'dd MMMM yyyy', { locale: id }) : '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold uppercase text-neutral-400 font-mono mb-1">Akses File</p>
                    {formData.file_url ? (
                      <a href={formData.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">
                        <LinkIcon className="w-3.5 h-3.5" /> Buka Tautan File
                      </a>
                    ) : (
                      <p className="text-xs italic text-neutral-400">Belum tersedia</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-neutral-100">
                  <button onClick={closeModal} className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold font-mono rounded-sm transition-colors shadow-sm">TUTUP DETAIL</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-blue-600 font-mono">Kode Dokumen (Auto)</label>
                    <input type="text" readOnly value={formData.kode_dokumen} className="w-full p-2.5 text-sm font-mono font-bold text-blue-700 border border-blue-200 bg-blue-50/50 rounded-sm outline-none cursor-not-allowed" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Kategori Arsip</label>
                    <select required value={formData.kategori} onChange={(e) => {
                        const newKategori = e.target.value;
                        setFormData({ ...formData, kategori: newKategori, kode_dokumen: modalMode === 'tambah' ? generateKodeDokumen(newKategori) : formData.kode_dokumen });
                      }} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all bg-white">
                      <option value="Peta Jaringan">Peta Jaringan</option>
                      <option value="Data Inventaris Jaringan">Data Inventaris Jaringan</option>
                      <option value="DED">DED (Detailed Engineering Design)</option>
                      <option value="Dokumen Perizinan">Dokumen Perizinan</option>
                      <option value="SOP">SOP (Standar Operasional Prosedur)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Uraian / Judul Dokumen</label>
                  <input type="text" required placeholder="Contoh: As-Built Drawing Jaringan Pipa..." value={formData.uraian} onChange={(e) => setFormData({...formData, uraian: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Status</label>
                    <select required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all bg-white">
                      <option value="Draft">Draft</option>
                      <option value="Review">Review</option>
                      <option value="Active">Active</option>
                      <option value="Final">Final</option>
                      <option value="Updated">Updated</option>
                      <option value="Needs Update">Needs Update</option>
                      <option value="Expiring Soon">Expiring Soon</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Tanggal Update</label>
                    <input type="date" required value={formData.tanggal_update} onChange={(e) => setFormData({...formData, tanggal_update: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all bg-white" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">Keterangan Detail (Opsional)</label>
                  <textarea rows={2} placeholder="Tambahkan catatan khusus..." value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all resize-none"></textarea>
                </div>

                {/* --- SEKSI DUAL INPUT (UPLOAD LOKAL VS LINK EKSTERNAL) --- */}
                <div className="border border-neutral-200 rounded-sm p-4 bg-neutral-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-bold uppercase text-neutral-900 font-mono">Sumber File Dokumen</label>
                    
                    {/* TOGGLE METHOD */}
                    <div className="flex bg-neutral-200 p-1 rounded-sm">
                      <button type="button" onClick={() => setUploadMethod('upload')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold font-mono rounded-sm transition-all ${uploadMethod === 'upload' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                        <UploadCloud className="w-3 h-3" /> UPLOAD FILE
                      </button>
                      <button type="button" onClick={() => setUploadMethod('url')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold font-mono rounded-sm transition-all ${uploadMethod === 'url' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
                        <ExternalLink className="w-3 h-3" /> LINK EKSTERNAL
                      </button>
                    </div>
                  </div>

                  {/* KONDISIONAL RENDER BERDASARKAN METODE */}
                  {uploadMethod === 'upload' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-sm cursor-pointer bg-white hover:bg-blue-50 hover:border-blue-400 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-3 text-neutral-400" />
                            <p className="mb-1 text-sm text-neutral-500 font-mono"><span className="font-bold">Klik untuk memilih file</span></p>
                            <p className="text-xs text-neutral-400">PDF, DOC, XLS, ZIP (MAX. 25MB)</p>
                          </div>
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileChange} />
                        </label>
                      </div>
                      
                      {/* PREVIEW FILE TERPILIH */}
                      {(selectedFile || (formData.file_url && formData.file_url.includes('supabase.co'))) && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <File className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-mono font-bold text-blue-900 truncate">
                              {selectedFile ? selectedFile.name : `File tersimpan di server (${formData.format_file})`}
                            </span>
                          </div>
                          {selectedFile && <span className="text-[10px] font-mono text-blue-600 font-bold shrink-0">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">URL / Link Google Drive (Untuk file &gt;25MB)</label>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input type="url" placeholder="https://drive.google.com/..." value={formData.file_url} onChange={(e) => setFormData({...formData, file_url: e.target.value})} className="w-full pl-9 pr-4 py-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-blue-600 outline-none transition-all bg-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-neutral-100 mt-2">
                  <div className="text-xs font-mono font-bold text-blue-600 animate-pulse">
                     {isSubmitting && uploadStatusText}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={closeModal} className="px-5 py-2.5 text-xs font-bold font-mono text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-sm transition-colors">BATAL</button>
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 hover:bg-blue-600 text-white text-xs font-bold font-mono rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {modalMode === 'tambah' ? 'SIMPAN ARSIP' : 'UPDATE ARSIP'}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full shrink-0 ${alertConfig.type === 'confirm' ? 'bg-red-100 text-red-600' : alertConfig.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {alertConfig.type === 'confirm' && <AlertTriangle className="w-6 h-6" />}
                  {alertConfig.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                  {alertConfig.type === 'error' && <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-1">{alertConfig.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{alertConfig.message}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
              {alertConfig.type === 'confirm' ? (
                <>
                  <button onClick={closeAlert} className="px-4 py-2 text-xs font-bold font-mono text-neutral-600 hover:bg-neutral-200 rounded-sm transition-colors">BATAL</button>
                  <button onClick={executeDelete} className="px-4 py-2 text-xs font-bold font-mono bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors shadow-sm">YA, HAPUS ARSIP</button>
                </>
              ) : (
                <button onClick={closeAlert} className="px-6 py-2 text-xs font-bold font-mono bg-neutral-900 hover:bg-neutral-800 text-white rounded-sm transition-colors shadow-sm">TUTUP</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}