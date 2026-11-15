export interface QuizQuestion {
  id: string;
  topic: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  card: { title: string; body: string };
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'air', topic: 'Life Support',
    question: 'Your base switches the air system to Eco mode for every cycle. What happens to the Air reserve?',
    choices: ['It goes up, because Eco is efficient', 'It slowly goes down, because the crew breathes more than Eco makes', 'Nothing changes', 'Air turns into water'],
    answer: 1,
    explanation: 'Eco makes 6 Air but four astronauts breathe 10. Saving power costs you air over time. That is a trade-off.',
    card: { title: 'Every choice has a cost', body: 'Engineers rarely get something for free. Saving power can mean less oxygen, and making more oxygen means using more power.' },
  },
  {
    id: 'solar', topic: 'Power',
    question: 'Why might solar panels near the Moon\'s south pole make less power on some days?',
    choices: ['The Moon is too cold for electricity', 'The Sun is low and hills can cast long shadows', 'Panels only work at night', 'Astronauts turn them off to sleep'],
    answer: 1,
    explanation: 'Near the poles the Sun skims the horizon. Hills and crater rims can block it, so energy storage like batteries matters.',
    card: { title: 'Store energy for shadows', body: 'Batteries let a base save energy from sunny times and use it when panels are in shadow.' },
  },
  {
    id: 'water', topic: 'Water',
    question: 'Why do space bases recycle water instead of bringing all of it from Earth?',
    choices: ['Launching heavy water from Earth is very costly', 'Moon water tastes better', 'Recycling uses no power', 'Water is not needed in space'],
    answer: 0,
    explanation: 'Every kilogram launched from Earth is expensive. Recycling uses power, but lets a small water supply last much longer.',
    card: { title: 'Reuse is a superpower', body: 'The International Space Station cleans and reuses most of its water, including moisture from the air.' },
  },
  {
    id: 'radiation', topic: 'Radiation',
    question: 'What can help protect astronauts from radiation on the Moon?',
    choices: ['Opening the windows', 'Thick shielding, like walls covered with lunar soil', 'Wearing sunglasses', 'Turning off the lights'],
    answer: 1,
    explanation: 'Radiation is energy from space. Thick materials such as lunar soil, water or special shielding can block some of it.',
    card: { title: 'The Moon has no shield', body: 'Earth has a magnetic field and thick air that protect us. On the Moon, astronauts must bring or build their own protection.' },
  },
  {
    id: 'comms', topic: 'Communications',
    question: 'About how long does a radio signal take to travel from the Moon to Earth?',
    choices: ['About 1.3 seconds', 'About 3 hours', 'About 1 week', 'It arrives before it is sent'],
    answer: 0,
    explanation: 'Radio travels at the speed of light. Across the average Earth-Moon distance (about 384,400 km) that is about 1.3 seconds one way, about 2.6 seconds there and back.',
    card: { title: 'Light is fast, but not instant', body: 'Real delays also depend on equipment and relay stations, so total latency can be longer than the light travel time.' },
  },
];

export const COMMS_REFLECTION = {
  question: 'Power is low and the crew needs more Air. Should you keep Communications on?',
  choices: [
    { label: 'Yes, science is always the top priority', feedback: 'Science matters, but crew survival comes first. Those 4 Power could help the air system.' },
    { label: 'Turn it off for now and turn it back on when power recovers', feedback: 'Good engineering thinking. You protect the crew first, then return to research when you can afford it.' },
    { label: 'It depends: if Air is safe, research can continue', feedback: 'Also a smart answer. Engineers look at the whole picture before choosing.' },
  ],
};

export interface QuizVisualMeta {
  shortPrompt: string;
  spokenPrompt: string;
  spokenHint: string;
  shortLabels: [string, string, string, string];
  choiceAlts: [string, string, string, string];
  realWorldNote: string;
  sourceTitle: string;
  sourceUrl: string;
}

export const QUIZ_VISUAL_META: Record<string, QuizVisualMeta> = {
  air: {
    shortPrompt: 'Eco Air: What happens to Air?',
    spokenPrompt: 'When the habitat air system runs in Eco mode every cycle, what happens to the Air reserve?',
    spokenHint: 'Eco makes 6 air while four astronauts breathe 10 air each cycle.',
    shortLabels: ['Air Goes Up', 'Air Drops Slowly', 'Stays The Same', 'Turns To Water'],
    choiceAlts: [
      'Air gauge rising upward with Eco setting',
      'Battery power saved while breathable air reserve slowly drops down',
      'Air gauge staying flat with an equals sign',
      'Air swirling into liquid water drops',
    ],
    realWorldNote: 'Simulated training units: Eco (+6 Air) vs crew use (-10 Air) models the real ECLSS trade-off between power budget and oxygen scrubbing.',
    sourceTitle: 'NASA ECLSS Overview',
    sourceUrl: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  solar: {
    shortPrompt: 'South Pole: Why less solar power?',
    spokenPrompt: 'Why might solar panels near the Moon south pole make less electricity on some days?',
    spokenHint: 'Look at how low the Sun sits above the crater hills.',
    shortLabels: ['Too Cold', 'Low Sun Shadows', 'Night Panels Only', 'Crew Turns Off'],
    choiceAlts: [
      'Moon surface with ice crystal and crossed-out lightning bolt',
      'Low horizon Sun casting long crater-hill shadows over solar panels',
      'Starry night sky lighting up solar panels',
      'Sleeping astronaut switching off solar panel breaker',
    ],
    realWorldNote: 'Near the lunar south pole, the Sun stays within a few degrees of the horizon, creating long shadows across crater rims.',
    sourceTitle: 'NASA Artemis Program',
    sourceUrl: 'https://www.nasa.gov/humans-in-space/artemis/',
  },
  water: {
    shortPrompt: 'Why recycle water in space?',
    spokenPrompt: 'Why do Moon and space bases recycle water instead of launching all of it from Earth?',
    spokenHint: 'Think about how heavy water is inside a rocket launching from Earth.',
    shortLabels: ['Rockets Costly', 'Tastes Better', 'Uses Zero Power', 'No Water Needed'],
    choiceAlts: [
      'Heavy water tanks riding an expensive rocket from Earth versus reusing water in a loop',
      'Astronaut drinking Moon water from a cup',
      'Water filter loop running with zero power bolt',
      'Crossed-out water drop beside an astronaut',
    ],
    realWorldNote: 'Water is heavy (~1 kg per liter). The ISS ECLSS recycles ~98% of crew water to cut costly Earth resupply launches.',
    sourceTitle: 'NASA ECLSS Water Recovery',
    sourceUrl: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  radiation: {
    shortPrompt: 'What helps block space radiation?',
    spokenPrompt: 'What can help protect astronauts from space radiation on the Moon?',
    spokenHint: 'Compare thin glass or sunglasses against thick lunar soil walls.',
    shortLabels: ['Open Windows', 'Thick Soil Shield', 'Sunglasses', 'Lights Off'],
    choiceAlts: [
      'Open habitat hatch letting solar particle waves stream straight inside',
      'Thick lunar soil regolith shelter wall blocking incoming solar particle waves around astronauts',
      'Astronaut wearing dark sunglasses under particle waves',
      'Switched-off lightbulb while solar waves still pass through',
    ],
    realWorldNote: 'Training model only: thick shielding reduces exposure risk in scenarios, not 100% immunity or a medical radiation dose prediction.',
    sourceTitle: 'NASA Human Research Program (Space Radiation)',
    sourceUrl: 'https://www.nasa.gov/hrp/',
  },
  comms: {
    shortPrompt: 'Moon → Earth radio travel time?',
    spokenPrompt: 'About how long does a radio signal take to travel one way from the Moon to Earth?',
    spokenHint: 'Light and radio travel across 384,400 kilometers very fast, yet not instantaneously.',
    shortLabels: ['~1.3 Seconds', '~3 Hours', '~1 Week', 'Before Sent'],
    choiceAlts: [
      'Radio wave speeding from Moon to Earth with a 1.3 second timer',
      'Slow clock showing 3 hours waiting between Moon and Earth',
      'Calendar flipping 7 days for one radio wave',
      'Signal arrow pointing backwards arriving before it leaves',
    ],
    realWorldNote: 'Average Earth–Moon light-travel delay is ~1.3s one way (~2.6s round-trip); real mission latency varies with relay stations.',
    sourceTitle: 'NASA Earth Calling Guide & SCaN',
    sourceUrl: 'https://www.nasa.gov/communicating-with-missions/',
  },
};

