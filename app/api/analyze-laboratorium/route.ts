import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { monthLabel, labData } = body;

    // Pakai model yang sama persis kayak page perencanaan lo
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format data dokumen agar mudah dibaca AI (Mirip docListText)
    const labDataText = labData.map((d: any) => 
      `- Lokasi: ${d.lokasi} | pH: ${d.ph} | Suhu: ${d.suhu}°C | Klorin: ${d.klorin} mg/l | Kekeruhan: ${d.kekeruhan} NTU | TDS: ${d.tds} mg/l | Warna: ${d.warna} TCU | Fe: ${d.fe} mg/l | Mn: ${d.mn} mg/l | Flourida: ${d.flourida} mg/l | Nitrat: ${d.nitrat} mg/l | Nitrit: ${d.nitrit} mg/l | Coliform: ${d.coliform} CFU | E.Coli: ${d.ecoli} CFU`
    ).join('\n');

    // Prompt Holistik ala Chief Chemist
    const prompt = `
      Anda adalah seorang Kepala Laboratorium Kualitas Air (Chief Chemist) yang jenius dan analitis di sebuah perusahaan SPAM.
      Tugas Anda adalah mengevaluasi data kualitas air dari Hulu (Reservoir) hingga Hilir (Rusunawa/titik terjauh) untuk periode ${monthLabel}.
      
      [DATA HASIL UJI LENGKAP - BERURUTAN DARI HULU KE HILIR]
      ${labDataText}

      Instruksi format balasan:
      1. Paragraf Pembuka: Berikan evaluasi umum tentang kualitas air baku dan apakah ada anomali berbahaya secara keseluruhan namun singkat.
      2. Analisis Korelasi Kimiawi (Bullet points):
         - Temukan hubungan logis. Misalnya: "Terjadi kenaikan Kekeruhan di titik hilir yang sejalan dengan peningkatan kadar Besi (Fe) dan Mangan (Mn)."
         - Soroti fungsi Klorin. Jelaskan bahwa Klorin menurun di hilir karena terpakai untuk mengoksidasi logam dan membunuh bakteri.
         - Jika ada Coliform > 0 di titik mana pun, jelaskan secara ilmiah (misal akibat sisa klorin yang menipis atau biofilm di pipa tua). Soroti juga kebanggaan jika E.Coli 0.
      3. Kesimpulan/Saran Tindakan: 1 kalimat penutup tegasan untuk tim teknis (misal perlunya flushing pipa).
      4. Gunakan bold (**teks**) untuk penekanan nama parameter, lokasi, atau angka penting.
      5. Jangan gunakan kata-kata salam. Langsung to the point dengan gaya bahasa profesional namun sederhana. jangan bertele-tele. hindari kata-kata yang tidak perlu.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // CATATAN PENTING: Karena di frontend lo ngambil data.insight, kita balikin key 'insight'
    return NextResponse.json({ insight: responseText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Gagal menghasilkan analisis dari AI. Silakan coba lagi." },
      { status: 500 }
    );
  }
}