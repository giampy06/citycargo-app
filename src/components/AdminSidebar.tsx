'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/supabase';
import {
  LayoutDashboard,
  Truck,
  Users,
  CalendarCheck,
  Receipt,
  FileSignature,
  FileText,
  BarChart3,
  MapPin,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Control Room', icon: LayoutDashboard },
  { href: '/flotta', label: 'Flotta', icon: Truck },
  { href: '/permessi', label: 'Permessi ZTL', icon: MapPin },
  { href: '/autisti', label: 'Autisti', icon: Users },
  { href: '/presenze', label: 'Presenze', icon: CalendarCheck },
  { href: '/spese', label: 'Spese', icon: Receipt },
  { href: '/cedolini', label: 'Cedolini', icon: FileSignature },
  { href: '/documenti', label: 'Documenti', icon: FileText },
  { href: '/report-autisti', label: 'Report Autisti', icon: BarChart3 },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <div className="px-5 py-6 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1.5 shrink-0">
          <img src="/logo.png" alt="City Cargo" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-extrabold text-sm leading-tight">City Cargo</p>
          <p className="text-[10px] text-white/40 font-medium">Admin Hub</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isActive(href)
                ? 'bg-[#E05353] text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Esci
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Sidebar fissa — solo desktop/tablet largo */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0 bg-[#1E242B] text-white">
        <SidebarContent />
      </aside>

      {/* Topbar con hamburger — solo schermi piccoli */}
      <div className="md:hidden sticky top-0 z-40 bg-[#1E242B] text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shrink-0">
            <img src="/logo.png" alt="City Cargo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-sm">City Cargo</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Apri menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full bg-[#1E242B] text-white flex flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/70"
              aria-label="Chiudi menu"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
