import { NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    // Tukarkan kode dari Google dengan Sesi (Cookies) di Supabase
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Setelah tiket divalidasi, tendang user ke halaman utama (Dashboard)
  return NextResponse.redirect(new URL('/kaur-produksi', request.url))
}