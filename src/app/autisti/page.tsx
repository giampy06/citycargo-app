'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { Users, Phone, Mail, CreditCard, Calendar, ExternalLink, ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminAutistiPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDrivers(data);
    }
    setLoading(false);
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-7 h-7 text-red-500" />
                Anagrafica Personale & Autisti
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Controllo patenti, documenti e stato operativo</p>
            </div>
          </div>
          <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold">
            {drivers.length} Autisti Registrati
          </span>
        </div>

        {/* Griglia Autisti */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Caricamento elenco personale...</div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-20 bg-[#1E293B] rounded-2xl border border-slate-800 text-slate-400 text-sm">
            Nessun autista registrato finora.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((d) => {
              const expired = isExpired(d.license_expiry);
              return (
                <div key={d.id} className="bg-[#1E293B] border border-slate-700/70 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-white capitalize">{d.full_name}</h3>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md font-semibold uppercase">
                          {d.status || 'Attivo'}
                        </span>
                      </div>
                      {expired ? (
                        <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg">
                          <AlertTriangle className="w-3 h-3" /> Patente Scaduta
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg">
                          <ShieldCheck className="w-3 h-3" /> In Regola
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span>{d.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span>{d.phone || 'Non inserito'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span>CF: <strong className="text-white">{d.tax_code}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <span>Patente: <strong className="text-white">{d.license_number}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Scadenza: <strong className={expired ? 'text-red-400' : 'text-slate-200'}>{d.license_expiry}</strong></span>
                      </div>
                    </div>
                  </div>

                  {d.license_file_url && (
                    <div className="mt-5 pt-4 border-t border-slate-700/60">
                      <a
                        href={d.license_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition border border-slate-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                        Visualizza Documento Patente
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}