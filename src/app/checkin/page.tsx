'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/supabase';
import { applicaWatermarkLegale } from '@/lib/watermark';
import { 
  ChevronLeft, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Check 
} from 'lucide-react';

export default function CheckinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [veicoli, setVeicoli] = useState<any[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Dati Turno
  const [targa, setTarga] = useState('');
  const [appalto, setAppalto] = useState<'CITI' | 'EDF' | 'RHENUS'>('CITI');
  const [kmInizio, setKmInizio] = useState('');
  const [noteInizio, setNoteInizio] = useState('');
  const [gpsPos, setGpsPos] = useState<string>('');

  // 4 Scatti Fotografici dei Lati del Mezzo
  const [fotoFrontale, setFotoFrontale] = useState<File | null>(null);
  const [fotoRetro, setFotoRetro] = useState<File | null>(null);
  const [fotoLatoSx, setFotoLatoSx] = useState<File | null>(null);
  const [fotoLatoDx, setFotoLatoDx] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
        return;
      }
      setUser(session.user);

      const { data: vData } = await supabase.from('veicoli').select('targa, modello').order('targa');
      if (vData && vData.length > 0) {
        setVeicoli(vData);
        setTarga(vData[0].targa);
      }

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

  const uploadFotoCertificata = async (
    file: File, 
    tipoControllo: string, 
    tipoFoto: string, 
    turnoId: string, 
    codiceVerbale: string, 
    autistaNome: string
  ) => {
    const stampedBlob = await applicaWatermarkLegale(file, {
      targa: targa.toUpperCase(),
      autista: autistaNome,
      tipoControllo: `Check-in ${tipoControllo}`,
      codiceVerbale,
      gps: gpsPos,
    });

    const filePath = `turni/${turnoId}/${tipoFoto}_${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('vehicle-inspections')
      .upload(filePath, stampedBlob, { contentType: 'image/jpeg' });

    if (!upErr) {
      const { data: pUrl } = supabase.storage.from('vehicle-inspections').getPublicUrl(filePath);
      await supabase.from('verbali_foto').insert([
        {
          turno_id: turnoId,
          tipo_controllo: 'checkin',
          tipo_foto: tipoFoto,
          foto_url: pUrl.publicUrl,
          targa: targa.toUpperCase(),
          autista_nome: autistaNome,
          coordinate_gps: gpsPos || null,
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!kmInizio || isNaN(Number(kmInizio))) {
      setErrorMsg('Inserisci un chilometraggio valido.');
      return;
    }

    if (!fotoFrontale || !fotoRetro || !fotoLatoSx || !fotoLatoDx) {
      setErrorMsg('Scatta tutte le 4 foto dei lati del veicolo per procedere.');
      return;
    }

    setSubmitting(true);
    const autistaNome = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Autista';
    const codiceVerbale = `CHK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      setUploadProgressText('Creazione verbale di servizio...');
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

      // Upload 4 Foto Lati Veicolo con Watermark
      setUploadProgressText('Timbro e invio Lato Frontale (1/4)...');
      await uploadFotoCertificata(fotoFrontale, 'Frontale', 'frontale', turno.id, codiceVerbale, autistaNome);

      setUploadProgressText('Timbro e invio Lato Posteriore (2/4)...');
      await uploadFotoCertificata(fotoRetro, 'Retro', 'retro', turno.id, codiceVerbale, autistaNome);

      setUploadProgressText('Timbro e invio Fiancata Sinistra (3/4)...');
      await uploadFotoCertificata(fotoLatoSx, 'Fiancata Sinistra', 'lato_sx', turno.id, codiceVerbale, autistaNome);

      setUploadProgressText('Timbro e invio Fiancata Destra (4/4)...');
      await uploadFotoCertificata(fotoLatoDx, 'Fiancata Destra', 'lato_dx', turno.id, codiceVerbale, autistaNome);

      alert(`Check-in registrato con successo!\n4 Foto certificate archiviate.\nVerbale: ${codiceVerbale}`);
      window.location.href = '/autista';
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Errore durante la registrazione.');
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

  const fotoCompletate = [fotoFrontale, fotoRetro, fotoLatoSx, fotoLatoDx].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] pb-24 antialiased">
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
            <p className="text-[11px] text-gray-400 font-medium">Controllo 4 Lati Veicolo & Km</p>
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
          
          {/* Sezione Mezzo e Km */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              1. Mezzo, Appalto e Chilometri
            </label>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Furgone Selezionato</label>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Appalto</label>
                <select
                  value={appalto}
                  onChange={(e: any) => setAppalto(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                >
                  <option value="CITI">CITI</option>
                  <option value="EDF">EDF</option>
                  <option value="RHENUS">RHENUS</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Km Attuali</label>
                <input
                  type="number"
                  placeholder="es. 124500"
                  value={kmInizio}
                  onChange={(e) => setKmInizio(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#E05353]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sezione 4 Foto Lati Veicolo */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                2. Perizia Fotografica (4 Lati)
              </label>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                fotoCompletate === 4 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {fotoCompletate}/4 Foto Scattate
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Foto 1: Frontale */}
              <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                fotoFrontale ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-[#F8F9FB] hover:border-[#E05353]'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoFrontale(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {fotoFrontale ? <Check className="w-6 h-6 text-emerald-600 mb-1" /> : <Camera className="w-6 h-6 text-[#E05353] mb-1" />}
                <span className="text-xs font-bold text-gray-800">1. Lato Frontale</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{fotoFrontale ? '✓ Acquisita' : 'Scatta foto'}</span>
              </label>

              {/* Foto 2: Retro */}
              <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                fotoRetro ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-[#F8F9FB] hover:border-[#E05353]'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoRetro(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {fotoRetro ? <Check className="w-6 h-6 text-emerald-600 mb-1" /> : <Camera className="w-6 h-6 text-[#E05353] mb-1" />}
                <span className="text-xs font-bold text-gray-800">2. Lato Posteriore</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{fotoRetro ? '✓ Acquisita' : 'Scatta foto'}</span>
              </label>

              {/* Foto 3: Lato Sinistro */}
              <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                fotoLatoSx ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-[#F8F9FB] hover:border-[#E05353]'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoLatoSx(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {fotoLatoSx ? <Check className="w-6 h-6 text-emerald-600 mb-1" /> : <Camera className="w-6 h-6 text-[#E05353] mb-1" />}
                <span className="text-xs font-bold text-gray-800">3. Fiancata SX</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{fotoLatoSx ? '✓ Acquisita' : 'Scatta foto'}</span>
              </label>

              {/* Foto 4: Lato Destro */}
              <label className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center ${
                fotoLatoDx ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 bg-[#F8F9FB] hover:border-[#E05353]'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoLatoDx(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {fotoLatoDx ? <Check className="w-6 h-6 text-emerald-600 mb-1" /> : <Camera className="w-6 h-6 text-[#E05353] mb-1" />}
                <span className="text-xs font-bold text-gray-800">4. Fiancata DX</span>
                <span className="text-[10px] text-gray-400 mt-0.5">{fotoLatoDx ? '✓ Acquisita' : 'Scatta foto'}</span>
              </label>
            </div>
          </div>

          {/* Note & Segnalazioni */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
              3. Segnalazione Danni o Anomalie (Opzionale)
            </label>
            <textarea
              rows={2}
              placeholder="es. Graffio su paraurti, spia motore accesa..."
              value={noteInizio}
              onChange={(e) => setNoteInizio(e.target.value)}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E05353]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-md flex flex-col items-center justify-center transition-all"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploadProgressText}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Certifica 4 Lati & Inizia Turno
              </span>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}