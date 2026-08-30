import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  Trash2,
  MapPin,
  Clock,
  Calendar,
  Navigation,
  ExternalLink,
  Truck,
  Building2,
  Route as RouteIcon,
  RefreshCw,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronDown,
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  X,
  Send,
} from 'lucide-react'
import './DriverDashboard.css'
import RouteMap from './RouteMap'
import { useAuth } from '../../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLabel(dateStr) {
  if (dateStr) {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      // ignore
    }
  }
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getNavigationUrl(stop) {
  if (!stop || stop.lat == null || stop.lng == null) return '#'
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`
}

function getFullRouteNavigationUrl(depot, stops) {
  if (!stops || stops.length === 0) return '#'
  const origin = `${depot?.lat || 12.9040},${depot?.lng || 74.8560}`
  const destination = origin
  const waypoints = stops.map(s => `${s.lat},${s.lng}`).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
}

export default function DriverDashboard() {
  const { session, loading: authLoading } = useAuth()
  const [routeData, setRouteData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState(null)
  const [selectedStopId, setSelectedStopId] = useState(null)

  // Hotspot Pinning State
  const [isPinningHotspot, setIsPinningHotspot] = useState(false)
  const [pinnedLocation, setPinnedLocation] = useState(null)
  const [timesFoundDirty, setTimesFoundDirty] = useState(1)
  const [hotspotNotes, setHotspotNotes] = useState('')
  const [submittingHotspot, setSubmittingHotspot] = useState(false)
  const [hotspotsList, setHotspotsList] = useState([])
  const [toast, setToast] = useState(null)

  const isAdmin = session?.user?.role === 'admin'

  // Fetch existing hotspots
  const fetchHotspots = async () => {
    try {
      const res = await fetch('/get/hotspots', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setHotspotsList(data)
      }
    } catch {
      // ignore
    }
  }

  // Fetch driver route data from API
  const fetchDriverRoute = async (driverId = null) => {
    setLoading(true)
    setError('')
    try {
      const url = (isAdmin && driverId)
        ? `/api/drivers/${driverId}/route`
        : `/api/drivers/me/route`

      const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('You only have permission to view your own assigned driver route.')
        }
        throw new Error(`Failed to load driver route (Status: ${res.status})`)
      }

      const data = await res.json()
      setRouteData(data)
      if (data.driver?.driver_id && !selectedDriverId) {
        setSelectedDriverId(data.driver.driver_id)
      }
    } catch (err) {
      console.error('Error fetching driver route:', err)
      setError(err.message || 'Could not load your assigned route.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchDriverRoute(isAdmin ? selectedDriverId : null)
      fetchHotspots()
    }
  }, [session, selectedDriverId, isAdmin])

  // Handle map click when in pinning mode
  const handleMapClickForHotspot = (coords) => {
    setPinnedLocation(coords)
  }

  // Submit hotspot report
  const handleSubmitHotspot = async (e) => {
    if (e) e.preventDefault()
    if (!pinnedLocation) return

    setSubmittingHotspot(true)
    try {
      const res = await fetch('/get/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          latitude: pinnedLocation.lat,
          longitude: pinnedLocation.lng,
          times_found_dirty: Number(timesFoundDirty) || 1,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to submit hotspot report (Status: ${res.status})`)
      }

      const newHotspot = await res.json()
      setHotspotsList((prev) => [...prev, newHotspot])
      setToast({
        type: 'success',
        msg: `🎉 Hotspot #${newHotspot.id} successfully pinned and saved to municipal database!`,
      })
      setTimeout(() => setToast(null), 5000)

      // Reset pinning mode
      setIsPinningHotspot(false)
      setPinnedLocation(null)
      setHotspotNotes('')
    } catch (err) {
      console.error('Submit hotspot error:', err)
      setToast({ type: 'error', msg: err.message || 'Could not save hotspot.' })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setSubmittingHotspot(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-green-400" />
          <span>Checking authorization…</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const driver = routeData?.driver || {
    name: session?.user?.name || 'Driver',
    phone: '9876543210',
    shift: 'Morning Shift (06:00 – 14:00)',
    status: 'ACTIVE',
  }

  const assignment = routeData?.assignment || {
    vehicleNumber: 'KA19AB1234',
    sector: 'Mangalore Central & Commercial Belt',
    zone: 'Mangaluru Zone 1',
    depotName: 'Central Waste Hub, Derebail',
    totalDistanceKm: 12.5,
    capacityKg: 5000,
  }

  const depot = routeData?.depot || {
    lat: 12.9040,
    lng: 74.8560,
    name: 'Central Waste Hub, Derebail',
  }

  const stops = routeData?.stops || []
  const allDrivers = routeData?.all_drivers || []

  return (
    <div className="driver-dashboard-container min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-24 pb-20 space-y-6">

        {/* ── Toast Notification ────────────────────────────────────────────── */}
        {toast && (
          <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-2xl transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span className="font-medium">{toast.msg}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white">✕</button>
          </div>
        )}

        {/* ── Driver / Admin Role Bar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-green-400 uppercase tracking-widest mb-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
              Live Garbage Collection Route
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Driver Path: <span className="text-green-400">{driver.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-green-400" />
                {todayLabel(routeData?.route_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-white/40" />
                {driver.shift}
              </span>
            </div>
          </div>

          {/* Action Buttons: Report Hotspot + Driver Badge / Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 🔴 Report Hotspot Button */}
            <button
              type="button"
              onClick={() => {
                setIsPinningHotspot(!isPinningHotspot)
                if (isPinningHotspot) setPinnedLocation(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                isPinningHotspot
                  ? 'bg-amber-400 text-black shadow-amber-500/40 animate-pulse'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
              }`}
            >
              <Flame className={`w-4 h-4 ${isPinningHotspot ? 'text-black' : 'text-red-400'}`} />
              <span>{isPinningHotspot ? '✕ Cancel Pinning' : '📍 Report Hotspot'}</span>
            </button>

            {isAdmin && allDrivers.length > 0 ? (
              <div className="flex items-center gap-2 bg-white/5 border border-purple-500/30 rounded-xl px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] text-purple-300 font-semibold uppercase">Admin Switch Driver View</p>
                  <select
                    value={selectedDriverId || ''}
                    onChange={(e) => setSelectedDriverId(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
                  >
                    {allDrivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id} className="bg-zinc-900 text-white">
                        {d.name} ({d.vehicle_number})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/5 border border-green-500/30 rounded-xl px-3.5 py-2 text-xs">
                <Truck className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-[10px] text-white/50 font-medium">Assigned Vehicle</p>
                  <p className="font-bold text-green-400">{assignment.vehicleNumber}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => fetchDriverRoute(isAdmin ? selectedDriverId : null)}
              title="Refresh Route"
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-green-500/40 text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Hotspot Pinning Instruction Banner ────────────────────────────── */}
        {isPinningHotspot && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Flame className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">
                  {pinnedLocation ? 'Location Pin Dropped!' : 'Pinpoint Hotspot Mode Active'}
                </p>
                <p className="text-xs text-white/70">
                  {pinnedLocation
                    ? `Pinned at Lat: ${pinnedLocation.lat.toFixed(5)}, Lng: ${pinnedLocation.lng.toFixed(5)}. Adjust severity below and click Save.`
                    : 'Click anywhere on the map below to pinpoint an overflowing waste spot.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPinningHotspot(false)
                  setPinnedLocation(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Hotspot Submission Card (Appears after pin is dropped) ────────── */}
        {isPinningHotspot && pinnedLocation && (
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Flame className="w-5 h-5 text-red-400" />
                <span>Submit Hotspot Report</span>
              </div>
              <span className="font-mono text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {pinnedLocation.lat.toFixed(4)}, {pinnedLocation.lng.toFixed(4)}
              </span>
            </div>

            <form onSubmit={handleSubmitHotspot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Waste Accumulation Severity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 1, label: 'Moderate Overflow', desc: '1x Dirty Count' },
                    { val: 2, label: 'Heavy Accumulation', desc: '2x Dirty Count' },
                    { val: 3, label: 'Critical Blackspot', desc: '3x Dirty Count' },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setTimesFoundDirty(s.val)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        timesFoundDirty === s.val
                          ? 'bg-red-500/20 border-red-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <p className="text-xs font-bold">{s.label}</p>
                      <p className="text-[10px] text-white/40">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Driver Observations / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={hotspotNotes}
                  onChange={(e) => setHotspotNotes(e.target.value)}
                  placeholder="e.g. Commercial waste overflow near road junction"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPinnedLocation(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70"
                >
                  Reposition Pin
                </button>
                <button
                  type="submit"
                  disabled={submittingHotspot}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-red-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingHotspot ? 'Saving to Database…' : 'Save Hotspot to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            {isAdmin && (
              <Link
                to="/admin"
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold whitespace-nowrap"
              >
                Go to Admin
              </Link>
            )}
          </div>
        )}

        {/* ── Vehicle & Route Summary Metrics ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Truck className="w-4 h-4 text-green-400" />
              Assigned Truck
            </div>
            <p className="text-lg font-bold font-mono text-white">{assignment.vehicleNumber}</p>
            <p className="text-[11px] text-white/40">{assignment.capacityKg} kg capacity</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <RouteIcon className="w-4 h-4 text-green-400" />
              Total Stops
            </div>
            <p className="text-lg font-bold font-mono text-white">{stops.length} Bins</p>
            <p className="text-[11px] text-green-400">Optimized by OR-Tools</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Navigation className="w-4 h-4 text-green-400" />
              Route Distance
            </div>
            <p className="text-lg font-bold font-mono text-white">{assignment.totalDistanceKm} km</p>
            <p className="text-[11px] text-white/40">Full round trip</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Trash2 className="w-4 h-4 text-green-400" />
              Est. Waste Load
            </div>
            <p className="text-lg font-bold font-mono text-white">{routeData?.total_estimated_volume_kg || 450} kg</p>
            <p className="text-[11px] text-white/40">ML predicted volume</p>
          </div>
        </div>

        {/* ── Interactive Route Map Component ───────────────────────────────── */}
        <RouteMap
          bins={stops}
          depot={depot}
          hotspots={hotspotsList}
          isPinningHotspot={isPinningHotspot}
          pinnedLocation={pinnedLocation}
          onMapClickForHotspot={handleMapClickForHotspot}
          onBinSelect={(id) => setSelectedStopId(id)}
        />

        {/* ── Ordered Collection Stops List ─────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Collection Sequence ({stops.length} Stops)
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Stops are ordered sequentially for maximum fuel efficiency and capacity.
              </p>
            </div>

            {stops.length > 0 && (
              <a
                href={getFullRouteNavigationUrl(depot, stops)}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/40 hover:bg-green-500/30 text-green-300 text-xs font-bold transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Entire Route in Google Maps</span>
              </a>
            )}
          </div>

          {stops.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <p className="text-white/60 font-semibold text-sm">No collection stops assigned today.</p>
              <p className="text-white/40 text-xs max-w-sm mx-auto">
                The administrative OR-Tools routing engine has not assigned any pending bins to this truck for today&apos;s date.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {stops.map((stop, idx) => {
                const isSelected = stop.id === selectedStopId
                const isFirst = idx === 0
                return (
                  <div
                    key={stop.id || idx}
                    onClick={() => setSelectedStopId(stop.id)}
                    className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-green-500/60 bg-green-500/10 shadow-[0_0_20px_rgba(74,222,128,0.15)]'
                        : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Sequence Badge */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                          isFirst
                            ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                            : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        #{stop.sequence_number || idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white leading-tight">{stop.location}</h3>
                          {isFirst && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 border border-amber-400/40 text-amber-300">
                              Next Stop
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-white/40" />
                          <span>{stop.address || 'Mangaluru Commercial Corridor'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {/* Fill Level Metric */}
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-white/40">Predicted Fill</p>
                        <p className="text-sm font-bold text-green-400 font-mono">
                          {stop.fill_pct ? stop.fill_pct.toFixed(0) + '%' : '85%'}
                        </p>
                      </div>

                      {/* Turn by turn nav button */}
                      <a
                        href={getNavigationUrl(stop)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Navigation className="w-3.5 h-3.5 text-green-400" />
                        <span>Navigate</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
