'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Shield, Menu, X, Activity } from 'lucide-react'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <Shield className="w-8 h-8 text-cyan-400" />
              <Activity className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
            </div>
            <span className="font-bold text-xl gradient-text">NeuralNexus</span>
            <span className="text-xs text-slate-500 ml-1 hidden sm:block">AC-COS</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">Features</Link>
            <Link href="/#how-it-works" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">How It Works</Link>
            <Link href="/#stats" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">Performance</Link>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-slate-300 hover:text-white text-sm transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link href="/signup" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-slate-400 hover:text-white">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-2 border-t border-cyan-500/10 pt-4">
            <Link href="/#features" onClick={() => setOpen(false)} className="block text-slate-400 hover:text-cyan-400 py-2 text-sm">Features</Link>
            <Link href="/#how-it-works" onClick={() => setOpen(false)} className="block text-slate-400 hover:text-cyan-400 py-2 text-sm">How It Works</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="block text-slate-300 py-2 text-sm">Sign In</Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="block bg-cyan-500 text-black font-semibold text-sm px-4 py-2 rounded-lg w-fit">Get Started</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
