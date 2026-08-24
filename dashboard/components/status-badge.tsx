"use client";

import { Badge } from "@/components/ui/badge";
import { getDomainColor, getDomainLabel, getPlatformColor, getTrackingStatusColor, getTrackingStatusLabel } from "@/lib/utils";

export function TrackingStatusBadge({ status }: { status: string }) {
  const color = getTrackingStatusColor(status);
  const label = getTrackingStatusLabel(status);
  return (
    <Badge className={`border ${color}`}>
      {label}
    </Badge>
  );
}

export function DomainBadge({ domain }: { domain: string }) {
  const color = getDomainColor(domain);
  const label = getDomainLabel(domain);
  return (
    <Badge className={`border ${color}`}>
      {label}
    </Badge>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const color = getPlatformColor(platform);
  return (
    <Badge className={`border ${color}`}>
      {platform}
    </Badge>
  );
}
