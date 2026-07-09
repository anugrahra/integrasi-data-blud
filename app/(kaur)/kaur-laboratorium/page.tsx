"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import {
	Plus,
	Edit2,
	Trash2,
	Loader2,
	Search,
	X,
	Save,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Info,
	TestTube,
	Beaker,
	Droplets,
	Activity,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export default function LabDataManajemenPage() {
	const [loading, setLoading] = useState(true);
	const [dataLab, setDataLab] = useState<any[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// --- STATE UNTUK PENCARIAN & PAGINASI ---
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const rowsPerPage = 7;

	// --- STATE UNTUK MODAL FORM ---
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<"tambah" | "edit" | "detail">(
		"tambah",
	);

	const formKosong = {
		id: "",
		tgl_pengambilan: "",
		tgl_penerimaan: "",
		tgl_uji: "",
		lokasi: "",
		lab: "UPTD Laboratorium Lingkungan Hidup DLH",
		ph: "",
		suhu: "",
		klorin: "",
		kekeruhan: "",
		tds: "",
		bau: "Tidak Berbau",
		warna: "",
		fe: "",
		mn: "",
		flourida: "",
		nitrat: "",
		nitrit: "",
		coliform: "",
		ecoli: "",
		status: "Memenuhi Syarat",
	};
	const [formData, setFormData] = useState(formKosong);

	// --- FUNGSI CEK BAKU MUTU ---
	const isTidakMemenuhi = (param: string, val: any) => {
		if (val === null || val === undefined || val === "") return false;
		const num = Number(val);
		switch (param) {
			case "ph":
				return num < 6.5 || num > 8.5;
			case "kekeruhan":
				return num > 3;
			case "tds":
				return num > 300;
			case "warna":
				return num > 10;
			case "fe":
				return num > 0.2;
			case "mn":
				return num > 0.1;
			case "flourida":
				return num > 1.5;
			case "nitrat":
				return num > 20;
			case "nitrit":
				return num > 3;
			case "coliform":
				return num > 0;
			case "ecoli":
				return num > 0;
			case "klorin":
				return num < 0.2; // Diasumsikan sisa klorin tidak boleh kurang dari 0.2
			default:
				return false;
		}
	};

	// --- STATE UNTUK CUSTOM ALERT/KONFIRMASI ---
	const [alertConfig, setAlertConfig] = useState({
		isOpen: false,
		type: "info",
		title: "",
		message: "",
		targetId: "",
	});

	// --- FUNGSI AMBIL DATA ---
	const fetchData = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("lab_kualitas_air")
			.select("*")
			.order("tgl_uji", { ascending: false });

		if (error) console.error("Error fetching:", error);
		else setDataLab(data || []);
		setLoading(false);
	};

	useEffect(() => {
		fetchData();
	}, []);

	// --- LOGIKA FILTER & PAGINASI ---
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	const filteredData = dataLab.filter((row) => {
		const formattedDate = format(parseISO(row.tgl_uji), "MMMM yyyy", {
			locale: id,
		}).toLowerCase();
		const lokasiLower = (row.lokasi || "").toLowerCase();
		const searchLower = searchTerm.toLowerCase();

		return (
			formattedDate.includes(searchLower) || lokasiLower.includes(searchLower)
		);
	});

	const totalPages = Math.ceil(filteredData.length / rowsPerPage);
	const startIndex = (currentPage - 1) * rowsPerPage;
	const paginatedData = filteredData.slice(
		startIndex,
		startIndex + rowsPerPage,
	);

	// --- FUNGSI KONTROL MODAL FORM ---
	const handleOpenModal = (
		mode: "tambah" | "edit" | "detail",
		data: any = null,
	) => {
		setModalMode(mode);
		if ((mode === "edit" || mode === "detail") && data) {
			const safeData = Object.keys(data).reduce((acc: any, key) => {
				acc[key] = data[key] === null ? "" : data[key];
				return acc;
			}, {});
			setFormData(safeData);
		} else {
			setFormData(formKosong);
		}
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setFormData(formKosong);
	};

	const closeAlert = () => setAlertConfig({ ...alertConfig, isOpen: false });
	const showNotification = (type: string, title: string, message: string) => {
		setAlertConfig({ isOpen: true, type, title, message, targetId: "" });
	};

	// --- FUNGSI SIMPAN DATA (CREATE & UPDATE) ---
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		const parseNum = (val: any) =>
			val === "" || val === null ? null : Number(val);

		const payload = {
			tgl_pengambilan: formData.tgl_pengambilan,
			tgl_penerimaan: formData.tgl_penerimaan,
			tgl_uji: formData.tgl_uji,
			lokasi: formData.lokasi,
			lab: formData.lab,
			ph: parseNum(formData.ph),
			suhu: parseNum(formData.suhu),
			klorin: parseNum(formData.klorin),
			kekeruhan: parseNum(formData.kekeruhan),
			tds: parseNum(formData.tds),
			bau: formData.bau,
			warna: parseNum(formData.warna),
			fe: parseNum(formData.fe),
			mn: parseNum(formData.mn),
			flourida: parseNum(formData.flourida),
			nitrat: parseNum(formData.nitrat),
			nitrit: parseNum(formData.nitrit),
			coliform: parseNum(formData.coliform),
			ecoli: parseNum(formData.ecoli),
			status: formData.status,
		};

		if (modalMode === "tambah") {
			const generatedId = `LAB-${Date.now()}`;
			const { error } = await supabase
				.from("lab_kualitas_air")
				.insert([{ ...payload, id: generatedId }]);
			if (error) {
				showNotification("error", "Gagal Menyimpan Data", error.message);
			} else {
				fetchData();
				closeModal();
				showNotification(
					"success",
					"Data Tersimpan",
					"Hasil uji lab baru berhasil ditambahkan.",
				);
			}
		} else if (modalMode === "edit") {
			const { error } = await supabase
				.from("lab_kualitas_air")
				.update(payload)
				.eq("id", formData.id);
			if (error) {
				showNotification("error", "Gagal Memperbarui Data", error.message);
			} else {
				fetchData();
				closeModal();
				showNotification(
					"success",
					"Data Diperbarui",
					"Pembaruan hasil uji lab telah berhasil disimpan.",
				);
			}
		}

		setIsSubmitting(false);
	};

	// --- FUNGSI HAPUS DATA ---
	const requestDelete = (id: string) => {
		setAlertConfig({
			isOpen: true,
			type: "confirm",
			title: "Konfirmasi Penghapusan",
			message:
				"Apakah Anda yakin ingin menghapus catatan uji lab ini? Tindakan ini tidak dapat dibatalkan.",
			targetId: id,
		});
	};

	const executeDelete = async () => {
		const { error } = await supabase
			.from("lab_kualitas_air")
			.delete()
			.eq("id", alertConfig.targetId);
		closeAlert();
		if (error) {
			setTimeout(
				() => showNotification("error", "Gagal Menghapus Data", error.message),
				300,
			);
		} else {
			fetchData();
			setTimeout(
				() =>
					showNotification(
						"success",
						"Data Dihapus",
						"Data lab berhasil dihapus dari sistem.",
					),
				300,
			);
		}
	};

	return (
		<div className="p-8 max-w-7xl mx-auto relative">
			{/* HEADER SECTION */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
				<div>
					<h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900 mb-1 flex items-center gap-2">
						<TestTube className="w-6 h-6 text-teal-600" />
						Manajemen Data Laboratorium
					</h1>
					<p className="text-xs text-neutral-500 font-mono">
						Pantau hasil uji kualitas air secara komprehensif.
					</p>
				</div>
				<button
					onClick={() => handleOpenModal("tambah")}
					className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-bold rounded-sm transition-colors shadow-sm"
				>
					<Plus className="w-4 h-4" /> INPUT HASIL UJI
				</button>
			</div>

			{/* TABLE SECTION */}
			<div className="bg-white border border-neutral-200 shadow-sm rounded-sm flex flex-col">
				<div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div className="relative w-full md:w-80">
						<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
						<input
							type="text"
							placeholder="Cari lokasi atau bulan uji..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-9 pr-4 py-2 text-xs font-mono border border-neutral-300 rounded-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none transition-all"
						/>
					</div>
					<div className="text-xs font-mono text-neutral-500 font-bold">
						Total Record: {filteredData.length}
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-xs font-mono text-left border-collapse whitespace-nowrap">
						<thead className="bg-neutral-900 text-white">
							<tr>
								<th className="px-4 py-3 font-medium">TANGGAL UJI</th>
								<th className="px-4 py-3 font-medium">LOKASI TITIK UJI</th>
								<th className="px-4 py-3 font-medium text-center">pH</th>
								<th className="px-4 py-3 font-medium text-center">KEKERUHAN</th>
								<th className="px-4 py-3 font-medium text-center">
									SISA KLORIN
								</th>
								<th className="px-4 py-3 font-medium text-center">STATUS</th>
								<th className="px-4 py-3 font-medium text-center">AKSI</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-200">
							{loading ? (
								<tr>
									<td
										colSpan={7}
										className="px-4 py-12 text-center text-neutral-400"
									>
										<Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
										Memuat data...
									</td>
								</tr>
							) : filteredData.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-4 py-12 text-center text-neutral-400"
									>
										Belum ada data uji lab.
									</td>
								</tr>
							) : (
								paginatedData.map((row) => (
									<tr
										key={row.id}
										onClick={() => handleOpenModal("detail", row)}
										className="hover:bg-teal-50/50 transition-colors cursor-pointer group"
									>
										<td className="px-4 py-3 font-bold text-neutral-900">
											{format(parseISO(row.tgl_uji), "dd MMM yyyy", {
												locale: id,
											}).toUpperCase()}
										</td>
										<td
											className="px-4 py-3 text-neutral-700 max-w-[200px] truncate"
											title={row.lokasi}
										>
											{row.lokasi}
										</td>

										<td
											className={`px-4 py-3 text-center font-medium ${isTidakMemenuhi("ph", row.ph) ? "text-red-600 font-bold" : ""}`}
										>
											{row.ph || "-"}
										</td>
										<td
											className={`px-4 py-3 text-center ${isTidakMemenuhi("kekeruhan", row.kekeruhan) ? "text-red-600 font-black" : "text-amber-700"}`}
										>
											{row.kekeruhan ? `${row.kekeruhan} NTU` : "-"}
										</td>
										<td
											className={`px-4 py-3 text-center ${isTidakMemenuhi("klorin", row.klorin) ? "text-red-600 font-black" : "text-blue-700"}`}
										>
											{row.klorin ? `${row.klorin} mg/L` : "-"}
										</td>
										<td className="px-4 py-3 text-center">
											<span
												className={`px-2 py-1 rounded-sm text-[10px] font-bold ${row.status === "Memenuhi Syarat" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
											>
												{row.status}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-2">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleOpenModal("edit", row);
													}}
													className="p-1.5 text-neutral-400 hover:text-teal-600 hover:bg-teal-100 rounded transition-all"
												>
													<Edit2 className="w-4 h-4" />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation();
														requestDelete(row.id);
													}}
													className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-100 rounded transition-all"
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
							Hal.{" "}
							<span className="font-bold text-neutral-900">{currentPage}</span>{" "}
							dari {totalPages}
						</span>
						<div className="flex gap-2">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="px-3 py-1.5 text-xs font-mono font-bold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50 rounded-sm"
							>
								PREV
							</button>
							<button
								onClick={() =>
									setCurrentPage((p) => Math.min(totalPages, p + 1))
								}
								disabled={currentPage === totalPages}
								className="px-3 py-1.5 text-xs font-mono font-bold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50 rounded-sm"
							>
								NEXT
							</button>
						</div>
					</div>
				)}
			</div>

			{/* ========================================= */}
			{/* POPUP MODAL (FORM INPUT, EDIT & DETAIL) */}
			{/* ========================================= */}
			{isModalOpen && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 overflow-y-auto">
					<div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50 sticky top-0 z-10">
							<div className="flex items-center gap-2">
								{modalMode === "tambah" && (
									<Plus className="w-5 h-5 text-teal-600" />
								)}
								{modalMode === "edit" && (
									<Edit2 className="w-5 h-5 text-amber-600" />
								)}
								{modalMode === "detail" && (
									<Info className="w-5 h-5 text-blue-600" />
								)}
								<h2 className="text-sm font-black uppercase tracking-wider text-neutral-900">
									{modalMode === "tambah"
										? "Input Hasil Uji Baru"
										: modalMode === "edit"
											? "Edit Data Uji Lab"
											: "Laporan Hasil Uji Laboratorium"}
								</h2>
							</div>
							<button
								onClick={closeModal}
								className="p-1 hover:bg-neutral-200 rounded transition-colors text-neutral-500"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* AREA SCROLLABLE */}
						<div className="p-6 overflow-y-auto max-h-[75vh]">
							{modalMode === "detail" ? (
								// === LAYOUT DETAIL READ-ONLY ===
								<div className="flex flex-col gap-6">
									{/* Info Header */}
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-neutral-200 rounded-sm bg-neutral-50">
										<div>
											<p className="text-[10px] font-bold text-neutral-500 font-mono mb-1">
												LOKASI
											</p>
											<p className="text-sm font-bold text-neutral-900">
												{formData.lokasi}
											</p>
										</div>
										<div>
											<p className="text-[10px] font-bold text-neutral-500 font-mono mb-1">
												STATUS UJI
											</p>
											<span
												className={`px-2 py-1 rounded-sm text-[10px] font-bold ${formData.status === "Memenuhi Syarat" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
											>
												{formData.status}
											</span>
										</div>
										<div>
											<p className="text-[10px] font-bold text-neutral-500 font-mono mb-1">
												TANGGAL UJI
											</p>
											<p className="text-sm font-mono font-bold text-neutral-900">
												{formData.tgl_uji
													? format(parseISO(formData.tgl_uji), "dd MMM yyyy", {
															locale: id,
														})
													: "-"}
											</p>
										</div>
										<div>
											<p className="text-[10px] font-bold text-neutral-500 font-mono mb-1">
												LABORATORIUM
											</p>
											<p className="text-xs font-bold text-neutral-700">
												{formData.lab}
											</p>
										</div>
									</div>

									{/* Parameter Grid Cards */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										{/* FISIKA */}
										<div className="border border-neutral-200 rounded-sm">
											<div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex items-center gap-2">
												<Activity className="w-4 h-4 text-amber-600" />
												<h3 className="text-xs font-black uppercase text-neutral-800">
													Fisika
												</h3>
											</div>
											<div className="p-4 flex flex-col gap-3">
												<div className="flex justify-between border-b border-neutral-100 pb-1">
													<span className="text-xs text-neutral-500 font-mono">
														Suhu
													</span>
													<span className="text-xs font-bold">
														{formData.suhu || "-"} °C
													</span>
												</div>
												<div className="flex justify-between border-b border-neutral-100 pb-1">
													<span className="text-xs text-neutral-500 font-mono">
														TDS
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("tds", formData.tds) ? "text-red-600" : ""}`}
													>
														{formData.tds || "-"} mg/L
													</span>
												</div>
												<div className="flex justify-between border-b border-neutral-100 pb-1">
													<span className="text-xs text-neutral-500 font-mono">
														Warna
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("warna", formData.warna) ? "text-red-600" : ""}`}
													>
														{formData.warna || "-"} TCU
													</span>
												</div>
												<div className="flex justify-between border-b border-neutral-100 pb-1">
													<span className="text-xs text-neutral-500 font-mono">
														Kekeruhan
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("kekeruhan", formData.kekeruhan) ? "text-red-600" : ""}`}
													>
														{formData.kekeruhan || "-"} NTU
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-xs text-neutral-500 font-mono">
														Bau
													</span>
													<span className="text-xs font-bold">
														{formData.bau}
													</span>
												</div>
											</div>
										</div>

										{/* KIMIA */}
										<div className="border border-neutral-200 rounded-sm">
											<div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex items-center gap-2">
												<Beaker className="w-4 h-4 text-blue-600" />
												<h3 className="text-xs font-black uppercase text-neutral-800">
													Kimia
												</h3>
											</div>
											<div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
												<div className="flex flex-col">
													<span className="text-[10px] text-neutral-500 font-mono">
														pH
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("ph", formData.ph) ? "text-red-600" : ""}`}
													>
														{formData.ph || "-"}
													</span>
												</div>
												<div className="flex flex-col">
													<span className="text-[10px] text-neutral-500 font-mono">
														Sisa Klorin
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("klorin", formData.klorin) ? "text-red-600" : "text-blue-700"}`}
													>
														{formData.klorin || "-"} mg/L
													</span>
												</div>
												<div className="flex flex-col">
													<span className="text-[10px] text-neutral-500 font-mono">
														Besi (Fe)
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("fe", formData.fe) ? "text-red-600" : ""}`}
													>
														{formData.fe || "-"} mg/L
													</span>
												</div>
												<div className="flex flex-col">
													<span className="text-[10px] text-neutral-500 font-mono">
														Mangan (Mn)
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("mn", formData.mn) ? "text-red-600" : ""}`}
													>
														{formData.mn || "-"} mg/L
													</span>
												</div>
												<div className="flex flex-col">
													<span className="text-[10px] text-neutral-500 font-mono">
														Nitrat
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("nitrat", formData.nitrat) ? "text-red-600" : ""}`}
													>
														{formData.nitrat || "-"} mg/L
													</span>
												</div>
												<div className="flex flex-col">
													<span className="text-[10px] text-neutral-500 font-mono">
														Nitrit
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("nitrit", formData.nitrit) ? "text-red-600" : ""}`}
													>
														{formData.nitrit || "-"} mg/L
													</span>
												</div>
												<div className="flex flex-col col-span-2">
													<span className="text-[10px] text-neutral-500 font-mono">
														Flourida
													</span>
													<span
														className={`text-xs font-bold ${isTidakMemenuhi("flourida", formData.flourida) ? "text-red-600" : ""}`}
													>
														{formData.flourida || "-"} mg/L
													</span>
												</div>
											</div>
										</div>

										{/* BIOLOGI */}
										<div className="border border-neutral-200 rounded-sm h-fit">
											<div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex items-center gap-2">
												<Droplets className="w-4 h-4 text-teal-600" />
												<h3 className="text-xs font-black uppercase text-neutral-800">
													Mikrobiologi
												</h3>
											</div>
											<div className="p-4 flex flex-col gap-4">
												<div
													className={`p-3 rounded-sm border text-center ${isTidakMemenuhi("coliform", formData.coliform) ? "bg-red-50 border-red-200" : "bg-teal-50/50 border-teal-100"}`}
												>
													<p
														className={`text-[10px] font-bold font-mono mb-1 ${isTidakMemenuhi("coliform", formData.coliform) ? "text-red-600" : "text-teal-600"}`}
													>
														TOTAL COLIFORM
													</p>
													<p
														className={`text-xl font-bold ${isTidakMemenuhi("coliform", formData.coliform) ? "text-red-700" : "text-teal-800"}`}
													>
														{formData.coliform || "0"}{" "}
														<span className="text-xs font-normal">
															MPN/100ml
														</span>
													</p>
												</div>
												<div
													className={`p-3 rounded-sm border text-center ${isTidakMemenuhi("ecoli", formData.ecoli) ? "bg-red-50 border-red-200" : "bg-red-50/50 border-red-100"}`}
												>
													<p className="text-[10px] font-bold text-red-600 font-mono mb-1">
														E. COLI
													</p>
													<p className="text-xl font-bold text-red-800">
														{formData.ecoli || "0"}{" "}
														<span className="text-xs font-normal">
															MPN/100ml
														</span>
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							) : (
								// === LAYOUT FORM (TAMBAH / EDIT) ===
								<form
									id="labForm"
									onSubmit={handleSubmit}
									className="flex flex-col gap-8"
								>
									{/* SEKSI 1: INFORMASI UMUM */}
									<div>
										<h3 className="text-sm font-black border-b border-neutral-200 pb-2 mb-4 text-teal-800">
											1. Informasi Sampel & Lokasi
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<InputGroup
												label="Lokasi Pengambilan"
												field="lokasi"
												placeholder="Misal: Reservoir A..."
												formData={formData}
												setFormData={setFormData}
											/>
											<InputGroup
												label="Nama Laboratorium Uji"
												field="lab"
												formData={formData}
												setFormData={setFormData}
											/>
											<div className="space-y-1.5">
												<label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">
													Status Kualitas
												</label>
												<select
													required
													value={formData.status}
													onChange={(e) =>
														setFormData({ ...formData, status: e.target.value })
													}
													className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-teal-600 outline-none"
												>
													<option value="Memenuhi Syarat">
														Memenuhi Syarat
													</option>
													<option value="Tidak Memenuhi Syarat">
														Tidak Memenuhi Syarat
													</option>
												</select>
											</div>
											<InputGroup
												label="Tgl Pengambilan"
												type="date"
												field="tgl_pengambilan"
												formData={formData}
												setFormData={setFormData}
											/>
											<InputGroup
												label="Tgl Penerimaan"
												type="date"
												field="tgl_penerimaan"
												formData={formData}
												setFormData={setFormData}
											/>
											<InputGroup
												label="Tgl Uji"
												type="date"
												field="tgl_uji"
												formData={formData}
												setFormData={setFormData}
											/>
										</div>
									</div>

									{/* SEKSI 2: PARAMETER FISIKA & KIMIA DISAMPINGAN */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
										<div>
											<h3 className="text-sm font-black border-b border-neutral-200 pb-2 mb-4 text-amber-700">
												2. Parameter Fisika
											</h3>
											<div className="grid grid-cols-2 gap-4">
												<InputGroup
													label="Suhu (°C)"
													type="number"
													field="suhu"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="TDS (mg/L)"
													type="number"
													field="tds"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Warna (TCU)"
													type="number"
													field="warna"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Kekeruhan (NTU)"
													type="number"
													field="kekeruhan"
													formData={formData}
													setFormData={setFormData}
												/>
												<div className="space-y-1.5 col-span-2">
													<label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">
														Bau
													</label>
													<select
														value={formData.bau}
														onChange={(e) =>
															setFormData({ ...formData, bau: e.target.value })
														}
														className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-amber-600 outline-none"
													>
														<option value="Tidak Berbau">Tidak Berbau</option>
														<option value="Berbau">Berbau</option>
													</select>
												</div>
											</div>
										</div>

										<div>
											<h3 className="text-sm font-black border-b border-neutral-200 pb-2 mb-4 text-blue-700">
												3. Parameter Kimia Terpilih
											</h3>
											<div className="grid grid-cols-2 gap-4">
												<InputGroup
													label="pH"
													type="number"
													field="ph"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Sisa Klorin (mg/L)"
													type="number"
													field="klorin"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Besi / Fe (mg/L)"
													type="number"
													field="fe"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Mangan / Mn (mg/L)"
													type="number"
													field="mn"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Nitrat (mg/L)"
													type="number"
													field="nitrat"
													formData={formData}
													setFormData={setFormData}
												/>
												<InputGroup
													label="Nitrit (mg/L)"
													type="number"
													field="nitrit"
													formData={formData}
													setFormData={setFormData}
												/>
												<div className="col-span-2">
													<InputGroup
														label="Flourida (mg/L)"
														type="number"
														field="flourida"
														formData={formData}
														setFormData={setFormData}
													/>
												</div>
											</div>
										</div>
									</div>

									{/* SEKSI 3: MIKROBIOLOGI */}
									<div>
										<h3 className="text-sm font-black border-b border-neutral-200 pb-2 mb-4 text-red-700">
											4. Parameter Mikrobiologi
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<InputGroup
												label="Total Coliform (MPN/100ml)"
												type="number"
												field="coliform"
												formData={formData}
												setFormData={setFormData}
											/>
											<InputGroup
												label="E. Coli (MPN/100ml)"
												type="number"
												field="ecoli"
												formData={formData}
												setFormData={setFormData}
											/>
										</div>
									</div>
								</form>
							)}
						</div>

						{/* MODAL FOOTER */}
						<div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-3 sticky bottom-0">
							{modalMode === "detail" ? (
								<button
									onClick={closeModal}
									className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold font-mono rounded-sm transition-colors shadow-sm"
								>
									TUTUP DETAIL
								</button>
							) : (
								<>
									<button
										type="button"
										onClick={closeModal}
										className="px-5 py-2.5 text-xs font-bold font-mono text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-sm transition-colors"
									>
										BATAL
									</button>
									<button
										type="submit"
										form="labForm"
										disabled={isSubmitting}
										className="flex items-center gap-2 px-6 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold font-mono rounded-sm transition-colors disabled:opacity-50 shadow-sm"
									>
										{isSubmitting ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Save className="w-4 h-4" />
										)}
										{modalMode === "tambah" ? "SIMPAN DATA UJI" : "UPDATE DATA"}
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{/* ALERT KONFIRMASI */}
			{alertConfig.isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
					<div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-hidden flex flex-col">
						<div className="p-6">
							<div className="flex items-start gap-4">
								<div
									className={`p-3 rounded-full shrink-0 ${
										alertConfig.type === "confirm"
											? "bg-red-100 text-red-600"
											: alertConfig.type === "success"
												? "bg-green-100 text-green-600"
												: "bg-amber-100 text-amber-600"
									}`}
								>
									{alertConfig.type === "confirm" && (
										<AlertTriangle className="w-6 h-6" />
									)}
									{alertConfig.type === "success" && (
										<CheckCircle2 className="w-6 h-6" />
									)}
									{alertConfig.type === "error" && (
										<AlertCircle className="w-6 h-6" />
									)}
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
							{alertConfig.type === "confirm" ? (
								<>
									<button
										onClick={closeAlert}
										className="px-4 py-2 text-xs font-bold font-mono text-neutral-600 hover:bg-neutral-200 rounded-sm transition-colors"
									>
										BATAL
									</button>
									<button
										onClick={executeDelete}
										className="px-4 py-2 text-xs font-bold font-mono bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors shadow-sm"
									>
										YA, HAPUS DATA
									</button>
								</>
							) : (
								<button
									onClick={closeAlert}
									className="px-6 py-2 text-xs font-bold font-mono bg-neutral-900 hover:bg-neutral-800 text-white rounded-sm transition-colors shadow-sm"
								>
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

// KOMPONEN INPUT GROUP DIPINDAH KE LUAR FUNGSI UTAMA
interface InputGroupProps {
	label: string;
	field: string;
	formData: any;
	setFormData: React.Dispatch<React.SetStateAction<any>>;
	type?: string;
	placeholder?: string;
	step?: string;
}

const InputGroup = ({
	label,
	field,
	formData,
	setFormData,
	type = "text",
	placeholder = "",
	step = "any",
}: InputGroupProps) => (
	<div className="space-y-1.5">
		<label className="text-[10px] font-bold uppercase text-neutral-500 font-mono">
			{label}
		</label>
		<input
			type={type}
			step={step}
			required={type === "date"}
			placeholder={placeholder}
			value={formData[field] ?? ""}
			onChange={(e) =>
				setFormData((prev: any) => ({ ...prev, [field]: e.target.value }))
			}
			className="w-full p-2.5 text-sm font-mono border border-neutral-300 rounded-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none transition-all"
		/>
	</div>
);
