// Educational content for AstroBorneo. All numbers are illustrative teaching units,
// not NASA mission measurements. Game rules live in src/game/engine.ts.

export type ResourceKey = 'power' | 'air' | 'water' | 'food' | 'safety';
export type ModuleId = 'habitat' | 'solar' | 'recycler' | 'greenhouse' | 'shelter' | 'comms';
export type EventValue =
  | 'none' | 'battery' | 'save' | 'repair' | 'skip' | 'shield' | 'shelter' | 'continue' | 'off';

export const MAX_CYCLES = 5;

export const RESOURCE_META: Record<ResourceKey, { label: string; long: string; explain: string }> = {
  power: { label: 'Power', long: 'Electrical energy', explain: 'Power is the energy every machine at the base uses. Solar panels make it; every system spends it.' },
  air: { label: 'Air', long: 'Breathable oxygen reserve', explain: 'Air is the stored oxygen the crew breathes. The Moon has no air, so the base must make it.' },
  safety: { label: 'Crew Safety', long: 'Crew health and protection', explain: 'Crew Safety shows how well the astronauts are protected, including from radiation, which is energy from space.' },
  water: { label: 'Water', long: 'Clean water supply', explain: 'Water is for drinking, washing and growing plants. Most of it must be cleaned and reused.' },
  food: { label: 'Food', long: 'Food stores', explain: 'Food comes from packed supplies and from plants grown in the greenhouse.' },
};

export const MODES = {
  eco: { label: 'Eco', power: 7, air: 6, net: -4, blurb: 'Saves power. Makes less air than the crew breathes.' },
  standard: { label: 'Standard', power: 12, air: 12, net: 2, blurb: 'Balanced. Makes a little more air than the crew uses.' },
  boost: { label: 'Boost', power: 18, air: 18, net: 8, blurb: 'Builds up air fast, but uses lots of power.' },
} as const;

export const SYSTEMS = {
  greenhouse: { label: 'Greenhouse', cost: 'Power -8, Water -5', gain: 'Food +12 when working' },
  recycler: { label: 'Water Recycler', cost: 'Power -6', gain: 'Water +12 when working' },
  communications: { label: 'Communications', cost: 'Power -4', gain: 'Science +5' },
} as const;

export { solar as SOLAR_BY_CYCLE } from '@/game/scenario-values';

export interface EventOption { value: EventValue; label: string; detail: string }
export interface MissionEvent {
  cycle: number;
  title: string;
  severity: 'nominal' | 'caution' | 'alert';
  briefing: string;
  science: string;
  options: EventOption[];
  relatesTo: ModuleId;
}

export const EVENTS: MissionEvent[] = [
  {
    cycle: 1, title: 'Nominal Operations', severity: 'nominal', relatesTo: 'habitat',
    briefing: 'All systems are healthy and the Sun is shining on the solar array. A good time to plan ahead and build up reserves.',
    science: 'Engineers plan for bad days during good days. Extra air, water and power now give the crew a safety margin later.',
    options: [{ value: 'none', label: 'No event this cycle', detail: 'Focus on your systems.' }],
  },
  {
    cycle: 2, title: 'Reduced Solar Generation', severity: 'caution', relatesTo: 'solar',
    briefing: 'The Sun is very low near the lunar south pole and long shadows fall over part of the solar array. Panels will make only +8 Power this cycle.',
    science: 'At the Moon\'s poles the Sun stays near the horizon, so tall hills can block sunlight. Batteries store energy so a base can get through shadowy periods.',
    options: [
      { value: 'battery', label: 'Use a backup battery', detail: 'Power +20 now. You will have one less charge later.' },
      { value: 'save', label: 'Save the battery', detail: 'Keep the charge for an emergency. Accept less power now.' },
    ],
  },
  {
    cycle: 3, title: 'Water Recycler Fault', severity: 'caution', relatesTo: 'recycler',
    briefing: 'A filter in the Water Recycler is clogged. Without a repair it recovers only +4 Water instead of +12.',
    science: 'On the International Space Station, most of the water the crew uses is cleaned and reused. Keeping recyclers working means fewer supply deliveries from Earth.',
    options: [
      { value: 'repair', label: 'Repair the recycler', detail: 'Costs 6 extra Power. Recycler recovers +12 Water again.' },
      { value: 'skip', label: 'Run it without repair', detail: 'No extra Power. Recycler recovers only +4 Water.' },
    ],
  },
  {
    cycle: 4, title: 'Radiation Alert', severity: 'alert', relatesTo: 'shelter',
    briefing: 'Space weather forecasters warn about a burst of energetic particles from the Sun. The crew needs protection.',
    science: 'Radiation is energy from space. Earth\'s magnetic field and air protect us, but the Moon has neither. Thick walls, water and lunar soil can block some radiation.',
    options: [
      { value: 'shield', label: 'Deploy shielding', detail: 'Uses 1 shielding kit and 4 Power. Shielding level goes up by 1.' },
      { value: 'shelter', label: 'Shelter the crew', detail: '4 extra Power. Crew Safety -2. Science -5 (never below zero).' },
      { value: 'continue', label: 'Continue operations', detail: 'No cost now. Crew Safety -15 at shielding level 1, or -5 at level 2+.' },
    ],
  },
  {
    cycle: 5, title: 'Greenhouse Equipment Fault', severity: 'caution', relatesTo: 'greenhouse',
    briefing: 'A grow-light controller in the greenhouse has failed. The plants cannot grow until it is fixed.',
    science: 'Growing food in space needs light, water, air and careful control. Plants also help the crew feel at home far from Earth.',
    options: [
      { value: 'repair', label: 'Repair the equipment', detail: 'Costs 8 extra Power. Greenhouse makes +12 Food if it is on.' },
      { value: 'continue', label: 'Keep running without food', detail: 'Greenhouse still uses Power and Water but makes no Food.' },
      { value: 'off', label: 'Turn the greenhouse off', detail: 'Saves Power and Water. No Food is grown.' },
    ],
  },
];

export const eventFor = (cycle: number) => EVENTS[Math.min(Math.max(cycle, 1), MAX_CYCLES) - 1];

export const EVENT_LABEL: Record<EventValue, string> = {
  none: 'No event', battery: 'Used backup battery', save: 'Saved battery', repair: 'Repaired equipment',
  skip: 'Ran without repair', shield: 'Deployed shielding', shelter: 'Sheltered crew', continue: 'Continued operations', off: 'Greenhouse turned off',
};

export interface ModuleInfo {
  id: ModuleId; name: string; short: string; purpose: string; needs: string; output: string; science: string;
}

export const MODULES: ModuleInfo[] = [
  { id: 'habitat', name: 'Habitat and Air System', short: 'Habitat', purpose: 'The home of the four astronauts. Its air system makes oxygen and removes the carbon dioxide the crew breathes out.', needs: 'Power: 7 (Eco), 12 (Standard) or 18 (Boost) each cycle.', output: 'Air: +6, +12 or +18. The crew breathes 10 Air every cycle.', science: 'Real spacecraft use machines that split water into hydrogen and oxygen using electricity. More electricity can mean more oxygen.' },
  { id: 'solar', name: 'Solar Power Array', short: 'Solar Array', purpose: 'Tall panels turn sunlight into electricity for the whole base.', needs: 'Sunlight. Near the south pole the Sun stays low, so panels stand upright.', output: 'Power: changes each cycle (+24, +8, +22, +14, +20 in this scenario).', science: 'The lunar south pole has places that get sunlight for long periods, which is one reason NASA\'s Artemis program is interested in it.' },
  { id: 'recycler', name: 'Water Recycling Facility', short: 'Water Recycler', purpose: 'Cleans used water so the crew can use it again.', needs: 'Power: 6 each cycle when on.', output: 'Water: +12 when working, +4 with a fault.', science: 'Bringing water from Earth is very expensive. Recycling lets a small supply last a long time.' },
  { id: 'greenhouse', name: 'Greenhouse', short: 'Greenhouse', purpose: 'Grows fresh plants under special lights.', needs: 'Power: 8 and Water: 5 each cycle when on.', output: 'Food: +12 when working. The crew eats 8 Food every cycle.', science: 'Astronauts have grown lettuce and other plants on the International Space Station to learn how to farm in space.' },
  { id: 'shelter', name: 'Radiation Shelter', short: 'Shelter', purpose: 'A thickly shielded room where the crew can hide during radiation storms.', needs: 'Shielding kits, Power to run, or research time.', output: 'Protects Crew Safety during radiation alerts.', science: 'Lunar soil, called regolith, can be piled over a shelter to block some radiation, like a thick blanket.' },
  { id: 'comms', name: 'Communications Station', short: 'Comms', purpose: 'Sends research data and messages to Earth.', needs: 'Power: 4 each cycle when on.', output: 'Science: +5 each cycle when on.', science: 'Radio signals travel at the speed of light. They take about 1.3 seconds to cross the average distance from the Moon to Earth.' },
];

export const DISCLOSURES = ['Educational Simulation', 'Illustrative Resource Units', 'Not an Operational NASA Model'];

export interface SourceLink { title: string; org: string; url: string; note: string }

export const SOURCES: SourceLink[] = [
  { title: 'NASA Space Apps Challenge', org: 'NASA Space Apps', url: 'https://www.spaceappschallenge.org/', note: 'Challenge: Build a Junior Astronaut Mission Trainer (2026).' },
  { title: 'Earth\'s Moon: Facts', org: 'NASA Science', url: 'https://science.nasa.gov/moon/facts/', note: 'Average Earth-Moon distance of about 384,400 km, used for the 1.3 second one-way signal example.' },
  { title: 'Artemis Program', org: 'NASA', url: 'https://www.nasa.gov/humans-in-space/artemis/', note: 'Context for crewed exploration of the lunar south polar region.' },
  { title: 'Environmental Control and Life Support Systems (ECLSS)', org: 'NASA', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/', note: 'Reference link: how spacecraft make oxygen and recycle water (not an integrated API).' },
  { title: 'Growing Plants in Space', org: 'NASA', url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/', note: 'Background for the greenhouse module.' },
  { title: 'Space Radiation', org: 'NASA Human Research Program', url: 'https://www.nasa.gov/hrp/', note: 'Why astronauts need shielding. AstroBorneo does not predict real doses.' },
  { title: 'Space Communications and Navigation (SCaN)', org: 'NASA', url: 'https://www.nasa.gov/communicating-with-missions/', note: 'How missions talk to Earth.' },
  { title: 'Earth Calling: radio signals and the speed of light (educator guide)', org: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2011/08/583093main_earth_calling.pdf', note: 'Educational source for radio propagation delay used in the Send to Earth demo.' },
  { title: 'DONKI: Space Weather Database Of Notifications, Knowledge, Information', org: 'NASA CCMC', url: 'https://ccmc.gsfc.nasa.gov/DONKI/api/', note: 'Public space-weather archive/API context (separate from simulated game rules).' },
  { title: 'NASA Open APIs Documentation', org: 'NASA', url: 'https://api.nasa.gov/', note: 'Separate server-keyed API documentation; requires server secret if enabled.' },
  { title: 'NASA Open Science Data Repository (OSDR)', org: 'NASA', url: 'https://osdr.nasa.gov/bio/repo/', note: 'Reference link only (not an automatically integrated API).' },
  { title: 'NASA RadLab Data API', org: 'NASA OSDR', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', note: 'Reference link only (not an integrated API). ISS RadLab measurements are not measured radiation at the lunar base.' },
];

export const CSA_LINKS: SourceLink[] = [
  { title: 'STEM and Youth Organizations Resources', org: 'Canadian Space Agency', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp', note: 'Reference link only. No CSA media is embedded; reuse permissions must be checked before embedding.' },
  { title: 'Food Production Toolkit', org: 'Canadian Space Agency', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/', note: 'Reference link only. Not an integrated API; check CSA reuse terms before embedding any media.' },
];
