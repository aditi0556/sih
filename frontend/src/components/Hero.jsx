import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

export default function Hero() {
  const scrollToFeatures = () => {
    const el = document.getElementById('features')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative w-full h-screen min-h-[600px] flex flex-col items-center justify-center overflow-hidden">

      {/* Full-screen background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />

      {/* Dark gradient overlay — top darker for navbar readability, center slightly lighter */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* Subtle green tint overlay */}
      <div className="absolute inset-0 bg-green-950/20" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in-up">

        {/* Main title */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight leading-none mb-6">
          Care
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
            India
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl md:text-2xl text-white/70 font-light max-w-2xl mx-auto leading-relaxed mb-4">
          Every morning, our AI predicts which bins will overflow.
        </p>
        <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto leading-relaxed mb-10">
          Smart truck routing, real-time map views, and ML-powered scheduling —
          keeping India's cities cleaner, one pickup at a time.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/signup"
            className="px-8 py-3.5 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl text-sm shadow-[0_0_30px_rgba(74,222,128,0.4)] hover:shadow-[0_0_50px_rgba(74,222,128,0.6)] transition-all duration-300"
          >
            Get Started →
          </Link>
          <button
            onClick={scrollToFeatures}
            className="px-8 py-3.5 border border-white/25 hover:border-white/50 text-white/80 hover:text-white font-medium rounded-xl text-sm backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
          >
            Explore Features
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToFeatures}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors group"
        aria-label="Scroll down"
      >
        <span className="text-xs tracking-widest uppercase font-medium">Scroll</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </button>
    </section>
  )
}
