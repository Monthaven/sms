/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";
import React, { useState } from 'react';

type Props = {
  score: number;
  priority: string;
  ownerMatch: boolean;
  phoneType: string | null;
  contactFlags: string[];
  emailPresent?: boolean;
};

export default function ContactScoreBreakdown({ score, priority, ownerMatch, phoneType, contactFlags, emailPresent }: Props) {
  const [open, setOpen] = useState(false);
  const badgeColor = priority === 'HIGH' || priority === 'HOT' ? 'bg-green-600' : 'bg-gray-600';

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-md ${badgeColor} text-white font-bold`}>{Math.round(score)}</div>
          <div>
            <div className="text-sm font-semibold">Priority: {priority}</div>
            <div className="text-xs text-muted-foreground">Owner match: {ownerMatch ? 'Yes' : 'No'}</div>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="text-sm text-primary">{open ? 'Hide' : 'Show'} breakdown</button>
      </div>

      {open && (
        <div className="mt-3 text-sm space-y-1">
          {ownerMatch && <div className="text-green-400">+50 Owner match</div>}
          {contactFlags.includes('likely owner') && <div className="text-green-400">+30 Likely Owner</div>}
          {contactFlags.includes('linked to company') && <div className="text-green-400">+30 Linked to Company</div>}
          {(phoneType || '').toLowerCase().includes('wireless') && <div className="text-green-400">+10 Wireless</div>}
          {emailPresent && <div className="text-green-400">+5 Email present</div>}
          {contactFlags.some(f => ['connectedinvestors','marketing','general','employee'].includes(f.toLowerCase())) && <div className="text-red-400">-15 Spam/marketing flags</div>}
        </div>
      )}
    </div>
  );
}
