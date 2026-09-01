'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { 
  FileText, 
  ChevronLeft, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function CedoliniAutistaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mieiCedolini, setMieiCedolini] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      // Recupera cedolini intestati all'email dell'autista
      const { data, error } = await supabase
        .from('cedolini')
        .select('*')
        .eq('autista_email', session.user.email)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMieiCedolini(data);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleFirmaCedolino = async (id: string) => {
    const conferma = window.confirm('Dichiari di aver preso visione e ricevuto il cedolino paga?');
    if (!conferma) return;

    setSigningId(id);
    try {
      const { error } = await supabase
        .from('cedolini')
        .update({
          firmato: true,
          data_firma: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setMieiCedolini(mieiCedolini.map(c => c.id === id ? { ...c, firmato: true, data_firma: new Date().toISOString() } : c));
      alert('Presa visione e firma registrate con successo!');
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    } finally {
      setSigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-slate-800" />
        Caricamento buste paga...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link 
            href="/autista" 
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Le Mie Buste Paga</h1>
            <p className="text-[11px] text-gray-400 font-medium">Archivio Cedolini & Firma Digitale</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {mieiCedolini.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-600">Nessuna busta paga presente</p>
            <p className="text-[11px]">I tuoi cedolini mensili compariranno qui non appena elaborati dall'amministrazione.</p>
          </div>
        ) : (
          mieiCedolini.map((c) => (
            <div key={c.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    ANNO {c.anno}
                  </span>
                  <h2 className="text-base font-black text-[#1E242B] mt-1.5">{c.mese_riferimento}</h2>
                </div>

                <div>
                  {c.firmato ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Firmata
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] flex items-center gap-1 border border-amber-200">
                      <Clock className="w-3 h-3" /> Da Firmare
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                <a
                  href={c.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition"
                >
                  <FileText className="w-4 h-4 text-slate-700" />
                  Visualizza PDF
                </a>

                {!c.firmato && (
                  <button
                    type="button"
                    disabled={signingId === c.id}
                    onClick={() => handleFirmaCedolino(c.id)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    {signingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Firma per Ricevuta
                  </button>
                )}
              </div>

              {c.firmato && c.data_firma && (
                <div className="text-[10px] text-gray-400 text-center font-medium">
                  Presa visione certificata il {new Date(c.data_firma).toLocaleString('it-IT')}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}