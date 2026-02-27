import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documents, currentDate } = body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format data dokumen agar mudah dibaca AI
    const docListText = documents.map((d: any) => 
      `- ${d.kategori}: ${d.uraian} | Status: ${d.status} | Update Terakhir: ${d.last_update || 'Belum ada'}`
    ).join('\n');

    const prompt = `
      Anda adalah seorang Senior Document Controller dan Engineering Manager di sebuah perusahaan Air Minum (SPAM).
      Tugas Anda adalah menganalisis "kesehatan" arsip dokumen teknis berdasarkan data berikut.
      
      Tanggal Hari Ini: ${currentDate}

      [DAFTAR DOKUMEN & STATUS]
      ${docListText}

      Instruksi format balasan:
      1. Paragraf Pembuka: Berikan ringkasan singkat tentang kelengkapan dan status kesehatan arsip secara umum.
      2. Analisis Kritis (Bullet points):
         - Soroti dokumen yang berstatus "Needs Update", "Expiring Soon", atau "Review".
         - Perhatikan tanggal "Update Terakhir". Jika ada dokumen penting (seperti SOP atau Peta) yang sudah berumur lebih dari 1 tahun dari tanggal hari ini, berikan peringatan.
      3. Kesimpulan/Saran Tindakan: 1 kalimat saran prioritas untuk tim *Engineering* atau Tata Usaha.
      4. Gunakan bold (**teks**) untuk penekanan pada nama dokumen atau status penting.
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