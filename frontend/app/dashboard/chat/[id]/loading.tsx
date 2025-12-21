export default function Loading() {
  return (
    <div className="h-full overflow-y-auto space-y-8 animate-pulse text-slate-100">
      <div className="h-6 w-48 rounded bg-slate-800" />

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-800" />
              <div className="h-6 w-40 rounded bg-slate-800" />
              <div className="h-3 w-28 rounded bg-slate-800" />
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="h-9 w-32 rounded bg-slate-800" />
            <div className="h-9 w-32 rounded bg-slate-800" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
            >
              <div className="h-3 w-24 rounded bg-slate-800" />
              <div className="h-4 w-32 rounded bg-slate-800" />
              <div className="h-3 w-20 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="glass-panel border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-28 rounded bg-slate-800" />
            <div className="h-4 w-10 rounded bg-slate-800" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                <div className="h-3 w-24 rounded bg-slate-800" />
                <div className="h-4 w-full rounded bg-slate-800" />
                <div className="h-4 w-2/3 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel border border-white/10 p-4 space-y-3">
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="h-4 w-20 rounded bg-slate-800" />
            <div className="h-3 w-32 rounded bg-slate-800" />
          </div>

          <div className="glass-panel border border-white/10 p-4 space-y-3">
            <div className="h-4 w-32 rounded bg-slate-800" />
            <div className="h-3 w-full rounded bg-slate-800" />
            <div className="h-3 w-3/4 rounded bg-slate-800" />
          </div>

          <div className="glass-panel border border-white/10 p-4 space-y-3">
            <div className="h-4 w-40 rounded bg-slate-800" />
            <div className="h-3 w-full rounded bg-slate-800" />
            <div className="h-3 w-5/6 rounded bg-slate-800" />
          </div>

          <div className="glass-panel border border-white/10 p-4 space-y-3">
            <div className="h-4 w-32 rounded bg-slate-800" />
            <div className="h-20 w-full rounded bg-slate-800" />
            <div className="h-9 w-32 rounded bg-slate-800" />
          </div>
        </div>
      </section>
    </div>
  );
}
