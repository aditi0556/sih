/**
 * RouteCompletionSummary.jsx
 *
 * Shown when the driver has marked every assigned bin as COLLECTED.
 * Receives derived stats as props from DriverDashboard — no local state needed.
 *
 * Props:
 *   total          {number}  — total bins assigned today
 *   collected      {number}  — bins marked collected
 *   pct            {number}  — completion percentage (0-100)
 *   shiftStart     {string}  — display string for shift start time (e.g. "06:00 AM")
 *   completedAt    {string}  — display string for time of last collection
 *   onFinishShift  {Function} — called when driver taps "Complete Shift"
 *   finished       {boolean} — true after onFinishShift has been called
 */

import { CheckCircle2, Star, Truck, ArrowRight, Clock } from 'lucide-react'

export default function RouteCompletionSummary({
  total,
  collected,
  pct,
  shiftStart,
  completedAt,
  onFinishShift,
  finished,
}) {
  return (
    <div className="relative glass-panel-glow rounded-3xl overflow-hidden">

      {/* Ambient green glow layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8  w-48 h-48 bg-emerald-500/8  rounded-full blur-2xl" />
      </div>

      <div className="relative p-6 sm:p-8 space-y-6">

        {/* ── Heading ───────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-0.5">
                Route Complete
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                All bins collected for today
              </h2>
            </div>
          </div>

          {/* Big percentage badge */}
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/25 flex flex-col items-center justify-center self-start sm:self-auto">
            <span className="text-xl font-black text-green-400 leading-none">{pct}%</span>
            <span className="text-[9px] text-green-400/70 uppercase tracking-wider font-semibold mt-0.5">Done</span>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/30 border border-white/8 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-white">{total}</p>
            <p className="text-[11px] text-white/50 mt-1 uppercase tracking-wider">Assigned</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-400">{collected}</p>
            <p className="text-[11px] text-emerald-400/70 mt-1 uppercase tracking-wider">Collected</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-green-400">{pct}%</p>
            <p className="text-[11px] text-green-400/70 mt-1 uppercase tracking-wider">Complete</p>
          </div>
        </div>

        {/* ── Progress bar (always full) ─────────────────────────────────── */}
        <div className="space-y-2">
          <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full progress-bar-fill shadow-[0_0_12px_rgba(74,222,128,0.6)]"
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-white/50">
            {shiftStart && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                Started at {shiftStart}
              </span>
            )}
            {completedAt && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Last collected at {completedAt}
              </span>
            )}
          </div>
        </div>

        {/* ── Completion message ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
          <Star className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" />
          <p className="text-sm text-white/80 leading-relaxed">
            Great work today. You have successfully collected all{' '}
            <span className="text-green-400 font-semibold">{collected} assigned bins</span> on your
            route. Return to the depot and complete your shift below.
          </p>
        </div>

        {/* ── Action button ──────────────────────────────────────────────── */}
        {finished ? (
          <div className="flex items-center justify-center gap-2 py-4 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Shift completed — well done!
          </div>
        ) : (
          <button
            type="button"
            id="complete-shift-btn"
            onClick={onFinishShift}
            className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-extrabold text-base transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(74,222,128,0.35)] hover:shadow-[0_0_50px_rgba(74,222,128,0.6)] active:scale-[0.98]"
          >
            <Truck className="w-5 h-5" />
            Complete Shift
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

      </div>
    </div>
  )
}
