import React from 'react';
import { parsePropertyFinancials, parsePropertyDetails, hasDistressIndicators } from '@/lib/propertyUtils';

type Props = { rawDetails: Record<string, any> | null };

export default function PropertyIntelligence({ rawDetails }: Props) {
  const fin = parsePropertyFinancials(rawDetails);
  const details = parsePropertyDetails(rawDetails);
  const distress = hasDistressIndicators(rawDetails);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3 shadow-sm">
      <h3 className="text-sm font-semibold">Property Intelligence</h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Equity</div>
          <div className="font-medium">{fin.equity ?? 'N/A'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Estimated Value</div>
          <div className="font-medium">{fin.estimatedValue ?? 'N/A'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Last Sale</div>
          <div className="font-medium">{fin.lastSalePrice ?? 'N/A'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Last Sale Date</div>
          <div className="font-medium">{fin.lastSaleDate ?? 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm pt-2">
        <div>
          <div className="text-xs text-muted-foreground">Beds</div>
          <div className="font-medium">{details.beds ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Baths</div>
          <div className="font-medium">{details.baths ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Sqft</div>
          <div className="font-medium">{details.sqft ?? '—'}</div>
        </div>
      </div>

      <div className="text-sm pt-2">
        <div className="text-xs text-muted-foreground">Year Built</div>
        <div className="font-medium">{details.yearBuilt ?? '—'}</div>
      </div>

      <div className="pt-2 text-sm">
        <div className="text-xs text-muted-foreground">Owner Status</div>
        <div className="font-medium">{rawDetails?.absentee_owner ? 'Absentee' : rawDetails?.is_corporate ? 'Corporate' : 'Owner-Occupied'}</div>
      </div>

      <div className="pt-2 text-sm">
        <div className="text-xs text-muted-foreground">Distress Indicators</div>
        <div className="font-medium">{distress ? 'Vacant / Tax Delinquent / High Equity' : 'None detected'}</div>
      </div>
    </div>
  );
}
