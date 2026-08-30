import { useState } from 'react'
import {
  Trash2,
  MapPin,
  CheckCircle2,
  Clock,
  Calendar,
  Navigation,
  ChevronRight,
  Check,
  Building2,
  Gauge,
  Truck,
  ExternalLink,
} from 'lucide-react'
import './DriverDashboard.css'
import RouteMap from './RouteMap'
import RouteCompletionSummary from './RouteCompletionSummary'

// ─── Mock data ────────────────────────────────────────────────────────────────
// Bins are pre-assigned by the system. The driver does not see fill percentages
// or prioritisation logic — they simply follow the sequence.

const DRIVER = {
  name: 'Rajesh Kumar',
  id: 'DRV-8492',
  shift: 'Morning Shift (06:00 – 14:00)',
}

const ASSIGNMENT = {
  vehicleNumber: 'KA-19-AB-1234',
  zone: 'Mangalore Zone 3',
  sector: 'Kadri & Bejai Commercial Belt',
  depotName: 'Central Waste Hub, Derebail',
  totalDistanceKm: 18.4,
}

// Depot and driver location: defined here (dashboard is the single source of truth).
// Replace with values from the backend assignment API when wired.
const MOCK_DEPOT = {
  lat: 12.9040,
  lng: 74.8560,
  name: 'Central Waste Hub, Derebail',
}

// Mock driver GPS location — will be replaced by real-time GPS heartbeat.
const MOCK_CURRENT_LOCATION = { lat: 12.8760, lng: 74.8502 }

// Initial bins: first bin is NEXT, all others PENDING.
// Status values: 'NEXT' | 'PENDING' | 'COLLECTED'
const INITIAL_BINS = [
  { id: 1,  code: 'BIN-101', location: 'Bejai Market Complex',          address: 'Main Road, Bejai',           lat: 12.8721, lng: 74.8434, status: 'NEXT'    },
  { id: 2,  code: 'BIN-102', location: 'KSRTC Bus Stand East Gate',     address: 'Bejai Cave Road',             lat: 12.8842, lng: 74.8553, status: 'PENDING' },
  { id: 3,  code: 'BIN-103', location: 'Bejai Church Circle',           address: 'Church Road, Bejai',          lat: 12.8786, lng: 74.8480, status: 'PENDING' },
  { id: 4,  code: 'BIN-104', location: 'MCC Office Complex',            address: 'Lalbagh, Mangalore',          lat: 12.8965, lng: 74.8445, status: 'PENDING' },
  { id: 5,  code: 'BIN-105', location: 'Kadri Park Main Gate',          address: 'Kadri Park Road',             lat: 12.8850, lng: 74.8486, status: 'PENDING' },
  { id: 6,  code: 'BIN-108', location: 'Kadri Market Gate 2',           address: 'Kadri Temple Road',           lat: 12.8870, lng: 74.8510, status: 'PENDING' },
  { id: 7,  code: 'BIN-109', location: 'Kadri Hills Apartment Complex', address: 'Circuit House Road',          lat: 12.8910, lng: 74.8530, status: 'PENDING' },
  { id: 8,  code: 'BIN-112', location: 'Mallikatta Junction North',     address: 'Mallikatta Main Cross',       lat: 12.8780, lng: 74.8620, status: 'PENDING' },
  { id: 9,  code: 'BIN-115', location: 'Shivabagh Food Street',         address: 'Shivabagh 1st Cross',        lat: 12.8740, lng: 74.8590, status: 'PENDING' },
  { id: 10, code: 'BIN-118', location: 'Nanthoor Circle East',          address: 'NH 66 Bypass Junction',      lat: 12.8660, lng: 74.8640, status: 'PENDING' },
  { id: 11, code: 'BIN-121', location: 'Bikarnakatte Market',           address: 'Bikarnakatte Main Road',     lat: 12.8600, lng: 74.8700, status: 'PENDING' },
  { id: 12, code: 'BIN-124', location: 'Kulshekar Housing Colony',      address: 'Kulshekar Bus Stop',         lat: 12.8550, lng: 74.8750, status: 'PENDING' },
  { id: 13, code: 'BIN-127', location: 'Shaktinagar Industrial Estate', address: 'Shaktinagar Gate 1',         lat: 12.8490, lng: 74.8900, status: 'PENDING' },
  { id: 14, code: 'BIN-130', location: 'Padil Rail Overbridge South',   address: 'Padil Junction',             lat: 12.8487, lng: 74.9006, status: 'PENDING' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/**
 * Builds an external navigation URL (Google Maps directions) using bin coordinates.
 * Structured so destination coordinates (lat, lng) can later come directly from the backend API.
 */
function getNavigationUrl(bin) {
  if (!bin || bin.lat == null || bin.lng == null) return '#'
  return `https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DriverDashboard() {
  const [bins, setBins] = useState(INITIAL_BINS)
  const [routeStarted, setRouteStarted] = useState(false)
  const [shiftFinished, setShiftFinished] = useState(false)
  const [shiftStartTime, setShiftStartTime] = useState('')
  const [toast, setToast] = useState('')

  // Derived counts
  const total     = bins.length
  const collected = bins.filter(b => b.status === 'COLLECTED').length
  const remaining = total - collected
  const pct       = Math.round((collected / total) * 100)
  const allDone   = collected === total

  const nextBin = bins.find(b => b.status === 'NEXT')

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleStartRoute() {
    setRouteStarted(true)
    setShiftStartTime(nowTime())
    showToast(`Route started — navigating to stop #1`)
  }

  function handleMarkCollected(binId) {
    setBins(prev => {
      const updated = prev.map(b =>
        b.id === binId
          ? { ...b, status: 'COLLECTED', collectedAt: nowTime() }
          : b
      )
      // Promote the next PENDING bin to NEXT
      const nextPendingIndex = updated.findIndex(b => b.status === 'PENDING')
      if (nextPendingIndex !== -1) {
        updated[nextPendingIndex] = { ...updated[nextPendingIndex], status: 'NEXT' }
        showToast(`Stop #${nextPendingIndex + 1} is your next location`)
      } else {
        showToast('All bins collected — great work today!')
      }
      return updated
    })
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="driver-dashboard-container min-h-screen bg-black text-white">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-5 py-3 rounded-xl bg-zinc-900 border border-green-500/40 text-green-400 text-sm shadow-lg animate-fade-in-up">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-20 pb-16 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-400 uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
            Today&apos;s Assignment
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Good morning, <span className="text-green-400">{DRIVER.name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-green-400" />
              {todayLabel()}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white/40" />
              {DRIVER.shift}
            </span>
          </div>
        </div>

        {/* ── Assignment info bar ─────────────────────────────────────────── */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/50">Assigned Vehicle</p>
              <p className="text-sm font-bold text-white font-mono tracking-wide">{ASSIGNMENT.vehicleNumber}</p>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/50">Collection Area</p>
              <p className="text-sm font-bold text-white">{ASSIGNMENT.sector}</p>
              <p className="text-xs text-white/50">{ASSIGNMENT.zone} · {ASSIGNMENT.totalDistanceKm} km route</p>
            </div>
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">

          <div className="glass-panel p-5 rounded-2xl text-center">
            <p className="text-3xl font-extrabold text-white">{total}</p>
            <p className="text-xs text-white/50 mt-1">Bins Assigned</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-center border-emerald-500/20 hover:border-emerald-500/30 transition-colors">
            <p className="text-3xl font-extrabold text-emerald-400">{collected}</p>
            <p className="text-xs text-emerald-400/70 mt-1">Collected</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl text-center border-amber-500/20 hover:border-amber-500/30 transition-colors">
            <p className="text-3xl font-extrabold text-amber-400">{remaining}</p>
            <p className="text-xs text-amber-400/70 mt-1">Remaining</p>
          </div>

        </div>

        {/* ── Progress + CTA ──────────────────────────────────────────────── */}
        <div className="glass-panel-glow p-6 sm:p-8 rounded-3xl space-y-5">

          {/* Progress label */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Route Progress
            </span>
            <span className="text-2xl font-black text-green-400">{pct}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-black/60 rounded-full h-4 p-0.5 border border-white/10 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full progress-bar-fill shadow-[0_0_15px_rgba(74,222,128,0.5)]"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-white/50">
            <span>{collected} of {total} bins collected</span>
            {allDone && <span className="text-green-400 font-semibold">All done for today ✓</span>}
          </div>

          {/* Main CTA */}
          {!allDone && (
            <button
              type="button"
              onClick={routeStarted ? undefined : handleStartRoute}
              disabled={routeStarted}
              className={`start-route-btn-glow w-full py-4 rounded-2xl font-extrabold text-base transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] ${
                routeStarted
                  ? 'bg-white/10 text-white/60 border border-white/15 cursor-default shadow-none'
                  : 'bg-green-500 hover:bg-green-400 text-black cursor-pointer shadow-[0_0_30px_rgba(74,222,128,0.4)] hover:shadow-[0_0_50px_rgba(74,222,128,0.7)]'
              }`}
            >
              <Navigation className={`w-5 h-5 ${routeStarted ? '' : 'fill-black'}`} />
              {routeStarted ? 'Route In Progress' : "Start Today's Route"}
              {!routeStarted && <ChevronRight className="w-5 h-5" />}
            </button>
          )}

        </div>

        {/* ── Next stop ───────────────────────────────────────────────────── */}
        {nextBin && (
          <div className="glass-panel border border-amber-500/30 p-6 rounded-3xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Next Stop</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-400 border border-amber-400/30">
                STOP #{bins.findIndex(b => b.id === nextBin.id) + 1}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">{nextBin.location}</h2>
              <p className="text-sm text-white/60 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-white/40 flex-shrink-0" />
                {nextBin.address}
              </p>
              <p className="text-xs text-white/40 mt-1 font-mono">{nextBin.code}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href={getNavigationUrl(nextBin)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] no-underline"
              >
                <Navigation className="w-4 h-4 fill-black" />
                <span>Navigate to Next Stop</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => handleMarkCollected(nextBin.id)}
                className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Mark as Collected</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Route Completion Summary (appears when all bins are collected) ── */}
        {allDone && (
          <RouteCompletionSummary
            total={total}
            collected={collected}
            pct={pct}
            shiftStart={shiftStartTime || '06:00 AM'}
            completedAt={bins.filter(b => b.completedAt).slice(-1)[0]?.completedAt}
            finished={shiftFinished}
            onFinishShift={() => {
              setShiftFinished(true)
              showToast('Shift completed! Great job today.')
            }}
          />
        )}

        {/* ── Route Map ───────────────────────────────────────────────────── */}
        {/* bins is the same state array driving the stop list below — status changes */}
        {/* (COLLECTED, NEXT, PENDING) propagate to the map automatically via props.   */}
        <RouteMap
          bins={bins}
          depot={MOCK_DEPOT}
          currentLocation={MOCK_CURRENT_LOCATION}
        />

        {/* ── Bin stop list ───────────────────────────────────────────────── */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4">

          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Today&apos;s Assigned Stops</h2>
              <p className="text-xs text-white/50 mt-0.5">{ASSIGNMENT.sector}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Done ({collected})
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Left ({remaining})
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {bins.map((bin, index) => {
              const isDone = bin.status === 'COLLECTED'
              const isNext = bin.status === 'NEXT'

              return (
                <div
                  key={bin.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                    isDone
                      ? 'bg-white/[0.02] border-white/5 opacity-55'
                      : isNext
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {/* Left: sequence + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-extrabold text-sm ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isNext
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/10 text-white/60 border border-white/10'
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{bin.location}</span>
                        {isNext && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400 text-black uppercase tracking-wider flex-shrink-0">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {bin.address}
                        <span className="text-white/30 font-mono ml-1">{bin.code}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: status or action */}
                  <div className="flex-shrink-0">
                    {isDone ? (
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {bin.collectedAt}
                      </span>
                    ) : isNext ? (
                      <button
                        type="button"
                        onClick={() => handleMarkCollected(bin.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all cursor-pointer active:scale-95"
                      >
                        Collect
                      </button>
                    ) : (
                      <span className="text-xs text-white/30 bg-white/5 px-2.5 py-1.5 rounded-lg">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
