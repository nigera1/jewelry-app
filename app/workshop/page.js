'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  Camera, Search, User, X, CheckCircle, 
  Loader2, Gem, Layers, List, ScanLine, Sparkles
} from 'lucide-react'

// Define the full workshop flow
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
  const [showCamera, setShowCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [activeJobs, setActiveJobs] = useState([]) 

  useEffect(() => {
    fetchActiveJobs()
  }, [])

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
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('vtiger_id', cleanId)
      .single()

    if (data) {
      setActiveOrder(data)
      setSearchId('')
    } else {
      alert("Order not found! Ensure the ID is correct.")
    }
    setLoading(false)
  }

  const toggleStone = async (field, currentValue) => {
    if (!activeOrder) return
    const newValue = !currentValue
    
    // Optimistic Update
    setActiveOrder({ ...activeOrder, [field]: newValue })
    
    const { error } = await supabase
      .from('orders')
      .update({ [field]: newValue })
      .eq('id', activeOrder.id)

    if (error) {
      alert(`Error: ${error.message}. Check if columns exist in Supabase!`)
      setActiveOrder({ ...activeOrder, [field]: currentValue })
    }
  }

  const handleMove = async (isRejection = false, reason = null) => {
    if (!activeOrder) return
    setLoading(true)

    // Determine the next stage in the array
    const currentIndex = STAGES.indexOf(activeOrder.current_stage)
    const nextStage = isRejection ? 'Goldsmithing' : STAGES[currentIndex + 1] || 'Completed'

    const { error } = await supabase
      .from('orders')
      .update({ current_stage: nextStage })
      .eq('id', activeOrder.id)
    
    if (!error) {
      await supabase.from('production_logs').insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: activeOrder.current_stage,
        new_stage: nextStage,
        redo_reason: reason
      }])
      
      alert(isRejection ? `⚠️ Sent back for Redo` : `✅ Moved to ${nextStage}`)
      setActiveOrder(null)
      setShowRejectMenu(false)
      fetchActiveJobs()
    } else {
      alert("Error moving stage: " + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      
      {/* HEADER TABS */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl border border-gray-800">
        <button onClick={() => { setActiveTab('scanner'); setActiveOrder(null); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${activeTab === 'scanner' ? 'bg-white text-black' : 'text-gray-400'}`}>
          <ScanLine size={14}/> SCANNER
        </button>
        <button onClick={() => { setActiveTab('overview'); setActiveOrder(null); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${activeTab === 'overview' ? 'bg-white text-black' : 'text-gray-400'}`}>
          <List size={14}/> ACTIVE ({activeJobs.length})
        </button>
      </div>

      {/* STAFF SELECTOR */}
      <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1 mb-1"><User size={12}/> Current Staff</label>
        <select className="w-full font-bold text-base bg-transparent outline-none" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
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
                  placeholder="ENTER VTIGER ID..." 
                  className="w-full p-4 border-4 border-black rounded-xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none" 
                  value={searchId} 
                  onChange={(e) => setSearchId(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && findOrder()} 
                />
                <button onClick={() => findOrder()} className="bg-black text-white px-6 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Search />
                </button>
              </div>
              <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">or scan the QR code on the job sheet</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeJobs.map(job => (
                <div key={job.id} onClick={() => setActiveOrder(job)} className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex justify-between items-center group active:scale-95 transition-transform">
                  <div>
                    <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase">{job.current_stage}</p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded-lg"><CheckCircle size={16} className="text-gray-300" /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* --- THE ACTIVE JOB CARD (FIXED REFERENCE ERROR) --- */
        <div className="bg-white border-4 border-black p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-5xl font-black tracking-tighter">{activeOrder.vtiger_id}</h2>
              <p className="text-blue-600 font-black text-xs uppercase mt-2">Currently at: {activeOrder.current_stage}</p>
            </div>
            <button onClick={() => setActiveOrder(null)} className="text-gray-300 hover:text-black transition-colors"><X size={32}/></button>
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

          {/* PROGRESS BUTTON */}
          <div className="space-y-4">
            <button 
              disabled={loading} 
              onClick={() => handleMove(false)} 
              className="w-full bg-green-500 text-white p-6 border-4 border-black rounded-3xl font-black text-2xl flex items-center justify-center gap-3 hover:bg-green-600 active:scale-95 transition-all shadow-[0px_6px_0px_0px_rgba(21,128,61,1)]"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28}/> COMPLETE STAGE</>}
            </button>

            {/* FAIL/REDO OPTION */}
            <button onClick={() => setShowRejectMenu(!showRejectMenu)} className="w-full bg-red-50 text-red-600 p-4 border-2 border-red-600 border-dashed rounded-2xl font-black text-xs uppercase">
              Fail QC / Send to Redo
            </button>

            {showRejectMenu && (
              <div className="bg-red-100 p-4 rounded-2xl border-2 border-red-600 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase mb-3 text-red-700">Select Reason for Redo:</p>
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