/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 */

"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Gauge, MessageSquare, ShieldCheck } from "lucide-react";

import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PortalTile = {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  accent?: "emerald" | "amber" | "blue" | "violet";
  requiredPermissions?: string[];
  allowRoles?: string[];
};

const iconMap: Record<NonNullable<PortalTile["accent"]>, typeof Gauge> = {
  emerald: ShieldCheck,
  amber: BadgeCheck,
  blue: MessageSquare,
  violet: Gauge,
};

type Props = {
  items: PortalTile[];
};

export function PortalTiles({ items }: Props) {
  if (items.length === 0) {
    return (
      <Card className="portal-tiles__empty">
        <CardHeader>
          <CardTitle className="portal-tiles__title">No destinations available</CardTitle>
        </CardHeader>
        <CardContent className="portal-tiles__content">
          <p className="text-ink-muted">Your account is active, but no roles map to portal destinations. Contact an admin to request access.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeIn>
      <Stagger className="portal-tiles__grid" staggerDelay={0.06}>
        {items.map((tile) => {
          const Icon = iconMap[tile.accent ?? "emerald"] ?? Gauge;
          return (
            <StaggerItem key={tile.id}>
              <Link href={tile.href} className="portal-tiles__link">
                <Card className={cn("portal-tiles__card", tile.accent ? `portal-tiles__card--${tile.accent}` : "")}>
                  <CardHeader className="portal-tiles__card-header">
                    <div className="portal-tiles__eyebrow">
                      {tile.badge ? <Badge className="portal-tiles__badge">{tile.badge}</Badge> : null}
                      <Icon aria-hidden="true" size={16} />
                    </div>
                    <CardTitle>{tile.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="portal-tiles__card-body">
                    <p>{tile.description}</p>
                    <span className="portal-tiles__cta">
                      Open
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </FadeIn>
  );
}
