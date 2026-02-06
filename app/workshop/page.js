'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, Search, Package, MapPin } from 'lucide-react'

export default function WorkshopDashboard() {
  const [searchId, setSearchId] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [loading, setLoading] = useState(false)

  const findOrder = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('vtiger_id', searchId.toUpperCase())
      .single()
    
    if (data) {
      setActiveOrder(data)
    } else {
      alert("Order not found! Make sure the ID is correct.")
    }
    setLoading(false)
  }

  const completeStage = async () => {
    // Logic to move to the next stage
    let nextStage = 'Setting' 
    if (activeOrder.current_stage === 'Setting') nextStage = 'QC'
    if (activeOrder.current_stage === 'QC') nextStage = 'Completed'

    const { error } = await supabase
      .from('orders')
      .update({ current_stage: nextStage })
      .eq('id', activeOrder.id)

    if (!error) {
      alert(`Order moved to ${nextStage}!`)
      setActiveOrder(null) // Clear the screen for the next scan
      setSearchId('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">WORKSHOP FLOOR</h1>
        <p className="text-gray-500 font-medium">Scan a job ticket to update status</p>
      </header>

      {/* SEARCH/SCAN INPUT */}
      <div className="relative mb-10">
        <input 
          type="text" 
          placeholder="SCAN QR CODE HERE..."
          className="w-full p-6 pl-14 border-4 border-black rounded-2xl text-2xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findOrder()}
          autoFocus
        />
        <Search className="absolute left-5 top-7 text-gray-400" size={30} />
      </div>

      {activeOrder ? (
        <div className="bg-white border-4 border-black p-8 rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-200">
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="text-xs font-black uppercase bg-blue-600 text-white px-3 py-1 rounded-md">Active Job</span>
              <h2 className="text-5xl font-black mt-2">{activeOrder.vtiger_id}</h2>
              <p className="text-xl text-gray-600 font-bold uppercase mt-1">{activeOrder.client_name}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-1">
                <MapPin size={16} /> Current Station
              </div>
              <div className="text-2xl font-black bg-yellow-300 border-2 border-black px-4 py-2 rounded-xl">
                {activeOrder.current_stage}
              </div>
            </div>
          </div>

          {/* SPECIFICATIONS GRID */}
          <div className="grid grid-cols-2 gap-6 bg-gray-100 p-6 rounded-2xl mb-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Metal Type</p>
              <p className="text-xl font-black">{activeOrder.metal_type}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ring Size</p>
              <p className="text-xl font-black text-right">{activeOrder.ring_size}</p>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <button 
            onClick={completeStage}
            className="w-full bg-green-500 hover:bg-green-600 text-white border-4 border-black p-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:mt-1 transition-all"
          >
            <CheckCircle size={32} />
            FINISH & SEND TO {activeOrder.current_stage === 'Goldsmithing' ? 'SETTER' : 'QC'}
          </button>

          <button 
            onClick={() => setActiveOrder(null)}
            className="w-full mt-6 text-gray-400 font-bold hover:text-gray-600"
          >
            Cancel / Go Back
          </button>

        </div>
      ) : (
        <div className="text-center py-20 border-4 border-dashed border-gray-200 rounded-3xl">
          <Package className="mx-auto text-gray-200 mb-4" size={80} />
          <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">Waiting for Scan...</p>
        </div>
      )}
    </div>
  )
}