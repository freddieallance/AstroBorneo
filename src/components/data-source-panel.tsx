import { Database } from 'lucide-react';
import { getProviderStatuses, getScenarioRecord } from '@/services/nasa';
import { Panel } from '@/components/kit';

export function DataSourcePanel({ cycle }: { cycle: number }) {
  const rec = getScenarioRecord(cycle);
  const providers = getProviderStatuses();
  const rows: [string, string][] = [
    ['Source name', rec.sourceName],
    ['Data mode', rec.mode],
    ['Event identifier', rec.eventId],
    ['Observation time', rec.observedAt],
    ['Retrieval time', rec.retrievedAt],
    ['Source URL', rec.sourceUrl],
  ];
  return (
    <Panel kicker="NASA Data Source" title="Where this cycle's data comes from" action={<Database className="h-5 w-5 text-aqua" aria-hidden />}>
      <dl className="grid gap-2 text-sm" data-testid="panel-data-source">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2">
            <dt className="text-dim">{k}</dt>
            <dd className={k === 'Data mode' ? 'font-mono font-semibold text-warn' : 'text-ink'}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-dim">{rec.disclaimer}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {providers.filter((p) => !p.provider.optional).map((p) => (
          <span key={p.provider.id} className="rounded-full border border-dim/20 px-2.5 py-1 font-mono text-[11px] text-dim">
            {p.provider.name}: {p.mode}
          </span>
        ))}
      </div>
    </Panel>
  );
}
