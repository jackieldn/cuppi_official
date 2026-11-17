'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { yearlySummary, type Schedule } from '@/lib/tools/amortise';
import { gbp } from '@/lib/tools/format';
import { DataTable } from './parts';

/** The schedule a year at a time, with the full month-by-month list one click away and a CSV to keep. */
export function ScheduleTable({ schedule, fileName }: { schedule: Schedule; fileName: string }) {
  const [monthly, setMonthly] = useState(false);
  const years = useMemo(() => yearlySummary(schedule), [schedule]);
  const hasExtra = schedule.rows.some((r) => r.overpayment > 0);

  const download = () => {
    const lines = ['Month,Payment,Interest,Debt repaid,Extra paid,Still owed'];
    for (const r of schedule.rows) lines.push([String(r.month), ...[r.payment, r.interest, r.principal, r.overpayment, r.balance].map((n) => n.toFixed(2))].join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (schedule.rows.length === 0) return null;
  return (
    <div className="space-y-4">
      {monthly ? (
        <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-cuppi-line">
          <DataTable
            animated={false}
            head={['Month', 'Payment', 'Interest', 'Debt repaid', ...(hasExtra ? ['Extra'] : []), 'Still owed']}
            rows={schedule.rows.map((r) => [r.month, gbp(r.payment, { pence: true }), gbp(r.interest, { pence: true }), gbp(r.principal, { pence: true }), ...(hasExtra ? [gbp(r.overpayment, { pence: true })] : []), gbp(r.balance)])}
          />
        </div>
      ) : (
        <DataTable animated={years.length <= 10} head={['Year', 'Paid', 'Interest', 'Debt repaid', 'Still owed']} rows={years.map((y) => [y.year, gbp(y.payments), gbp(y.interest), gbp(y.paidOff), gbp(y.endBalance)])} />
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMonthly((m) => !m)} className="rounded-full border border-cuppi-line bg-cuppi-paper px-4 py-2 text-sm font-medium transition-colors hover:bg-cuppi-honey-soft">
          {monthly ? 'Show year by year' : 'Show month by month'}
        </button>
        <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-full border border-cuppi-line bg-cuppi-paper px-4 py-2 text-sm font-medium transition-colors hover:bg-cuppi-honey-soft">
          <Download className="h-4 w-4" aria-hidden /> Download as a spreadsheet (CSV)
        </button>
      </div>
    </div>
  );
}
