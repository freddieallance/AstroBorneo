import type { ModuleId } from '@/content/mission';
import type { Decision, EventChoice, Review, State } from '@/game/engine';
import type { GameViewModel } from '@/game/view-model';
import {
  CycleDecisionDialog,
  CycleReactionDialog,
  GuidedIntroOverlay,
  MissionOutcomeDialog,
  ModuleControlDialog,
  NasaSourceDialog,
  PauseDialog,
} from '@/components/scene-overlays';

export interface MoonBaseOverlayHostProps {
  game: State;
  vm: GameViewModel;
  draft: Decision;
  introStep: number | null;
  onIntroStep: (step: number) => void;
  onFinishIntro: () => void;
  selectedModule: ModuleId | null;
  onSelectModule: (id: ModuleId | null) => void;
  decisionOpen: boolean;
  onDecisionOpenChange: (open: boolean) => void;
  lastReaction: Review | null;
  onContinueReaction: () => void;
  outcomeOpen: boolean;
  onOutcomeOpenChange: (open: boolean) => void;
  initialQuizMode?: boolean;
  onOpenQuiz?: () => void;
  onQuizModeChange?: (quizOpen: boolean) => void;
  stagedEventChoice?: EventChoice | null;
  onStageEventChoice?: (choice: EventChoice | null) => void;
  pauseOpen: boolean;
  onPauseOpenChange: (open: boolean) => void;
  sourceOpen: boolean;
  onSourceOpenChange: (open: boolean) => void;
  onSetDraft: (patch: Partial<Decision>) => void;
  onSelectEvent: (choice: EventChoice) => void;
  onCommitCycle: () => void;
  onPreviewChoiceChange?: (choice: EventChoice | null) => void;
  hasVerifiedDonkiContext?: boolean;
  onRestart: () => void;
  onUpdateQuiz: (completed: boolean, correct: number) => void;
  onCommsPingChange: (stage: 'idle' | 'out' | 'back' | 'done') => void;
  running: boolean;
  commitError: string | null;
  detailsMode: boolean;
  onToggleDetails: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  speechAvailable: boolean;
}

/**
 * Central reusable overlay host mounting story/guided intro, module controls,
 * mission event decisions, cycle reaction review, outcome quiz, pause/settings menu,
 * and NASA source attribution directly over the Moon Base scene.
 */
export function MoonBaseOverlayHost({
  game,
  vm,
  draft,
  introStep,
  onIntroStep,
  onFinishIntro,
  selectedModule,
  onSelectModule,
  decisionOpen,
  onDecisionOpenChange,
  lastReaction,
  onContinueReaction,
  outcomeOpen,
  onOutcomeOpenChange,
  initialQuizMode = false,
  onOpenQuiz,
  onQuizModeChange,
  stagedEventChoice,
  onStageEventChoice,
  pauseOpen,
  onPauseOpenChange,
  sourceOpen,
  onSourceOpenChange,
  onSetDraft,
  onSelectEvent,
  onCommitCycle,
  onPreviewChoiceChange,
  hasVerifiedDonkiContext = false,
  onRestart,
  onUpdateQuiz,
  onCommsPingChange,
  running,
  commitError,
  detailsMode,
  onToggleDetails,
  reducedMotion,
  onToggleReducedMotion,
  soundOn,
  onToggleSound,
  speechAvailable,
}: MoonBaseOverlayHostProps) {
  return (
    <>
      {introStep !== null && (
        <div className="pointer-events-none absolute inset-x-3 top-2.5 z-20 md:inset-x-auto md:left-5 md:top-4 md:w-[400px]">
          <GuidedIntroOverlay
            step={introStep}
            onStep={onIntroStep}
            onFinish={onFinishIntro}
            soundOn={soundOn}
          />
        </div>
      )}

      <ModuleControlDialog
        id={selectedModule}
        vm={vm}
        draft={draft}
        onSetDraft={onSetDraft}
        onOpenEvent={() => onDecisionOpenChange(true)}
        onOpenSources={() => onSourceOpenChange(true)}
        onClose={() => onSelectModule(null)}
        detailsMode={detailsMode}
        onCommsPingChange={onCommsPingChange}
      />

      <CycleDecisionDialog
        open={decisionOpen}
        onOpenChange={onDecisionOpenChange}
        game={game}
        draft={draft}
        vm={vm}
        stagedChoiceProp={stagedEventChoice}
        onStageChoice={onStageEventChoice}
        onSelectEvent={onSelectEvent}
        onSetDraft={onSetDraft}
        onCommitCycle={onCommitCycle}
        onPreviewChoiceChange={onPreviewChoiceChange}
        onOpenSources={() => onSourceOpenChange(true)}
        hasVerifiedDonkiContext={hasVerifiedDonkiContext}
        running={running}
        error={commitError}
        detailsMode={detailsMode}
        soundOn={soundOn}
      />

      <CycleReactionDialog
        record={lastReaction}
        gameStatus={vm.status}
        nextCycle={vm.cycle}
        onContinue={onContinueReaction}
        soundOn={soundOn}
      />

      <MissionOutcomeDialog
        open={outcomeOpen}
        game={game}
        onRestart={onRestart}
        onUpdateQuiz={onUpdateQuiz}
        onClose={() => onOutcomeOpenChange(false)}
        onOpenSources={() => onSourceOpenChange(true)}
        initialQuizMode={initialQuizMode}
        onQuizModeChange={onQuizModeChange}
        soundOn={soundOn}
      />

      <PauseDialog
        open={pauseOpen}
        onOpenChange={onPauseOpenChange}
        cycle={vm.cycle}
        onRestart={onRestart}
        onOpenGuide={() => onIntroStep(0)}
        onOpenNasa={() => onSourceOpenChange(true)}
        onOpenQuiz={onOpenQuiz}
        detailsMode={detailsMode}
        onToggleDetails={onToggleDetails}
        reducedMotion={reducedMotion}
        onToggleReducedMotion={onToggleReducedMotion}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        speechAvailable={speechAvailable}
      />

      <NasaSourceDialog open={sourceOpen} onOpenChange={onSourceOpenChange} cycle={vm.cycle} />
    </>
  );
}
