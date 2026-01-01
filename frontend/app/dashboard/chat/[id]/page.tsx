/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { getLeadDetails } from "@/app/actions";
import { Avatar, StatusBadge } from "@/components/Shared";
import ReplyComposer from "@/components/ReplyComposer";
import ContactScoreBreakdown from "@/components/ContactScoreBreakdown";
import AlternativeContacts from "@/components/AlternativeContacts";
import LeadNotes from "@/components/LeadNotes";
import CommunicationBar from "@/components/CommunicationBar";
import LeadActionButtons from "@/components/LeadActionButtons";
import ActivityTimeline from "@/components/ActivityTimeline";
import { TwilioPhoneLink } from "@/components/TwilioCallButton";
import { getContactFlags, parsePropertyFinancials, parsePropertyDetails, formatCurrency, formatPercent } from "@/lib/propertyUtils";
import {
  ArrowLeft,
  Building,
  Clock,
  DollarSign,
  Home,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
  User,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Extended types for Prisma JSON columns
interface PropertyWithRawDetails {
  rawDetails?: Record<string, unknown>;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  [key: string]: unknown;
}

interface ContactWithOwnerMatch {
  ownerMatch?: boolean;
  [key: string]: unknown;
}

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
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
    `${lead.contact.firstName ?? ""} ${lead.contact.lastName ?? ""}`.trim() ||
    lead.contact.phoneE164;
  const propertyData = lead.property as PropertyWithRawDetails | null;
  const contactFlags =
    getContactFlags(
      propertyData?.rawDetails ?? null,
      lead.contact.phoneE164
    ) || [];

  const rawDetails = propertyData?.rawDetails ?? {};

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
    if (!status) return "New";
    switch (status) {
      case "RESP_HOT":
      case "HOT":
      case "QUEUED_FOR_CALL":
        return "Hot";
      case "RESP_WARM":
      case "WARM":
        return "Warm";
      case "NEW":
      case "CREATED":
        return "New";
      case "RESP_STOP":
      case "DNC":
        return "DNC";
      case "SOLD":
        return "Sold";
      default:
        return "Cold";
    }
  }

  // Parse property financials and details using utility functions
  const fin = parsePropertyFinancials(rawDetails);
  const details = parsePropertyDetails(rawDetails);
  
  // Get formatted values (handles NaN, null, and string formats)
  const estimatedValueFormatted = formatCurrency(fin.estimatedValue);
  const lastSaleFormatted = formatCurrency(fin.lastSalePrice);
  const equityFormatted = formatPercent(fin.equity);
  const yearBuilt = details.yearBuilt || lead.property?.year_built || null;
  const ownerType = rawDetails.absentee_owner ? "Absentee" : rawDetails.is_corporate ? "Corporate" : "Owner-Occupied";

  return (
    <div className="h-full overflow-y-auto text-slate-100">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/inbox"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Inbox</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <StatusBadge status={mapStatus(lead.status)} />
            <LeadActionButtons leadId={lead.id} context="chat" showAssignButton={false} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Lead Header Card */}
        <section className="glass-panel border border-white/10 p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: Contact Info */}
            <div className="flex items-start gap-4 flex-1">
              <Avatar name={displayName} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">
                  Lead Profile
                </p>
                <h1 className="text-2xl font-bold text-white truncate">
                  {displayName}
                </h1>
                
                {/* Contact Details */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    <TwilioPhoneLink phoneNumber={lead.contact.phoneE164} leadId={lead.id}>
                      {lead.contact.phoneE164}
                    </TwilioPhoneLink>
                    {lead.contact.phoneType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                        {lead.contact.phoneType}
                      </span>
                    )}
                  </div>
                  
                  {lead.contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-indigo-400" />
                      <a href={`mailto:${lead.contact.email}`} className="text-slate-300 hover:text-white transition truncate">
                        {lead.contact.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-slate-400">Score:</span>
                    <span className="font-semibold text-white">{lead.contact.score ?? "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5 text-sky-400" />
                    <span className="text-slate-400">Priority:</span>
                    <span className="font-semibold text-white">{lead.contact.priority ?? "LOW"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-slate-400">Created:</span>
                    <span className="font-semibold text-white">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/sequences?contactId=${lead.contact.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-200 hover:bg-blue-500/20 transition"
                  >
                    <Sparkles size={14} />
                    Enroll in sequence
                  </Link>
                  <TwilioPhoneLink phoneNumber={lead.contact.phoneE164} leadId={lead.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60">
                    <Phone size={14} />
                    Call now
                  </TwilioPhoneLink>
                </div>
              </div>
            </div>

            {/* Right: Communication Actions */}
            <div className="lg:w-auto">
              <CommunicationBar
                leadId={lead.id}
                phoneNumber={lead.contact.phoneE164}
                email={lead.contact.email}
                leadName={displayName}
              />
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
          {/* Left Column: Activity Timeline + Reply */}
          <div className="space-y-4">
            {/* Full Activity Timeline - Messages, Calls, Notes, Status Changes */}
            <ActivityTimeline 
              leadId={lead.id} 
              maxHeight="500px"
              showSummary={true}
              autoRefresh={true}
              refreshInterval={30000}
            />

            {/* Quick Reply */}
            <section className="glass-panel border border-white/10 p-4">
              <ReplyComposer leadId={lead.id} macros={macroTemplates} />
            </section>
          </div>

          {/* Right Column: Intelligence Panels */}
          <div className="space-y-4">
            {/* Property Details Card */}
            <section className="glass-panel border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-4 w-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">Property Details</h3>
              </div>

              {lead.property ? (
                <div className="space-y-4">
                  {/* Address */}
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-white">
                        {lead.property.addressLine1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 ml-5">
                      {lead.property.city}, {lead.property.state} {lead.property.postalCode}
                    </p>
                  </div>

                  {/* Property Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-white/5 p-2 text-center">
                      <div className="text-lg font-bold text-white">{details.beds ?? "—"}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Beds</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 text-center">
                      <div className="text-lg font-bold text-white">{details.baths ?? "—"}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Baths</div>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 text-center">
                      <div className="text-lg font-bold text-white">{details.sqft ? Number(details.sqft).toLocaleString() : "—"}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Sqft</div>
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" /> Est. Value
                      </span>
                      <span className="font-medium text-white">
                        {estimatedValueFormatted ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Equity</span>
                      <span className="font-medium text-emerald-400">
                        {equityFormatted ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Last Sale</span>
                      <span className="font-medium text-white">
                        {lastSaleFormatted ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Year Built</span>
                      <span className="font-medium text-white">{yearBuilt ?? "N/A"}</span>
                    </div>
                  </div>

                  {/* Owner Status Badge */}
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <Building className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-amber-200">{ownerType}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 text-center py-4">
                  No property data available
                </div>
              )}
            </section>

            {/* Contact Score */}
            <section className="glass-panel border border-white/10 p-4">
              <ContactScoreBreakdown
                score={lead.contact.score ?? 0}
                priority={lead.contact.priority ?? "LOW"}
                ownerMatch={Boolean((lead.contact as ContactWithOwnerMatch).ownerMatch)}
                phoneType={lead.contact.phoneType}
                contactFlags={contactFlags}
                emailPresent={Boolean(lead.contact.email)}
              />
            </section>

            {/* Notes */}
            <section className="glass-panel border border-white/10 p-4">
              <LeadNotes leadId={lead.id} initialNotes={lead.notes ?? ""} />
            </section>

            {/* Alternative Contacts */}
            {lead.property?.id && (
              <section className="glass-panel border border-white/10 p-4">
                <AlternativeContacts
                  propertyId={lead.property.id}
                  currentContactId={lead.contact.id}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type LeadDetail = Awaited<ReturnType<typeof getLeadDetails>>;
type InteractionEntry = NonNullable<LeadDetail>["interactions"][number];

function groupInteractions(interactions: InteractionEntry[]) {
  const sorted = [...interactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
