import { NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Default tujuan lemparan kalau dia Admin atau role-nya gak jelas
  let redirectTo = '/' 

  if (code) {
    // 1. Tukarkan kode dari Google dengan Sesi (Cookies) di Supabase
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (!authError && authData?.user?.email) {
      // 2. Ambil email user yang baru aja sukses login
      const email = authData.user.email

      // 3. Langsung cek ke tabel master_users buat lihat jabatannya
      const { data: masterData } = await supabase
        .from('master_users')
        .select('role_jabatan')
        .eq('email', email)
        .single()

      if (masterData) {
        const role = masterData.role_jabatan.toLowerCase()
        
        // 4. Tentukan arah tendangan berdasarkan role
        if (role.includes('produksi')) {
          redirectTo = '/kaur-produksi'
        } else if (role.includes('perencanaan')) {
          redirectTo = '/kaur-perencanaan'
        } else if (role.includes('administrasi')) {
          redirectTo = '/kaur-administrasi'
        }
        // Note: Kalau role-nya 'admin', dia bakal tetep pakai default '/', 
        // biarin Admin mendarat di Beranda biar dia bebas milih mau masuk ke mana.
      }
    }
  }

  // 5. Eksekusi tendangan maut ke rute yang udah ditentuin!
  return NextResponse.redirect(new URL(redirectTo, request.url))
}