'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  ShieldCheck, 
  FileText, 
  RefreshCw,
  Smartphone,
  ArrowUpRight,
  Edit3,
  Check,
  X,
  Trash2,
  ChevronRight,
  Download,
  Receipt,
  Users,
  Truck,
  BarChart3,
  Loader2,
  LogOut,
  FileSignature
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [turni, setTurni] = useState<any[]>([]);
  const [spese, setSpese] = useState<any[]>([]);
  const [loadingTurni, setLoadingTurni] = useState(true);

  // Modifica Admin
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarga, setEditTarga] = useState('');
  const [editKmFine, setEditKmFine] = useState('');

  // Controllo Sicurezza Accesso Admin (Tabella Profili)
  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }

        const { data: profilo } = await supabase
          .from('profili')
          .select('ruolo, nome, cognome')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profilo?.ruolo !== 'admin') {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        setAdminUser({ ...session.user, ...profilo });
        setAuthChecking(false);
        fetchDati();
      } catch (err) {
        router.replace('/login');
      }
    }
    checkAdminAuth();
  }, [router]);

  const fetchDati = async () => {
    setLoadingTurni(true);
    try {
      const { data: tData, error: tErr } = await supabase
        .from('turni_presenze')
        .select('*')
        .order('created_at', { ascending: false });

      if (tErr) throw tErr;
      setTurni(tData || []);

      const { data: sData, error: sErr } = await supabase
        .from('vehicle_expenses')
        .select('*')
        .order('data_spesa', { ascending: true });

      if (!sErr && sData) {
        setSpese(sData);
      }
    } catch (err: any) {
      console.error('Errore recupero dati:', err);
    } finally {
      setLoadingTurni(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Verifica autorizzazione amministratore...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] font-sans antialiased pb-24">
      {/* Navbar Admin */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E05353] flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-sm">
              CC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">CITY CARGO</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-[#E05353] uppercase tracking-wider">
                  Admin Hub
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Controllo Flotta & Amministrazione</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/autista" 
              className="h-9 px-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-[#E05353] font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-100"
            >
              <Smartphone className="w-3.5 h-3.5" /> App Autista
            </Link>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-full bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* 5 MODULI GESTIONALI */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#E05353]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Flotta Mezzi</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Veicoli</h3>
              </div>
            </div>
            <Link 
              href="/flotta" 
              className="mt-4 w-full py-2.5 px-3 bg-[#1E242B] hover:bg-black text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Gestione Flotta <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Contabilità</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Spese</h3>
              </div>
            </div>
            <Link 
              href="/spese" 
              className="mt-4 w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Aggiungi Fattura <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-[#E05353] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#E05353]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#E05353] uppercase tracking-wider">Risorse Umane</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Autisti</h3>
              </div>
            </div>
            <Link 
              href="/autisti" 
              className="mt-4 w-full py-2.5 px-3 bg-[#E05353] hover:bg-[#c94545] text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Elenco Autisti <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amministrazione</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Buste Paga</h3>
              </div>
            </div>
            <Link 
              href="/cedolini" 
              className="mt-4 w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Gestisci Cedolini <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Legale & GDPR</span>
                <h3 className="text-base font-black text-[#1E242B] mt-0.5">Registro Firme</h3>
              </div>
            </div>
            <Link 
              href="/documenti" 
              className="mt-4 w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs tracking-wider uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
            >
              Apri Registro <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}