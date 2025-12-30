'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { STRINGS } from '@/lib/constants/strings';
import { STYLES, cn } from '@/lib/constants/styles';
import { LayoutDashboard, Home, Calendar, CreditCard, Settings, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { agent, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: STRINGS.dashboard.overview, href: '/dashboard', icon: LayoutDashboard },
    { name: STRINGS.dashboard.properties, href: '/dashboard/properties', icon: Home },
    { name: STRINGS.dashboard.showings, href: '/dashboard/showings', icon: Calendar },
    { name: STRINGS.dashboard.billing, href: '/dashboard/billing', icon: CreditCard },
    { name: STRINGS.dashboard.settings, href: '/dashboard/settings', icon: Settings },
    { name: STRINGS.dashboard.profile, href: '/dashboard/profile', icon: User },
  ];

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <ProtectedRoute>
      <div className={STYLES.dashboard.layout}>
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-40">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            {STRINGS.brand.name}
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          'fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          {/* Brand - Desktop Only */}
          <div className="hidden lg:block p-6 border-b border-gray-200">
            <h1 className={cn(STYLES.text.h3, 'bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent font-bold')}>
              {STRINGS.brand.name}
            </h1>
            {agent && (
              <p className={cn(STYLES.text.small, 'mt-1')}>{agent.name}</p>
            )}
          </div>

          {/* Mobile User Info */}
          <div className="lg:hidden p-6 border-b border-gray-200">
            {agent && (
              <p className="text-sm font-medium text-gray-900">{agent.name}</p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center space-x-3',
                    isActive ? STYLES.nav.linkActive : STYLES.nav.link
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer - Sign Out */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className={cn(STYLES.nav.link, 'w-full text-left flex items-center space-x-3')}
            >
              <LogOut className="w-5 h-5" />
              <span>{STRINGS.dashboard.signOut}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
          <div className={STYLES.dashboard.content}>
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
