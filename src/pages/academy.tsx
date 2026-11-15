import { Link } from 'wouter';
import { Rocket } from 'lucide-react';
import { scoreSummary } from '@/game/scoring';
import { useGame } from '@/state/game';
import { btn, Panel } from '@/components/kit';
import { QUIZ } from '@/content/quiz';
import type { ModuleId } from '@/content/mission';
import { ModuleVisualLesson } from '@/components/visual-lessons';
import { VisualQuizCard } from '@/components/visual-quiz';
import { firstOpenQuizIndex, quizCorrect } from '@/lib/records';

const QUIZ_MODULE: Record<string, ModuleId> = {
  air: 'habitat',
  solar: 'solar',
  water: 'recycler',
  radiation: 'shelter',
  comms: 'comms',
};

export default function Academy() {
  const { game, quiz, quizSaveError, setQuizIndex, submitQuizAnswer, resetQuiz } = useGame();
  const idx = quiz.currentIndex ?? firstOpenQuizIndex(quiz.answers);
  const cur = QUIZ[idx];
  const correct = quizCorrect(quiz);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud-label">Learning Academy · Picture Quiz</p>
          <h1 className="text-3xl font-bold md:text-4xl">Five questions from the outpost</h1>
        </div>
        <Link href="/base" className={btn.ghost} data-testid="link-academy-to-base">
          <Rocket className="h-4 w-4" /> Open on Moon Base Scene
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Panel kicker={`Question ${idx + 1} of 5 · ${cur.topic}`} title={cur.card.title}>
          <VisualQuizCard
            quiz={quiz}
            game={game}
            onSelectQuestion={setQuizIndex}
            onSubmitAnswer={submitQuizAnswer}
            onResetQuiz={resetQuiz}
            quizSaveError={quizSaveError}
            showTeacherKey
          />
        </Panel>

        <div className="space-y-6">
          <Panel kicker="Visual learning card" title={cur.card.title}>
            <div className="space-y-3">
              <ModuleVisualLesson
                id={QUIZ_MODULE[cur.id] ?? 'habitat'}
                mode="standard"
                solar={24}
                backupCharges={1}
                shieldingLevel={1}
                recyclerOn
                greenhouseOn
                commsOn
                cycle={1}
              />
              <p className="text-sm text-dim">{cur.card.body}</p>
            </div>
          </Panel>

          <Panel
            kicker="Quiz score"
            title={quiz.completed ? `${correct} of 5 correct` : `${quiz.answers.filter((a) => a !== null).length} of 5 answered`}
          >
            {quiz.completed ? (
              <div className="space-y-2 text-sm">
                {game && game.status !== 'active' ? (
                  <p>
                    Final Mission and Learning Score:{' '}
                    <span className="font-display text-3xl font-bold text-aqua">
                      {scoreSummary(game, true, correct).value}
                    </span>
                    <span className="text-dim">/100</span>
                  </p>
                ) : (
                  <p className="text-dim">Finish all 5 cycles on the Moon Base to combine this quiz with your mission score.</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-dim">
                <p>Select a picture card and press Check Answer for each question. Unanswered questions stay open without penalty.</p>
                {game && game.status !== 'active' && (
                  <p className="mt-2 font-mono text-xs text-aqua">Provisional Mission Score: {scoreSummary(game, false).value}/90</p>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
