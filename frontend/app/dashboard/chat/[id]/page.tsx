
import { getLeadDetails } from "@/app/actions";
import LeadActionButtons from "@/components/LeadActionButtons";
import { Avatar, StatusBadge } from "@/components/Shared";
import PageFooterRail from "@/components/PageFooterRail";
import ReplyComposer from "@/components/ReplyComposer";
import CallLogButton from "@/components/CallLogButton";
import PropertyIntelligence from "@/components/PropertyIntelligence";
import ContactScoreBreakdown from "@/components/ContactScoreBreakdown";
import AlternativeContacts from "@/components/AlternativeContacts";
import { getContactFlags } from "@/lib/propertyUtils";
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

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export default async function ChatThread({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadDetails(id);
  if (!lead) {
    notFound();
  }

  const interactions = lead.interactions || [];
  const displayName =
    `${lead.contact.firstName ?? ""} ${lead.contact.lastName ?? ""}`.trim() || lead.contact.phoneE164;
  const contactFlags =
    getContactFlags((lead.property as any)?.rawDetails ?? null, lead.contact.phoneE164) || [];

  const macroTemplates = [
    {
      id: "confirm",
      label: "Confirm property",
      body: `Hi ${lead.contact.firstName ?? "there"}, thanks for the quick response. I wanted to confirm we're talking about ${lead.property?.addressLine1 ?? "your property"} — are you open to reviewing an offer if it looks good?`,
      description: "Friendly confirmation + open-ended question",
    },
    {
      id: "schedule",
      label: "Schedule call",
      body: "I can have our acquisitions partner call you later today or tomorrow morning to go over condition and price. Does a quick 15 minute call work?",
    },
    {
      id: "handoff",
      label: "Handoff to closer",
      body: "I'm looping in our closer now so we can finalize numbers. Expect an introduction text shortly—appreciate your time.",
    },
  ];

  const groupedInteractions = groupInteractions(
    interactions as InteractionEntry[]
  );

  function mapStatus(status: string | undefined) {
    if (!status) return 'New';
    switch (status) {
      case 'RESP_HOT':
      case 'HOT':
      case 'QUEUED_FOR_CALL':
        return 'Hot';
      case 'RESP_WARM':
      case 'WARM':
        return 'Warm';
      case 'NEW':
      case 'CREATED':
        return 'New';
      case 'RESP_STOP':
      case 'DNC':
        return 'DNC';
      case 'SOLD':
        return 'Sold';
      default:
        return 'Cold';
    }
  }

  return (
    <div className="space-y-8 text-slate-100 h-full overflow-y-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Command Center
      </Link>

      <section className="glass-panel border border-white/10 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${lead.contact.firstName ?? ''} ${lead.contact.lastName ?? ''}`.trim() || lead.contact.phoneE164} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Lead Profile</p>
              <h1 className="text-3xl font-semibold text-white">
                {lead.contact.firstName} {lead.contact.lastName}
              </h1>
              <p className="text-sm text-slate-400">{lead.contact.phoneE164}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <StatusBadge status={mapStatus(lead.status)} />
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

          <div className="mt-6 space-y-5 max-h-[600px] overflow-y-auto">
            {interactions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
                No interaction logs yet. Once EzTexting hits the webhook, replies render here chronologically.
              </div>
            )}
            {groupedInteractions.map((group) => (
              <div key={group.label} className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-slate-500">
                  <span className="h-px flex-1 bg-white/10" />
                  {group.label}
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <div className="space-y-4">
                  {group.items.map((interaction) => (
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
                          {new Date(interaction.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-white">
                        {interaction.body}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel border border-white/10 p-4">
            <PropertyIntelligence rawDetails={(lead.property as any)?.rawDetails ?? null} />
          </div>

          <div className="glass-panel border border-white/10 p-4">
            <ContactScoreBreakdown
              score={lead.contact.score ?? 0}
              priority={lead.contact.priority ?? 'LOW'}
              ownerMatch={Boolean((lead.contact as any).ownerMatch)}
              phoneType={lead.contact.phoneType}
              contactFlags={contactFlags}
            />
          </div>

          <div className="glass-panel border border-white/10 p-4 max-h-[600px] overflow-y-auto">
            <AlternativeContacts propertyId={lead.property?.id ?? ''} currentContactId={lead.contact.id} />
          </div>

          <div className="glass-panel border border-white/10 p-4 max-h-[600px] overflow-y-auto">
            <ReplyComposer leadId={lead.id} macros={macroTemplates} />
          </div>
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

type LeadDetail = Awaited<ReturnType<typeof getLeadDetails>>;
type InteractionEntry =
  NonNullable<LeadDetail>["interactions"][number];

function groupInteractions(interactions: InteractionEntry[]) {
  const sorted = [...interactions].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const groups: { label: string; items: typeof sorted }[] = [];
  sorted.forEach((interaction) => {
    const dateLabel = new Date(interaction.createdAt).toLocaleDateString(
      undefined,
      { weekday: "long", month: "short", day: "numeric" }
    );
    const existing = groups.find((group) => group.label === dateLabel);
    if (existing) {
      existing.items.push(interaction);
    } else {
      groups.push({ label: dateLabel, items: [interaction] });
    }
  });
  return groups;
}
