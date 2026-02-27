import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  Shield, Brain, Zap, Lock, Activity, Globe, ChevronRight,
  Eye, Database, GitBranch, CheckCircle, AlertTriangle, TrendingDown,
  Clock, DollarSign, Target, Server
} from 'lucide-react'

export default function LandingPage() {
  const features = [
    {
      icon: Brain,
      title: 'Semantic Vector Intelligence',
      desc: 'BERT-powered 128-dim embeddings capture 13 dimensions of organizational context — users, IPs, behaviors, relationships, and more.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      icon: Activity,
      title: 'LSTM Threat Prediction',
      desc: 'Time-series neural networks predict attacks 30% earlier than traditional SIEMs by learning temporal behavior patterns.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: Zap,
      title: 'Automated Orchestration',
      desc: 'n8n-powered playbooks auto-respond in <5 minutes — block, quarantine, isolate, patch, revoke, snapshot — no human needed.',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
    {
      icon: Lock,
      title: 'Quantum-Resistant Encryption',
      desc: 'CRYSTALS-Kyber-768 + Dilithium post-quantum cryptography ensures your data is safe from future quantum attacks.',
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    {
      icon: GitBranch,
      title: 'Blockchain Integrity',
      desc: 'Every log entry is anchored on Hyperledger Fabric, providing tamper-proof audit trails for compliance and forensics.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: Eye,
      title: 'Deception Technology',
      desc: 'Honeypots, honeytokens, and honeyfiles lure attackers into revealing themselves while your real assets stay protected.',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    {
      icon: Globe,
      title: 'Federated Threat Sharing',
      desc: 'Zero-knowledge proofs enable anonymous threat intelligence sharing across organizations without exposing private data.',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      icon: Database,
      title: 'Tiered Smart Storage',
      desc: 'AWS S3 hot/warm + Glacier cold storage with Zstandard compression (60% reduction) and RL-based pruning (25% more).',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
    },
  ]

  const stats = [
    { label: 'False Positive Reduction', value: '50–70%', sub: 'vs 60–80% industry baseline', icon: TrendingDown, color: 'text-green-400' },
    { label: 'Mean Time to Respond', value: '<5 min', sub: 'vs 24–48 hours baseline', icon: Clock, color: 'text-cyan-400' },
    { label: 'Zero-Day Detection', value: '80–99%', sub: 'vs 20–30% industry baseline', icon: Target, color: 'text-purple-400' },
    { label: 'Annual Cost (1K endpoints)', value: '₹2L', sub: 'vs ₹10L+ (Splunk)', icon: DollarSign, color: 'text-yellow-400' },
    { label: 'Attack Resilience', value: '99%', sub: 'vs 30–40% baseline', icon: Shield, color: 'text-red-400' },
    { label: 'Deployment Time', value: '1–2 wks', sub: 'vs 6–12 months baseline', icon: Server, color: 'text-blue-400' },
  ]

  const steps = [
    { step: '01', title: 'Asset Discovery', desc: 'Auto-discover all endpoints, users, and services via SNMP, AD, and cloud APIs.' },
    { step: '02', title: 'BERT Vectorization', desc: 'Convert all logs and context into 128-dim semantic vectors across 13 dimensions.' },
    { step: '03', title: 'FAISS Indexing', desc: 'Store vectors in FAISS for millisecond similarity search across terabytes of data.' },
    { step: '04', title: 'LSTM Detection', desc: 'Neural networks analyze time-series patterns to predict threats 30% earlier.' },
    { step: '05', title: 'Auto Response', desc: 'n8n playbooks fire automatically — containment in under 5 minutes.' },
    { step: '06', title: 'Continuous Learning', desc: 'RL feedback loop + dark web monitoring keeps the system ahead of new threats.' },
  ]

  return (
    <div className="min-h-screen bg-[#020817] cyber-grid">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-cyan-500/30 text-xs text-cyan-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-glow" />
            Patent Pending · IDF 25230 · SRM IST · AC-COS
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            The Future of{' '}
            <span className="gradient-text">Cybersecurity</span>
            <br />
            is Context-Aware
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            AC-COS unifies your entire security stack with AI-powered semantic vectors,
            LSTM threat prediction, and automated response — reducing false positives by 70%
            and responding to threats in under 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-lg transition-all glow-cyan hover:scale-105">
              Launch Dashboard
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link href="/#how-it-works" className="inline-flex items-center gap-2 glass border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 font-semibold px-8 py-4 rounded-xl text-lg transition-all">
              See How It Works
            </Link>
          </div>

          {/* Mini stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { v: '80–99%', l: 'Zero-Day Detection' },
              { v: '<5 min', l: 'Auto Response' },
              { v: '₹2L/yr', l: 'Per 1K Endpoints' },
            ].map(s => (
              <div key={s.l} className="glass rounded-xl p-4">
                <div className="text-2xl font-bold gradient-text">{s.v}</div>
                <div className="text-xs text-slate-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alert Banner ── */}
      <section className="px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 font-medium">Live Threat Intelligence:</span>
            <span className="text-slate-400">Ransomware incidents surged 25% YoY in 2025 (4,701 cases). Traditional SIEMs miss 70–80% of zero-day attacks. AC-COS was built to close this gap.</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              8-Layer <span className="gradient-text">Security Architecture</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Each layer is independently powerful. Together, they form an adaptive intelligence
              that no single prior art — or combination — has ever achieved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(f => (
              <div key={f.title} className={`glass rounded-2xl p-5 border hover:scale-[1.02] transition-transform ${f.bg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.bg}`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="stats" className="py-24 px-6 bg-gradient-to-b from-transparent to-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Performance <span className="gradient-text">vs Industry</span>
            </h2>
            <p className="text-slate-400">Designed to outperform Splunk, CrowdStrike, and Darktrace on every key metric.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map(s => (
              <div key={s.label} className="glass rounded-2xl p-6 hover:glow-cyan transition-all">
                <s.icon className={`w-8 h-8 ${s.color} mb-4`} />
                <div className={`text-4xl font-bold ${s.color} mb-1`}>{s.value}</div>
                <div className="text-white font-medium text-sm mb-1">{s.label}</div>
                <div className="text-slate-500 text-xs">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How <span className="gradient-text">AC-COS Works</span>
            </h2>
            <p className="text-slate-400">A continuous 6-step intelligence loop that gets smarter with every incident.</p>
          </div>

          <div className="space-y-4">
            {steps.map((s, i) => (
              <div key={s.step} className="glass rounded-2xl p-6 flex items-start gap-6 hover:border-cyan-500/30 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold text-sm">{s.step}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{s.title}</h3>
                    {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600" />}
                  </div>
                  <p className="text-slate-400 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prior Art ── */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            What <span className="gradient-text">No One Else</span> Has Done
          </h2>
          <p className="text-slate-400 mb-12">
            AC-COS was evaluated against 14 cited prior arts (FireEye, Darktrace, IBM, Cisco, Splunk, Arctic Wolf, Symantec and more).
            None of them — individually or combined — achieve this integration:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: 'Semantic Vector Context', desc: 'No prior art uses BERT + FAISS across 13 organizational dimensions for threat detection.' },
              { title: 'Adaptive RL Orchestration', desc: 'No prior art combines RL-based rule refinement with end-to-end response automation.' },
              { title: 'Quantum + Blockchain + XAI', desc: 'No prior art integrates CRYSTALS-Kyber, Hyperledger Fabric, and LIME/SHAP in a single platform.' },
            ].map(c => (
              <div key={c.title} className="glass rounded-2xl p-6 border border-purple-500/20">
                <CheckCircle className="w-8 h-8 text-purple-400 mb-4 mx-auto" />
                <h3 className="text-white font-semibold mb-2">{c.title}</h3>
                <p className="text-slate-400 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl p-12 border border-cyan-500/20 glow-cyan">
            <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-6 float" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Orchestrate Your Defense?
            </h2>
            <p className="text-slate-400 mb-8">
              Join the NeuralNexus pilot program. 100-endpoint deployment. Live dashboard.
              AI-powered protection from Day 1.
            </p>
            <Link href="/signup" className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105">
              Get Early Access
              <ChevronRight className="w-5 h-5" />
            </Link>
            <p className="text-slate-500 text-xs mt-4">SRM IST Pilot Program · Patent Pending · No credit card required</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
