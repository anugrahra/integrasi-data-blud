import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Kita tangkap monthlyData yang baru dikirim dari frontend
    const { spamName, spamCapacity, stats, periodLabel, monthlyData } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Ubah data bulanan (JSON/Array) menjadi teks tabel yang mudah dibaca AI
    const monthlyDataText = monthlyData.map((d: any) => 
      `- ${d.bulan}: Air Baku ${d.airBakuLPS} LPS | Produksi ${d.produksiM3} m3 (${d.lps} LPS) | PAC ${d.pacKg} Kg (Dosis: ${d.dosisPac} mg/l) | Kaporit ${d.kapKg} Kg (Dosis: ${d.dosisKap} mg/l)`
    ).join('\n');

    // Prompt instruksi tingkat lanjut untuk AI
    const prompt = `
      Anda adalah seorang Senior Ahli Analisis Data Water Treatment Plant (SPAM).
      Buatkan kesimpulan eksekutif (executive summary) yang mendalam, padat, dan profesional.
      
      Unit Instalasi: ${spamName}
      Kapasitas Terpasang: ${spamCapacity}
      Periode Data: ${periodLabel}
      
      [RINGKASAN TOTAL & RATA-RATA]
      - Total Produksi: ${stats.totalProd} m3 (Rata-rata: ${stats.avgProdDay} m3/hari)
      - Kapasitas Termanfaatkan: ${stats.avgLps} LPS
      - Rata-rata Air Baku: ${stats.avgAirBaku} LPS
      - PAC: Total ${stats.totalPac} Kg (Rata-rata Dosis: ${stats.avgDosePac} mg/l)
      - Kaporit: Total ${stats.totalKap} Kg (Rata-rata Dosis: ${stats.avgDoseKap} mg/l)

      [DATA DETAIL PER BULAN (Kronologis)]
      ${monthlyDataText}

      Instruksi format balasan:
      1. Paragraf Pembuka: Berikan gambaran umum performa produksi, evaluasi apakah kapasitas terpakai aman terhadap kapasitas terpasang.
      2. Analisis Tren & Korelasi (Bullet points): 
         - Temukan bulan dengan anomali (lonjakan/penurunan tajam pada produksi, air baku, atau bahan kimia).
         - Temukan korelasi logis (Misalnya: "Pada bulan X, penurunan debit air baku dibarengi dengan kenaikan dosis PAC yang mengindikasikan kekeruhan tinggi...").
      3. Kesimpulan/Saran: 1 kalimat penutup untuk fokus operasional ke depan.
      4. Gunakan bold (**teks**) untuk penekanan angka atau bulan penting.
      5. Jangan gunakan kata-kata salam. Langsung to the point.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ summary: responseText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan analisis dari AI. Silakan coba lagi." },
      { status: 500 }
    );
  }
}