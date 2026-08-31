'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase';
import { 
  Truck, 
  LogOut, 
  FileText, 
  Coins, 
  TrendingUp, 
  RefreshCw, 
  ChevronRight, 
  Edit3, 
  Check, 
  X,
  Clock
} from 'lucide-react';

export default function AutistaPage() {
  const [turniMese, setTurniMese] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [turnoAttivo, setTurnoAttivo] = useState<any | null>(null);

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editTarga, setEditTarga] = useState('');
  const [editKmInizio, setEditKmInizio] = useState('');
  const [editKmFine, setEditKmFine] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  const TARIFFA_GIORNATA_INTERA = 70.00; 
  const TARIFFA_MEZZA_GIORNATA = 40.00;
  const TARIFFA_STRAORDINARIO = 15.00;

  const fetchDatiAutista = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('turni_presenze')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const lista = data || [];
      setTurniMese(lista);

      const aperto = lista.find(t => t.stato === 'aperto');
      setTurnoAttivo(aperto || null);
    } catch (err) {
      console.error('Errore dati autista:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatiAutista();
  }, []);

  const handleSaveTurnoModificato = async (turno: any) => {
    const kmIniNum = Number(editKmInizio);
    const kmFinNum = editKmFine ? Number(editKmFine) : null;

    if (isNaN(kmIniNum) || kmIniNum <= 0) {
      alert('Inserisci un chilometraggio iniziale valido.');
      return;
    }

    if (kmFinNum !== null && (isNaN(kmFinNum) || kmFinNum < kmIniNum)) {
      alert(`I km finali non possono essere inferiori a quelli iniziali (${kmIniNum}).`);
      return;
    }

    setSavingShift(true);
    try {
      const payload: any = {
        targa_mezzo: editTarga.trim().toUpperCase(),
        km_inizio: kmIniNum,
      };

      if (kmFinNum !== null) {
        payload.km_fine = kmFinNum;
        payload.km_percorsi = kmFinNum - kmIniNum;
      }

      const { error } = await supabase
        .from('turni_presenze')
        .update(payload)
        .eq('id', turno.id);

      if (error) throw error;

      setEditingShiftId(null);
      fetchDatiAutista();
      alert('Dati turno aggiornati con successo!');
    } catch (err: any) {
      alert(`Errore aggiornamento: ${err.message}`);
    } finally {
      setSavingShift(false);
    }
  };

  const turniCompletati = turniMese.filter(t => t.stato === 'completato');
  const totaleMaturato = turniCompletati.reduce((acc, t) => {
    let quota = t.tipo_turno === 'mezza_giornata' ? TARIFFA_MEZZA_GIORNATA : TARIFFA_GIORNATA_INTERA;
    if (t.ha_straordinario) quota += TARIFFA_STRAORDINARIO;
    return acc + quota;
  }, 0);

  const kmTotaliMese = turniCompletati.reduce((acc, t) => acc + (Number(t.km_percorsi) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] font-sans antialiased pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E05353] text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
              CC
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight">Area Autista</h1>
              <p className="text-[11px] text-gray-400 font-medium">City Cargo Logistics</p>
            </div>
          </div>

          <button 
            onClick={fetchDatiAutista}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E05353]' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4">
        <div className="bg-[#1E242B] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
            <Coins className="w-40 h-40" />
          </div>

          <div className="flex items-center justify-between opacity-80 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Stima Compenso Maturato</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" /> Live
            </span>
          </div>

          <div className="text-3xl font-black tracking-tight">
            € {totaleMaturato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-400 text-[10px] uppercase font-bold">Giornate Lavorate</div>
              <div className="font-extrabold text-sm mt-0.5">{turniCompletati.length} turni</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] uppercase font-bold">Km Totali Mese</div>
              <div className="font-extrabold text-sm mt-0.5">+{kmTotaliMese} km</div>
            </div>
          </div>
        </div>

        {turnoAttivo ? (
          <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md inline-block">
                Turno In Corso
              </div>
              <div className="text-base font-extrabold">{turnoAttivo.targa_mezzo} ({turnoAttivo.appalto})</div>
              <div className="text-xs text-emerald-100">Inizio: {Number(turnoAttivo.km_inizio).toLocaleString('it-IT')} km</div>
            </div>
            <a 
              href="/checkout" 
              className="py-2.5 px-4 bg-white text-emerald-700 font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:bg-emerald-50 transition-colors"
            >
              Fine Turno
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex items-center justify-between text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> Nessun turno attivo
            </span>
            <span className="text-[11px] text-[#E05353] font-bold">Pronto per Check-in</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <a
            href="/checkin"
            className="bg-[#E05353] hover:bg-[#c94545] text-white rounded-3xl p-5 shadow-sm shadow-rose-200 flex flex-col justify-between h-32 transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Presa Mezzo</div>
              <div className="text-sm font-black mt-0.5">Inizio Turno</div>
            </div>
          </a>

          <a
            href="/checkout"
            className="bg-white hover:bg-gray-50 text-[#1E242B] border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-32 transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Riconsegna</div>
              <div className="text-sm font-black mt-0.5">Fine Turno</div>
            </div>
          </a>
        </div>

        <a
          href="/autista/cedolini"
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow block"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-[#1E242B]">I Miei Cedolini</div>
              <div className="text-[11px] text-gray-400 font-medium">Firma ricevuta e scarica PDF</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </a>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">I Tuoi Turni</h2>
            <span className="text-[10px] text-gray-400">Tocca matita per correggere</span>
          </div>

          <div className="divide-y divide-gray-50 text-xs">
            {turniMese.slice(0, 6).map((t) => (
              <div key={t.id} className="py-3.5 space-y-2">
                {editingShiftId === t.id ? (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Targa Mezzo</label>
                      <input 
                        type="text"
                        value={editTarga}
                        onChange={(e) => setEditTarga(e.target.value.toUpperCase())}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Km Inizio</label>
                        <input 
                          type="number"
                          value={editKmInizio}
                          onChange={(e) => setEditKmInizio(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Km Fine</label>
                        <input 
                          type="number"
                          value={editKmFine}
                          onChange={(e) => setEditKmFine(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button 
                        onClick={() => setEditingShiftId(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                      >
                        Annulla
                      </button>
                      <button 
                        onClick={() => handleSaveTurnoModificato(t)}
                        disabled={savingShift}
                        className="px-3 py-1.5 bg-[#E05353] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Salva Correzione
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                        <span>{t.targa_mezzo}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 rounded-md text-gray-600">
                          {t.appalto}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {Number(t.km_inizio).toLocaleString('it-IT')} km 
                        {t.km_fine ? ` → ${Number(t.km_fine).toLocaleString('it-IT')} km` : ' (Turno Aperto)'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600">
                        {t.km_percorsi ? `+${t.km_percorsi} km` : ''}
                      </span>
                      <button 
                        onClick={() => {
                          setEditingShiftId(t.id);
                          setEditTarga(t.targa_mezzo || '');
                          setEditKmInizio(t.km_inizio?.toString() || '');
                          setEditKmFine(t.km_fine?.toString() || '');
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Modifica Mezzo o Km"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}