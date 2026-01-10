"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, MessageSquareText, Code, LogOut, Palette, GraduationCap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Översikt', href: '/dashboard' },
  { icon: MessageSquareText, label: 'Inkomna Leads', href: '/dashboard/leads' },
  { icon: GraduationCap, label: 'Träna NORA', href: '/dashboard/training' }, // New
  { icon: Database, label: 'Kunskapsbas', href: '/dashboard/knowledge' },
  { icon: Palette, label: 'Utseende', href: '/dashboard/branding' }, // New
  { icon: Code, label: 'Installationskod', href: '/dashboard/install' },
];

export function DashboardSidebar() {
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  ));
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">NORA<span className="text-violet-500">.ai</span></h1>
        <p className="text-xs text-slate-500 mt-1">User Dashboard</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-violet-600/10 text-violet-400 font-medium border border-violet-600/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logga ut
        </button>
      </div>
    </aside>
  );
}
