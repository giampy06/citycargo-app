'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1E242B] font-sans antialiased selection:bg-[#E05353] selection:text-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#E05353]" /> Informativa Privacy & GDPR
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">Ultimo aggiornamento: Settembre 2026</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 pb-24">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm space-y-8 text-sm text-gray-600 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="font-black text-base text-[#1E242B] uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4" /> 1. Titolare del Trattamento
            </h2>
            <p>
              Ai sensi dell'art. 13 del Regolamento (UE) 2016/679 (GDPR), si informa che i dati personali raccolti tramite l'applicazione "City Cargo" sono trattati dalla società titolare dell'appalto di trasporti. I dati verranno trattati nel rispetto della normativa vigente e degli obblighi di riservatezza.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-black text-base text-[#1E242B] uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> 2. Dati Raccolti e Finalità
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Dati Anagrafici e di Contatto:</strong> Nome, cognome, email, telefono, codice fiscale per la creazione e gestione dell'account lavorativo.</li>
              <li><strong>Documenti di Guida e Identità:</strong> Copia della Patente, CQC, Carta d'Identità, necessari per obblighi di legge e verifica dell'idoneità alla guida.</li>
              <li><strong>Dati Sanitari e di Sicurezza:</strong> Scadenza visite mediche del lavoro e corsi di sicurezza (D.Lgs 81/08).</li>
              <li><strong>Dati Operativi e di Geolocalizzazione:</strong> Registrazione orari dei turni, chilometri percorsi, targhe dei veicoli e foto peritali dei mezzi (per prevenzione danni e gestione della flotta).</li>
              <li><strong>Firma Digitale:</strong> Tracciamento IP, data, ora e tratto grafico per la presa visione di documenti aziendali e circolari.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-black text-base text-[#1E242B] uppercase tracking-wider">
              3. Base Giuridica del Trattamento
            </h2>
            <p>
              Il trattamento è lecito in quanto basato su: esecuzione del contratto di lavoro/collaborazione; adempimento di un obbligo legale (sicurezza sul lavoro e codice della strada); legittimo interesse del Titolare (tutela del patrimonio aziendale tramite perizie fotografiche dei furgoni).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-black text-base text-[#1E242B] uppercase tracking-wider">
              4. Conservazione dei Dati
            </h2>
            <p>
              I dati saranno conservati per tutta la durata del rapporto di collaborazione. Alla cessazione dello stesso, i dati contabili/amministrativi e i documenti firmati digitalmente saranno conservati per i termini previsti dalla legge (es. 10 anni). Le foto peritali dei veicoli verranno eliminate una volta decaduta la necessità di verifica danni.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-black text-base text-[#1E242B] uppercase tracking-wider">
              5. Diritti dell'Interessato
            </h2>
            <p>
              In ogni momento, l'utente (autista) può esercitare, ai sensi degli artt. 15-22 del GDPR, il diritto di: chiedere conferma dell'esistenza di propri dati; ottenere rettifica o cancellazione; opporsi al trattamento. Per esercitare i diritti è sufficiente contattare l'amministrazione tramite i canali ufficiali aziendali.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}