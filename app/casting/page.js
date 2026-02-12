'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Factory, CheckCircle2, Timer, PackageSearch, ArrowUpRight, Loader2 } from 'lucide-react'

export default function CastingPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchCastingJobs()
  }, [])

  const fetchCastingJobs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('current_stage', 'At Casting')
      .order('created_at', { ascending: true })
    
    if (data) setJobs(data)
    setLoading(false)
  }

  const approveToWorkshop = async (job) => {
    setProcessingId(job.id)
    
    // 1. Move to Goldsmithing
    const { error } = await supabase
      .from('orders')
      .update({ current_stage: 'Goldsmithing' })
      .eq('id', job.id)

    if (!error) {
      // 2. Log the approval
      await supabase.from('production_logs').insert([{
        order_id: job.id,
        staff_name: 'Casting Dept',
        previous_stage: 'At Casting',
        new_stage: 'Goldsmithing'
      }])
      
      // 3. Update local UI
      setJobs(jobs.filter(j => j.id !== job.id))
    }
    setProcessingId(null)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
            <Factory size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Casting Queue</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Awaiting Metal Arrival & Approval</p>
          </div>
        </div>
        
        <div className="bg-white border-4 border-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[10px] font-black text-slate-400 uppercase">Pending Approval</p>
          <p className="text-2xl font-black text-blue-600">{jobs.length} JOBS</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="font-black uppercase">Loading Queue...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border-4 border-dashed border-slate-200 rounded-[3rem] py-20 text-center">
          <PackageSearch size={64} className="mx-auto text-slate-200 mb-4" />
          <h2 className="text-xl font-black text-slate-300 uppercase">All clear! No jobs in casting.</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-white border-4 border-black p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black text-[10px] uppercase">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  {job.is_rush && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full font-black text-[10px] animate-pulse">RUSH</span>
                  )}
                </div>
                
                <h3 className="text-3xl font-black mb-1">{job.vtiger_id}</h3>
                <p className="font-bold text-blue-600 uppercase text-sm mb-4">{job.client_name}</p>
                
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Timer size={10}/> Job Details
                  </p>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">
                    {job.description || "No specific instructions provided."}
                  </p>
                </div>
              </div>

              <button 
                disabled={processingId === job.id}
                onClick={() => approveToWorkshop(job)}
                className="w-full bg-blue-600 text-white p-4 rounded-2xl border-4 border-black font-black text-sm uppercase flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50"
              >
                {processingId === job.id ? <Loader2 className="animate-spin" /> : <>Receive & Release <ArrowUpRight size={18} /></>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}