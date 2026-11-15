import type { Decision, State } from '@/game/engine';
import type { ModuleId } from '@/content/mission';
import type { ModuleStatus } from '@/components/lunar-scene';

const lvl = (v: number): ModuleStatus['level'] => (v >= 50 ? 'ok' : v >= 25 ? 'warn' : 'bad');

export function moduleStatuses(s: State, d: Decision, solar: number): Record<ModuleId, ModuleStatus> {
  const r = s.resources;
  const active = s.status === 'active';
  return {
    habitat: { level: lvl(r.air), text: `${d.mode} · air ${r.air}` },
    solar: { level: !active ? lvl(r.power) : solar < 12 ? 'warn' : lvl(r.power), text: active ? `+${solar} this cycle` : `power ${r.power}` },
    recycler: !d.recycler
      ? { level: 'off', text: 'switched off' }
      : active && s.cycle === 3 && d.event !== 'repair'
        ? { level: 'warn', text: 'filter fault' }
        : { level: lvl(r.water), text: `on · water ${r.water}` },
    greenhouse: !d.greenhouse
      ? { level: 'off', text: 'switched off' }
      : active && s.cycle === 5 && d.event !== 'repair'
        ? { level: 'bad', text: 'light fault' }
        : { level: lvl(r.food), text: `on · food ${r.food}` },
    shelter: active && s.cycle === 4
      ? { level: 'bad', text: 'radiation alert' }
      : { level: lvl(r.safety), text: `shield lvl ${s.shieldingLevel}` },
    comms: d.communications ? { level: 'ok', text: `on · sci ${s.science}` } : { level: 'off', text: 'switched off' },
  };
}

export function moduleDetail(id: ModuleId, s: State, d: Decision): string[] {
  const r = s.resources;
  switch (id) {
    case 'habitat': return [`Life support mode: ${d.mode}`, `Air reserve: ${r.air}/100`, `Crew Safety: ${r.safety}/100`];
    case 'solar': return [`Power stored: ${r.power}/100`, `Backup battery charges: ${s.backupCharges}`];
    case 'recycler': return [`Recycler: ${d.recycler ? 'on' : 'off'}`, `Water: ${r.water}/100`, s.cycle === 3 && s.status === 'active' ? 'Fault active this cycle' : 'No fault this cycle'];
    case 'greenhouse': return [`Greenhouse: ${d.greenhouse ? 'on' : 'off'}`, `Food: ${r.food}/100`, s.cycle === 5 && s.status === 'active' ? 'Grow-light fault this cycle' : 'No fault this cycle'];
    case 'shelter': return [`Shielding level: ${s.shieldingLevel}`, `Shielding kits: ${s.shieldingKits}`, `Crew Safety: ${r.safety}/100`];
    case 'comms': return [`Communications: ${d.communications ? 'on' : 'off'}`, `Science Points: ${s.science}`];
  }
}
