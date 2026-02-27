import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produksi - Pusat Data BLUD AM Terintegrasi',
};

export default function ProduksiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}