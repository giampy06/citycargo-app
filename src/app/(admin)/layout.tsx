'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/supabase';
import { Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecking, setAuthChecking] = useState(true);
  // Una volta verificato l'admin, i controlli successivi (cambio pagina, refresh del token)
  // sono silenziosi: mostrare di nuovo il caricamento smonterebbe la pagina e farebbe
  // perdere i moduli aperti.
  const giaAutorizzato = useRef(false);

  useEffect(() => {
    let attivo = true;

    async function checkAdminAuth() {
      if (!giaAutorizzato.current) setAuthChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          giaAutorizzato.current = false;
          router.replace('/login');
          return;
        }

        const { data: profilo } = await supabase
          .from('profili')
          .select('ruolo')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profilo?.ruolo !== 'admin') {
          giaAutorizzato.current = false;
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        giaAutorizzato.current = true;
        if (attivo) setAuthChecking(false);
      } catch (err) {
        giaAutorizzato.current = false;
        router.replace('/login');
      }
    }

    checkAdminAuth();

    // Riverifica ad ogni cambio di sessione (login/logout/cambio utente),
    // non solo al primo montaggio: senza questo, se nello stesso tab si
    // passa da una sessione admin a una sessione autista senza un reload
    // completo della pagina, il layout resterebbe "sbloccato" perché
    // React non lo rimonta tra route dello stesso gruppo.
    // Le chiamate a Supabase vanno rimandate fuori dal callback (setTimeout), altrimenti
    // getSession() può restare in attesa del lock tenuto durante l'evento e bloccarsi.
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (attivo) checkAdminAuth();
      }, 0);
    });

    return () => {
      attivo = false;
      authListener.subscription.unsubscribe();
    };
    // Riverifica anche ad ogni cambio di pagina, come ulteriore rete di sicurezza.
  }, [router, pathname]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center text-xs text-gray-500 font-bold">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#E05353]" />
        Verifica accesso amministratore...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F8F9FB]">
      <AdminSidebar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
