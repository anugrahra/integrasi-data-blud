import Link from 'next/link';
import { 
  Droplets, 
  Map, 
  Users, 
  FileText, 
  Ruler, 
  ArrowRight 
} from 'lucide-react';

export default function Home() {
  // Data menu kita taruh sini biar kodingan di bawah bersih
  const menus = [
    {
      title: "Produksi",
      desc: "Pengolahan air minum, kualitas air.",
      icon: <Droplets className="w-6 h-6" />,
      href: "/produksi",
      // status: "Operational"
    },
    // {
    //   title: "Distribusi",
    //   desc: "Jaringan pipa, kebocoran.",
    //   icon: <Map className="w-6 h-6" />,
    //   href: "/distribusi",
    //   // status: "Active"
    // },
    // {
    //   title: "Pelayanan Langganan",
    //   desc: "Data pelanggan, pengaduan.",
    //   icon: <Users className="w-6 h-6" />,
    //   href: "/pelayanan",
    //   // status: "Online"
    // },
    // {
    //   title: "Administrasi Umum",
    //   desc: "Surat, aset/gudang, kepegawaian.",
    //   icon: <FileText className="w-6 h-6" />,
    //   href: "/administrasi",
    //   // status: "Standby"
    // },
    // {
    //   title: "Perencanaan Teknik",
    //   desc: "RAB, survey, proyek baru.",
    //   icon: <Ruler className="w-6 h-6" />,
    //   href: "/perencanaan",
    //   // status: "In Progress",
    //   highlight: false
    // }
  ];

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-black selection:text-white">
      
      {/* Header Simple */}
      <header className="px-6 py-6 border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <span className="text-white font-bold text-sm">BL</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">BLUD AIR MINUM</h1>
          </div>
          <Link 
            href="/login" 
            className="text-sm font-medium text-neutral-500 hover:text-black transition-colors"
          >
            Login &rarr;
          </Link>
        </div>
      </header>

      {/* Hero Section yang 'Cuek' tapi Jelas */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-neutral-900 mb-4">
            PUSAT DATA BLUD AM<br/> TERINTEGRASI.
          </h2>
          <p className="text-lg text-neutral-500 max-w-xl leading-relaxed">
            Sistem informasi manajemen operasional dan pelayanan.
          </p>
        </div>

        {/* Grid Card Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((item, index) => (
            <Link 
              key={index} 
              href={item.href}
              className={`
                group relative p-6 border transition-all duration-300 ease-out
                flex flex-col justify-between h-48
                ${item.highlight 
                  ? 'bg-neutral-900 border-neutral-900 text-white hover:bg-neutral-800' 
                  : 'bg-white border-neutral-200 hover:border-black hover:shadow-lg'
                }
              `}
            >
              {/* Top Part: Icon & Title */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-sm ${item.highlight ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
                    {item.icon}
                  </div>
                  {/* <span className={`text-xs font-mono px-2 py-1 rounded-full ${item.highlight ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-500'}`}>
                    {item.status}
                  </span> */}
                </div>
                <h3 className="text-xl font-bold mb-1 group-hover:underline decoration-2 underline-offset-4">
                  {item.title}
                </h3>
                <p className={`text-sm ${item.highlight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {item.desc}
                </p>
              </div>

              {/* Bottom Part: Arrow Action */}
              <div className="flex justify-end opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <ArrowRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer Minimalis */}
      <footer className="px-6 py-8 border-t border-neutral-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-neutral-500">
          <p>&copy; 2026 BLUD Air Minum Kota Cimahi.</p>
          <div className="flex gap-6 mt-4 md:mt-0 font-mono">
            <span>Server: <span className="text-green-600">Online</span></span>
            <span>V.1.0.0</span>
          </div>
        </div>
      </footer>
    </main>
  );
}