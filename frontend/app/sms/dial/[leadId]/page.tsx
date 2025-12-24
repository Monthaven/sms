/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { DialPad } from "@/components/sms/DialPad";

interface DialPageProps {
  params: Promise<{ leadId: string }>;
}

export default async function DialPage({ params }: DialPageProps) {
  const { leadId } = await params;
  return (
    <div className="p-6">
      <DialPad leadId={leadId} />
    </div>
  );
}
