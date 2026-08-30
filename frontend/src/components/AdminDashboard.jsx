import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const MAP_CENTER = [12.9141, 74.856] // Mangaluru, matches the seeded dustbin data
const MANGALURU_BOUNDS = [
  [12.75, 74.72],
  [13.05, 74.97],
]

function redPinIcon(L) {
  return L.divIcon({
    className: '',
    html: `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" fill="#ef4444"/>
      <circle cx="12" cy="12" r="4.5" fill="#fff"/>
    </svg>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -30],
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
      L.marker([bin.latitude, bin.longitude], { icon: redPinIcon(L) }).addTo(mapRef.current)
    )

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [mapReady, dustbins])

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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 className="w-5 h-5 text-green-400" />
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <p className="text-white/50 text-sm mb-8">
          Live dustbin locations across the city, plus zones flagged as recurring hotspots.
        </p>

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
          <h2 className="text-xl font-semibold text-white mb-4">Hotspots</h2>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-white/50 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Latitude</th>
                  <th className="px-6 py-3 font-medium">Longitude</th>
                  <th className="px-6 py-3 font-medium">Times found dirty</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/30">
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