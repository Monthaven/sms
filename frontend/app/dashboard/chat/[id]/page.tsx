import { getLeadDetails } from "@/app/actions";
import LeadActionButtons from "@/components/LeadActionButtons";
import LeadStatusBadge from "@/components/LeadStatusBadge";
import PageFooterRail from "@/components/PageFooterRail";
import ReplyComposer from "@/components/ReplyComposer";
import CallLogButton from "@/components/CallLogButton";
import {
  Activity,
  ArrowLeft,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ChatThread({
  params,
}: {
  params: { id: string };
}) {
  const lead = await getLeadDetails(params.id);
  if (!lead) {
    notFound();
  }

  const interactions = lead.interactions || [];
  const displayName =
    `${lead.contact.firstName ?? ""} ${lead.contact.lastName ?? ""}`.trim() || lead.contact.phoneE164;

  return (
    <div className="space-y-8 text-slate-100">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Command Center
      </Link>

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Lead Profile
            </p>
            <h1 className="text-3xl font-semibold text-white">
              {lead.contact.firstName} {lead.contact.lastName}
            </h1>
            <p className="text-sm text-slate-400">{lead.contact.phoneE164}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <LeadStatusBadge status={lead.status} />
            <LeadActionButtons leadId={lead.id} context="chat" />
            <CallLogButton leadId={lead.id} leadName={displayName} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Property
            </div>
            <p className="mt-2 text-sm text-white">
              {lead.property?.addressLine1 ?? "No address on file"}
            </p>
            <p className="text-xs text-slate-400">
              {lead.property?.city ?? "N/A"}, {lead.property?.state ?? "--"}
            </p>
            <MapPin className="mt-3 h-4 w-4 text-sky-300" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Channel
            </div>
            <p className="mt-2 text-sm text-white">EzTexting</p>
            <p className="text-xs text-slate-400">Webhook powered</p>
            <MessageCircle className="mt-3 h-4 w-4 text-emerald-300" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Queue
            </div>
            <p className="mt-2 text-sm text-white">
              {lead.status === "QUEUED_FOR_CALL" ? "Call ready" : "SMS thread"}
            </p>
            <p className="text-xs text-slate-400">Synced from Neon</p>
            <Phone className="mt-3 h-4 w-4 text-amber-300" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="glass-panel border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                Conversation
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Timeline
              </h2>
            </div>
            <Activity className="h-4 w-4 text-sky-300" />
          </div>

          <div className="mt-6 space-y-5">
            {interactions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
                No interaction logs yet. Once EzTexting hits the webhook, replies render here chronologically.
              </div>
            )}
            {interactions.map((interaction) => (
              <article
                key={interaction.id}
                className={`rounded-2xl border p-4 ${
                  interaction.direction === "INBOUND"
                    ? "border-emerald-400/40 bg-emerald-400/5"
                    : "border-sky-400/30 bg-sky-400/5"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold uppercase tracking-[0.4em] text-slate-500">
                    {interaction.direction}
                  </span>
                  <span>
                    {new Date(interaction.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white">{interaction.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="glass-panel border border-white/10 p-6">
          <ReplyComposer leadId={lead.id} />
        </div>
      </section>

      <PageFooterRail
        kicker="Assignment"
        title="Need to re-route or view admin actions?"
        description="Once the chat is handled, bounce directly into the queue or campaign admin."
        actions={[
          { label: "Queue", href: "/dashboard/queue", icon: Phone, variant: "primary" },
          { label: "Admin Tower", href: "/dashboard/admin", icon: Shield },
        ]}
      />
    </div>
  );
}
