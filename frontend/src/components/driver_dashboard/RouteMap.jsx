/**
 * RouteMap.jsx — Interactive Driver Route Map Component (Vanilla Leaflet)
 *
 * Supports:
 * - Depot Marker (Indigo 'D')
 * - Collection Stop Markers with sequence numbers (#1 Amber, #2+ Emerald)
 * - Hotspot Pinning Mode (Click anywhere on map to pinpoint new hotspot)
 * - Existing Hotspots Layer (Red Flame Icons)
 * - Polyline route connecting Depot → Ordered Stops → Depot
 */

import { useState, useEffect, useRef } from 'react'
import { Navigation, MapPin, AlertTriangle, Flame } from 'lucide-react'
import './DriverDashboard.css'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const MAP_CENTER = [12.8941, 74.856] // Mangaluru center
const MANGALURU_BOUNDS = [
  [12.75, 74.72],
  [13.05, 74.97],
]

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

export default function RouteMap({
  bins = [],
  depot = { lat: 12.9040, lng: 74.8560, name: 'Central Waste Hub, Derebail' },
  currentLocation = { lat: 12.8760, lng: 74.8502 },
  hotspots = [],
  isPinningHotspot = false,
  pinnedLocation = null,
  onMapClickForHotspot,
  onBinSelect,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const layerGroupRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedBinId, setSelectedBinId] = useState(null)

  // Initialize Map matching Admin & Survey map settings
  useEffect(() => {
    let cancelled = false

    loadLeaflet().then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return

      const initialLat = depot?.lat || MAP_CENTER[0]
      const initialLng = depot?.lng || MAP_CENTER[1]

      const map = L.map(mapContainerRef.current, {
        maxBounds: MANGALURU_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 11,
        maxZoom: 19,
        scrollWheelZoom: false,
      }).setView([initialLat, initialLng], 12)

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      layerGroupRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setMapReady(false)
    }
  }, [])

  // Handle map click events for hotspot pinning
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current

    const handleMapClick = (e) => {
      if (isPinningHotspot && onMapClickForHotspot) {
        onMapClickForHotspot({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [mapReady, isPinningHotspot, onMapClickForHotspot])

  // Render Markers and Polyline
  useEffect(() => {
    if (!mapReady || !mapRef.current || !layerGroupRef.current) return
    const L = window.L
    if (!L) return

    const lg = layerGroupRef.current
    lg.clearLayers()

    const points = []

    // 1. Depot Marker
    if (depot && depot.lat && depot.lng) {
      points.push([depot.lat, depot.lng])
      const depotIcon = L.divIcon({
        className: 'custom-depot-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background-color: #4f46e5;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 900;
            font-size: 14px;
            font-family: ui-sans-serif, system-ui;
          ">
            D
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      L.marker([depot.lat, depot.lng], { icon: depotIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; font-size: 12px; color: #1e293b; min-width: 160px;">
            <p style="margin: 0; font-weight: bold; color: #4338ca; font-size: 13px;">Depot Hub</p>
            <p style="margin: 2px 0 0; color: #475569;">${depot.name}</p>
            <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Starting & Ending Point</p>
          </div>
        `)
        .addTo(lg)
    }

    // 2. Bin Markers with Sequence Badges
    bins.forEach((bin, idx) => {
      if (!bin.lat || !bin.lng) return
      points.push([bin.lat, bin.lng])

      const isFirst = idx === 0
      const isSelected = bin.id === selectedBinId
      const bg = isFirst ? '#f59e0b' : '#10b981'

      const binIcon = L.divIcon({
        className: 'custom-bin-marker',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '28px'};
            height: ${isSelected ? '32px' : '28px'};
            border-radius: 50%;
            background-color: ${bg};
            border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'};
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${isFirst ? '#000000' : '#ffffff'};
            font-weight: 800;
            font-size: 12px;
            font-family: ui-sans-serif, system-ui;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            ${bin.sequence_number || idx + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      const marker = L.marker([bin.lat, bin.lng], { icon: binIcon }).addTo(lg)

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; font-size: 12px; color: #1e293b; min-width: 180px;">
          <h4 style="margin: 0 0 2px; font-weight: 700; color: #0f172a; font-size: 13px;">
            Stop #${bin.sequence_number || idx + 1}: ${bin.location || ('Dustbin #' + bin.id)}
          </h4>
          <p style="margin: 2px 0 4px; color: #64748b; font-size: 11px;">${bin.address || ''}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
            <span style="font-weight: 600; color: #334155;">Fill: ${bin.fill_pct ? bin.fill_pct.toFixed(0) + '%' : '85%'}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1; font-weight: 600;">
              ${bin.zone_type || 'Commercial'}
            </span>
          </div>
        </div>
      `)

      marker.on('click', () => {
        setSelectedBinId(bin.id)
        if (onBinSelect) onBinSelect(bin.id)
      })
    })

    // 3. Existing Hotspots Layer (Red Flame Badges)
    hotspots.forEach((h) => {
      if (!h.latitude || !h.longitude) return
      const hotspotIcon = L.divIcon({
        className: 'custom-hotspot-marker',
        html: `
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background-color: #ef4444;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(239,68,68,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 13px;
          ">
            🔥
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      L.marker([h.latitude, h.longitude], { icon: hotspotIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; font-size: 12px; color: #1e293b;">
            <p style="margin: 0; font-weight: bold; color: #dc2626;">Reported Waste Hotspot #${h.id}</p>
            <p style="margin: 2px 0 0; color: #475569; font-size: 11px;">Times dirty: ${h.times_found_dirty || 1}</p>
            <p style="margin: 2px 0 0; font-size: 10px; color: #94a3b8;">(${h.latitude.toFixed(4)}, ${h.longitude.toFixed(4)})</p>
          </div>
        `)
        .addTo(lg)
    })

    // 4. Pinned Hotspot Location Marker (Interactive pulsating drop pin)
    if (pinnedLocation && pinnedLocation.lat && pinnedLocation.lng) {
      const pinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            filter: drop-shadow(0 4px 10px rgba(239, 68, 68, 0.8));
          ">
            <div style="
              background-color: #ef4444;
              color: white;
              font-size: 10px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 6px;
              border: 1.5px solid white;
              white-space: nowrap;
              margin-bottom: 2px;
              animation: pulse 1.5s infinite;
            ">
              🔥 PINNED HOTSPOT
            </div>
            <div style="
              width: 18px;
              height: 18px;
              background: #ef4444;
              border: 3px solid #ffffff;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [120, 42],
        iconAnchor: [60, 42],
      })

      const pinMarker = L.marker([pinnedLocation.lat, pinnedLocation.lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(lg)

      pinMarker.on('dragend', (e) => {
        const newPos = e.target.getLatLng()
        if (onMapClickForHotspot) {
          onMapClickForHotspot({ lat: newPos.lat, lng: newPos.lng })
        }
      })

      pinMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; font-size: 12px; color: #1e293b;">
          <p style="margin: 0; font-weight: bold; color: #dc2626;">Selected Hotspot Location</p>
          <p style="margin: 2px 0 0; color: #475569; font-size: 11px;">Drag pin to fine-tune placement</p>
        </div>
      `).openPopup()
    }

    // 5. Polyline route: Depot -> Ordered Bins -> Depot
    if (points.length > 1) {
      const fullPath = [...points]
      if (depot && depot.lat && depot.lng) {
        fullPath.push([depot.lat, depot.lng])
      }

      L.polyline(fullPath, {
        color: '#16a34a',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 8',
      }).addTo(lg)

      // Fit bounds if not pinning
      if (!pinnedLocation) {
        const bounds = L.latLngBounds(points)
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      }
    }
  }, [mapReady, bins, depot, selectedBinId, hotspots, pinnedLocation])

  const selectedBin = bins.find((b) => b.id === selectedBinId)

  return (
    <div className={`glass-panel rounded-3xl overflow-hidden border transition-all duration-300 ${
      isPinningHotspot ? 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]' : 'border-white/10'
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg border ${
            isPinningHotspot
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-green-500/10 border-green-500/20 text-green-400'
          }`}>
            {isPinningHotspot ? <Flame className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {isPinningHotspot ? 'Pinpoint Waste Hotspot Location' : 'Live Collection Route Map'}
            </h2>
            <p className="text-[11px] text-white/50">
              {isPinningHotspot ? 'Click anywhere on the map to drop a hotspot pin' : depot?.name}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3.5 text-[11px] text-white/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-600 flex-shrink-0" />
            Depot
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            Bin Stops
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            Hotspot
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative bg-[#0a0a0c] h-[360px] sm:h-[440px] w-full z-0 ${
        isPinningHotspot ? 'cursor-crosshair' : ''
      }`}>
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Selected bin preview bar */}
      <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between gap-4 text-xs">
        {selectedBin ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex-shrink-0 flex items-center justify-center font-bold text-black">
              {bins.findIndex((b) => b.id === selectedBin.id) + 1}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">{selectedBin.location}</p>
              <p className="text-white/50 text-[11px] truncate">{selectedBin.address}</p>
            </div>
            <button
              onClick={() => setSelectedBinId(null)}
              className="ml-auto text-white/40 hover:text-white transition"
            >
              ✕
            </button>
          </div>
        ) : isPinningHotspot ? (
          <div className="flex items-center gap-2 text-amber-300 font-semibold animate-pulse">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Click map to place pin {pinnedLocation ? `(${pinnedLocation.lat.toFixed(4)}, ${pinnedLocation.lng.toFixed(4)})` : ''}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/50">
            <MapPin className="w-4 h-4 text-green-400" />
            <span>Click any stop marker on the map to inspect details</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-3 text-white/40 font-mono">
          <span>{bins.length} stops</span>
          {hotspots.length > 0 && <span>· {hotspots.length} hotspots</span>}
        </div>
      </div>
    </div>
  )
}
