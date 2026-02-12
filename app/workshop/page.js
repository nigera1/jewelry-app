'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Search, User, X, CheckCircle, 
  Loader2, Gem, Layers, List, ScanLine, Package,
  Play, Pause, RotateCcw
} from 'lucide-react'

const STAGES = ['At Casting', 'Goldsmithing', 'Setting', 'Polishing', 'QC', 'Completed']
const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'Polisher 1', 'QC']
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

function WorkshopContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState('scanner')
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [activeJobs, setActiveJobs] = useState([])

  // --- Timer state ---
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [accumulated, setAccumulated] = useState(0)
  const [startedAt, setStartedAt] = useState(null) 
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerLoading, setTimerLoading] = useState(false)
  const timerIntervalRef = useRef(null)

  // --- Fetch active jobs on mount ---
  useEffect(() => {
    fetchActiveJobs()
  }, [])

  // --- Timer interval: recalc elapsed every second when running ---
  useEffect(() => {
    if (isTimerRunning && startedAt) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const diffSeconds = (now - startedAt.getTime()) / 1000
        setElapsedSeconds(accumulated + diffSeconds)
      }, 1000)
    } else {
      clearInterval(timerIntervalRef.current)
    }
    return () => clearInterval(timerIntervalRef.current)
  }, [isTimerRunning, startedAt, accumulated])

  // --- Load timer state from activeOrder ---
  useEffect(() => {
    if (activeOrder) {
      const acc = activeOrder.timer_accumulated || 0
      const start = activeOrder.timer_started_at ? new Date(activeOrder.timer_started_at) : null
      setAccumulated(acc)
      setStartedAt(start)
      setIsTimerRunning(!!start)

      if (start) {
        const diff = (Date.now() - start.getTime()) / 1000
        setElapsedSeconds(acc + diff)
      } else {
        setElapsedSeconds(acc)
      }
    } else {
      // Reset timer when order is closed
      setElapsedSeconds(0)
      setAccumulated(0)
      setStartedAt(null)
      setIsTimerRunning(false)
    }
  }, [activeOrder])

  const fetchActiveJobs = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: false })
    if (data) setActiveJobs(data)
  }

  const findOrder = async (idToSearch = searchId) => {
    const cleanId = idToSearch.toUpperCase().trim()
    if (!cleanId) return
    setLoading(true)
    
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('vtiger_id', cleanId)
      .single()

    if (data) {
      setActiveOrder(data)
      setSearchId('')
    } else {
      alert("Order not found!")
    }
    setLoading(false)
  }

  const toggleStone = async (field, currentValue) => {
    if (!activeOrder) return
    const newValue = !currentValue
    setActiveOrder({ ...activeOrder, [field]: newValue })
    
    const { error } = await supabase
      .from('orders')
      .update({ [field]: newValue })
      .eq('id', activeOrder.id)

    if (error) {
      alert(`Error updating stone: ${error.message}`)
      setActiveOrder({ ...activeOrder, [field]: currentValue })
    }
  }

  // --- Persist timer state to database ---
  const saveTimerToDB = async (newAccumulated, newStartedAt) => {
    if (!activeOrder) return
    setTimerLoading(true)
    const updates = {
      timer_accumulated: Math.floor(newAccumulated),
      timer_started_at: newStartedAt
    }
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', activeOrder.id)
    if (error) console.error('Timer save error:', error.message)
    setTimerLoading(false)
  }

  // --- Timer controls ---
  const startTimer = async () => {
    if (!activeOrder) return
    const now = new Date()
    setStartedAt(now)
    setIsTimerRunning(true)
    // Keep accumulated unchanged, set started_at in DB
    await saveTimerToDB(accumulated, now.toISOString())
  }

  const pauseTimer = async () => {
    if (!activeOrder || !startedAt) return
    setIsTimerRunning(false)
    const now = Date.now()
    const additional = (now - startedAt.getTime()) / 1000
    const newAccumulated = accumulated + additional
    setAccumulated(newAccumulated)
    setElapsedSeconds(newAccumulated)
    setStartedAt(null)
    await saveTimerToDB(newAccumulated, null)
  }

  const resetTimer = async () => {
    setIsTimerRunning(false)
    setAccumulated(0)
    setElapsedSeconds(0)
    setStartedAt(null)
    await saveTimerToDB(0, null)
  }

  // --- Updated handleMove with timer integration ---
  const handleMove = async (isRejection = false, reason = null) => {
    if (!activeOrder) return
    setLoading(true)

    // 1. Capture final duration for current stage
    // If timer running, pause it conceptually to get total
    let finalDuration = accumulated
    if (isTimerRunning && startedAt) {
      finalDuration += (Date.now() - startedAt.getTime()) / 1000
    }
    const finalStageDuration = Math.floor(finalDuration)

    // 2. Pause/Reset logic handled by updating the order with new stage & clearing timer fields
    const currentIndex = STAGES.indexOf(activeOrder.current_stage)
    const nextStage = isRejection ? 'Goldsmithing' : STAGES[currentIndex + 1] || 'Completed'

    const { error } = await supabase
      .from('orders')
      .update({ 
        current_stage: nextStage,
        timer_accumulated: 0, // Reset for next stage
        timer_started_at: null // Reset for next stage
      })
      .eq('id', activeOrder.id)
    
    if (!error) {
      // 3. Log the completed stage duration
      await supabase.from('production_logs').insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: activeOrder.current_stage,
        new_stage: nextStage,
        redo_reason: reason,
        duration_seconds: finalStageDuration,
        action: isRejection ? 'REJECTED' : 'COMPLETED'
      }])
      
      setActiveOrder(null)
      setShowRejectMenu(false)
      fetchActiveJobs()
    }
    setLoading(false)
  }

  const closeOrder = async () => {
    if (activeOrder) {
      if (isTimerRunning) {
        await pauseTimer()
      } else {
        await saveTimerToDB(accumulated, null)
      }
    }
    setActiveOrder(null)
  }

  // --- Format seconds -> HH:MM:SS or MM:SS ---
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = Math.floor(totalSeconds % 60)
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // --- Compute current total time for list view ---
  const getJobCurrentTime = (job) => {
    let acc = job.timer_accumulated || 0
    if (job.timer_started_at) {
      const start = new Date(job.timer_started_at)
      acc += (Date.now() - start.getTime()) / 1000
    }
    return acc
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      
      {/* HEADER TABS */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl">
        <button onClick={() => { setActiveTab('scanner'); closeOrder(); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${activeTab === 'scanner' ? 'bg-white text-black' : 'text-gray-400'}`}>
          <ScanLine size={14}/> SCANNER
        </button>
        <button onClick={() => { setActiveTab('overview'); closeOrder(); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${activeTab === 'overview' ? 'bg-white text-black' : 'text-gray-400'}`}>
          <List size={14}/> ACTIVE ({activeJobs.length})
        </button>
      </div>

      {/* STAFF SELECTOR */}
      <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1 mb-1"><User size={12}/> Workshop Staff</label>
        <select className="w-full font-bold text-base bg-transparent outline-none cursor-pointer" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
          {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!activeOrder ? (
        <div className="animate-in fade-in duration-500">
          {activeTab === 'scanner' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="SCAN OR TYPE ID..." 
                  className="w-full p-4 border-4 border-black rounded-xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-blue-50" 
                  value={searchId} 
                  onChange={(e) => setSearchId(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && findOrder()} 
                />
                <button onClick={() => findOrder()} className="bg-black text-white px-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all">
                  <Search />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeJobs.map(job => {
                const currentTime = getJobCurrentTime(job)
                return (
                  <div key={job.id} onClick={() => setActiveOrder(job)} className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex justify-between items-center group active:scale-95 transition-transform">
                    <div>
                      <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
                      <p className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1">
                        <Package size={10}/> {job.article_code || 'Stock'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black uppercase text-gray-400">{job.current_stage}</p>
                      {currentTime > 0 && (
                        <p className="text-[10px] font-bold text-gray-500">{formatTime(currentTime)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* --- ACTIVE JOB CARD --- */
        <div className="bg-white border-4 border-black p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-5xl font-black tracking-tighter leading-none">{activeOrder.vtiger_id}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  {activeOrder.article_code || 'NO CODE'}
                </span>
                <span className="text-gray-400 font-black text-[10px] uppercase italic">Stage: {activeOrder.current_stage}</span>
              </div>
            </div>
            <button onClick={closeOrder} className="text-gray-300 hover:text-black"><X size={32}/></button>
          </div>

          {/* STONE TRACKING */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => toggleStone('center_stone_received', activeOrder.center_stone_received)} className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 transition-all ${activeOrder.center_stone_received ? 'bg-green-500 text-white shadow-inner' : 'bg-red-50 text-red-500 border-dashed'}`}>
              <Gem size={24} />
              <span className="text-[10px] font-black uppercase">{activeOrder.center_stone_received ? 'Center: Received' : 'Center: Needed'}</span>
            </button>
            <button onClick={() => toggleStone('side_stones_received', activeOrder.side_stones_received)} className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 transition-all ${activeOrder.side_stones_received ? 'bg-green-500 text-white shadow-inner' : 'bg-red-50 text-red-500 border-dashed'}`}>
              <Layers size={24} />
              <span className="text-[10px] font-black uppercase">{activeOrder.side_stones_received ? 'Sides: Received' : 'Sides: Needed'}</span>
            </button>
          </div>

          {/* --- TIMER SECTION --- */}
          <div className="bg-black text-white p-5 rounded-3xl mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between">
              <div className="text-4xl font-mono font-black tracking-wider">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="flex gap-2">
                {!isTimerRunning ? (
                  <button 
                    onClick={startTimer}
                    disabled={timerLoading}
                    className="bg-green-500 hover:bg-green-600 p-3 rounded-full text-black border-2 border-white transition-all active:scale-90"
                  >
                    <Play size={20} fill="black" />
                  </button>
                ) : (
                  <button 
                    onClick={pauseTimer}
                    disabled={timerLoading}
                    className="bg-yellow-400 hover:bg-yellow-500 p-3 rounded-full text-black border-2 border-white transition-all active:scale-90"
                  >
                    <Pause size={20} fill="black" />
                  </button>
                )}
                <button 
                  onClick={resetTimer}
                  disabled={timerLoading}
                  className="bg-gray-600 hover:bg-gray-700 p-3 rounded-full text-white border-2 border-white transition-all active:scale-90"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
            {timerLoading && (
              <div className="text-[10px] text-gray-300 mt-2 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> saving...
              </div>
            )}
            {accumulated > 0 && !timerLoading && (
              <div className="text-[10px] text-gray-400 mt-2">
                Previously logged: {formatTime(accumulated)}
              </div>
            )}
          </div>

          {/* PROGRESS BUTTON */}
          <div className="space-y-4">
            <button 
              disabled={loading || timerLoading} 
              onClick={() => handleMove(false)} 
              className="w-full bg-green-500 text-white p-6 border-4 border-black rounded-3xl font-black text-2xl flex items-center justify-center gap-3 hover:bg-green-600 active:scale-95 transition-all shadow-[0px_6px_0px_0px_rgba(21,128,61,1)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28}/> MOVE TO NEXT</>}
            </button>

            <button onClick={() => setShowRejectMenu(!showRejectMenu)} className="w-full bg-red-50 text-red-600 p-4 border-2 border-red-600 border-dashed rounded-2xl font-black text-xs uppercase">
              Fail QC / Send back to Goldsmithing
            </button>

            {showRejectMenu && (
              <div className="bg-red-100 p-4 rounded-2xl border-2 border-red-600 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase mb-3 text-red-700">Reason for Redo:</p>
                <div className="grid grid-cols-1 gap-2">
                  {REDO_REASONS.map(reason => (
                    <button key={reason} onClick={() => handleMove(true, reason)} className="bg-white p-3 border-2 border-black rounded-xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-colors text-left">
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkshopPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse">LOADING WORKSHOP...</div>}>
      <WorkshopContent />
    </Suspense>
  )
}