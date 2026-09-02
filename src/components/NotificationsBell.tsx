'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/supabase';
import { Bell } from 'lucide-react';

export default function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [avvisi, setAvvisi] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkScadenze() {
      try {
        const { data: veicoli } = await supabase.from('veicoli').select('*');
        const { data: autisti } = await supabase.from('profili').select('*');

        const oggi = new Date();
        let tempAvvisi: string[] = [];

        veicoli?.forEach((v: any) => {
          const targa = v.targa || 'Mezzo';
          if (v.scadenza_assicurazione) {
            const diff = Math.ceil((new Date(v.scadenza_assicurazione).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
            if (diff <= 15) tempAvvisi.push(`🚐 Furgone ${targa}: Assicurazione in scadenza (${v.scadenza_assicurazione})`);
          }
          if (v.scadenza_revisione) {
            const diff = Math.ceil((new Date(v.scadenza_revisione).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
            if (diff <= 15) tempAvvisi.push(`🚐 Furgone ${targa}: Revisione in scadenza (${v.scadenza_revisione})`);
          }
        });

        autisti?.forEach((a: any) => {
          const nome = `${a.nome || ''} ${a.cognome || ''}`.trim() || 'Autista';
          if (a.scadenza_patente) {
            const diff = Math.ceil((new Date(a.scadenza_patente).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
            if (diff <= 30) tempAvvisi.push(`👤 Autista ${nome}: Patente in scadenza (${a.scadenza_patente})`);
          }
          if (a.scadenza_visita_medica) {
            const diff = Math.ceil((new Date(a.scadenza_visita_medica).getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
            if (diff <= 30) tempAvvisi.push(`👤 Autista ${nome}: Visita medica in scadenza (${a.scadenza_visita_medica})`);
          }
        });

        setAvvisi(tempAvvisi);
      } catch (err) {
        console.error('Errore caricamento notifiche', err);
      } finally {
        setLoading(false);
      }
    }

    checkScadenze();
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-black transition-colors rounded-full hover:bg-gray-100"
        title="Notifiche scadenze"
      >
        <Bell className="w-6 h-6" />
        {avvisi.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {avvisi.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="font-semibold text-sm text-gray-800">Centro Notifiche</span>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-700 font-medium">
              {avvisi.length} attive
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 divide-y divide-gray-50">
            {loading ? (
              <p className="text-center text-xs text-gray-400 py-4">Controllo scadenze...</p>
            ) : avvisi.length === 0 ? (
              <div className="text-center py-6 px-4">
                <p className="text-sm font-medium text-green-600">🟢 Tutto ok!</p>
                <p className="text-xs text-gray-400 mt-1">Nessuna scadenza critica o imminente.</p>
              </div>
            ) : (
              avvisi.map((avviso, index) => (
                <div key={index} className="p-3 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">⚠️</span>
                  <p className="leading-relaxed font-medium">{avviso}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}