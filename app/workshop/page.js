'use client'
import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabaseClient'
import {
  Search, User, X, CheckCircle, Flame,
  Loader2, Gem, Layers, List, ScanLine, Package, Printer, Camera, Keyboard, Clock,
  Globe, Home, AlertOctagon, Calendar,
} from 'lucide-react'

// ✅ Lazy‑load QR code library
const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then(m => m.QRCodeCanvas),
  { ssr: false }
)

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES        = ['At Casting', 'Casted', 'Goldsmithing', 'Setting', 'Polishing', 'QC', 'Completed']
const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'Polisher 1', 'QC']
const REDO_REASONS  = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']
const COOLDOWN_MS   = 5 * 60 * 1000

const printQRCode = (vtigerId, articleCode) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Label - ${vtigerId}</title>
        <style>
          body { display:flex; justify-content:center; align-items:center; height:100vh; margin:0; font-family:sans-serif; }
          .label { border:2px solid black; padding:20px; text-align:center; width:250px; }
          h2 { margin:0; font-size:28px; font-weight:900; }
          p  { margin:5px 0; font-weight:bold; text-transform:uppercase; font-size:12px; }
          .qr-box { margin:15px 0; }
        </style>
      </head>
      <body>
        <div class="label">
          <h2>${vtigerId}</h2>
          <p>${articleCode || 'Stock'}</p>
          <div id="qr" class="qr-box"></div>
          <p style="font-size:8px;">Scan to Start/Finish Stage</p>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
        <script>
          QRCode.toCanvas(document.getElementById('qr'), '${vtigerId}', { width:180 }, function() {
            window.print(); window.close();
          })
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

// ─── Custom Hook: Camera Scanner ──────────────────────────────────────────────
function useCameraScanner(containerId) {
  const scannerRef = useRef(null)
  const onScanRef  = useRef(null)
  const [initialized,     setInitialized]     = useState(false)
  const [error,           setError]           = useState(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const setOnScan = useCallback((cb) => { onScanRef.current = cb }, [])

  const start = useCallback(async () => {
    setError(null)
    setPermissionDenied(false)
    if (!document.getElementById(containerId)) { setError('Scanner container not found'); return }
    if (!scannerRef.current) {
      const { Html5Qrcode: H } = await import('html5-qrcode')
      scannerRef.current = new H(containerId)
    }
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => { if (onScanRef.current) onScanRef.current(text) },
        undefined
      )
      setInitialized(true)
    } catch (err) {
      const isDenied = err.name === 'NotAllowedError' || err.message?.includes('permission')
      setPermissionDenied(isDenied)
      setError(isDenied
        ? 'Camera access denied. Please enable camera permissions.'
        : 'Could not access camera. Please check permissions.'
      )
      setInitialized(false)
    }
  }, [containerId])

  const stop = useCallback(async () => {
    if (!scannerRef.current) return
    try { await scannerRef.current.stop(); await scannerRef.current.clear() }
    catch (err) { console.error('Error stopping camera', err) }
    scannerRef.current = null
    setInitialized(false); setError(null); setPermissionDenied(false)
  }, [])

  useEffect(() => () => {
    scannerRef.current?.stop().catch(console.error)
    scannerRef.current?.clear()
  }, [])

  return { initialized, error, permissionDenied, start, stop, setOnScan }
}

// ─── Small Pure Components ────────────────────────────────────────────────────
const ScanMessage = ({ message }) => {
  if (!message) return null
  const styles = {
    start:   'bg-blue-100  border-blue-600  text-blue-800',
    success: 'bg-green-100 border-green-600 text-green-800',
    error:   'bg-red-100   border-red-600   text-red-800',
  }
  return (
    <div className={`mb-4 p-4 rounded-xl border-2 font-black text-sm text-center uppercase animate-in slide-in-from-top-2 ${styles[message.type] ?? styles.error}`}>
      {message.text}
    </div>
  )
}

const TabButton = ({ active, onClick, activeClass = 'bg-white text-black', children }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-lg font-black text-[10px] md:text-xs transition-all ${
      active ? activeClass : 'text-gray-400 hover:text-white'
    }`}
  >
    {children}
  </button>
)

const ScannerModeToggle = ({ mode, onModeChange }) => (
  <div className="flex gap-2 mb-4">
    {[
      { value: 'manual', label: 'MANUAL', icon: <Keyboard size={14} /> },
      { value: 'camera', label: 'CAMERA', icon: <Camera size={14} /> },
    ].map(({ value, label, icon }) => (
      <button
        key={value}
        onClick={() => onModeChange(value)}
        className={`flex-1 py-2 rounded-xl border-2 font-black text-xs flex items-center justify-center gap-1 ${
          mode === value ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-300'
        }`}
      >
        {icon} {label}
      </button>
    ))}
  </div>
)

const ManualScanner = ({ searchId, onSearchIdChange, onScan, loading, disabled }) => (
  <>
    <div className="flex gap-2">
      <input
        autoFocus type="text" placeholder="SCAN JOB BARCODE..."
        className="w-full p-6 border-4 border-black rounded-2xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-blue-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
        value={searchId}
        onChange={e => onSearchIdChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onScan()}
        disabled={disabled}
      />
      <button
        onClick={onScan} disabled={disabled}
        className="bg-black text-white px-8 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Search />}
      </button>
    </div>
    <p className="text-center mt-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">
      Scan 1× to Start Stage · Scan 2× to Complete Stage
    </p>
  </>
)

const JobCard = ({ job, onClick, cooldownRemaining }) => (
  <div
    onClick={onClick}
    className={`bg-white p-4 rounded-2xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex justify-between items-center group active:scale-95 transition-transform ${
      job.is_rush ? 'border-red-500' : 'border-black'
    }`}
  >
    <div>
      <div className="flex items-center gap-2">
        <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
        {job.is_rush && <Flame size={16} className="text-red-500 fill-red-500" />}
        {cooldownRemaining > 0 && (
          <span className="flex items-center gap-1 text-[8px] font-black text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded">
            <Clock size={10} /> {cooldownRemaining}s
          </span>
        )}
      </div>
      <p className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1">
        <Package size={10} /> {job.article_code || 'Stock'}
      </p>
    </div>
    <p className="text-[8px] font-black uppercase text-gray-400">{job.current_stage}</p>
  </div>
)

const CameraScanner = ({ containerId, onScan, onStop }) => {
  const { initialized, error, permissionDenied, start, stop, setOnScan } = useCameraScanner(containerId)
  useEffect(() => { setOnScan(onScan) }, [setOnScan, onScan])
  useEffect(() => {
    const t = setTimeout(() => start(), 100)
    return () => { clearTimeout(t); stop() }
  }, [start, stop])

  return (
    <div className="space-y-4">
      <div id={containerId} className="w-full aspect-video bg-black rounded-2xl overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-600 rounded-xl font-black text-xs text-red-800">
          {error}
          {permissionDenied && <button onClick={() => { stop(); start() }} className="ml-2 underline">Retry</button>}
        </div>
      )}
      {!error && !initialized && (
        <div className="text-center p-4 bg-yellow-100 border-2 border-yellow-600 rounded-xl font-black text-xs">Initializing camera…</div>
      )}
      {initialized && <p className="text-center text-[10px] font-black text-green-600">Camera active – point at a QR code</p>}
      <button onClick={onStop} className="w-full bg-gray-200 p-3 rounded-xl font-black text-xs border-2 border-black">STOP CAMERA</button>
    </div>
  )
}

// ─── Active Order Card (separate Start/Stop buttons) ─────────────────────────
function ActiveOrderCard({
  order, loading,
  isExternal, setIsExternal,
  manualStage, setManualStage,
  lastRedoReason,
  showRejectMenu, setShowRejectMenu,
  cooldownRemaining,
  isTimerRunning,
  onTimerStart, onTimerStop,
  onClose, onToggleStone, onMove, onPrint,
}) {
  return (
    <div className="bg-white border-4 border-black p-4 md:p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">{order.vtiger_id}</h2>
            {order.is_rush && <Flame size={24} className="text-red-500 fill-red-500" />}
            {cooldownRemaining > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-black text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                <Clock size={14} /> {cooldownRemaining}s cooldown
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
              {order.article_code || 'NO CODE'}
            </span>
            <span className="text-gray-400 font-black text-[10px] uppercase italic">
              Stage: {order.current_stage}
            </span>
            {order.deadline && (
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1">
                <Calendar size={10} /> Due: {new Date(order.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-black ml-2 shrink-0"><X size={32} /></button>
      </div>

      {/* Order details */}
      <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 mb-6 grid grid-cols-2 gap-y-3">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase">Metal</p>
          <p className="text-xs font-black">{order.metal || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase">Size</p>
          <p className="text-xs font-black">{order.ring_size || 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-black text-gray-400 uppercase">Instructions</p>
          <p className="text-[10px] font-bold italic">{order.instructions || 'No special notes'}</p>
        </div>
      </div>

      {/* Last redo reason alert */}
      {lastRedoReason && order.current_stage === 'Goldsmithing' && (
        <div className="mb-4 bg-red-600 text-white p-3 rounded-xl border-2 border-black flex items-center gap-3 animate-pulse">
          <AlertOctagon size={20} />
          <div>
            <p className="text-xs font-black uppercase opacity-70">Last QC Fail Reason</p>
            <p className="text-xs font-black uppercase">{lastRedoReason}</p>
          </div>
        </div>
      )}

      {/* Internal / External toggle */}
      {(order.current_stage === 'Setting' || order.current_stage === 'Polishing') && (
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4 border-2 border-black">
          {[
            { value: false, label: 'INTERNAL', icon: <Home size={12} />, activeClass: 'bg-black text-white' },
            { value: true,  label: 'EXTERNAL', icon: <Globe size={12} />, activeClass: 'bg-blue-600 text-white' },
          ].map(({ value, label, icon, activeClass }) => (
            <button
              key={label}
              onClick={() => setIsExternal(value)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-[10px] transition-all ${
                isExternal === value ? activeClass : 'text-gray-400'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* QR Code */}
      <div className="relative flex flex-col items-center bg-gray-50 border-2 border-black rounded-3xl p-4 mb-6">
        <div className="bg-white p-2 border border-black rounded-lg shadow-sm">
          <QRCodeCanvas value={order.vtiger_id} size={120} level="H" includeMargin={false} />
        </div>
        <p className="text-[9px] font-black uppercase mt-2 text-gray-400 tracking-widest">Digital Job Token</p>
        <button onClick={onPrint} className="absolute top-2 right-2 bg-black text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg" title="Print QR Label">
          <Printer size={16} />
        </button>
      </div>

      {/* Stone toggles */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { field: 'center_stone_received', label: 'Center', icon: <Gem size={24} /> },
          { field: 'side_stones_received',  label: 'Sides',  icon: <Layers size={24} /> },
        ].map(({ field, label, icon }) => (
          <button
            key={field}
            onClick={() => onToggleStone(field, order[field])}
            className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 transition-all ${
              order[field] ? 'bg-green-500 text-white shadow-inner' : 'bg-gray-50 text-gray-400 border-dashed'
            }`}
          >
            {icon}
            <span className="text-[10px] font-black uppercase">
              {order[field] ? `${label}: Ready` : `${label}: Needed`}
            </span>
          </button>
        ))}
      </div>

      {/* START / STOP buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onTimerStart}
          disabled={loading || isTimerRunning}
          className="flex items-center justify-center gap-2 p-4 bg-green-500 text-white border-4 border-black rounded-2xl font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ▶ START
        </button>
        <button
          onClick={onTimerStop}
          disabled={loading || !isTimerRunning}
          className="flex items-center justify-center gap-2 p-4 bg-red-500 text-white border-4 border-black rounded-2xl font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ■ STOP
        </button>
      </div>

      {/* Manual stage override */}
      <div className="space-y-4">
        <div className="bg-white border-2 border-black rounded-xl p-3">
          <label className="text-xs font-black uppercase text-gray-400">Override Stage:</label>
          <select
            className="w-full font-black text-sm outline-none bg-transparent"
            value={manualStage}
            onChange={e => setManualStage(e.target.value)}
          >
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button
          disabled={loading}
          onClick={() => onMove(false, null)}
          className="w-full bg-black text-white p-5 border-4 border-black rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-gray-800 active:scale-95 transition-all shadow-[0px_6px_0px_0px_rgba(0,0,0,0.5)] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={24} /> MOVE TO STAGE</>}
        </button>

        <button
          onClick={() => setShowRejectMenu(v => !v)}
          className="w-full bg-red-50 text-red-600 p-4 border-2 border-red-600 border-dashed rounded-2xl font-black text-xs uppercase hover:bg-red-100"
        >
          Fail QC / Send back to Goldsmithing
        </button>

        {showRejectMenu && (
          <div className="bg-red-100 p-4 rounded-2xl border-2 border-red-600 animate-in slide-in-from-top-2">
            <p className="text-xs font-black uppercase mb-3 text-red-700">Reason for Redo:</p>
            <div className="grid grid-cols-1 gap-2">
              {REDO_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => onMove(true, reason)}
                  className="bg-white p-3 border-2 border-black rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-colors text-left"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
function WorkshopContent() {
  const [activeTab,      setActiveTab]      = useState('scanner')
  const [searchId,       setSearchId]       = useState('')
  const [activeOrder,    setActiveOrder]    = useState(null)
  const [staffName,      setStaffName]      = useState(STAFF_MEMBERS[0])
  const [loading,        setLoading]        = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [jobsLoading,    setJobsLoading]    = useState(true)
  const [activeJobs,     setActiveJobs]     = useState([])
  const [scanMessage,    setScanMessage]    = useState(null)
  const [scanMode,       setScanMode]       = useState('manual')
  const [isExternal,     setIsExternal]     = useState(false)
  const [manualStage,    setManualStage]    = useState('')
  const [lastRedoReason, setLastRedoReason] = useState(null)

  const [isTimerRunning,  setIsTimerRunning]  = useState(false)

  const cooldownsRef  = useRef({})
  const processingRef = useRef(false)

  // Unified 1s tick for cooldown countdown display
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Sync state with activeOrder
  useEffect(() => {
    if (!activeOrder) {
      setLastRedoReason(null)
      return
    }
    setManualStage(activeOrder.current_stage)
    setIsExternal(activeOrder.is_external || false)
    fetchLastRedoReason(activeOrder.id)
  }, [activeOrder])

  const fetchLastRedoReason = useCallback(async (orderId) => {
    const { data } = await supabase
      .from('production_logs')
      .select('redo_reason')
      .eq('order_id', orderId)
      .not('redo_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data?.[0]) setLastRedoReason(data[0].redo_reason)
  }, [])

  const isOrderInCooldown = useCallback((orderId) => {
    const expiry = cooldownsRef.current[orderId]
    return expiry && Date.now() < expiry
  }, [])

  const setOrderCooldown = useCallback((orderId) => {
    cooldownsRef.current[orderId] = Date.now() + COOLDOWN_MS
    setTimeout(() => { delete cooldownsRef.current[orderId] }, COOLDOWN_MS)
  }, [])

  useEffect(() => {
    if (!scanMessage) return
    const t = setTimeout(() => setScanMessage(null), 4000)
    return () => clearTimeout(t)
  }, [scanMessage])

  const fetchActiveJobs = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: false })
    if (data) setActiveJobs(data)
    setJobsLoading(false)
  }, [])

  useEffect(() => { fetchActiveJobs() }, [fetchActiveJobs])

  const updateOrderStage = useCallback(async ({ order, nextStage, action, redoReason = null, durationSeconds = 0 }) => {
    setActiveJobs(prev =>
      prev
        .map(j => j.id === order.id ? { ...j, current_stage: nextStage } : j)
        .filter(j => j.current_stage !== 'Completed')
    )
    await supabase.from('orders').update({
      current_stage: nextStage,
      timer_started_at: null,
      timer_accumulated: 0,
      updated_at: new Date().toISOString()
    }).eq('id', order.id)

    await supabase.from('production_logs').insert([{
      order_id: order.id,
      staff_name: staffName,
      action,
      previous_stage: order.current_stage,
      new_stage: nextStage,
      redo_reason: redoReason,
      duration_seconds: durationSeconds,
    }])

    fetchActiveJobs()
  }, [staffName, fetchActiveJobs])

  // START: record start time in DB + log
  const handleTimerStart = useCallback(async () => {
    if (!activeOrder) return
    const now = new Date().toISOString()
    setIsTimerRunning(true)
    await supabase.from('orders').update({ timer_started_at: now }).eq('id', activeOrder.id)
    await supabase.from('production_logs').insert([{
      order_id: activeOrder.id,
      staff_name: staffName,
      action: 'STARTED',
      new_stage: activeOrder.current_stage,
    }])
  }, [activeOrder, staffName])

  // STOP: clear start time, accumulate elapsed in DB + log
  const handleTimerStop = useCallback(async () => {
    if (!activeOrder || !isTimerRunning) return
    const accumulated = (activeOrder.timer_accumulated || 0) +
      Math.floor((Date.now() - new Date(activeOrder.timer_started_at).getTime()) / 1000)
    setIsTimerRunning(false)
    await supabase.from('orders').update({
      timer_started_at: null,
      timer_accumulated: accumulated,
    }).eq('id', activeOrder.id)
    await supabase.from('production_logs').insert([{
      order_id: activeOrder.id,
      staff_name: staffName,
      action: 'PAUSED',
      new_stage: activeOrder.current_stage,
      duration_seconds: accumulated,
    }])
  }, [activeOrder, isTimerRunning, staffName])

  const processOrderId = useCallback(async (cleanId) => {
    if (!cleanId || processingRef.current) return
    processingRef.current = true
    setLoading(true)
    try {
      const { data: order, error } = await supabase
        .from('orders').select('*').eq('vtiger_id', cleanId).single()

      if (!order || error) {
        setScanMessage({ type: 'error', text: `Order ${cleanId} not found!` })
        setSearchId('')
        return
      }
      if (isOrderInCooldown(order.id)) {
        const remaining = Math.ceil((cooldownsRef.current[order.id] - Date.now()) / 1000)
        setScanMessage({ type: 'error', text: `Order ${cleanId} is in cooldown (${remaining}s remaining)` })
        return
      }

      const now = new Date()
      if (!order.timer_started_at) {
        await supabase.from('orders').update({ timer_started_at: now.toISOString() }).eq('id', order.id)
        await supabase.from('production_logs').insert([{
          order_id: order.id, staff_name: staffName, action: 'STARTED', new_stage: order.current_stage,
        }])
        setScanMessage({ type: 'start', text: `▶️ STARTED: ${order.vtiger_id} at ${order.current_stage}` })
      } else {
        const durationSeconds = Math.floor((now - new Date(order.timer_started_at)) / 1000) + (order.timer_accumulated || 0)
        const nextStage = STAGES[STAGES.indexOf(order.current_stage) + 1] || 'Completed'
        await updateOrderStage({ order, nextStage, action: 'COMPLETED', durationSeconds })
        setScanMessage({ type: 'success', text: `✅ COMPLETED: ${order.vtiger_id}. Moved to ${nextStage}` })
      }

      setOrderCooldown(order.id)
      setSearchId('')
    } catch (err) {
      console.error(err)
      setScanMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
      processingRef.current = false
    }
  }, [staffName, isOrderInCooldown, updateOrderStage, setOrderCooldown])

  const handleDecodedText = useCallback((text) => {
    processOrderId(text.trim().toUpperCase())
    navigator.vibrate?.(200)
  }, [processOrderId])

  const handleScan = () => processOrderId(searchId.toUpperCase().trim())

  const handleManualMove = useCallback(async (isRejection = false, reason = null) => {
    if (!activeOrder) return
    setLoading(true)

    const nextStage = isRejection ? 'Goldsmithing' : manualStage
    const durationSeconds = (activeOrder.timer_accumulated || 0) +
      (activeOrder.timer_started_at
        ? Math.floor((Date.now() - new Date(activeOrder.timer_started_at).getTime()) / 1000)
        : 0)

    await supabase.from('orders')
      .update({ current_stage: nextStage, is_external: isExternal, timer_started_at: null, timer_accumulated: 0, updated_at: new Date().toISOString() })
      .eq('id', activeOrder.id)

    await supabase.from('production_logs').insert([{
      order_id: activeOrder.id,
      staff_name: staffName,
      action: isRejection ? 'REJECTED' : 'COMPLETED',
      previous_stage: activeOrder.current_stage,
      new_stage: nextStage,
      redo_reason: reason,
      duration_seconds: durationSeconds,
    }])

    setActiveJobs(prev =>
      prev.map(j => j.id === activeOrder.id ? { ...j, current_stage: nextStage } : j)
          .filter(j => j.current_stage !== 'Completed')
    )
    fetchActiveJobs()
    setOrderCooldown(activeOrder.id)
    setActiveOrder(null)
    setShowRejectMenu(false)
    setScanMessage({ type: 'success', text: `✅ Moved to ${nextStage}` })
    setLoading(false)
  }, [activeOrder, manualStage, isExternal, staffName, setOrderCooldown, fetchActiveJobs])

  const toggleStone = useCallback(async (field, currentValue) => {
    if (!activeOrder) return
    const newValue = !currentValue
    setActiveOrder(prev => ({ ...prev, [field]: newValue }))
    await supabase.from('orders').update({ [field]: newValue }).eq('id', activeOrder.id)
  }, [activeOrder])

  const closeOrder = () => { setActiveOrder(null); setShowRejectMenu(false) }

  const rushJobs = useMemo(() => activeJobs.filter(j => j.is_rush), [activeJobs])
  const cooldownRemainingForJob = useCallback((jobId) => {
    const expiry = cooldownsRef.current[jobId]
    if (!expiry) return 0
    return Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
  }, [])

  const visibleJobs = activeTab === 'rush' ? rushJobs : activeJobs

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      <ScanMessage message={scanMessage} />

      {/* Tab bar */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl gap-1">
        <TabButton active={activeTab === 'scanner'} onClick={() => { setActiveTab('scanner'); closeOrder() }}>
          <ScanLine size={14} /> SCANNER
        </TabButton>
        <TabButton active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); closeOrder() }}>
          <List size={14} /> ACTIVE ({activeJobs.length})
        </TabButton>
        <TabButton active={activeTab === 'rush'} activeClass="bg-red-500 text-white" onClick={() => { setActiveTab('rush'); closeOrder() }}>
          <Flame size={14} className={activeTab === 'rush' ? 'animate-pulse' : ''} /> RUSH ({rushJobs.length})
        </TabButton>
      </div>

      {/* Staff selector */}
      <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-xs font-black uppercase text-gray-400 flex items-center gap-1 mb-1">
          <User size={12} /> Technician
        </label>
        <select
          className="w-full font-bold text-base bg-transparent outline-none cursor-pointer"
          value={staffName}
          onChange={e => setStaffName(e.target.value)}
        >
          {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!activeOrder ? (
        <div className="animate-in fade-in duration-500">
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              <ScannerModeToggle mode={scanMode} onModeChange={setScanMode} />
              {scanMode === 'manual' && (
                <ManualScanner
                  searchId={searchId}
                  onSearchIdChange={setSearchId}
                  onScan={handleScan}
                  loading={loading}
                  disabled={loading}
                />
              )}
              {scanMode === 'camera' && (
                <CameraScanner
                  containerId="qr-reader"
                  onScan={handleDecodedText}
                  onStop={() => setScanMode('manual')}
                />
              )}
            </div>
          )}

          {(activeTab === 'overview' || activeTab === 'rush') && (
            <div className="grid gap-3">
              {jobsLoading ? (
                <div className="text-center p-10 text-gray-400 font-black uppercase text-xs animate-pulse">Loading jobs…</div>
              ) : visibleJobs.length === 0 ? (
                <div className="text-center p-10 text-gray-400 font-black uppercase text-xs">No jobs found in this view.</div>
              ) : (
                visibleJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => setActiveOrder(job)}
                    cooldownRemaining={cooldownRemainingForJob(job.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <ActiveOrderCard
          order={activeOrder}
          loading={loading}
          isExternal={isExternal}
          setIsExternal={setIsExternal}
          manualStage={manualStage}
          setManualStage={setManualStage}
          lastRedoReason={lastRedoReason}
          showRejectMenu={showRejectMenu}
          setShowRejectMenu={setShowRejectMenu}
          cooldownRemaining={cooldownRemainingForJob(activeOrder.id)}
          isTimerRunning={isTimerRunning}
          onTimerStart={handleTimerStart}
          onTimerStop={handleTimerStop}
          onClose={closeOrder}
          onToggleStone={toggleStone}
          onMove={handleManualMove}
          onPrint={() => printQRCode(activeOrder.vtiger_id, activeOrder.article_code)}
        />
      )}
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse">SYNCING WORKSHOP…</div>}>
      <WorkshopContent />
    </Suspense>
  )
}