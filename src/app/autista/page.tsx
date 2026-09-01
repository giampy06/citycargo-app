'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import { LogOut, User, Truck, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function AutistaDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/autista/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/autista/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-300 text-sm">
        Verifica sessione di guida in corso...
      </div>
    );
  }

  const driverDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Autista';

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-6 max-w-xl mx-auto pb-24">
      {/* Header Autista */}
      <div className="flex justify-between items-center bg-[#1E293B] border border-slate-700/60 rounded-2xl p-4 mb-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-600/20 border border-red-500/40 rounded-xl flex items-center justify-center text-red-500 font-bold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base capitalize">{driverDisplayName}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2 text-xs"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Esci</span>
        </button>
      </div>

      {/* Pulsanti Rapidi Turno */}
      <div className="space-y-4 mb-6">
        <Link
          href="/checkin"
          className="block bg-gradient-to-r from-emerald-600 to-teal-700 p-5 rounded-2xl shadow-lg hover:opacity-95 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Inizio Turno (Check-in)</h3>
                <p className="text-xs text-emerald-100">Registra mezzo e km partenza</p>
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-white/80" />
          </div>
        </Link>

        <Link
          href="/checkout"
          className="block bg-gradient-to-r from-amber-600 to-orange-700 p-5 rounded-2xl shadow-lg hover:opacity-95 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Fine Turno (Check-out)</h3>
                <p className="text-xs text-amber-100">Registra rientro e km finali</p>
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-white/80" />
          </div>
        </Link>
      </div>

      {/* Buste Paga */}
      <Link
        href="/autista/cedolini"
        className="block bg-[#1E293B] border border-slate-700/60 p-5 rounded-2xl hover:border-slate-500 transition shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/10 text-red-500 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Le mie Buste Paga</h4>
              <p className="text-xs text-slate-400">Consulta e firma i cedolini</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-red-600/20 text-red-400 px-3 py-1.5 rounded-full border border-red-500/30">
            Visualizza
          </span>
        </div>
      </Link>
    </div>
  );
}