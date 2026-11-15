import { useEffect, useState } from 'react';
import {
  loadSavedSpaceWeatherContext,
  saveSpaceWeatherContext,
  useGetSpaceWeather,
  getGetSpaceWeatherQueryKey,
  type GetSpaceWeatherParams,
  type SpaceWeather,
} from '@/services/space-weather-client';
import { Panel, btn } from './kit';
import { archivedContext } from '@/services/archived-context';

export function SpaceWeatherContext() {
  const [savedInit] = useState(loadSavedSpaceWeatherContext);
  const [form, setForm] = useState({
    eventType: savedInit.eventType,
    startDate: savedInit.startDate,
    endDate: savedInit.endDate,
    mode: savedInit.requestMode,
  });
  const [params, setParams] = useState<GetSpaceWeatherParams>({
    eventType: savedInit.eventType,
    startDate: savedInit.startDate,
    endDate: savedInit.endDate,
    mode: savedInit.requestMode,
  });
  const query = useGetSpaceWeather(params, { query: { queryKey: getGetSpaceWeatherQueryKey(params), staleTime: 60000, retry: false } });

  useEffect(() => {
    if (!query.data) return;
    saveSpaceWeatherContext({
      eventType: (params.eventType ?? 'FLR') as 'FLR' | 'SEP' | 'CME',
      startDate: params.startDate ?? '2024-05-10',
      endDate: params.endDate ?? '2024-05-10',
      requestMode: (params.mode ?? 'auto') as 'auto' | 'archived' | 'simulated',
      lastMode: query.data.mode,
      lastStatus: query.data.status,
      cached: query.data.cached,
      stale: query.data.stale,
      record: query.data.records[0] ?? null,
    });
  }, [query.data, params]);

  const fallbackOfflineData: SpaceWeather =
    params.mode === 'simulated'
      ? { ...archivedContext, mode: 'SIMULATED_SCENARIO', status: 'OFFLINE', records: [], message: 'Simulation only. NASA context is not required.' }
      : savedInit.record && savedInit.requestMode !== 'simulated'
        ? {
            mode: 'ARCHIVED_DATA',
            status: 'CACHED_OFFLINE',
            cached: true,
            stale: true,
            records: [savedInit.record],
            message: 'Offline or unable to reach NASA context API. Showing previously verified cached record.',
          }
        : archivedContext;

  const data: SpaceWeather | undefined = query.isError ? fallbackOfflineData : query.data;
  const [selected, setSelected] = useState('');
  const record = data?.records.find(r => r.id === selected) ?? data?.records[0];

  const applyForm = (nextForm: typeof form) => {
    const nextParams: GetSpaceWeatherParams = {
      eventType: nextForm.eventType as GetSpaceWeatherParams['eventType'],
      startDate: nextForm.startDate,
      endDate: nextForm.endDate,
      mode: nextForm.mode as GetSpaceWeatherParams['mode'],
    };
    setSelected('');
    setParams(nextParams);
    saveSpaceWeatherContext({
      eventType: nextForm.eventType as 'FLR' | 'SEP' | 'CME',
      startDate: nextForm.startDate,
      endDate: nextForm.endDate,
      requestMode: nextForm.mode as 'auto' | 'archived' | 'simulated',
      lastMode: nextForm.mode === 'simulated' ? 'SIMULATED_SCENARIO' : nextForm.mode === 'archived' ? 'ARCHIVED_DATA' : savedInit.lastMode,
      lastStatus: nextForm.mode === 'simulated' ? 'OFFLINE' : nextForm.mode === 'archived' ? 'ARCHIVE' : 'PENDING',
      cached: false,
      stale: false,
      record: nextForm.mode === 'simulated' ? null : savedInit.record,
    });
  };

  return <Panel kicker="NASA observations · separate from game rules" title="Space-weather context">
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); applyForm(form); }}>
      <label className="text-xs font-semibold text-dim">Event type<select className="mt-1 block w-full rounded-xl border border-[#d7e0f7] bg-white px-2.5 py-2 text-sm font-semibold text-ink" value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value as 'FLR' | 'SEP' | 'CME' })} data-testid="select-space-weather-type"><option>FLR</option><option>SEP</option><option>CME</option></select></label>
      <label className="text-xs font-semibold text-dim">Context source<select className="mt-1 block w-full rounded-xl border border-[#d7e0f7] bg-white px-2.5 py-2 text-sm font-semibold text-ink" value={form.mode} onChange={e => {
        const nextMode = e.target.value as 'auto' | 'archived' | 'simulated';
        const updated = { ...form, mode: nextMode };
        setForm(updated);
        applyForm(updated);
      }} data-testid="select-space-weather-mode"><option value="auto">NASA API with fallback</option><option value="archived">Verified historical example</option><option value="simulated">Simulation only</option></select></label>
      {(['startDate', 'endDate'] as const).map(k => <label key={k} className="text-xs font-semibold text-dim">{k === 'startDate' ? 'Start date' : 'End date'}<input required type="date" className="mt-1 block w-full rounded-xl border border-[#d7e0f7] bg-white px-2.5 py-2 text-sm font-semibold text-ink" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>)}
      <button className={btn.ghost} disabled={query.isFetching}>Load context</button>
      <button type="button" className={btn.ghost} disabled={query.isFetching} onClick={() => query.refetch()}>Refresh context</button>
    </form>
    <p className="mt-3 text-sm text-dim">Up to 30 days per request. Refresh respects the server cache to protect NASA services.</p>
    {query.isFetching && <p role="status">Checking NASA context…</p>}
    {query.isError && <p role="alert" className="mt-3">NASA context is unavailable or the dates are invalid. Your simulated mission is unaffected. Choose valid dates or try again.</p>}
    {data && <div className="mt-4 space-y-3">
      <p className="font-mono text-aqua" data-testid="text-space-weather-mode">
        {query.isError && data.mode === 'LIVE_DATA' ? 'ARCHIVED_DATA' : data.mode} · {query.isError ? (params.mode === 'simulated' ? 'OFFLINE' : 'REFRESH_FAILED') : data.status === 'CONNECTED' ? 'VALIDATED' : data.status}
      </p>
      <p className="text-sm">{data.message}</p>
      {data.cached && <p className="text-sm text-warn">{data.stale ? 'Stale cached observations' : 'Cached response'} — not newly retrieved.</p>}
      {data.records.length > 1 && <label className="block text-xs font-semibold text-dim">Observation<select className="mt-1 block w-full rounded-xl border border-[#d7e0f7] bg-white px-2.5 py-2 text-sm font-semibold text-ink" value={record?.id ?? ''} onChange={e => setSelected(e.target.value)}>{data.records.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}</select></label>}
      {record && <article className="rounded-xl border border-dim/20 p-3 space-y-2 break-words">
        <h3 className="font-bold">Real observation: {record.eventType}</h3>
        <dl className="text-sm"><dt>Provider / source</dt><dd>{record.provider} / {record.sourceName}</dd><dt>Original identifier</dt><dd>{record.id}</dd><dt>Observation time (UTC)</dt><dd>{record.observationTimeUTC}</dd><dt>Retrieved (UTC)</dt><dd>{record.fetchedAtUTC}</dd></dl>
        <a className="text-aqua underline" href={record.sourceUrl} target="_blank" rel="noreferrer">Original NASA record</a>
        <p>{record.summary}</p>
      </article>}
      {!data.records.length && <p>No verified observation is displayed.</p>}
    </div>}
    <p className="mt-4 text-sm text-dim"><strong>Game rule:</strong> Cycle 4 is always a simulated radiation-protection exercise. NASA observations never change resources, safety or scoring. DONKI research products are preliminary, not operational forecasts or lunar dose measurements. NOAA SWPC is the US official space-weather forecast source.</p>
  </Panel>;
}

