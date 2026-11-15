import { BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { btn, Disclosures, Panel } from '@/components/kit';
import { CSA_LINKS, SOURCES, type SourceLink } from '@/content/mission';
import { getProviderStatuses } from '@/services/nasa';
import { SpaceWeatherContext } from '@/components/space-weather-context';

function LinkList({ items }: { items: SourceLink[] }) {
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.url} className="rounded-xl border border-[#dfe5fa] bg-[#f4f7ff] p-3">
          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-aqua hover:underline" data-testid={`link-source-${s.title.slice(0, 16).replace(/\W/g, '')}`}>
            {s.title} <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="text-xs text-dim">{s.org}</p>
          <p className="mt-1 text-sm text-ink">{s.note}</p>
        </li>
      ))}
    </ul>
  );
}

export default function About() {
  const providers = getProviderStatuses();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hud-label !text-[#ffe49e]">About and NASA Sources</p>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Why AstroBorneo exists</h1>
          <p className="mt-2 max-w-3xl text-lg text-[#dce4ff]">
            AstroBorneo helps kids aged 7 to 12 feel the real engineering trade-offs of living on the Moon: life support, radiation protection, power budgets, food and communication. It was created for the 2026 NASA Space Apps Challenge, "Build a Junior Astronaut Mission Trainer".
          </p>
        </div>
        <Link href="/teacher" className={btn.ghost} data-testid="link-about-teacher">
          <BookOpen className="h-4 w-4 text-aqua" /> Teacher &amp; Judge Guide
        </Link>
      </div>
      <Disclosures />
      <SpaceWeatherContext />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Scientific references" title="NASA and challenge sources"><LinkList items={SOURCES} /></Panel>
        <div className="space-y-6">
          <Panel kicker="Canadian Space Agency" title="More to explore"><LinkList items={CSA_LINKS} /></Panel>
          <Panel kicker="Data attribution" title="NASA data integration status">
            <p className="text-sm">Every game resource remains simulated. The context panel above shows actual request status and attributed NASA observations separately. Below are adapter setup states, not live connection indicators.</p>
            <ul className="mt-3 space-y-2">
              {providers.map((p) => (
                <li key={p.provider.id} className="rounded-xl border border-dim/15 p-3 text-sm" data-testid={`status-provider-${p.provider.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{p.provider.name}</span>
                    <span className="font-mono text-xs text-warn">{p.mode}</span>
                  </div>
                  <p className="font-mono text-xs text-dim">{p.provider.baseUrl}</p>
                  <p className="mt-1 text-xs text-dim">{p.provider.auth}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Panel kicker="Disclaimer" title="Educational simulation">
          <p className="text-sm">Resource values are illustrative teaching units, not NASA measurements. Radiation effects are simplified and are not medical predictions. AstroBorneo is not endorsed by NASA and uses no NASA logos.</p>
        </Panel>
        <Panel kicker="Disclosure" title="AI-assisted development">
          <p className="text-sm">This application was designed and built with help from AI tools. The team reviewed game rules and educational content against the sources listed here.</p>
        </Panel>
        <Panel kicker="Credits" title="Team">
          <p className="text-sm">AstroBorneo Space Apps team. Original lunar illustrations created for this project. Crew members are fictional.</p>
        </Panel>
      </div>
    </div>
  );
}
