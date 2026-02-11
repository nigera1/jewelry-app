'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Camera, X, RotateCcw, CheckCircle, BarChart3, Loader2 } from 'lucide-react'

const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'QC']
const REDO_REASONS = ['Loose Stone', 'Polishing Issue', 'Sizing Error', 'Metal Flaw', 'Other']

const STAGE_FLOW = {
  'Goldsmithing': 'Setting',
  'Setting': 'QC',
  'QC': 'Completed',
  'Completed': 'Completed'
}

export default function WorkshopDashboard() {
  const [view, setView] = useState('scanner') // 'scanner' or 'stats'
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [allLogs, setAllLogs] = useState([]) // For Analytics

  // Fetch Global Logs for Analytics
  useEffect(() => {
    if (view === 'stats') {
      fetchGlobalLogs()
    }
  }, [view])

  const fetchGlobalLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('production_logs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to fetch logs:', error)
      alert('Failed to load analytics')
    } else if (data) {
      setAllLogs(data)
    }
    setLoading(false)
  }

  const findOrder = useCallback(async (idToSearch = searchId) => {
    const cleanId = idToSearch.toUpperCase().trim()
    if (!cleanId) return
    
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, production_logs(*)')
      .eq('vtiger_id', cleanId)
      .single()
    
    if (error) {
      alert('Order not found!')
    } else if (data) {
      if (data.current_stage === 'At Casting') {
        alert('🛑 Still at Casting!')
      } else {
        setActiveOrder(data)
      }
    }
    setLoading(false)
  }, [searchId])

  // Camera Logic with proper cleanup
  useEffect(() => {
    let scanner = null
    
    if (showCamera && view === 'scanner') {
      scanner = new Html5QrcodeScanner('reader', { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      })
      
      scanner.render(
        (decodedText) => {
          setSearchId(decodedText)
          findOrder(decodedText)
          if (scanner) {
            scanner.clear().catch(console.error)
          }
          setShowCamera(false)
        },
        (error) => {
          // Silently handle scanning errors
          console.debug('QR scan error:', error)
        }
      )
    }
    
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error)
      }
    }
  }, [showCamera, view, findOrder])

  const handleMove = async (nextStage, isRejection = false, reason = null) => {
    setLoading(true)
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({ current_stage: nextStage })
      .eq('id', activeOrder.id)
    
    if (updateError) {
      alert('Failed to update order: ' + updateError.message)
      setLoading(false)
      return
    }
    
    const { error: logError } = await supabase
      .from('production_logs')
      .insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: activeOrder.current_stage,
        new_stage: nextStage,
        redo_reason: reason
      }])
    
    if (logError) {
      console.error('Failed to log action:', logError)
      alert('Order updated but log failed')
    } else {
      alert(isRejection ? `⚠️ Sent back to ${nextStage}` : `✅ Moved to ${nextStage}`)
    }
    
    setActiveOrder(null)
    setSearchId('')
    setShowRejectMenu(false)
    setLoading(false)
  }

  const getNextStage = (currentStage) => {
    return STAGE_FLOW[currentStage] || 'Completed'
  }

  // Analytics Calculations
  const redos = allLogs.filter(l => l.redo_reason)
  const completions = allLogs.filter(l => l.new_stage === 'Completed')
  const redosByReason = REDO_REASONS.map(reason => ({
    reason,
    count: redos.filter(r => r.redo_reason === reason).length
  }))

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      
      {/* VIEW TOGGLE */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-lg">
        <button 
          onClick={() => setView('scanner')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all ${view === 'scanner' ? 'bg-white text-black' : 'text-white'}`}
        >
          <Camera size={14}/> SCANNER
        </button>
        <button 
          onClick={() => setView('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-black text-xs transition-all ${view === 'stats' ? 'bg-white text-black' : 'text-white'}`}
        >
          <BarChart3 size={14}/> SHOP STATS
        </button>
      </div>

      {view === 'scanner' ? (
        <>
          {/* STAFF SELECTOR */}
          <div className="mb-6 bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <label className="text-[10px] font-black uppercase text-gray-400">Current Staff</label>
            <select 
              className="w-full font-black text-lg bg-transparent outline-none" 
              value={staffName} 
              onChange={(e) => setStaffName(e.target.value)}
            >
              {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!activeOrder && (
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="SCAN ID..." 
                className="flex-1 p-4 border-4 border-black rounded-xl font-black text-xl uppercase" 
                value={searchId} 
                onChange={(e) => setSearchId(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && findOrder()}
                disabled={loading}
              />
              <button 
                onClick={() => setShowCamera(true)} 
                className="bg-blue-600 text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : <Camera />}
              </button>
            </div>
          )}

          {/* CAMERA MODAL */}
          {showCamera && (
            <div className="fixed inset-0 bg-black z-50 p-6">
              <button 
                onClick={() => setShowCamera(false)} 
                className="text-white mb-4 hover:text-gray-300"
              >
                <X size={40}/>
              </button>
              <div id="reader" className="bg-white rounded-xl"></div>
            </div>
          )}

          {activeOrder && (
            <div className={`bg-white border-4 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${activeOrder.is_rush ? 'border-red-600 ring-4 ring-red-200' : 'border-black'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black">{activeOrder.vtiger_id}</h2>
                  <p className="text-gray-500 font-semibold mt-1">{activeOrder.client_name}</p>
                </div>
                <span className="bg-yellow-300 border-2 border-black px-3 py-1 rounded-lg font-black text-xs">
                  {activeOrder.current_stage}
                </span>
              </div>

              {activeOrder.is_rush && (
                <div className="bg-red-100 border-2 border-red-600 p-3 rounded-xl mb-4">
                  <span className="font-black text-red-600 uppercase text-sm">⚠️ RUSH ORDER</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <span className="text-gray-500 text-xs font-bold block">Metal</span>
                  <span className="font-black">{activeOrder.metal_type}</span>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <span className="text-gray-500 text-xs font-bold block">Size</span>
                  <span className="font-black">{activeOrder.ring_size || 'N/A'}</span>
                </div>
              </div>

              {activeOrder.cad_url && (
                <div className="mb-6 border-2 border-gray-200 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeOrder.cad_url} alt="CAD" className="w-full h-48 object-contain bg-gray-50" />
                </div>
              )}

              <div className="space-y-3">
                <button 
                  onClick={() => handleMove(getNextStage(activeOrder.current_stage))}
                  className="w-full bg-green-500 text-white p-5 border-4 border-black rounded-2xl font-black text-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                  {loading ? 'UPDATING...' : 'FINISH STAGE'}
                </button>

                {activeOrder.current_stage === 'QC' && !showRejectMenu && (
                  <button 
                    onClick={() => setShowRejectMenu(true)} 
                    className="w-full bg-orange-100 text-orange-600 p-4 border-2 border-orange-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-orange-200 transition-colors"
                  >
                    <RotateCcw size={20} /> REJECT / NEEDS FIX
                  </button>
                )}

                {showRejectMenu && (
                  <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200">
                    <p className="text-[10px] font-black uppercase text-orange-400 mb-3">Select Redo Reason</p>
                    <div className="grid grid-cols-1 gap-2">
                      {REDO_REASONS.map(reason => (
                        <button 
                          key={reason} 
                          onClick={() => handleMove('Goldsmithing', true, reason)} 
                          className="bg-white p-3 border-2 border-black rounded-xl font-bold text-sm hover:bg-orange-500 hover:text-white text-left transition-colors"
                          disabled={loading}
                        >
                          {reason}
                        </button>
                      ))}
                      <button 
                        onClick={() => setShowRejectMenu(false)} 
                        className="bg-gray-200 p-3 border-2 border-black rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setActiveOrder(null)
                    setSearchId('')
                    setShowRejectMenu(false)
                  }} 
                  className="w-full text-gray-400 hover:text-gray-600 underline text-sm"
                >
                  ← Clear & Scan Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* STATS VIEW */
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin" size={40} />
            </div>
          ) : (
            <>
              {/* COMPLETIONS */}
              <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-sm font-black text-gray-400 uppercase mb-2">Completed Orders</h3>
                <p className="text-5xl font-black text-green-600">{completions.length}</p>
              </div>

              {/* REDOS */}
              <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-sm font-black text-gray-400 uppercase mb-2">Total Redos</h3>
                <p className="text-5xl font-black text-orange-600 mb-6">{redos.length}</p>
                
                <div className="space-y-2">
                  <p className="text-xs font-black text-gray-400 uppercase mb-3">Breakdown by Reason</p>
                  {redosByReason.map(({ reason, count }) => (
                    <div key={reason} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span className="font-bold text-sm">{reason}</span>
                      <span className="font-black text-lg text-orange-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECENT ACTIVITY */}
              <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-sm font-black text-gray-400 uppercase mb-4">Recent Activity</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allLogs.slice(0, 20).map((log, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-black text-sm">{log.staff_name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {log.previous_stage} → <span className="font-bold">{log.new_stage}</span>
                      </p>
                      {log.redo_reason && (
                        <p className="text-xs text-orange-600 font-bold mt-1">
                          ⚠️ Redo: {log.redo_reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div> 
  )
}
