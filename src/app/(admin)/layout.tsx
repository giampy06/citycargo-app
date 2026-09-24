'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/supabase';
import { Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let attivo = true;

    async function checkAdminAuth() {
      setAuthChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }

        const { data: profilo } = await supabase
          .from('profili')
          .select('ruolo')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profilo?.ruolo !== 'admin') {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        if (attivo) setAuthChecking(false);
      } catch (err) {
        router.replace('/login');
      }
    }

    checkAdminAuth();

    // Riverifica ad ogni cambio di sessione (login/logout/cambio utente),
    // non solo al primo montaggio: senza questo, se nello stesso tab si
    // passa da una sessione admin a una sessione autista senza un reload
    // completo della pagina, il layout resterebbe "sbloccato" perché
    // React non lo rimonta tra route dello stesso gruppo.
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkAdminAuth();
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
