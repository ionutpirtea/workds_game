import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'

type MathQuestion = {
  id: string
  left: number
  right: number
  operator: '+' | '-'
}

const QUESTION_COUNT = 10
const MATH_SCORE_STORAGE_KEY = 'french-math-quiz-scores'

type MathQuizProps = {
  playerName: string
}

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const createAdditionQuestion = (index: number): MathQuestion => {
  const left = randomInt(11, 79)
  const right = randomInt(11, 79)

  return {
    id: `add-${index}`,
    left,
    right,
    operator: '+',
  }
}

const createSubtractionQuestion = (index: number): MathQuestion => {
  const left = randomInt(12, 79)
  const right = randomInt(11, left - 1)

  return {
    id: `sub-${index}`,
    left,
    right,
    operator: '-',
  }
}

const getAnswer = (question: MathQuestion) =>
  question.operator === '+'
    ? question.left + question.right
    : question.left - question.right

function MathQuiz({ playerName }: MathQuizProps) {
  const [seed, setSeed] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [validationState, setValidationState] = useState<
    Record<string, 'correct' | 'incorrect'>
  >({})
  const [awardedCorrect, setAwardedCorrect] = useState<Record<string, boolean>>(
    {},
  )
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, number>>(
    () => {
      if (typeof window === 'undefined') return {}
      const raw = window.localStorage.getItem(MATH_SCORE_STORAGE_KEY)
      if (!raw) return {}
      try {
        return JSON.parse(raw) as Record<string, number>
      } catch {
        return {}
      }
    },
  )

  const activePlayerName = playerName.trim() || 'Joueur'
  const score = scoresByPlayer[activePlayerName] ?? 0

  const additions = useMemo(
    () =>
      Array.from({ length: QUESTION_COUNT }, (_, index) =>
        createAdditionQuestion(index + seed * QUESTION_COUNT),
      ),
    [seed],
  )

  const subtractions = useMemo(
    () =>
      Array.from({ length: QUESTION_COUNT }, (_, index) =>
        createSubtractionQuestion(index + seed * QUESTION_COUNT),
      ),
    [seed],
  )

  const handleAnswerChange = (id: string, value: string) => {
    if (!/^\d*$/.test(value)) return
    setAnswers((current) => ({
      ...current,
      [id]: value,
    }))
  }

  const handleNewQuiz = () => {
    setSeed((current) => current + 1)
    setAnswers({})
    setValidationState({})
    setAwardedCorrect({})
  }

  const handleValidateAnswer = (question: MathQuestion) => {
    const typed = answers[question.id] ?? ''
    if (typed === '') return

    const expected = getAnswer(question)
    const isCorrect = Number(typed) === expected

    setValidationState((current) => ({
      ...current,
      [question.id]: isCorrect ? 'correct' : 'incorrect',
    }))

    if (!isCorrect) return

    confetti({
      particleCount: 110,
      spread: 75,
      startVelocity: 38,
      gravity: 0.95,
      scalar: 0.95,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#22c55e', '#e5e7eb', '#38bdf8', '#fbbf24'],
    })

    if (!awardedCorrect[question.id]) {
      setScoresByPlayer((current) => ({
        ...current,
        [activePlayerName]: (current[activePlayerName] ?? 0) + 1,
      }))
      setAwardedCorrect((current) => ({
        ...current,
        [question.id]: true,
      }))
    }
  }

  useEffect(() => {
    window.localStorage.setItem(
      MATH_SCORE_STORAGE_KEY,
      JSON.stringify(scoresByPlayer),
    )
  }, [scoresByPlayer])

  const renderQuestion = (question: MathQuestion) => {
    const inputValue = answers[question.id] ?? ''
    const isAnswered = inputValue !== ''
    const rowValidation = validationState[question.id]

    return (
      <div
        key={question.id}
        className="flex items-center rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-2 sm:py-2.5 min-h-[58px]"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full pl-2 sm:pl-3">
          <span className="text-[2.35rem] sm:text-[2.9rem] font-extrabold text-slate-100 tracking-wide leading-[0.9]">
            {question.left} {question.operator} {question.right} =
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(event) =>
              handleAnswerChange(question.id, event.target.value.trim())
            }
            className="w-[90px] rounded-lg border border-slate-600 bg-slate-950/80 px-1 py-1.5 text-center text-[2.35rem] sm:text-[2.9rem] font-extrabold text-slate-100 leading-[0.9] focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={`Answer for ${question.left} ${question.operator} ${question.right}`}
          />
          <button
            type="button"
            onClick={() => handleValidateAnswer(question)}
            disabled={!isAnswered}
            className="appearance-none rounded-lg border border-amber-200 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 px-3 py-2 text-sm sm:text-base font-extrabold shadow-[0_6px_16px_rgba(251,191,36,0.4)] hover:from-amber-300 hover:to-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Validation
          </button>

          <span
            className={`min-w-[84px] ml-[20px] text-base sm:text-lg font-bold ${
            rowValidation
              ? rowValidation === 'correct'
                ? 'text-emerald-300'
                : 'font-black'
              : 'text-slate-500'
          }`}
            style={
              rowValidation === 'incorrect'
                ? {
                    color: '#ef4444',
                    fontSize: '20px',
                    fontWeight: 900,
                    animation: 'blinkError 0.8s step-start infinite',
                  }
                : undefined
            }
          >
            {rowValidation
              ? rowValidation === 'correct'
                ? 'Correct'
                : 'Erreur'
              : ''}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-300 tracking-wide">
            Math Quiz
          </h2>
          <div
            className="font-black text-emerald-300 leading-[0.95]"
            style={{ fontSize: 'clamp(2.56rem, 6.4vw, 4.16rem)' }}
          >
            Score: <span className="text-emerald-200 font-black">{score}</span>
          </div>
          <div
            className="font-black text-slate-200 leading-[0.95]"
            style={{ fontSize: 'clamp(1.76rem, 4.16vw, 3.04rem)' }}
          >
            Player: <span className="font-black">{activePlayerName}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewQuiz}
          className="appearance-none rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 px-7 sm:px-9 py-3 sm:py-4 text-lg sm:text-xl font-black shadow-[0_10px_24px_rgba(251,191,36,0.5)] hover:from-amber-300 hover:to-orange-300 transition-colors"
        >
          Nouveau quiz
        </button>
      </div>

      <div className="grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1fr)_20px] gap-4 flex-1 min-h-0 overflow-auto">
        <section className="col-start-2 rounded-2xl border border-sky-700/40 bg-sky-950/20 p-3 sm:p-4">
          <h3 className="text-lg sm:text-xl font-bold text-sky-200 mb-3">Additions</h3>
          <div className="flex flex-col gap-2">
            {additions.map((question) => renderQuestion(question))}
          </div>
        </section>

        <section className="col-start-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-3 sm:p-4">
          <h3 className="text-lg sm:text-xl font-bold text-emerald-200 mb-3">Subtractions</h3>
          <div className="flex flex-col gap-2">
            {subtractions.map((question) => renderQuestion(question))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default MathQuiz
