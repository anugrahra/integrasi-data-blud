"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import {
	Database,
	CheckCircle2,
	Loader2,
	RefreshCw,
	Clock3,
	Activity,
	AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { id } from "date-fns/locale";

type MaintenanceLog = {
	id: number;
	created_at: string;
};

export default function DatabaseMaintenancePage() {
	const [logs, setLogs] = useState<MaintenanceLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [isChecking, setIsChecking] = useState(false);
	const [error, setError] = useState("");

	// =========================================
	// AMBIL RIWAYAT MAINTENANCE
	// =========================================
	const fetchLogs = async () => {
		setLoading(true);
		setError("");

		const { data, error } = await supabase
			.from("database_maintenance")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(20);

		if (error) {
			console.error("Error fetching maintenance logs:", error);
			setError(error.message);
		} else {
			setLogs(data || []);
		}

		setLoading(false);
	};

	// =========================================
	// LOAD PERTAMA
	// =========================================
	useEffect(() => {
		fetchLogs();
	}, []);

	// =========================================
	// JALANKAN MAINTENANCE CHECK
	// =========================================
	const runMaintenanceCheck = async () => {
		setIsChecking(true);
		setError("");

		const { error } = await supabase.from("database_maintenance").insert([
			{
				// created_at otomatis diisi Supabase
			},
		]);

		if (error) {
			console.error("Maintenance error:", error);
			setError(error.message);
			setIsChecking(false);
			return;
		}

		await fetchLogs();

		setIsChecking(false);
	};

	const lastMaintenance = logs.length > 0 ? logs[0] : null;

	return (
		<div className="p-8 max-w-6xl mx-auto">
			{/* ========================================= */}
			{/* HEADER */}
			{/* ========================================= */}
			<div className="mb-8">
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-neutral-900 text-white rounded-sm">
						<Database className="w-5 h-5" />
					</div>

					<h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900">
						Database Maintenance
					</h1>
				</div>

				<p className="text-sm text-neutral-500 font-mono">
					Pemeriksaan dan pencatatan aktivitas database Supabase.
				</p>
			</div>

			{/* ========================================= */}
			{/* STATUS CARD */}
			{/* ========================================= */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{/* STATUS */}
				<div className="bg-white border border-neutral-200 shadow-sm rounded-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
							Database Status
						</span>

						<Activity className="w-4 h-4 text-green-600" />
					</div>

					<div className="flex items-center gap-2">
						<span className="relative flex h-3 w-3">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
						</span>

						<span className="text-lg font-black text-neutral-900 uppercase">
							Online
						</span>
					</div>

					<p className="text-[10px] text-neutral-400 font-mono mt-2">
						Connection available
					</p>
				</div>

				{/* LAST MAINTENANCE */}
				<div className="bg-white border border-neutral-200 shadow-sm rounded-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
							Last Maintenance
						</span>

						<Clock3 className="w-4 h-4 text-blue-600" />
					</div>

					{lastMaintenance ? (
						<>
							<p className="text-lg font-black text-neutral-900">
								{format(parseISO(lastMaintenance.created_at), "dd MMM yyyy", {
									locale: id,
								}).toUpperCase()}
							</p>

							<p className="text-xs text-neutral-500 font-mono mt-1">
								{format(parseISO(lastMaintenance.created_at), "HH:mm:ss")} WIB
							</p>

							<p className="text-[10px] text-neutral-400 font-mono mt-2">
								{formatDistanceToNow(parseISO(lastMaintenance.created_at), {
									addSuffix: true,
									locale: id,
								})}
							</p>
						</>
					) : (
						<p className="text-sm text-neutral-400 font-mono">
							Belum ada pemeriksaan.
						</p>
					)}
				</div>

				{/* TOTAL CHECK */}
				<div className="bg-white border border-neutral-200 shadow-sm rounded-sm p-5">
					<div className="flex items-center justify-between mb-4">
						<span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
							Recorded Checks
						</span>

						<RefreshCw className="w-4 h-4 text-amber-600" />
					</div>

					<p className="text-3xl font-black font-mono text-neutral-900">
						{logs.length}
					</p>

					<p className="text-[10px] text-neutral-400 font-mono mt-2">
						Riwayat terakhir yang ditampilkan
					</p>
				</div>
			</div>

			{/* ========================================= */}
			{/* MAIN MAINTENANCE ACTION */}
			{/* ========================================= */}
			<div className="bg-neutral-900 text-white rounded-sm shadow-sm p-6 mb-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<CheckCircle2 className="w-5 h-5 text-green-400" />

							<h2 className="text-sm font-black uppercase tracking-wider">
								Weekly Database Check
							</h2>
						</div>

						<p className="text-xs text-neutral-400 font-mono max-w-xl leading-relaxed">
							Tekan tombol di bawah untuk mencatat aktivitas maintenance
							database. Waktu pemeriksaan akan dicatat otomatis oleh PostgreSQL.
						</p>
					</div>

					<button
						onClick={runMaintenanceCheck}
						disabled={isChecking}
						className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-white text-neutral-900 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black font-mono rounded-sm transition-colors shadow-sm"
					>
						{isChecking ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								CHECKING...
							</>
						) : (
							<>
								<RefreshCw className="w-4 h-4" />
								RUN MAINTENANCE CHECK
							</>
						)}
					</button>
				</div>
			</div>

			{/* ========================================= */}
			{/* ERROR */}
			{/* ========================================= */}
			{error && (
				<div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

					<div>
						<p className="text-xs font-bold text-red-800 uppercase font-mono">
							Maintenance Check Failed
						</p>

						<p className="text-xs text-red-600 font-mono mt-1">{error}</p>
					</div>
				</div>
			)}

			{/* ========================================= */}
			{/* HISTORY */}
			{/* ========================================= */}
			<div className="bg-white border border-neutral-200 shadow-sm rounded-sm">
				<div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
					<div>
						<h2 className="text-xs font-black uppercase tracking-wider text-neutral-900">
							Maintenance History
						</h2>

						<p className="text-[10px] text-neutral-400 font-mono mt-1">
							20 pemeriksaan terakhir
						</p>
					</div>

					<button
						onClick={fetchLogs}
						disabled={loading}
						className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
						title="Refresh"
					>
						<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
					</button>
				</div>

				<div className="overflow-x-auto">
					{loading ? (
						<div className="py-12 text-center text-neutral-400">
							<Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />

							<p className="text-xs font-mono">Memuat riwayat maintenance...</p>
						</div>
					) : logs.length === 0 ? (
						<div className="py-12 text-center text-neutral-400">
							<Database className="w-8 h-8 mx-auto mb-3 opacity-40" />

							<p className="text-xs font-mono">Belum ada maintenance check.</p>
						</div>
					) : (
						<table className="w-full text-xs font-mono text-left border-collapse">
							<thead className="bg-neutral-900 text-white">
								<tr>
									<th className="px-4 py-3 font-medium">STATUS</th>

									<th className="px-4 py-3 font-medium">TANGGAL</th>

									<th className="px-4 py-3 font-medium">WAKTU</th>

									<th className="px-4 py-3 font-medium">KETERANGAN</th>
								</tr>
							</thead>

							<tbody className="divide-y divide-neutral-200">
								{logs.map((log) => {
									const date = parseISO(log.created_at);

									return (
										<tr
											key={log.id}
											className="hover:bg-neutral-50 transition-colors"
										>
											<td className="px-4 py-3">
												<span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded-sm text-[10px] font-bold">
													<span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
													RECORDED
												</span>
											</td>

											<td className="px-4 py-3 font-bold text-neutral-900">
												{format(date, "dd MMMM yyyy", { locale: id })}
											</td>

											<td className="px-4 py-3 text-neutral-500">
												{format(date, "HH:mm:ss")} WIB
											</td>

											<td className="px-4 py-3 text-neutral-500">
												Database maintenance check
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{/* ========================================= */}
			{/* FOOTNOTE */}
			{/* ========================================= */}
			<div className="mt-4 flex items-start gap-2 text-[10px] text-neutral-400 font-mono">
				<Database className="w-3.5 h-3.5 shrink-0 mt-0.5" />

				<p>
					Setiap maintenance check membuat satu record baru pada tabel
					<span className="font-bold text-neutral-600">
						{" "}
						database_maintenance
					</span>
					.
				</p>
			</div>
		</div>
	);
}
