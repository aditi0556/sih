import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ClipboardList,
  Trash2,
  Flame,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  User,
  Shield,
  Layers,
  Filter,
  Check,
  Send,
  Building2,
  Home,
  Factory
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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

function getFillColor(fill) {
  if (fill < 50) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
  if (fill < 80) return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  return 'text-rose-400 border-rose-500/30 bg-rose-500/10'
}

function getFillBarColor(fill) {
  if (fill < 50) return 'bg-emerald-500'
  if (fill < 80) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function SurveyDashboard() {
  const { session, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('dustbins') // 'dustbins' | 'hotspots' | 'map' | 'schedule'
  const [drivers, setDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [scheduleData, setScheduleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'COMPLETED'
  const [zoneFilter, setZoneFilter] = useState('ALL') // 'ALL' | 'COMMERCIAL' | 'RESIDENTIAL' | 'INDUSTRIAL'
  const [toastMessage, setToastMessage] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])

  // Local draft state for inputs: dustbin fill inputs { [binId]: number }
  const [binInputs, setBinInputs] = useState({})
  const [binRemarks, setBinRemarks] = useState({})
  const [submittingBinId, setSubmittingBinId] = useState(null)

  // Local draft state for hotspot presence: { [hotspotId]: boolean | null }
  const [hotspotInputs, setHotspotInputs] = useState({})
  const [hotspotRemarks, setHotspotRemarks] = useState({})
  const [submittingHotspotId, setSubmittingHotspotId] = useState(null)

  // Map refs
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [mapReady, setMapReady] = useState(false)

  // Show Toast
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Fetch Drivers List
  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/survey/drivers', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDrivers(data)
      }
    } catch (e) {
      console.error('Failed to load survey drivers', e)
    }
  }

  // Fetch Survey Schedule
  const fetchSchedule = async () => {
    setRefreshing(true)
    try {
      const url = selectedDriverId
        ? `/api/survey/schedule?driver_id=${selectedDriverId}`
        : '/api/survey/schedule'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setScheduleData(data)

        // Seed default inputs from current data
        const initialBinInputs = {}
        data.all_dustbins?.forEach((b) => {
          initialBinInputs[b.dustbin_id] =
            b.recorded_fill_level !== null && b.recorded_fill_level !== undefined
              ? b.recorded_fill_level
              : b.previous_fill || 50
        })
        setBinInputs((prev) => ({ ...initialBinInputs, ...prev }))

        const initialHotspotInputs = {}
        data.all_hotspots?.forEach((h) => {
          if (h.is_hotspot_present !== null && h.is_hotspot_present !== undefined) {
            initialHotspotInputs[h.hotspot_id] = h.is_hotspot_present
          }
        })
        setHotspotInputs((prev) => ({ ...initialHotspotInputs, ...prev }))
      }
    } catch (e) {
      console.error('Failed to load schedule', e)
      showToast('Error loading survey schedule', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch Audit Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/survey/logs?limit=15', { credentials: 'include' })
      if (res.ok) {
        const logs = await res.json()
        setAuditLogs(logs)
      }
    } catch (e) {
      console.error('Failed to load logs', e)
    }
  }

  useEffect(() => {
    if (!session) return
    fetchDrivers()
    fetchLogs()
  }, [session])

  useEffect(() => {
    if (!session) return
    fetchSchedule()
  }, [session, selectedDriverId])

  // Submit Dustbin Fill Level
  const handleUpdateBinFill = async (dustbinId, assignmentId) => {
    setSubmittingBinId(dustbinId)
    const fillLevel = parseFloat(binInputs[dustbinId] ?? 50)
    const remarks = binRemarks[dustbinId] || ''
    const currentDriver = drivers.find((d) => String(d.driver_id) === String(selectedDriverId))

    try {
      const res = await fetch('/api/survey/update-dustbin-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dustbin_id: dustbinId,
          fill_level: fillLevel,
          assignment_id: assignmentId || undefined,
          driver_name: currentDriver ? currentDriver.name : session?.user?.name || 'Survey Team',
          remarks: remarks || `Ground survey inspection (${fillLevel}%)`,
        }),
      })

      if (res.ok) {
        showToast(`Dustbin #${dustbinId} fill updated to ${fillLevel}%!`)
        fetchSchedule()
        fetchLogs()
      } else {
        const err = await res.json()
        showToast(err.detail || 'Failed to update fill level', 'error')
      }
    } catch (e) {
      showToast('Network error while updating fill level', 'error')
    } finally {
      setSubmittingBinId(null)
    }
  }

  // Submit Hotspot Presence
  const handleUpdateHotspotPresence = async (hotspotId, assignmentId, presence) => {
    setSubmittingHotspotId(hotspotId)
    const remarks = hotspotRemarks[hotspotId] || ''
    const currentDriver = drivers.find((d) => String(d.driver_id) === String(selectedDriverId))

    try {
      const res = await fetch('/api/survey/update-hotspot-presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hotspot_id: hotspotId,
          is_present: presence,
          assignment_id: assignmentId || undefined,
          driver_name: currentDriver ? currentDriver.name : session?.user?.name || 'Survey Team',
          remarks:
            remarks || (presence ? 'Garbage overflow observed' : 'Cleaned / No overflow observed'),
        }),
      })

      if (res.ok) {
        setHotspotInputs((prev) => ({ ...prev, [hotspotId]: presence }))
        showToast(
          `Hotspot #${hotspotId} verified as ${presence ? 'Waste Present (Dirty)' : 'Clean'}!`
        )
        fetchSchedule()
        fetchLogs()
      } else {
        const err = await res.json()
        showToast(err.detail || 'Failed to update hotspot', 'error')
      }
    } catch (e) {
      showToast('Network error while updating hotspot', 'error')
    } finally {
      setSubmittingHotspotId(null)
    }
  }

  // Trigger Auto Generation
  const handleAutoGenerate = async () => {
    if (!confirm('Regenerate weekly survey schedule across all drivers for this week?')) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/survey/auto-generate', {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        showToast('Weekly survey schedule successfully regenerated!')
        fetchSchedule()
        fetchLogs()
      }
    } catch (e) {
      showToast('Failed to auto-generate schedule', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // Map Initialization & Updates
  useEffect(() => {
    if (activeTab !== 'map') return

    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return

      const map = L.map(mapContainerRef.current, {
        maxBounds: MANGALURU_BOUNDS,
        maxBoundsViscosity: 1.0,
        minZoom: 11,
      }).setView(MAP_CENTER, 12)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
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
      setMapReady(false)
    }
  }, [activeTab])

  // Update map markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || !scheduleData) return
    const L = window.L

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    // Dustbin markers
    scheduleData.all_dustbins?.forEach((bin) => {
      const fill = bin.recorded_fill_level ?? bin.previous_fill ?? 50
      const isCompleted = bin.status === 'COMPLETED'
      const pinColor = isCompleted ? '#10b981' : fill > 75 ? '#ef4444' : fill > 50 ? '#f59e0b' : '#3b82f6'

      const customIcon = L.divIcon({
        className: '',
        html: `
          <div style="background-color: ${pinColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5); color: white; font-weight: bold; font-size: 10px;">
            ${Math.round(fill)}%
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      })

      const marker = L.marker([bin.latitude, bin.longitude], { icon: customIcon }).addTo(mapRef.current)
      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px; min-width: 170px;">
          <h4 style="margin: 0 0 4px; font-weight: 700;">Dustbin #${bin.dustbin_id}</h4>
          <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">Zone: <b>${bin.zone_type}</b></p>
          <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">Status: <b>${bin.status}</b></p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 600;">Fill: ${Math.round(fill)}%</span>
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${isCompleted ? '#dcfce7' : '#fef3c7'}; color: ${isCompleted ? '#166534' : '#92400e'};">
              ${isCompleted ? 'Inspected' : 'Pending'}
            </span>
          </div>
        </div>
      `)
      markersRef.current.push(marker)
    })

    // Hotspot markers
    scheduleData.all_hotspots?.forEach((h) => {
      const isDirty = h.is_hotspot_present === true
      const isClean = h.is_hotspot_present === false
      const pinColor = isDirty ? '#dc2626' : isClean ? '#059669' : '#f97316'

      const customIcon = L.divIcon({
        className: '',
        html: `
          <div style="background-color: ${pinColor}; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.5); color: white; font-weight: bold; font-size: 12px;">
            ⚠️
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      })

      const marker = L.marker([h.latitude, h.longitude], { icon: customIcon }).addTo(mapRef.current)
      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px; min-width: 170px;">
          <h4 style="margin: 0 0 4px; font-weight: 700; color: #b91c1c;">Hotspot #${h.hotspot_id}</h4>
          <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">Historical dirty times: <b>${h.times_found_dirty}</b></p>
          <p style="margin: 0 0 4px; font-size: 12px; color: #64748b;">Verification: <b>${
            h.is_hotspot_present === true ? 'Dirty' : h.is_hotspot_present === false ? 'Clean' : 'Pending'
          }</b></p>
        </div>
      `)
      markersRef.current.push(marker)
    })
  }, [mapReady, scheduleData])

  // Filtered Dustbins
  const filteredDustbins = (scheduleData?.all_dustbins || []).filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
    if (zoneFilter !== 'ALL' && b.zone_type !== zoneFilter) return false
    return true
  })

  // Filtered Hotspots
  const filteredHotspots = (scheduleData?.all_hotspots || []).filter((h) => {
    if (statusFilter !== 'ALL' && h.status !== statusFilter) return false
    return true
  })

  const stats = scheduleData?.stats || {
    total_dustbins: 0,
    completed_dustbins: 0,
    total_hotspots: 0,
    completed_hotspots: 0,
    overall_completion_pct: 0,
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-green-400" />
          <span>Verifying session…</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all animate-bounce ${
            toastMessage.type === 'error'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-sm font-medium">{toastMessage.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                Weekly Survey Team Dashboard
              </h1>
            </div>
            <p className="text-white/60 text-sm">
              Ground-truth waste audits: record weekly dustbin fill levels and verify illegal waste hotspots.
            </p>
          </div>

          {/* Context & Driver Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Driver Filter Selector */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <User className="w-4 h-4 text-green-400 shrink-0" />
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none cursor-pointer pr-2"
              >
                <option value="" className="bg-neutral-900 text-white">
                  All Survey Teams & Drivers
                </option>
                {drivers.map((d) => (
                  <option key={d.driver_id} value={d.driver_id} className="bg-neutral-900 text-white">
                    {d.name} {d.truck_id ? `(Truck #${d.truck_id})` : '(Survey Unit)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Week Badge */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs text-white/80">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Week of {scheduleData?.week_start_date || 'Active'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchSchedule}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50"
              title="Refresh Schedule"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-green-400' : ''}`} />
            </button>

            {/* Auto Schedule Button */}
            <button
              onClick={handleAutoGenerate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xs font-semibold shadow-lg shadow-green-900/30 transition-all flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Regenerate Schedule
            </button>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Dustbin Inspections */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-green-500/30 transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Dustbins Checked</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">{stats.completed_dustbins}</span>
                  <span className="text-sm font-semibold text-white/40">/ {stats.total_dustbins}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-500"
                style={{
                  width: `${stats.total_dustbins ? (stats.completed_dustbins / stats.total_dustbins) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">
              {stats.pending_dustbins} dustbins pending inspection this week
            </p>
          </div>

          {/* Card 2: Hotspot Verifications */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Hotspots Verified</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">{stats.completed_hotspots}</span>
                  <span className="text-sm font-semibold text-white/40">/ {stats.total_hotspots}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-amber-500 to-rose-400 h-full transition-all duration-500"
                style={{
                  width: `${stats.total_hotspots ? (stats.completed_hotspots / stats.total_hotspots) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">
              {stats.pending_hotspots} hotspots to check for waste presence
            </p>
          </div>

          {/* Card 3: Overall Progress Gauge */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Weekly Progress</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">{stats.overall_completion_pct}%</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${stats.overall_completion_pct}%` }}
              />
            </div>
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {stats.overall_completion_pct >= 80 ? 'Survey On Target' : 'Inspection in Progress'}
            </p>
          </div>

          {/* Card 4: Active Driver Schedule Summary */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Scheduled Teams</p>
                <p className="text-xl font-bold text-white mt-1">
                  {selectedDriverId
                    ? drivers.find((d) => String(d.driver_id) === String(selectedDriverId))?.name || 'Selected Driver'
                    : `${drivers.length} Field Drivers`}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-white/50 mt-4 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Assigned once per week per sector
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('dustbins')}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'dustbins'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Dustbin Fill Levels ({filteredDustbins.length})
            </button>

            <button
              onClick={() => setActiveTab('hotspots')}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'hotspots'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4" />
              Hotspot Presence ({filteredHotspots.length})
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'map'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Live Field Map
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === 'schedule'
                  ? 'bg-white text-black font-semibold shadow-lg shadow-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Weekly Schedule & Logs
            </button>
          </div>

          {/* Quick Filters (when on dustbins or hotspots) */}
          {(activeTab === 'dustbins' || activeTab === 'hotspots') && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'ALL' ? 'bg-white/20 text-white font-medium' : 'text-white/50 hover:text-white'
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'PENDING' ? 'bg-amber-500/20 text-amber-300 font-medium' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Pending Only
                </button>
                <button
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Completed
                </button>
              </div>

              {activeTab === 'dustbins' && (
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 text-xs text-white/80 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-neutral-900">All Zones</option>
                  <option value="COMMERCIAL" className="bg-neutral-900">Commercial</option>
                  <option value="RESIDENTIAL" className="bg-neutral-900">Residential</option>
                  <option value="INDUSTRIAL" className="bg-neutral-900">Industrial</option>
                </select>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: DUSTBINS FILL LEVEL INSPECTION */}
        {activeTab === 'dustbins' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-green-400" />
                  Assigned Dustbins — Ground Truth Fill Level Updates
                </h2>
                <p className="text-xs text-white/50">
                  Inspect each container and slide or enter its physical fill percentage (0% to 100%).
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-white/40">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-green-400" />
                Loading survey dustbins...
              </div>
            ) : filteredDustbins.length === 0 ? (
              <div className="py-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
                <Trash2 className="w-10 h-10 mx-auto text-white/20 mb-3" />
                <p className="text-white/60 font-medium">No dustbins match the current filter.</p>
                <p className="text-white/40 text-xs mt-1">Try switching driver or clearing filter options.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredDustbins.map((bin) => {
                  const currentInputValue = binInputs[bin.dustbin_id] ?? bin.recorded_fill_level ?? bin.previous_fill ?? 50
                  const isDone = bin.status === 'COMPLETED'
                  const isUpdating = submittingBinId === bin.dustbin_id

                  return (
                    <div
                      key={bin.dustbin_id}
                      className={`p-6 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-emerald-950/10 border-emerald-500/20'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Top Row: Info & Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white">Dustbin #{bin.dustbin_id}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                bin.zone_type === 'COMMERCIAL'
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                  : bin.zone_type === 'INDUSTRIAL'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              }`}
                            >
                              {bin.zone_type}
                            </span>
                          </div>
                          <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-white/40" />
                            {bin.latitude.toFixed(5)}, {bin.longitude.toFixed(5)} • Pop: {bin.population}
                          </p>
                        </div>

                        {/* Status Tag */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Inspected
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Pending Audit
                            </>
                          )}
                        </span>
                      </div>

                      {/* Fill Level Gauge & Slider Control */}
                      <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/60 font-medium">Recorded Fill Level:</span>
                          <span className={`text-lg font-black px-2.5 py-0.5 rounded-lg border ${getFillColor(currentInputValue)}`}>
                            {Math.round(currentInputValue)}%
                          </span>
                        </div>

                        {/* Progress Bar Display */}
                        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full transition-all duration-300 ${getFillBarColor(currentInputValue)}`}
                            style={{ width: `${currentInputValue}%` }}
                          />
                        </div>

                        {/* Interactive Range Slider */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={currentInputValue}
                          onChange={(e) =>
                            setBinInputs((prev) => ({
                              ...prev,
                              [bin.dustbin_id]: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-400"
                        />

                        {/* Quick-Preset Buttons */}
                        <div className="flex items-center justify-between gap-1.5 pt-1">
                          {[0, 25, 50, 75, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                setBinInputs((prev) => ({
                                  ...prev,
                                  [bin.dustbin_id]: preset,
                                }))
                              }
                              className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all border ${
                                Math.round(currentInputValue) === preset
                                  ? 'bg-white text-black border-white shadow'
                                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Remarks & Submit Action */}
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Surveyor remarks (e.g. lid open, sensor clean)"
                          value={binRemarks[bin.dustbin_id] || ''}
                          onChange={(e) =>
                            setBinRemarks((prev) => ({
                              ...prev,
                              [bin.dustbin_id]: e.target.value,
                            }))
                          }
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-green-400"
                        />
                        <button
                          onClick={() => handleUpdateBinFill(bin.dustbin_id, bin.id)}
                          disabled={isUpdating}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-green-900/30 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          {isUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Save Fill
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HOTSPOTS VERIFICATION */}
        {activeTab === 'hotspots' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  Assigned Hotspots — Waste Presence (Yes/No) Verification
                </h2>
                <p className="text-xs text-white/50">
                  Inspect recurring garbage dumping hotspots. Verify if waste or overflow is currently present on site.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-white/40">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-amber-400" />
                Loading survey hotspots...
              </div>
            ) : filteredHotspots.length === 0 ? (
              <div className="py-16 text-center bg-white/[0.02] border border-white/10 rounded-2xl">
                <Flame className="w-10 h-10 mx-auto text-white/20 mb-3" />
                <p className="text-white/60 font-medium">No hotspots match the current filter.</p>
                <p className="text-white/40 text-xs mt-1">Try switching driver or clearing filter options.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredHotspots.map((spot) => {
                  const currentPresence = hotspotInputs[spot.hotspot_id] ?? spot.is_hotspot_present
                  const isDone = spot.status === 'COMPLETED'
                  const isUpdating = submittingHotspotId === spot.hotspot_id

                  return (
                    <div
                      key={spot.hotspot_id}
                      className={`p-6 rounded-2xl border transition-all ${
                        isDone
                          ? currentPresence
                            ? 'bg-rose-950/15 border-rose-500/20'
                            : 'bg-emerald-950/15 border-emerald-500/20'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Top Row */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white">Hotspot #{spot.hotspot_id}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                              {spot.times_found_dirty} times flagged dirty
                            </span>
                          </div>
                          <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-white/40" />
                            {spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}
                          </p>
                        </div>

                        {/* Status Tag */}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                            isDone
                              ? currentPresence
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isDone ? (
                            currentPresence ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" /> Dirty / Present
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Clean / Resolved
                              </>
                            )
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Pending Check
                            </>
                          )}
                        </span>
                      </div>

                      {/* Presence Verification Question & Toggle Buttons */}
                      <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
                        <p className="text-xs font-semibold text-white/80">
                          Is garbage accumulation / overflow present at this location?
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {/* Option 1: Yes (Waste Present) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateHotspotPresence(spot.hotspot_id, spot.id, true)}
                            disabled={isUpdating}
                            className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                              currentPresence === true
                                ? 'bg-rose-500/25 border-rose-500 text-rose-300 shadow-lg shadow-rose-900/30 ring-2 ring-rose-500/50'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-rose-500/10 hover:border-rose-500/30'
                            }`}
                          >
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                            <span className="text-xs font-bold">YES (Waste Present)</span>
                            <span className="text-[10px] text-white/40">Requires cleaning</span>
                          </button>

                          {/* Option 2: No (Clean) */}
                          <button
                            type="button"
                            onClick={() => handleUpdateHotspotPresence(spot.hotspot_id, spot.id, false)}
                            disabled={isUpdating}
                            className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                              currentPresence === false
                                ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-900/30 ring-2 ring-emerald-500/50'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-bold">NO (Clean / Spotless)</span>
                            <span className="text-[10px] text-white/40">Area is cleared</span>
                          </button>
                        </div>
                      </div>

                      {/* Surveyor remarks input */}
                      <div className="mt-4">
                        <input
                          type="text"
                          placeholder="Surveyor remarks (e.g. construction debris, street sweeping done)"
                          value={hotspotRemarks[spot.hotspot_id] || ''}
                          onChange={(e) =>
                            setHotspotRemarks((prev) => ({
                              ...prev,
                              [spot.hotspot_id]: e.target.value,
                            }))
                          }
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE INTERACTIVE FIELD MAP */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-400" />
                  Interactive City Survey Map
                </h2>
                <p className="text-xs text-white/50">
                  Click on any pin to view details or check ground-truth state across Mangaluru sectors.
                </p>
              </div>

              {/* Map Legend */}
              <div className="flex items-center gap-3 text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Inspected Bins
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Fill / Dirty Hotspot
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl">
              <div ref={mapContainerRef} className="w-full h-[540px] bg-neutral-950" />
            </div>
            {!mapReady && <p className="text-white/30 text-xs">Initializing GIS map...</p>}
          </div>
        )}

        {/* TAB 4: SCHEDULE & ACTIVITY AUDIT TRAIL */}
        {activeTab === 'schedule' && (
          <div className="space-y-8">
            {/* Weekly Schedule Assignments Breakdown */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Driver Weekly Survey Schedule Plan
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleData?.assignments?.map((assign) => (
                  <div
                    key={assign.id}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-400" />
                        <h3 className="font-bold text-white text-sm">{assign.assigned_to_name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/20 text-purple-300 uppercase">
                        {assign.day_of_week}
                      </span>
                    </div>

                    <p className="text-xs text-white/50 mb-3">{assign.notes || 'Weekly Ground Inspection'}</p>

                    <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                      <div className="flex justify-between text-white/70">
                        <span>Dustbins Assigned:</span>
                        <span className="font-bold text-white">{assign.total_dustbins} bins</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Hotspots Assigned:</span>
                        <span className="font-bold text-white">{assign.total_hotspots} spots</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Status:</span>
                        <span
                          className={`font-semibold ${
                            assign.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {assign.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail Logs */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Recent Survey Inspection Audit Logs
              </h2>

              <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/5 text-white/50 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Target ID</th>
                      <th className="px-5 py-3">Driver / Surveyor</th>
                      <th className="px-5 py-3">Recorded Finding</th>
                      <th className="px-5 py-3">Remarks</th>
                      <th className="px-5 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-6 text-center text-white/30">
                          No survey audit entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.item_type === 'DUSTBIN'
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {log.item_type}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-semibold text-white">#{log.target_id}</td>
                          <td className="px-5 py-3">{log.driver_name || 'Survey Team'}</td>
                          <td className="px-5 py-3 font-bold">
                            {log.item_type === 'DUSTBIN' ? (
                              <span className="text-emerald-400">{log.recorded_fill_level}% fill</span>
                            ) : log.is_hotspot_present ? (
                              <span className="text-rose-400">Waste Present (Dirty)</span>
                            ) : (
                              <span className="text-emerald-400">Clean</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-white/60">{log.remarks || '—'}</td>
                          <td className="px-5 py-3 text-white/40">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
