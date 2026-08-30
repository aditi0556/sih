/**
 * RouteMap.jsx — Interactive Driver Route Map Component (React Leaflet)
 *
 * Renders an interactive Leaflet map matching CareIndia dark theme.
 * Displays:
 * - Depot Marker (Indigo badge 'D')
 * - Bin Markers with sequence numbers (Amber for NEXT, Emerald for COLLECTED, Grey for PENDING)
 * - Driver Current Location (Glowing Green pulsing marker)
 * - Polyline route connecting Depot → Bins → Depot
 * - Interactive click handlers calling onBinSelect
 *
 * PROPS INTERFACE:
 * @prop {Array}   bins              Array of bin objects: { id, code, location, address, lat, lng, status }
 * @prop {Array}   routePolyline     Array of { lat, lng } waypoints (optional, derived if not supplied)
 * @prop {Object}  depot             { lat, lng, name }
 * @prop {Object}  currentLocation   { lat, lng }
 * @prop {Function} onBinSelect      (binId) => void
 */

import { useState, useEffect } from 'react'
import { MapPin, Navigation, Truck } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './DriverDashboard.css'

// ─── Fallback mock data ────────────────────────────────────────────────────────
const FALLBACK_DEPOT = { lat: 12.9040, lng: 74.8560, name: 'Central Waste Hub, Derebail' }
const FALLBACK_CURRENT_LOCATION = { lat: 12.8760, lng: 74.8502 }

// ─── Bin status colour helper ──────────────────────────────────────────────────
function binColour(status) {
  if (status === 'COLLECTED') return '#10b981' // emerald
  if (status === 'NEXT')      return '#f59e0b' // amber
  return '#6b7280'                             // grey (pending)
}

// ─── Custom Leaflet DivIcons ───────────────────────────────────────────────────
function createBinIcon(index, status, isSelected) {
  let bg = '#6b7280'
  let border = 'rgba(255,255,255,0.5)'
  let shadow = 'none'
  let textColor = '#ffffff'

  if (status === 'NEXT') {
    bg = '#f59e0b'
    border = '#ffffff'
    shadow = '0 0 16px rgba(245,158,11,0.9)'
    textColor = '#000000'
  } else if (status === 'COLLECTED') {
    bg = '#10b981'
    border = 'rgba(255,255,255,0.4)'
    textColor = '#ffffff'
  }

  const selectedBorder = isSelected ? '3px solid #ffffff' : `2px solid ${border}`

  return L.divIcon({
    className: 'custom-bin-marker-wrap',
    html: `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: ${bg};
        border: ${selectedBorder};
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${textColor};
        font-weight: 800;
        font-size: 11px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const depotIcon = L.divIcon({
  className: 'custom-depot-marker-wrap',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background-color: #6366f1;
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px rgba(99,102,241,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 12px;
      font-family: ui-sans-serif, system-ui, -apple-system;
    ">
      D
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const driverIcon = L.divIcon({
  className: 'custom-driver-marker-wrap',
  html: `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #4ade80;
      border: 2px solid #ffffff;
      box-shadow: 0 0 16px rgba(74,222,128,1);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// ─── Auto-fit bounds on route change ──────────────────────────────────────────
function MapRecenter({ points }) {
  const map = useMap()

  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [points, map])

  return null
}

// ─── Main Exported Component ───────────────────────────────────────────────────
export default function RouteMap({
  bins = [],
  routePolyline,
  depot = FALLBACK_DEPOT,
  currentLocation = FALLBACK_CURRENT_LOCATION,
  onBinSelect,
}) {
  const [selectedBinId, setSelectedBinId] = useState(null)

  // Derive route polyline if not provided explicitly: depot → bins → depot
  const polylineWaypoints = routePolyline ?? [
    { lat: depot.lat, lng: depot.lng },
    ...bins.map(b => ({ lat: b.lat, lng: b.lng })),
    { lat: depot.lat, lng: depot.lng },
  ]

  const polylineCoords = polylineWaypoints.map(p => [p.lat, p.lng])
  const allPoints = [depot, currentLocation, ...bins].filter(Boolean)

  const selectedBin = bins.find(b => b.id === selectedBinId)
  const nextBin     = bins.find(b => b.status === 'NEXT')
  const collectedN  = bins.filter(b => b.status === 'COLLECTED').length

  function handleSelectBin(id) {
    setSelectedBinId(id)
    if (id && onBinSelect) onBinSelect(id)
  }

  // Default center
  const centerLat = depot.lat || 12.9040
  const centerLng = depot.lng || 74.8560

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">

      {/* ── Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Today&apos;s Collection Route</h2>
            <p className="text-[11px] text-white/50">{depot.name}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-white/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
            Next stop
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
            Collected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />
            You
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500 flex-shrink-0" />
            Depot
          </span>
        </div>
      </div>

      {/* ── Leaflet Interactive Map Area */}
      <div className="relative bg-[#0a0a0c] h-[360px] sm:h-[420px] w-full z-0">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', backgroundColor: '#0a0a0c' }}
        >
          {/* Recenter helper */}
          <MapRecenter points={allPoints} />

          {/* CartoDB Dark Matter tiles matching CareIndia dark theme */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Route Polyline */}
          {polylineCoords.length > 1 && (
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: '#4ade80',
                weight: 3,
                opacity: 0.75,
                dashArray: '6, 8',
              }}
            />
          )}

          {/* Depot Marker */}
          {depot && (
            <Marker
              position={[depot.lat, depot.lng]}
              icon={depotIcon}
            >
              <Popup className="custom-dark-popup">
                <div className="text-xs p-1">
                  <p className="font-bold text-indigo-400">Depot Hub</p>
                  <p className="text-gray-300">{depot.name}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Driver Current Location Marker */}
          {currentLocation && (
            <Marker
              position={[currentLocation.lat, currentLocation.lng]}
              icon={driverIcon}
            >
              <Popup className="custom-dark-popup">
                <div className="text-xs p-1">
                  <p className="font-bold text-green-400">Current Position</p>
                  <p className="text-gray-300">Driver Vehicle GPS</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Bin Markers */}
          {bins.map((bin, index) => (
            <Marker
              key={bin.id}
              position={[bin.lat, bin.lng]}
              icon={createBinIcon(index, bin.status, bin.id === selectedBinId)}
              eventHandlers={{
                click: () => handleSelectBin(bin.id === selectedBinId ? null : bin.id),
              }}
            >
              <Popup className="custom-dark-popup">
                <div className="text-xs p-1 space-y-1">
                  <p className="font-bold text-white flex items-center justify-between gap-2">
                    <span>Stop #{index + 1}: {bin.location}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-extrabold"
                      style={{
                        backgroundColor: binColour(bin.status),
                        color: bin.status === 'NEXT' ? '#000' : '#fff',
                      }}
                    >
                      {bin.status}
                    </span>
                  </p>
                  <p className="text-gray-400 font-mono text-[10px]">{bin.code}</p>
                  <p className="text-gray-300">{bin.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── Selected bin tooltip / Next stop callout */}
      <div className="px-5 py-4 border-t border-white/10 min-h-[64px] flex items-center justify-between gap-4">
        {selectedBin ? (
          // Selected bin detail
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-extrabold text-black"
              style={{ backgroundColor: binColour(selectedBin.status) }}
            >
              {bins.findIndex(b => b.id === selectedBin.id) + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{selectedBin.location}</p>
              <p className="text-xs text-white/50 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {selectedBin.address ?? selectedBin.code}
                <span className="font-mono ml-1 text-white/30">{selectedBin.code}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBinId(null)}
              className="ml-auto text-xs text-white/40 hover:text-white/70 flex-shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : nextBin ? (
          // Default: show next stop hint
          <div className="flex items-center gap-3 flex-1">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex-shrink-0 flex items-center justify-center text-xs font-extrabold text-black">
              {bins.findIndex(b => b.id === nextBin.id) + 1}
            </div>
            <div>
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Next Stop</p>
              <p className="text-sm font-bold text-white">{nextBin.location}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <MapPin className="w-4 h-4" />
            All stops collected for today
          </div>
        )}

        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-white/50 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-white/30" />
            {collectedN}/{bins.length} collected
          </span>
          <span className="text-white/20">·</span>
          <span className="text-white/50">Tap a marker to inspect</span>
        </div>
      </div>
    </div>
  )
}
