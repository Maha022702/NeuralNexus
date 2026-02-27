import Link from 'next/link'
import { Shield, Activity, Github, Globe } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-cyan-500/10 bg-[#020817]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-7 h-7 text-cyan-400" />
              <span className="font-bold text-xl gradient-text">NeuralNexus</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Adaptive Context-Aware Cybersecurity Orchestration System. 
              AI-driven threat detection with quantum-resistant encryption.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Link href="https://github.com/Maha022702/NeuralNexus" target="_blank" className="text-slate-500 hover:text-cyan-400 transition-colors">
                <Github className="w-5 h-5" />
              </Link>
              <Link href="https://neuralnexus.org.in" target="_blank" className="text-slate-500 hover:text-cyan-400 transition-colors">
                <Globe className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2">
              {['Features', 'How It Works', 'Performance', 'Pricing'].map(item => (
                <li key={item}>
                  <Link href={`/#${item.toLowerCase().replace(/ /g, '-')}`} className="text-slate-400 hover:text-cyan-400 text-sm transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {['Privacy Policy', 'Terms of Service', 'Patent APP001'].map(item => (
                <li key={item}>
                  <span className="text-slate-500 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-cyan-500/10 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            © 2026 NeuralNexus — Ajaysurya S · SRM IST Kattankulathur · Patent Pending (APP001)
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Activity className="w-3 h-3 text-green-400 pulse-glow" />
            <span>System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
