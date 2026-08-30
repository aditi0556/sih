import { useEffect, useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { AlertTriangle, Trash2, CheckCircle2, Sparkles, Truck, Navigation, RefreshCw, ClipboardList } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const MAP_CENTER = [12.9141, 74.856] // Mangaluru, matches the seeded dustbin data
const MANGALURU_BOUNDS = [
  [12.75, 74.72],
  [13.05, 74.97],
]

function dustbinIcon(L) {
  return L.divIcon({
    className: '',
    html: `<svg width="22" height="26" viewBox="0 0 22 26" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="16" height="18" rx="1.5" fill="#ef4444"/>
      <path d="M1 6h20" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
      <path d="M8 2h6a2 2 0 0 1 2 2v2H6V4a2 2 0 0 1 2-2z" fill="#ef4444"/>
      <path d="M8 10v11M11 10v11M14 10v11" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
    iconSize: [22, 26],
    iconAnchor: [11, 26],
    popupAnchor: [0, -22],
  })
}
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }

    const existingScript = document.querySelector(`script[src="${LEAFLET_JS}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L))
      return
    }

    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => resolve(window.L)
    script.onerror = reject
    document.body.appendChild(script)
  })
}

export default function AdminDashboard() {
  const { session, loading } = useAuth()

  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  const [mapReady, setMapReady] = useState(false)
  const [dustbins, setDustbins] = useState([])
  const [hotspots, setHotspots] = useState([])
  const [error, setError] = useState('')
  const [approving, setApproving] = useState(new Set())

  const isAdmin = session?.user?.role === 'admin'

  // set up the map once, regardless of role — avoids flashing an empty
  // container while the session check resolves
  useEffect(() => {
    let cancelled = false

    loadLeaflet().then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return

      const map = L.map(mapContainerRef.current, {
        maxBounds: MANGALURU_BOUNDS,
        maxBoundsViscosity: 1.0, // fully solid — can't drag past the edge
        minZoom: 11,
      }).setView(MAP_CENTER, 12)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return

    fetch('/get/dustbins', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setDustbins)
      .catch(() => setError((prev) => prev || 'Could not load dustbin locations.'))

    fetch('/get/hotspots', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setHotspots)
      .catch(() => setError((prev) => prev || 'Could not load hotspots.'))
  }, [isAdmin])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const L = window.L
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = dustbins.map((bin) =>
      L.marker([bin.latitude, bin.longitude], { icon: dustbinIcon(L) }).addTo(mapRef.current)
    )

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [mapReady, dustbins])

  const [optimizing, setOptimizing] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [toast, setToast] = useState(null)

  const handlePredictDustbins = async () => {
    setPredicting(true)
    try {
      const res = await fetch('/api/predict-dustbin-fill', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setToast({
        type: 'success',
        msg: `ML Predictions updated for ${data.total_predicted || data.predictions?.length || 0} dustbins!`
      })
      setTimeout(() => setToast(null), 4000)
    } catch {
      setToast({
        type: 'error',
        msg: 'Failed to run ML fill prediction pipeline.'
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setPredicting(false)
    }
  }

  const handleOptimizeRoutes = async () => {
    setOptimizing(true)
    try {
      const res = await fetch('/api/routing/optimize', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setToast({
        type: 'success',
        msg: `Routes optimized! ${data.summary?.total_trucks_dispatched || data.saved_route_records || 4} truck routes dispatched.`
      })
      setTimeout(() => setToast(null), 4000)
    } catch {
      setToast({
        type: 'error',
        msg: 'Failed to run route optimization engine.'
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setOptimizing(false)
    }
  }

  const handleApprove = async (id) => {
    setApproving((prev) => new Set(prev).add(id))
    try {
      let res = await fetch(`/get/hotspots/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        res = await fetch(`/api/get/hotspots/${id}/approve`, {
          method: 'POST',
          credentials: 'include',
        })
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || `Failed to approve hotspot (Status: ${res.status})`)
      }
      const newDustbin = await res.json()
      setDustbins((prev) => {
        const exists = prev.some((d) => d.dustbin_id === newDustbin.dustbin_id)
        return exists ? prev : [...prev, newDustbin]
      })
      setHotspots((prev) => prev.filter((h) => h.id !== id))
      setToast({ type: 'success', msg: `Hotspot #${id} successfully approved and promoted to permanent dustbin!` })
      setTimeout(() => setToast(null), 4000)
    } catch (err) {
      console.error('Approve hotspot error:', err)
      setError(err.message || 'Could not approve hotspot.')
      setTimeout(() => setError(null), 5000)
    } finally {
      setApproving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading…</p>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-black pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all animate-bounce ${
            toast.type === 'error'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="w-5 h-5 text-green-400" />
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <p className="text-white/50 text-sm">
              Live dustbin locations across the city, plus zones flagged as recurring hotspots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePredictDustbins}
              disabled={predicting}
              className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {predicting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-400" />
              )}
              <span>{predicting ? 'Calculating ML Predictions…' : 'Run ML Prediction Model'}</span>
            </button>

            <button
              onClick={handleOptimizeRoutes}
              disabled={optimizing}
              className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] cursor-pointer disabled:opacity-50"
            >
              {optimizing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{optimizing ? 'Running ML & OR-Tools…' : 'Run Daily Route Optimization'}</span>
            </button>

            <Link
              to="/driver"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all no-underline"
            >
              <Truck className="w-4 h-4 text-green-400" />
              <span>View Driver Routes</span>
            </Link>

            <Link
              to="/survey"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all no-underline"
            >
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <span>Survey Team</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-[440px]" />
        </div>
        {!mapReady && <p className="text-white/30 text-xs mt-2">Loading map…</p>}

        <section className="mt-16">
          <h2 className="text-xl font-semibold text-white mb-4">Dustbins</h2>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-white/50 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Latitude</th>
                  <th className="px-6 py-3 font-medium">Longitude</th>
                  <th className="px-6 py-3 font-medium">Zone</th>
                  <th className="px-6 py-3 font-medium">Population</th>
                  <th className="px-6 py-3 font-medium">Days since collection</th>
                  <th className="px-6 py-3 font-medium">Previous day fill</th>
                </tr>
              </thead>
              <tbody>
                {dustbins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-white/30">
                      No dustbins recorded yet.
                    </td>
                  </tr>
                ) : (
                  dustbins.map((bin) => (
                    <tr
                      key={bin.dustbin_id}
                      className="border-t border-white/10 text-white/80 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-3">{bin.dustbin_id}</td>
                      <td className="px-6 py-3">{bin.latitude.toFixed(5)}</td>
                      <td className="px-6 py-3">{bin.longitude.toFixed(5)}</td>
                      <td className="px-6 py-3">{bin.zone_type ?? '—'}</td>
                      <td className="px-6 py-3">{bin.population ?? '—'}</td>
                      <td className="px-6 py-3">{bin.days_since_last_collection ?? '—'}</td>
                      <td className="px-6 py-3">
                        {bin.previous_day_fill != null ? (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              bin.previous_day_fill >= 80
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {bin.previous_day_fill}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-xl font-semibold text-white mb-4">Hotspots</h2>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-white/50 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Latitude</th>
                  <th className="px-6 py-3 font-medium">Longitude</th>
                  <th className="px-6 py-3 font-medium">Times found dirty</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-white/30">
                      No hotspots recorded yet.
                    </td>
                  </tr>
                ) : (
                  hotspots.map((spot) => (
                    <tr
                      key={spot.id}
                      className="border-t border-white/10 text-white/80 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-3">{spot.id}</td>
                      <td className="px-6 py-3">{spot.latitude.toFixed(5)}</td>
                      <td className="px-6 py-3">{spot.longitude.toFixed(5)}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            spot.times_found_dirty >= 5
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {spot.times_found_dirty}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleApprove(spot.id)}
                          disabled={approving.has(spot.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {approving.has(spot.id) ? 'Approving…' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}