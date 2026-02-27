import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeuralNexus — AC-COS | AI-Driven Cybersecurity Orchestration',
  description: 'Adaptive Context-Aware Cybersecurity Orchestration System. BERT vectors, LSTM threat prediction, quantum-resistant encryption.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#020817] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
