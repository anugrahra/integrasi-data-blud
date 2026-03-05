import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administrasi Umum - Pusat Data BLUD AM Terintegrasi',
};

export default function AdministrasiUmumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}