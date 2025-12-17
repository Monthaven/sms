export default function Loading() {
  return (
    <div className="space-y-8 text-slate-100 animate-pulse">
      <div className="h-6 w-48 bg-slate-800 rounded"></div>
      
      <section className="glass-panel border border-white/10 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
            <div className="h-8 w-48 bg-slate-800 rounded"></div>
            <div className="h-4 w-36 bg-slate-800 rounded"></div>
          </div>
        </div>
        
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 h-24">
              <div className="h-4 w-24 bg-slate-800 rounded"></div>
              <div className="h-6 w-16 bg-slate-800 rounded mt-2"></div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel border border-white/10 p-6">
        <div className="h-6 w-32 bg-slate-800 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 h-20">
              <div className="h-4 w-full bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
