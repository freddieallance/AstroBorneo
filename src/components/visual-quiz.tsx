import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  XCircle,
} from 'lucide-react';
import { QUIZ, QUIZ_VISUAL_META, type QuizQuestion } from '@/content/quiz';
import { buildLearningReflection, firstOpenQuizIndex, quizCorrect, type QuizState } from '@/lib/records';
import type { State } from '@/game/engine';
import { scoreSummary } from '@/game/scoring';
import { speakText } from '@/lib/speech';
import { playSfx } from '@/lib/sfx';
import { btn } from '@/components/kit';
import { cn } from '@/lib/utils';

export function VisualQuizScene({ questionId }: { questionId: string }) {
  return (
    <svg
      viewBox="0 0 360 118"
      className="h-24 w-full rounded-2xl border border-aqua/25 bg-[#080d1f] sm:h-28"
      role="img"
      aria-label={QUIZ_VISUAL_META[questionId]?.spokenPrompt ?? 'Mission science visual'}
    >
      <rect width="360" height="118" fill="#080d1f" />
      <circle cx="28" cy="18" r="1.3" fill="#f5f7ff" opacity="0.65" />
      <circle cx="96" cy="12" r="1" fill="#f5f7ff" opacity="0.45" />
      <circle cx="242" cy="16" r="1.2" fill="#f5f7ff" opacity="0.55" />
      <path d="M0 98 Q180 86 360 98 V118 H0 Z" fill="#1b2442" />

      {questionId === 'air' && (
        <g>
          {/* Left: Battery with ECO badge */}
          <g transform="translate(56 58)">
            <rect x="-26" y="-22" width="52" height="44" rx="10" fill="#162840" stroke="#35d2a0" strokeWidth="2" />
            <path d="M2 -13 L-6 0 H0 L-2 12 L7 -1 H1 Z" fill="#ffc76b" />
            <text y="34" textAnchor="middle" fill="#35d2a0" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">ECO MODE</text>
          </g>
          <path d="M90 58 H126" stroke="#35d9e8" strokeWidth="2.5" strokeDasharray="5 4" />
          {/* Center: Habitat */}
          <g transform="translate(180 68)">
            <rect x="-44" y="-26" width="88" height="30" rx="14" fill="#c9d1e6" />
            <path d="M-24 -26 a24 20 0 0 1 48 0" fill="#dfe5f5" />
            <circle cx="-18" cy="-11" r="4" fill="#ffc76b" />
            <circle cx="0" cy="-11" r="4" fill="#ffc76b" />
            <circle cx="18" cy="-11" r="4" fill="#ffc76b" />
            <text y="22" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">+6 AIR</text>
          </g>
          <path d="M234 58 H270" stroke="#ffc76b" strokeWidth="2.5" strokeDasharray="5 4" />
          {/* Right: 4 Crew Breathing (-10) */}
          <g transform="translate(306 58)">
            <circle r="24" fill="#2a1d2e" stroke="#ffc76b" strokeWidth="2" />
            {[-9, -3, 3, 9].map((cx) => (
              <circle key={cx} cx={cx} cy="-4" r="4.2" fill="#f5f7ff" />
            ))}
            <text y="34" textAnchor="middle" fill="#ffc76b" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">USE 10 AIR</text>
          </g>
        </g>
      )}

      {questionId === 'solar' && (
        <g>
          {/* Low Sun on Horizon */}
          <circle cx="52" cy="72" r="22" fill="#ffc76b" fillOpacity="0.22" />
          <circle cx="52" cy="72" r="13" fill="#ffc76b" />
          {/* Rays hitting Crater Hill */}
          <line x1="68" y1="70" x2="150" y2="54" stroke="#ffc76b" strokeWidth="2" strokeDasharray="4 4" />
          {/* Crater Rim Mountain */}
          <path d="M84 96 L154 44 L218 96 Z" fill="#2b375c" stroke="#7e8ba8" strokeWidth="1.5" />
          {/* Cast Shadow */}
          <polygon points="154,44 300,98 218,96" fill="#060916" opacity="0.72" />
          {/* Solar Panels sitting in partial shadow */}
          <g transform="translate(274 84)">
            <rect x="-26" y="-40" width="16" height="36" rx="2" fill="#1a346d" stroke="#7e8ba8" strokeWidth="1.6" />
            <rect x="-6" y="-40" width="16" height="36" rx="2" fill="#1a346d" stroke="#7e8ba8" strokeWidth="1.6" />
            <rect x="14" y="-40" width="16" height="36" rx="2" fill="#1f4594" stroke="#ffc76b" strokeWidth="1.6" />
            <text x="2" y="14" textAnchor="middle" fill="#abb8d5" fontSize="9.5" fontFamily="JetBrains Mono">SOUTH POLE</text>
          </g>
        </g>
      )}

      {questionId === 'water' && (
        <g>
          {/* Left: Heavy Rocket from Earth */}
          <g transform="translate(76 60)">
            <circle r="26" fill="#18274a" stroke="#ff727e" strokeWidth="1.8" />
            <path d="M0 -18 C6 -10 8 -2 8 8 H-8 C-8 -2 -6 -10 0 -18 Z" fill="#dfe5f5" />
            <path d="M-8 4 L-14 13 H-8 Z M8 4 L14 13 H8 Z" fill="#ff727e" />
            <path d="M0 -5 C3 0 4 2 4 4 A4 4 0 0 1 -4 4 C-4 2 -3 0 0 -5 Z" fill="#35d9e8" />
            <text y="38" textAnchor="middle" fill="#ff727e" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">EARTH ROCKET</text>
          </g>
          <text x="180" y="64" textAnchor="middle" fill="#abb8d5" fontSize="13" fontFamily="Outfit" fontWeight="800">VS</text>
          {/* Right: Recycler Loop */}
          <g transform="translate(282 58)">
            <circle r="26" fill="#132e3c" stroke="#35d9e8" strokeWidth="2" />
            <path d="M-15 -10 A18 18 0 1 1 14 12" fill="none" stroke="#35d9e8" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M10 15 A18 18 0 0 1 -16 -6" fill="none" stroke="#35d2a0" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M0 -11 C5 -3 7 1 7 4 A7 7 0 0 1 -7 4 C-7 1 -5 -3 0 -11 Z" fill="#35d9e8" />
            <text y="40" textAnchor="middle" fill="#35d9e8" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">WATER LOOP</text>
          </g>
        </g>
      )}

      {questionId === 'radiation' && (
        <g>
          {/* Left: Solar Particle Waves */}
          <g transform="translate(52 54)">
            <circle r="15" fill="#ffc76b" />
            <path d="M22 -18 Q36 -4 26 8 T30 28" fill="none" stroke="#ff727e" strokeWidth="2.5" strokeDasharray="4 3" />
            <path d="M36 -22 Q50 -6 40 6 T44 26" fill="none" stroke="#ff727e" strokeWidth="2.5" strokeDasharray="4 3" />
            <text x="6" y="42" textAnchor="middle" fill="#ff727e" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">RADIATION</text>
          </g>
          {/* Right: Question Shield Zone + Astronauts */}
          <g transform="translate(232 80)">
            <path d="M-56 12 q10 -54 56 -56 q46 2 56 56 z" fill="#465273" fillOpacity="0.45" stroke="#35d9e8" strokeWidth="2" strokeDasharray="5 4" />
            <circle cx="-12" cy="-14" r="6" fill="#f5f7ff" />
            <circle cx="12" cy="-14" r="6" fill="#f5f7ff" />
            <text y="24" textAnchor="middle" fill="#35d9e8" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">HOW TO PROTECT CREW?</text>
          </g>
        </g>
      )}

      {questionId === 'comms' && (
        <g>
          {/* Moon Dish Left */}
          <g transform="translate(58 58)">
            <circle r="22" fill="#2a3454" stroke="#9fb4dc" strokeWidth="1.8" />
            <circle cx="-6" cy="-6" r="4" fill="#445074" />
            <circle cx="7" cy="5" r="3" fill="#445074" />
            <text y="38" textAnchor="middle" fill="#f5f7ff" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">MOON</text>
          </g>
          {/* Beam Across Space */}
          <line x1="88" y1="58" x2="270" y2="58" stroke="#35d9e8" strokeWidth="2.5" strokeDasharray="6 5" />
          <circle cx="180" cy="58" r="5" fill="#35d9e8" />
          <text x="180" y="38" textAnchor="middle" fill="#abb8d5" fontSize="10" fontFamily="JetBrains Mono">384,400 km</text>
          {/* Earth Right */}
          <g transform="translate(302 58)">
            <circle r="24" fill="#2357b8" stroke="#7fd3ff" strokeWidth="1.8" />
            <path d="M-9 -11 q11 4 6 13 q-8 4 -11 -4 z M5 2 q8 -3 11 5 q-5 6 -11 -5 z" fill="#35d2a0" fillOpacity="0.88" />
            <text y="38" textAnchor="middle" fill="#7fd3ff" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">EARTH</text>
          </g>
        </g>
      )}
    </svg>
  );
}

/**
 * Distinct causal illustration for each of the 4 answer choices across all 5
 * questions — zero shared generic icons, zero embedded sentences inside SVGs.
 */
export function ChoiceVisualDiagram({ questionId, choiceIndex }: { questionId: string; choiceIndex: number }) {
  return (
    <svg viewBox="0 0 120 68" className="h-16 w-full rounded-xl bg-[#070c1c]" aria-hidden>
      {questionId === 'air' && choiceIndex === 0 && (
        <g transform="translate(60 36)">
          <rect x="-32" y="-14" width="22" height="28" rx="4" fill="#173832" stroke="#35d2a0" strokeWidth="1.8" />
          <rect x="-28" y="-8" width="14" height="18" rx="2" fill="#35d2a0" />
          <path d="M16 14 V-12 M8 -4 L16 -14 L24 -4" fill="none" stroke="#35d2a0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {questionId === 'air' && choiceIndex === 1 && (
        <g transform="translate(60 36)">
          {/* Battery saved left */}
          <rect x="-42" y="-16" width="22" height="32" rx="4" fill="#192647" stroke="#ffc76b" strokeWidth="1.8" />
          <path d="M-30 -8 L-35 0 H-30 L-32 8 L-26 -1 H-30 Z" fill="#ffc76b" />
          {/* Air gauge trending gently downward right */}
          <rect x="-6" y="-14" width="48" height="28" rx="6" fill="#15203b" stroke="#35d9e8" strokeWidth="1.4" />
          <path d="M4 -5 L18 1 L32 8 M25 9 H33 V2" fill="none" stroke="#ffc76b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {questionId === 'air' && choiceIndex === 2 && (
        <g transform="translate(60 34)">
          <line x1="-26" y1="-6" x2="26" y2="-6" stroke="#9fb4dc" strokeWidth="4" strokeLinecap="round" />
          <line x1="-26" y1="6" x2="26" y2="6" stroke="#9fb4dc" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {questionId === 'air' && choiceIndex === 3 && (
        <g transform="translate(60 34)">
          <path d="M-34 2 Q-24 -10 -14 0" fill="none" stroke="#abb8d5" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M-4 0 H10 M5 -5 L11 0 L5 5" fill="none" stroke="#35d9e8" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 -12 C32 -2 34 3 34 7 A8 8 0 0 1 18 7 C18 3 20 -2 26 -12 Z" fill="#35d9e8" />
        </g>
      )}

      {questionId === 'solar' && choiceIndex === 0 && (
        <g transform="translate(60 34)">
          <g stroke="#7fd3ff" strokeWidth="2.2" strokeLinecap="round">
            <line x1="-20" y1="-16" x2="-20" y2="16" />
            <line x1="-34" y1="-8" x2="-6" y2="8" />
            <line x1="-34" y1="8" x2="-6" y2="-8" />
          </g>
          <path d="M18 -14 L10 0 H17 L15 14 L25 -1 H18 Z" fill="#6b7899" />
          <line x1="6" y1="-16" x2="32" y2="16" stroke="#ff727e" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {questionId === 'solar' && choiceIndex === 1 && (
        <g transform="translate(60 38)">
          <circle cx="-36" cy="4" r="10" fill="#ffc76b" />
          <path d="M-24 18 L-2 -14 L18 18 Z" fill="#39466e" />
          <polygon points="-2,-14 42,18 18,18" fill="#0b1124" stroke="#4f8cff" strokeWidth="1" />
          <rect x="20" y="-8" width="18" height="24" rx="2" fill="#172a5e" stroke="#7e8ba8" strokeWidth="1.5" />
        </g>
      )}
      {questionId === 'solar' && choiceIndex === 2 && (
        <g transform="translate(60 34)">
          <path d="M-24 -14 A14 14 0 1 0 -10 14 A11 11 0 1 1 -24 -14 Z" fill="#ffd98a" />
          <rect x="6" y="-12" width="26" height="26" rx="2" fill="#1f4594" stroke="#4f8cff" strokeWidth="1.6" />
        </g>
      )}
      {questionId === 'solar' && choiceIndex === 3 && (
        <g transform="translate(60 34)">
          <circle cx="-20" cy="0" r="11" fill="#f5f7ff" />
          <path d="M-24 -2 Q-20 3 -16 -2" fill="none" stroke="#1b2442" strokeWidth="1.8" />
          <rect x="8" y="-10" width="28" height="18" rx="9" fill="#2a3556" stroke="#6b7899" strokeWidth="1.5" />
          <circle cx="17" cy="-1" r="6" fill="#ff727e" />
        </g>
      )}

      {questionId === 'water' && choiceIndex === 0 && (
        <g transform="translate(60 34)">
          {/* Earth Rocket + Cost */}
          <path d="M-28 -18 C-23 -10 -21 -2 -21 8 H-35 C-35 -2 -33 -10 -28 -18 Z" fill="#dfe5f5" />
          <path d="M-35 4 L-40 12 H-35 Z M-21 4 L-16 12 H-21 Z" fill="#ff727e" />
          {/* Arrow to Loop */}
          <path d="M-6 0 H6 M2 -4 L7 0 L2 4" fill="none" stroke="#35d9e8" strokeWidth="2.2" />
          {/* Loop Drop */}
          <circle cx="26" cy="0" r="15" fill="none" stroke="#35d2a0" strokeWidth="2.5" strokeDasharray="24 6" />
          <path d="M26 -8 C30 -2 31 1 31 4 A5 5 0 0 1 21 4 C21 1 22 -2 26 -8 Z" fill="#35d9e8" />
        </g>
      )}
      {questionId === 'water' && choiceIndex === 1 && (
        <g transform="translate(60 34)">
          <circle cx="-14" cy="-2" r="12" fill="#f5f7ff" />
          <path d="M-19 2 Q-14 7 -9 2" fill="none" stroke="#1b2442" strokeWidth="2" strokeLinecap="round" />
          <rect x="10" y="-8" width="18" height="22" rx="3" fill="#132e3c" stroke="#35d9e8" strokeWidth="1.8" />
          <rect x="12" y="2" width="14" height="10" fill="#35d9e8" />
        </g>
      )}
      {questionId === 'water' && choiceIndex === 2 && (
        <g transform="translate(60 34)">
          <circle cx="-16" cy="0" r="13" fill="none" stroke="#35d9e8" strokeWidth="2.5" strokeDasharray="18 5" />
          <path d="M16 -13 L9 -1 H15 L13 13 L23 -2 H16 Z" fill="#6b7899" />
          <line x1="6" y1="-15" x2="28" y2="15" stroke="#ff727e" strokeWidth="2.6" />
        </g>
      )}
      {questionId === 'water' && choiceIndex === 3 && (
        <g transform="translate(60 34)">
          <path d="M0 -15 C7 -4 9 1 9 6 A9 9 0 0 1 -9 6 C-9 1 -7 -4 0 -15 Z" fill="#4f6085" />
          <line x1="-18" y1="-16" x2="18" y2="18" stroke="#ff727e" strokeWidth="3.2" strokeLinecap="round" />
        </g>
      )}

      {questionId === 'radiation' && choiceIndex === 0 && (
        <g transform="translate(60 34)">
          <rect x="-10" y="-18" width="38" height="36" rx="4" fill="#192647" stroke="#abb8d5" strokeWidth="2" />
          <rect x="-4" y="-12" width="26" height="24" rx="2" fill="#070c1c" />
          <path d="M-36 -6 H10 M-36 6 H10" stroke="#ff727e" strokeWidth="2.6" strokeDasharray="4 3" />
        </g>
      )}
      {questionId === 'radiation' && choiceIndex === 1 && (
        <g transform="translate(60 44)">
          {/* Thick Soil Dome blocking red wavy line */}
          <path d="M-40 -18 Q-30 -6 -38 6" fill="none" stroke="#ff727e" strokeWidth="2.4" strokeDasharray="3 3" />
          <path d="M-24 12 q6 -40 34 -42 q28 2 34 42 z" fill="#5e6a8a" stroke="#35d2a0" strokeWidth="2.5" />
          <circle cx="4" cy="-6" r="5" fill="#f5f7ff" />
          <circle cx="17" cy="-6" r="5" fill="#f5f7ff" />
        </g>
      )}
      {questionId === 'radiation' && choiceIndex === 2 && (
        <g transform="translate(60 34)">
          <rect x="-28" y="-8" width="22" height="14" rx="4" fill="#111a35" stroke="#35d9e8" strokeWidth="2" />
          <rect x="6" y="-8" width="22" height="14" rx="4" fill="#111a35" stroke="#35d9e8" strokeWidth="2" />
          <line x1="-6" y1="-3" x2="6" y2="-3" stroke="#35d9e8" strokeWidth="2.2" />
        </g>
      )}
      {questionId === 'radiation' && choiceIndex === 3 && (
        <g transform="translate(60 34)">
          <circle cx="0" cy="-4" r="12" fill="#232c4a" stroke="#7e8ba8" strokeWidth="2" />
          <rect x="-6" y="8" width="12" height="8" rx="2" fill="#7e8ba8" />
          <line x1="-16" y1="-16" x2="16" y2="16" stroke="#ff727e" strokeWidth="2.6" />
        </g>
      )}

      {questionId === 'comms' && choiceIndex === 0 && (
        <g transform="translate(60 34)">
          <circle cx="0" cy="2" r="18" fill="#143238" stroke="#35d2a0" strokeWidth="2.2" />
          <line x1="0" y1="2" x2="9" y2="-6" stroke="#35d2a0" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="-5" y="-21" width="10" height="4" rx="1.5" fill="#35d2a0" />
          <text x="0" y="13" textAnchor="middle" fill="#35d2a0" fontSize="9.5" fontFamily="JetBrains Mono" fontWeight="700">1.3s</text>
        </g>
      )}
      {questionId === 'comms' && choiceIndex === 1 && (
        <g transform="translate(60 34)">
          <circle cx="0" cy="0" r="18" fill="#192647" stroke="#ffc76b" strokeWidth="2" />
          <line x1="0" y1="0" x2="0" y2="-10" stroke="#ffc76b" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="0" y1="0" x2="10" y2="0" stroke="#ffc76b" strokeWidth="2.4" strokeLinecap="round" />
          <text x="0" y="14" textAnchor="middle" fill="#ffc76b" fontSize="8.5" fontFamily="JetBrains Mono" fontWeight="700">3h</text>
        </g>
      )}
      {questionId === 'comms' && choiceIndex === 2 && (
        <g transform="translate(60 34)">
          <rect x="-18" y="-16" width="36" height="32" rx="5" fill="#192647" stroke="#9fb4dc" strokeWidth="2" />
          <rect x="-18" y="-16" width="36" height="9" rx="3" fill="#ff727e" />
          <text x="0" y="8" textAnchor="middle" fill="#f5f7ff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="700">7d</text>
        </g>
      )}
      {questionId === 'comms' && choiceIndex === 3 && (
        <g transform="translate(60 34)">
          <path d="M24 0 H-18 M-10 -8 L-20 0 L-10 8" fill="none" stroke="#ff727e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="14" y="16" textAnchor="middle" fill="#ff727e" fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">-t?</text>
        </g>
      )}
    </svg>
  );
}

export interface VisualQuizCardProps {
  quiz: QuizState;
  game: State | null;
  onSelectQuestion: (idx: number) => void;
  onSubmitAnswer: (questionIndex: number, choiceIndex: number) => boolean;
  onResetQuiz: () => void;
  onBackToScore?: () => void;
  quizSaveError?: string | null;
  soundOn?: boolean;
  showTeacherKey?: boolean;
}

export function VisualQuizCard({
  quiz,
  game,
  onSelectQuestion,
  onSubmitAnswer,
  onResetQuiz,
  onBackToScore,
  quizSaveError,
  soundOn = false,
  showTeacherKey = false,
}: VisualQuizCardProps) {
  const activeIdx = quiz.currentIndex ?? firstOpenQuizIndex(quiz.answers);
  const cur: QuizQuestion = QUIZ[activeIdx];
  const meta = QUIZ_VISUAL_META[cur.id];
  const submittedChoice = quiz.answers[activeIdx];
  const isSubmitted = submittedChoice !== null;

  const [selectedChoice, setSelectedChoice] = useState<number | null>(submittedChoice);
  const [showWhy, setShowWhy] = useState(false);
  const [showReadingText, setShowReadingText] = useState(false);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);

  // Sync local pending selection cleanly when changing question or after reset/reload.
  useEffect(() => {
    setSelectedChoice(submittedChoice);
    setShowWhy(false);
  }, [activeIdx, submittedChoice]);

  // Optional gentle voice prompt only when global narration is toggled ON and question changes.
  useEffect(() => {
    if (!soundOn || !meta) return;
    speakText(`Question ${activeIdx + 1}. ${meta.spokenPrompt}`, false);
  }, [activeIdx, soundOn, meta]);

  const correctCount = quizCorrect(quiz);
  const firstOpen = firstOpenQuizIndex(quiz.answers);
  const maxReachable = quiz.completed ? QUIZ.length - 1 : firstOpen;
  const reflection = buildLearningReflection(game, quiz);
  const summary = game ? scoreSummary(game, quiz.completed, correctCount) : null;

  const handleConfirm = () => {
    if (selectedChoice === null || isSubmitted) return;
    const committed = onSubmitAnswer(activeIdx, selectedChoice);
    if (committed) {
      const ok = selectedChoice === cur.answer;
      playSfx(ok ? 'good' : 'oops');
      if (soundOn) {
        speakText(`${ok ? 'Great engineering!' : 'Good try!'} ${cur.explanation}`, false);
      }
    }
  };

  const handleRadioKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (isSubmitted) return;
    let target: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      target = (i + 1) % 4;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      target = (i + 3) % 4;
    }
    if (target !== null) {
      setSelectedChoice(target);
      const group = e.currentTarget.closest('[role="radiogroup"]');
      const nextBtn = group?.querySelector<HTMLButtonElement>(`[data-testid="scene-quiz-answer-${target}"]`);
      nextBtn?.focus();
    }
  };

  return (
    <div className="space-y-4" data-testid="panel-scene-quiz">
      {/* Top Row: Back + 5 Star Progress Track */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onBackToScore ? (
          <button
            type="button"
            onClick={onBackToScore}
            className="text-xs font-semibold text-aqua hover:underline"
            data-testid="button-quiz-back-score"
          >
            ← Back to Mission Score
          </button>
        ) : (
          <span className="hud-label">5-Star Mission Quiz</span>
        )}

        <div className="flex items-center gap-1.5" role="group" aria-label="Quiz progress: 5 questions" data-testid="progress-quiz">
          {QUIZ.map((item, i) => {
            const ans = quiz.answers[i];
            const isCorrect = ans === item.answer;
            const lockedAhead = i > maxReachable;
            return (
              <button
                key={item.id}
                type="button"
                disabled={lockedAhead}
                onClick={() => onSelectQuestion(i)}
                aria-label={`Question ${i + 1}: ${ans === null ? (lockedAhead ? 'Locked' : 'Unanswered') : isCorrect ? 'Correct' : 'Answered'}`}
                data-testid={`button-quiz-step-${i}`}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full border transition',
                  ans === null
                    ? lockedAhead
                      ? 'border-dim/15 bg-deep/50 text-dim/35 cursor-not-allowed'
                      : 'border-dim/35 bg-plate text-dim hover:border-aqua'
                    : isCorrect
                      ? 'border-ok bg-ok/20 text-ok'
                      : 'border-warn/60 bg-warn/15 text-warn',
                  i === activeIdx && 'ring-2 ring-aqua ring-offset-2 ring-offset-hull',
                )}
              >
                <Star className={cn('h-4 w-4', ans !== null && 'fill-current')} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      {quizSaveError && (
        <p className="rounded-xl border border-warn/45 bg-warn/10 px-3 py-2 text-xs text-warn" role="alert">
          {quizSaveError}
        </p>
      )}

      {/* Large Picture Scene */}
      <VisualQuizScene questionId={cur.id} />

      {/* Question Card + 4 Visual Answer Cards */}
      <div className="rounded-2xl border border-dim/20 bg-deep/70 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="hud-label">Question {activeIdx + 1} of 5 · {cur.topic}</p>
            <h3 className="mt-1 font-display text-lg font-bold text-ink sm:text-xl" data-testid="text-quiz-short-prompt">
              {meta?.shortPrompt ?? cur.question}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => speakText(`${meta?.spokenPrompt ?? cur.question} ${meta?.spokenHint ?? ''}`, true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dim/25 bg-plate text-aqua hover:border-aqua"
            aria-label="Listen to question aloud"
            data-testid="button-quiz-speak"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        </div>

        {/* Optional full-reading text disclosure for readers / accessibility */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowReadingText((v) => !v)}
            aria-expanded={showReadingText}
            className="inline-flex items-center gap-1 text-xs font-semibold text-dim hover:text-aqua"
            data-testid="button-toggle-reading-version"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            {showReadingText ? 'Hide Reading Version' : 'Reading Version'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition', showReadingText && 'rotate-180')} />
          </button>
          {showReadingText && (
            <div className="mt-2 space-y-1 rounded-xl border border-dim/20 bg-hull/80 p-3 text-xs text-dim" data-testid="panel-quiz-reading-version">
              <p className="font-semibold text-ink">{cur.question}</p>
              <ul className="space-y-0.5">
                {cur.choices.map((fullChoice, idx) => (
                  <li key={idx}>
                    <strong className="text-aqua">{String.fromCharCode(65 + idx)}:</strong> {fullChoice}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 4 Clickable Picture Answer Cards */}
        <div className="mt-3 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={meta?.shortPrompt ?? cur.question}>
          {cur.choices.map((fullChoice, i) => {
            const isSelected = !isSubmitted && selectedChoice === i;
            const isSubmittedPick = isSubmitted && submittedChoice === i;
            const isAns = i === cur.answer;
            const shortLabel = meta?.shortLabels[i] ?? fullChoice;
            const altDesc = meta?.choiceAlts[i] ?? fullChoice;

            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={isSubmitted ? isSubmittedPick : isSelected}
                aria-label={`Option ${String.fromCharCode(65 + i)}: ${shortLabel}. ${altDesc}`}
                disabled={isSubmitted}
                onClick={() => {
                  if (!isSubmitted) {
                    playSfx('tap');
                    setSelectedChoice(i);
                  }
                }}
                onKeyDown={(e) => handleRadioKeyDown(e, i)}
                data-testid={`scene-quiz-answer-${i}`}
                className={cn(
                  'flex min-h-[112px] flex-col items-center justify-between gap-2 rounded-2xl border p-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua',
                  !isSubmitted && !isSelected && 'border-dim/25 bg-hull/70 hover:border-aqua/65',
                  !isSubmitted && isSelected && 'border-aqua bg-aqua/15 ring-2 ring-aqua/60',
                  isSubmitted && isAns && 'border-ok bg-ok/15',
                  isSubmitted && isSubmittedPick && !isAns && 'border-warn bg-warn/15',
                  isSubmitted && !isAns && !isSubmittedPick && 'border-dim/10 bg-hull/40 opacity-55',
                )}
              >
                <ChoiceVisualDiagram questionId={cur.id} choiceIndex={i} />
                <div className="flex w-full items-center justify-center gap-1.5 px-1">
                  <span className="font-mono text-[11px] font-bold text-dim">{String.fromCharCode(65 + i)}</span>
                  <span className="text-xs font-bold leading-tight text-ink sm:text-sm">{shortLabel}</span>
                  {isSubmitted && isAns && <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label="Correct choice" />}
                  {isSubmitted && isSubmittedPick && !isAns && <XCircle className="h-4 w-4 shrink-0 text-warn" aria-label="Not this one" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dedicated Submit-Once Check Action (Before submission) OR Visual Reasoning Feedback (After submission) */}
        {!isSubmitted ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-dim" data-testid="text-quiz-pick-hint">
              {selectedChoice === null ? 'Tap a picture card, then press Check Answer.' : `Picked ${String.fromCharCode(65 + selectedChoice)} — ready to check?`}
            </p>
            <button
              type="button"
              disabled={selectedChoice === null}
              onClick={handleConfirm}
              className={cn(btn.primary, 'min-h-[44px] px-4 py-2 text-sm')}
              data-testid="button-quiz-submit"
            >
              Check Answer
            </button>
          </div>
        ) : (
          <div
            className={cn(
              'mt-3 rounded-2xl border p-3 text-sm',
              submittedChoice === cur.answer ? 'border-ok/45 bg-ok/10' : 'border-warn/45 bg-warn/10',
            )}
            aria-live="polite"
            data-testid="text-scene-quiz-explanation"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-display text-sm font-bold text-ink">
                  {submittedChoice === cur.answer ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />
                      Great engineering!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-warn" aria-hidden />
                      Good try — here is why {String.fromCharCode(65 + cur.answer)} works:
                    </>
                  )}
                </p>
                <p className="text-xs text-ink">{cur.explanation}</p>
              </div>
              <button
                type="button"
                onClick={() => speakText(cur.explanation, true)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-dim/25 bg-plate text-aqua hover:border-aqua"
                aria-label="Listen to explanation"
                data-testid="button-quiz-speak-explanation"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Optional "Why?" Scientific Depth + Simulated-vs-Real + NASA Source */}
            <button
              type="button"
              onClick={() => setShowWhy((w) => !w)}
              aria-expanded={showWhy}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-aqua hover:underline"
              data-testid="button-quiz-why"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden />
              Why? (NASA Science &amp; Source)
              <ChevronDown className={cn('h-3.5 w-3.5 transition', showWhy && 'rotate-180')} />
            </button>
            {showWhy && (
              <div className="mt-2 space-y-1.5 rounded-xl border border-dim/20 bg-deep/75 p-2.5 text-xs text-dim" data-testid="panel-quiz-why-source">
                <p className="font-semibold text-ink">{cur.card.title}</p>
                <p>{cur.card.body}</p>
                {meta && (
                  <>
                    <p className="text-[11px] text-aqua">{meta.realWorldNote}</p>
                    <a
                      href={meta.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-aqua hover:underline"
                    >
                      Source: {meta.sourceTitle} <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation + Completed Score & Actual-Decision Reflection */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={activeIdx === 0}
          onClick={() => onSelectQuestion(activeIdx - 1)}
          className={cn(btn.ghost, 'px-3 py-2 text-sm')}
          data-testid="button-prev-question"
        >
          Previous
        </button>

        {activeIdx < QUIZ.length - 1 ? (
          <button
            type="button"
            disabled={!isSubmitted}
            onClick={() => onSelectQuestion(activeIdx + 1)}
            className={cn(btn.primary, 'px-4 py-2 text-sm')}
            data-testid="button-scene-quiz-next"
          >
            Next Question <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {quiz.completed && summary && (
              <span className="font-mono text-sm font-bold text-ok" data-testid="text-quiz-final-score">
                Score: {summary.value}/{summary.maximum}
              </span>
            )}
            {quiz.completed && (
              <button
                type="button"
                onClick={onResetQuiz}
                className={cn(btn.ghost, 'px-3 py-2 text-xs')}
                data-testid="button-retake-quiz"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retake
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grounded Learning Summary once all 5 answers are submitted */}
      {quiz.completed && (
        <div className="space-y-2 rounded-2xl border border-ok/35 bg-ok/10 p-3.5" data-testid="text-quiz-summary">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-base font-bold text-ok">
              Quiz Complete: {correctCount}/5 Correct
            </p>
            {summary && game && game.status !== 'active' && (
              <span className="font-mono text-sm font-bold text-aqua" data-testid="text-combined-score">
                Final Score: {summary.value}/100
              </span>
            )}
          </div>
          <p className="text-xs text-ink">{reflection.summaryLine}</p>
          {reflection.missionFacts.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-dim" data-testid="list-quiz-reflection-facts">
              {reflection.missionFacts.map((fact, idx) => (
                <li key={idx}>· {fact}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Optional Teacher / Judge Key (hidden behind explicit control; separate from normal kid flow) */}
      {showTeacherKey && (
        <div className="border-t border-dim/15 pt-3">
          <button
            type="button"
            onClick={() => setShowTeacherPanel((v) => !v)}
            aria-expanded={showTeacherPanel}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-dim hover:text-ink"
            data-testid="button-toggle-teacher-key"
          >
            <HelpCircle className="h-3.5 w-3.5 text-aqua" />
            Teacher / Judge: Review All 5 Questions &amp; Answer Key
            <ChevronDown className={cn('h-3.5 w-3.5 transition', showTeacherPanel && 'rotate-180')} />
          </button>
          {showTeacherPanel && (
            <div className="mt-2 space-y-2 rounded-xl border border-dim/20 bg-deep/80 p-3 text-xs" data-testid="panel-teacher-quiz-key">
              {QUIZ.map((item, idx) => {
                const qMeta = QUIZ_VISUAL_META[item.id];
                return (
                  <div key={item.id} className="border-b border-dim/15 pb-2 last:border-b-0 last:pb-0">
                    <p className="font-semibold text-ink">
                      Q{idx + 1} ({item.id} · {item.topic}): {item.question}
                    </p>
                    <p className="mt-0.5 text-ok">
                      Correct Answer ({String.fromCharCode(65 + item.answer)}): {item.choices[item.answer]}
                    </p>
                    <p className="mt-0.5 text-dim">{item.explanation}</p>
                    {qMeta && (
                      <p className="mt-0.5 text-[11px] text-aqua">
                        {qMeta.realWorldNote}{' '}
                        <a href={qMeta.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                          {qMeta.sourceTitle}
                        </a>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
