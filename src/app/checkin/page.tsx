'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { applicaWatermarkLegale } from '@/lib/watermark';
import { 
  ChevronLeft, 
  Camera, 
  UploadCloud, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Gauge, 
  FileCheck 
} from 'lucide-react';

export default function CheckinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Form State
  const [targa, setTarga] = useState('');
  const [appalto, setAppalto] = useState<'CITI' | 'EDF' | 'RHENUS'>('CITI');
  const [kmInizio, setKmInizio] = useState('');
  const [noteInizio, setNoteInizio] = useState('');
  const [gpsPos, setGpsPos] = useState<string>('');

  // Foto controlli
  const [fotoQuadro, setFotoQuadro] = useState<File | null>(null);
  const [fotoDanni, setFotoDanni] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      // Carica veicoli per selezione rapida
      const { data: vData } = await supabase.from('veicoli').select('targa, modello').order('targa');
      if (vData && vData.length > 0) {
        setVeicoli(vData);
        setTarga(vData[0].targa);
      }

      // Rilevamento coordinate GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setGpsPos(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`),
          () => setGpsPos('')
        );
      }
      setLoadingInit(false);
    }
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!kmInizio || isNaN(Number(kmInizio))) {
      setErrorMsg('Inserisci un chilometraggio valido.');
      return;
    }

    setSubmitting(true);
    const autistaNome = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Autista';
    const codiceVerbale = `CHK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      // 1. Creazione turno
      const { data: turno, error: turnoErr } = await supabase
        .from('turni_presenze')
        .insert([
          {
            autista_id: user?.id,
            nome_autista: autistaNome,
            targa_mezzo: targa.trim().toUpperCase(),
            appalto,
            km_inizio: Number(kmInizio),
            codice_verbale: codiceVerbale,
            stato: 'aperto',
            note_inizio: noteInizio || null,
          },
        ])
        .select()
        .single();

      if (turnoErr) throw turnoErr;

      // 2. Upload Foto Quadro con Filigrana Digitale
      if (fotoQuadro && turno) {
        const stampedBlob = await applicaWatermarkLegale(fotoQuadro, {
          targa: targa.toUpperCase(),
          autista: autistaNome,
          tipoControllo: 'Check-in Quadro Km',
          codiceVerbale,
          gps: gpsPos,
        });

        const filePath = `turni/${turno.id}/quadro_inizio_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('vehicle-inspections').upload(filePath, stampedBlob, { contentType: 'image/jpeg' });
        
        if (!upErr) {
          const { data: pUrl } = supabase.storage.from('vehicle-inspections').getPublicUrl(filePath);
          await supabase.from('verbali_foto').insert([
            {
              turno_id: turno.id,
              tipo_controllo: 'checkin',
              tipo_foto: 'quadro_km',
              foto_url: pUrl.publicUrl,
              targa: targa.toUpperCase(),
              autista_nome: autistaNome,
              coordinate_gps: gpsPos || null,
            },
          ]);
        }
      }

      // 3. Upload Foto Danni/Carrozzeria (opzionale)
      if (fotoDanni && turno) {
        const stampedDanniBlob = await applicaWatermarkLegale(fotoDanni, {
          targa: targa.toUpperCase(),
          autista: autistaNome,
          tipoControllo: 'Check-in Stato Carrozzeria',
          codiceVerbale,
          gps: gpsPos,
        });

        const filePathDanni = `turni/${turno.id}/carrozzeria_inizio_${Date.now()}.jpg`;
        const { error: upDanniErr } = await supabase.storage.from('vehicle-inspections').upload(filePathDanni, stampedDanniBlob, { contentType: 'image/jpeg' });

        if (!upDanniErr) {
          const { data: pUrlDanni } = supabase.storage.from('vehicle-inspections').getPublicUrl(filePathDanni);
          await supabase.from('verbali_foto').insert([
            {
              turno_id: turno.id,
              tipo_controllo: 'checkin',
              tipo_foto: 'danno',
              foto_url: pUrlDanni.publicUrl,
              targa: targa.toUpperCase(),
              autista_nome: autistaNome,
              coordinate_gps: gpsPos || null,
            },
          ]);
        }
      }

      alert(`Check-in registrato con successo!\nVerbale: ${codiceVerbale}`);
      window.location.href = '/autista';
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Errore durante la registrazione del check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Inizializzazione check-in...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-20 antialiased">
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
            <h1 className="font-extrabold text-sm uppercase tracking-wider">Inizio Turno (Check-in)</h1>
            <p className="text-[11px] text-gray-400 font-medium">Assegnazione Mezzo e Perizia Digitale</p>
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[#E05353] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Dati Mezzo & Appalto */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              1. Selezione Veicolo & Appalto
            </label>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Targa Mezzo</label>
              {veicoli.length > 0 ? (
                <select
                  value={targa}
                  onChange={(e) => setTarga(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  required
                >
                  {veicoli.map((v) => (
                    <option key={v.targa} value={v.targa}>
                      {v.targa} — {v.modello || 'Furgone'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="es. FY123AB"
                  value={targa}
                  onChange={(e) => setTarga(e.target.value.toUpperCase())}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  required
                />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Appalto di Riferimento</label>
              <div className="grid grid-cols-3 gap-2">
                {(['CITI', 'EDF', 'RHENUS'] as const).map((app) => (
                  <button
                    key={app}
                    type="button"
                    onClick={() => setAppalto(app)}
                    className={`py-2.5 rounded-xl font-bold text-xs transition border ${
                      appalto === app
                        ? 'bg-[#1E242B] text-white border-[#1E242B]'
                        : 'bg-gray-50 border-gray-100 text-gray-600'
                    }`}
                  >
                    {app}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Km & Foto Quadro con Watermark */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              2. Chilometri & Foto Quadro Strumenti
            </label>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Km alla Partenza</label>
              <input
                type="number"
                placeholder="es. 124500"
                value={kmInizio}
                onChange={(e) => setKmInizio(e.target.value)}
                className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                required
              />
            </div>

            {/* Upload Foto Quadro con Fotocamera */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block flex items-center justify-between">
                <span>Foto Quadro Km (Obbligatoria)</span>
                <span className="text-[10px] text-emerald-600 font-bold">● Timbro Digitale GPS</span>
              </label>
              <label className="border-2 border-dashed border-gray-200 hover:border-[#E05353] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-[#F8F9FB] transition">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoQuadro(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <Camera className="w-7 h-7 text-[#E05353] mb-1.5" />
                <span className="text-xs font-bold text-gray-700">
                  {fotoQuadro ? `✓ ${fotoQuadro.name}` : 'Scatta Foto al Quadro Acceso'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">Applica automaticamente data, ora e coordinate</span>
              </label>
            </div>
          </div>

          {/* Stato Carrozzeria & Danni Preesistenti */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              3. Segnalazione Danni Carrozzeria (Opzionale)
            </label>

            <textarea
              rows={2}
              placeholder="Segnala graffi, ammaccature o spie accese..."
              value={noteInizio}
              onChange={(e) => setNoteInizio(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />

            <label className="border border-dashed border-gray-200 rounded-2xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-[#F8F9FB] hover:bg-gray-100 transition">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFotoDanni(e.target.files?.[0] || null)}
                className="hidden"
              />
              <UploadCloud className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-600">
                {fotoDanni ? `✓ Foto Danno: ${fotoDanni.name}` : 'Scatta Foto Eventuale Danno'}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Certificazione Watermark & Invio...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Conferma Check-in & Avvia Servizio
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}