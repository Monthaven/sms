import LoginForm from "@/components/LoginForm";
import { Activity, MessageSquare, Shield, Zap } from "lucide-react";

const architecture = [
  {
    title: "The Engine",
    description: "Local ts-node runners power ingestion + blasting without Vercel timeouts.",
    icon: Activity,
  },
  {
    title: "The Storefront",
    description: "Always-on Next.js dashboard that catches inbound replies + routes agents.",
    icon: MessageSquare,
  },
];

const stats = [
  { value: "500k+", label: "Rows per CSV ingest", sublabel: "Streamed locally via ts-node" },
  { value: "24/7", label: "Cloud coverage", sublabel: "Neon pooled connection" },
  { value: "10k+", label: "SMS / blast reach", sublabel: "EzTexting orchestrated" },
];

export default function LoginPage() {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <div className="glass-panel w-full border border-white/10 bg-slate-900/40 px-8 py-12 shadow-2xl lg:px-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <section className="space-y-8 text-slate-200">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-sky-200/80">
                MAE v3.0 · Hybrid Architecture
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white lg:text-5xl">
                Monthaven Acquisition <span className="text-gradient">Command Center</span>
              </h1>
              <p className="max-w-xl text-base text-slate-300">
                Catch inbound SMS leads the second they hit Neon. The Engine handles heavy ingestion + blasting
                locally while the Storefront keeps agents online with inbox, call queue, and live telemetry.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {architecture.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <item.icon className="mb-3 h-6 w-6 text-sky-300" />
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="kpi-card">
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-10 text-white shadow-xl">
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Shield className="h-4 w-4 text-sky-300" />
                Secured by Neon + EzTexting
              </div>
              <h2 className="text-3xl font-semibold">Authenticate</h2>
              <p className="text-sm text-slate-400">Use your agent email to open the Monthaven Storefront.</p>
            </div>

            <LoginForm />

            <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Zap className="h-4 w-4 text-amber-300" />
                <span>Real-time feed</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Every inbound text hits <span className="font-semibold text-white">/api/webhooks/eztexting</span> on
                Vercel. Leads sync into Neon and are surfaced instantly in your Inbox + Call Queue.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
