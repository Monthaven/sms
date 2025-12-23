/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { DialPad } from "@/components/sms/DialPad";

export default function DialPage({ params }: any) {
  return (
    <div className="p-6">
      <DialPad leadId={params.leadId} />
    </div>
  );
}
