import { useRef, useEffect, useState } from 'react'
import {
  BrainCircuit,
  Route,
  Map,
  CalendarCheck,
  BarChart3,
  Bell,
  Truck,
  Trash2,
  Leaf,
  Shield,
  Zap,
  Users,
} from 'lucide-react'

const features = [
  {
    icon: BrainCircuit,
    title: 'ML Predictions',
    description: 'Daily forecasts of which dustbins will reach 90% capacity — before overflow happens.',
  },
  {
    icon: Route,
    title: 'Route Optimization',
    description: 'Graph-based shortest-path algorithms plan the most efficient truck collection routes.',
  },
  {
    icon: Map,
    title: 'Live Map View',
    description: 'Interactive UI map shows real-time bin status, fill levels, and active truck positions.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Scheduling',
    description: 'Auto-generated morning schedules ensure every at-risk bin is cleared before peak hours.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Historical fill-rate trends, fleet performance metrics, and zone-level insights at a glance.',
  },
  {
    icon: Bell,
    title: 'Overflow Alerts',
    description: 'Push notifications for high-risk overflow zones so teams can respond in real time.',
  },
]

/* Marquee logos — represent the tech/partner "cloud" in Aceternity style */
const marqueeTags = [
  { icon: Truck,        label: 'Fleet Management' },
  { icon: BrainCircuit, label: 'AI / ML Engine' },
  { icon: Map,          label: 'Map Visualization' },
  { icon: Leaf,         label: 'Eco Routing' },
  { icon: Shield,       label: 'Data Security' },
  { icon: Zap,          label: 'Real-time Updates' },
  { icon: Trash2,       label: 'Bin Monitoring' },
  { icon: Users,        label: 'Civic Collaboration' },
]

function FeatureCard({ icon: Icon, title, description, code, index, isHovered, onMouseEnter, onMouseLeave }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ transitionDelay: `${index * 80}ms` }}
      className={`relative z-10 rounded-2xl border p-6 transition-all duration-500
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${isHovered ? 'border-green-500/40 bg-white/[0.03] shadow-[0_8px_30px_rgba(74,222,128,0.15)]' : 'border-white/10 bg-transparent shadow-none'}
      `}
    >
      <div className="flex items-start justify-between mb-5">
        <span className="font-mono text-[11px] tracking-wider text-white/25">{code}</span>
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function HoverEffectGrid({ items }) {
  const containerRef = useRef(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [highlight, setHighlight] = useState({ top: 0, left: 0, width: 0, height: 0, opacity: 0 })

  const handleEnter = (index, e) => {
    const cardEl = e.currentTarget
    const containerEl = containerRef.current
    if (!cardEl || !containerEl) return
    const cardRect = cardEl.getBoundingClientRect()
    const containerRect = containerEl.getBoundingClientRect()
    setHighlight({
      top: cardRect.top - containerRect.top,
      left: cardRect.left - containerRect.left,
      width: cardRect.width,
      height: cardRect.height,
      opacity: 1,
    })
    setHoveredIndex(index)
  }
 
  const handleLeave = () => {
    setHoveredIndex(null)
    setHighlight((h) => ({ ...h, opacity: 0 }))
  }

  return (
    <div ref={containerRef} className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
      <div
        className="absolute rounded-2xl bg-green-500/[0.06] border border-green-500/30 pointer-events-none transition-all duration-300 ease-out"
        style={{
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          opacity: highlight.opacity,
        }}
      />
      {items.map((item, i) => (
        <FeatureCard
          key={item.title}
          {...item}
          index={i}
          isHovered={hoveredIndex === i}
          onMouseEnter={(e) => handleEnter(i, e)}
          onMouseLeave={handleLeave}
        />
      ))}
    </div>
  )
}

export default function FeaturesCloud() {
  /* Duplicate tags for seamless loop */
  const doubled = [...marqueeTags, ...marqueeTags]

  return (
    <section
      id="features"
      className="w-full bg-black py-32 px-4"
    >
      {/* Header */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Everything you need to manage
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
            India's waste, smarter.
          </span>
        </h2>
      </div>

      {/* Aceternity-style logo-cloud marquee row */}
      <div className="relative w-full overflow-hidden mb-20">
        {/* Left / right fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 h-full w-24 z-10 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-24 z-10 bg-gradient-to-l from-black to-transparent" />

        <div className="flex animate-marquee gap-6 w-max">
          {doubled.map(({ icon: Icon, label }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm whitespace-nowrap hover:border-green-500/40 hover:bg-green-500/5 transition-all duration-300 group cursor-default"
            >
              <Icon className="w-4 h-4 text-white/50 group-hover:text-green-400 transition-colors" />
              <span className="text-white/60 group-hover:text-white/90 text-sm font-medium transition-colors">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards grid with sliding hover highlight */}
      <HoverEffectGrid items={features} />
    </section>
  )
}