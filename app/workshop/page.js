'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeCanvas } from 'qrcode.react'
import { 
  Camera, Search, User, X, RotateCcw, 
  CheckCircle, Package, Loader2,
  Gem, Layers, List, ScanLine
} from 'lucide-react'

const STAFF_MEMBERS = ['Goldsmith 1', 'Goldsmith 2', 'Setter 1', 'Setter 2', 'QC']
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

  useEffect(() => {
    const urlId = searchParams.get('search')
    if (urlId && !activeOrder) {
      findOrder(urlId)
    }
  }, [searchParams])

  const fetchActiveJobs = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .neq('current_stage', 'Completed')
      .order('created_at', { ascending: false })
    if (data) setActiveJobs(data)
  }

  useEffect(() => {
    if (showCamera && activeTab === 'scanner') {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } });
      scanner.render((decodedText) => {
        const id = decodedText.includes('search=') ? decodedText.split('search=')[1] : decodedText
        findOrder(id);
        scanner.clear();
        setShowCamera(false);
      }, (error) => {});
      return () => scanner.clear();
    }
  }, [showCamera, activeTab]);

  const findOrder = async (idToSearch = searchId) => {
    const cleanId = idToSearch.toUpperCase().trim();
    if (!cleanId) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('orders')
      .select('*, production_logs(*)')
      .eq('vtiger_id', cleanId)
      .single();

    if (data) {
      setActiveOrder(data);
      setSearchId('');
    } else {
      alert("Order not found!");
    }
    setLoading(false);
  }

  const toggleStone = async (field, currentValue) => {
    if (!activeOrder) return;
    const newValue = !currentValue
    setActiveOrder({ ...activeOrder, [field]: newValue })
    
    const { error } = await supabase
      .from('orders')
      .update({ [field]: newValue })
      .eq('id', activeOrder.id)

    if (error) {
      alert(`Error: ${error.message}. Ensure columns exist in Supabase!`)
      setActiveOrder({ ...activeOrder, [field]: currentValue })
    }
  }

  const handleMove = async (nextStage, isRejection = false, reason = null) => {
    if (!activeOrder) return;
    setLoading(true)
    const { error } = await supabase.from('orders').update({ current_stage: nextStage }).eq('id', activeOrder.id);
    
    if (!error) {
      await supabase.from('production_logs').insert([{
        order_id: activeOrder.id,
        staff_name: staffName,
        previous_stage: activeOrder.current_stage,
        new_stage: nextStage,
        redo_reason: reason
      }]);
      
      alert(isRejection ? `⚠️ Sent back to ${nextStage}` : `✅ Moved to ${nextStage}`);
      setActiveOrder(null);
      setShowRejectMenu(false);
      fetchActiveJobs();
      router.push('/workshop', { shallow: true });
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen pb-20">
      
      {/* TABS */}
      <div className="flex bg-black p-1 rounded-xl mb-6 shadow-xl sticky top-4 z-40 border border-gray-800">
        <button onClick={() => { setActiveTab('scanner'); setActiveOrder(null); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${activeTab === 'scanner' ? 'bg-white text-black shadow-inner' : 'text-gray-400'}`}>
          <ScanLine size={14}/> SCANNER
        </button>
        <button onClick={() => { setActiveTab('overview'); setActiveOrder(null); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-black text-xs transition-all ${activeTab === 'overview' ? 'bg-white text-black shadow-inner' : 'text-gray-400'}`}>
          <List size={14}/> OVERVIEW ({activeJobs.length})
        </button>
      </div>

      {/* STAFF SELECTOR */}
      <div className="mb-4 bg-white p-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1 mb-1"><User size={12}/> Current Staff</label>
        <select className="w-full font-bold text-base bg-transparent outline-none" value={staffName} onChange={(e) => setStaffName(e.target.value)}>
          {STAFF_MEMBERS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* CONDITIONAL RENDERING: LIST OR SCANNER */}
      {!activeOrder ? (
        <>
          {activeTab === 'scanner' && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-4 text-gray-400" size={20}/>
                  <input 
                    type="text" 
                    placeholder="ENTER ID..." 
                    className="w-full pl-10 p-4 border-4 border-black rounded-xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-y-1 focus:shadow-none transition-all outline-none" 
                    value={searchId} 
                    onChange={(e) => setSearchId(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && findOrder()} 
                  />
                </div>
                <button onClick={() => setShowCamera(true)} className="bg-blue-600 text-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Camera />
                </button>
              </div>

              {showCamera && (
                <div className="fixed inset-0 bg-black z-50 p-6 flex flex-col items-center justify-center">
                  <button onClick={() => setShowCamera(false)} className="absolute top-8 right-8 text-white"><X size={48}/></button>
                  <div className="bg-white p-2 rounded-2xl border-4 border-blue-500 overflow-hidden shadow-2xl">
                    <div id="reader" className="w-75"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid gap-3 animate-in slide-in-from-right-4 duration-300">
              {activeJobs.map(job => (
                <div 
                  key={job.id} 
                  onClick={() => setActiveOrder(job)}
                  className="bg-white p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <p className="font-black text-xl group-hover:text-blue-600">{job.vtiger_id}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase">{job.client_name || 'Stock Item'}</p>
                  </div>
                  <span className="bg-yellow-300 border-2 border-black px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                    {job.current_stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* THE ACTIVE CARD (Wrapped in activeOrder check to prevent error) */
        <div className={`bg-white border-4 p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200 ${activeOrder.is_rush ? 'border-red-600' : 'border-black'}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-5xl font-black tracking-tighter">{activeOrder.vtiger_id}</h2>
              <p className="text-gray-400 font-black text-xs uppercase mt-2">{activeOrder.client_name}</p>
            </div>
            <button onClick={() => setActiveOrder(null)} className="text-gray-300 hover:text-black"><X size={32}/></button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => toggleStone('center_stone_received', activeOrder.center_stone_received)} className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 ${activeOrder.center_stone_received ? 'bg-green-500 text-white' : 'bg-red-50 text-red-500'}`}>
              <Gem size={24} />
              <span className="text-[10px] font-black uppercase">{activeOrder.center_stone_received ? 'CENTER: IN' : 'CENTER: OUT'}</span>
            </button>
            <button onClick={() => toggleStone('side_stones_received', activeOrder.side_stones_received)} className={`p-4 rounded-2xl border-2 border-black flex flex-col items-center gap-2 ${activeOrder.side_stones_received ? 'bg-green-500 text-white' : 'bg-red-50 text-red-500'}`}>
              <Layers size={24} />
              <span className="text-[10px] font-black uppercase">{activeOrder.side_stones_received ? 'SIDES: IN' : 'SIDES: OUT'}</span>
            </button>
          </div>

          <div className="flex flex-col items-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-6 mb-8">
            <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : ''}/workshop?search=${activeOrder.vtiger_id}`} size={160} />
          </div>

          <div className="space-y-4">
            <button disabled={loading} onClick={() => { const stages = ['At Casting', 'Goldsmithing', 'Setting', 'Polishing', 'QC', 'Completed'];; handleMove(stages[stages.indexOf(activeOrder.current_stage) + 1] || 'Completed'); }} className="w-full bg-green-500 text-white p-6 border-4 border-black rounded-3xl font-black text-2xl flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={28}/> NEXT STAGE</>}
            </button>
            {activeOrder.current_stage === 'QC' && (
              <button onClick={() => setShowRejectMenu(true)} className="w-full bg-red-50 text-red-600 p-5 border-4 border-red-600 border-dashed rounded-3xl font-black text-lg">
                FAIL QC / REDO
              </button>
            )}
            {showRejectMenu && (
              <div className="bg-red-50 p-6 rounded-3xl border-4 border-black mt-4">
                {REDO_REASONS.map(reason => (
                  <button key={reason} onClick={() => handleMove('Goldsmithing', true, reason)} className="w-full bg-white p-3 border-2 border-black rounded-xl mb-2 font-black text-xs uppercase hover:bg-red-500 hover:text-white">{reason}</button>
                ))}
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
    <Suspense fallback={<div className="p-20 text-center font-black">LOADING WORKSHOP...</div>}>
      <WorkshopContent />
    </Suspense>
  )
}