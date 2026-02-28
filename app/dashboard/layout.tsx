'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, Activity, AlertTriangle, BarChart2, Server,
  Target, CheckCircle, Zap, Brain, Settings, LogOut,
  Menu, X, Bell, ChevronRight, Plug
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Overview', href: '/dashboard', icon: BarChart2 },
  { id: 'alerts', label: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle, badge: 3 },
  { id: 'assets', label: 'Asset Inventory', href: '/dashboard/assets', icon: Server },
  { id: 'threats', label: 'Threat Intelligence', href: '/dashboard/threats', icon: Target },
  { id: 'compliance', label: 'Compliance', href: '/dashboard/compliance', icon: CheckCircle },
  { id: 'playbooks', label: 'Playbooks', href: '/dashboard/playbooks', icon: Zap },
  { id: 'vectors', label: 'Vector Engine', href: '/dashboard/vectors', icon: Brain },
  { id: 'integrations', label: 'Integrations', href: '/dashboard/integrations', icon: Plug },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#020817] flex">
      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-300 flex-shrink-0 glass border-r border-cyan-500/10 flex flex-col min-h-screen fixed top-0 left-0 z-30`}>
        {/* Logo */}
        <div className="p-4 border-b border-cyan-500/10 flex items-center gap-3 h-16">
          <Link href="/" className="relative flex-shrink-0">
            <Shield className="w-8 h-8 text-cyan-400" />
            <Activity className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
          </Link>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="font-bold text-sm gradient-text truncate">NeuralNexus</div>
              <div className="text-xs text-slate-500">AC-COS v1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative ${
                isActive(item.href)
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {!sidebarOpen && item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-cyan-500/10 space-y-1">
          <Link href="/dashboard/settings" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
            <Settings className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-60' : 'ml-16'} transition-all duration-300`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass border-b border-cyan-500/10 px-6 py-0 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white transition-colors">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
              {pathname !== '/dashboard' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-300 capitalize">
                    {pathname.split('/').filter(Boolean).slice(1).join(' / ')}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-glow" />
              System Active
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xs font-bold">
              AJ
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
