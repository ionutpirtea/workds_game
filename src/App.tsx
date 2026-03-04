import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Volume2, VolumeX } from 'lucide-react'
import HangmanFigure from './components/HangmanFigure'
import Keyboard from './components/Keyboard'
import StatusBar from './components/StatusBar'

const normalizeLetter = (ch: string) =>
  ch
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

const MAX_WRONG = (HangmanFigure as any).STAGES ?? 6

const SOUND_URLS = {
  click: 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
  wrong: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-bass-buzz-948.mp3',
  win: 'https://assets.mixkit.co/sfx/preview/mixkit-video-game-win-2016.mp3',
  lose: 'https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3',
}

type Status = 'playing' | 'win' | 'lose'
type WordEntry = { word: string; hint: string }

const SCORE_STORAGE_KEY = 'french-hangman-scores'
const LAST_PLAYER_STORAGE_KEY = 'french-hangman-last-player'

const getLastPlayerName = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(LAST_PLAYER_STORAGE_KEY) ?? ''
}

const parseWordsCsv = (csvText: string): WordEntry[] => {
  const seen = new Set<string>()
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (rows.length === 0) return []

  const dataRows =
    rows[0].toLowerCase().startsWith('word,') ||
    rows[0].toLowerCase().startsWith('mot,')
      ? rows.slice(1)
      : rows

  const result: WordEntry[] = []
  for (const row of dataRows) {
    const separatorIndex = row.indexOf(',')
    if (separatorIndex < 0) continue
    const word = row.slice(0, separatorIndex).trim()
    const hint = row.slice(separatorIndex + 1).trim()

    if (!word || !hint || word.length < 6) continue
    const key = word.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    result.push({ word, hint })
  }

  return result
}

function App() {
  const [word, setWord] = useState('')
  const [normalizedWord, setNormalizedWord] = useState('')
  const [hint, setHint] = useState('')
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(
    () => new Set(),
  )
  const [wrongGuesses, setWrongGuesses] = useState(0)
  const [status, setStatus] = useState<Status>('playing')
  const [soundOn, setSoundOn] = useState(true)
  const [playerName, setPlayerName] = useState(() => getLastPlayerName())
  const [nameInput, setNameInput] = useState(() => getLastPlayerName())
  const [wordsBank, setWordsBank] = useState<WordEntry[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [scoresByPlayer, setScoresByPlayer] = useState<Record<string, number>>(
    () => {
      if (typeof window === 'undefined') return {}
      const raw = window.localStorage.getItem(SCORE_STORAGE_KEY)
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

  const clickAudioRef = useRef<HTMLAudioElement | null>(null)
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null)
  const winAudioRef = useRef<HTMLAudioElement | null>(null)
  const loseAudioRef = useRef<HTMLAudioElement | null>(null)
  const encouragementAnnouncedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    clickAudioRef.current = new Audio(SOUND_URLS.click)
    wrongAudioRef.current = new Audio(SOUND_URLS.wrong)
    winAudioRef.current = new Audio(SOUND_URLS.win)
    loseAudioRef.current = new Audio(SOUND_URLS.lose)

    if (clickAudioRef.current) clickAudioRef.current.volume = 0.4
    if (wrongAudioRef.current) wrongAudioRef.current.volume = 0.45
    if (winAudioRef.current) winAudioRef.current.volume = 1
    if (loseAudioRef.current) loseAudioRef.current.volume = 0.6
  }, [])

  const playSound = useCallback(
    (type: keyof typeof SOUND_URLS) => {
      if (!soundOn) return
      const map: Record<string, HTMLAudioElement | null> = {
        click: clickAudioRef.current,
        wrong: wrongAudioRef.current,
        win: winAudioRef.current,
        lose: loseAudioRef.current,
      }
      const audio = map[type]
      if (!audio) return
      audio.currentTime = 0
      void audio.play().catch(() => {})
    },
    [soundOn],
  )

  const speakFrenchText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (!text.trim()) return

    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.95

    const frenchVoice = synth
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith('fr'))
    if (frenchVoice) utterance.voice = frenchVoice

    synth.cancel()
    synth.speak(utterance)
  }, [])

  const speakHint = useCallback(
    (hintText: string) => {
      speakFrenchText(`Indice: ${hintText}`)
    },
    [speakFrenchText],
  )

  const startRoundForEntry = useCallback((entry: WordEntry) => {
    const trimmed = entry.word.trim()
    setWord(trimmed)
    setHint(entry.hint)
    const normalized = Array.from(trimmed)
      .map((c) => normalizeLetter(c))
      .join('')
    setNormalizedWord(normalized)

    // Pre-reveal first and last letters so they count as "guessed"
    const autoGuessed = new Set<string>()
    const chars = Array.from(trimmed)
    const lastIndex = chars.length - 1
    chars.forEach((ch, index) => {
      const norm = normalizeLetter(ch)
      if (/[A-Z]/.test(norm) && (index === 0 || index === lastIndex)) {
        autoGuessed.add(norm)
      }
    })
    setGuessedLetters(autoGuessed)
    setWrongGuesses(0)
    setStatus('playing')
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadWords = async () => {
      try {
        const response = await fetch('/secret_words.csv', { cache: 'no-store' })
        const content = await response.text()
        if (isCancelled) return

        const parsedWords = parseWordsCsv(content)
        if (parsedWords.length === 0) return

        setWordsBank(parsedWords)
        setCurrentWordIndex(0)
        startRoundForEntry(parsedWords[0])
      } catch {
      }
    }

    void loadWords()

    return () => {
      isCancelled = true
    }
  }, [startRoundForEntry])

  useEffect(() => {
    window.localStorage.setItem(
      SCORE_STORAGE_KEY,
      JSON.stringify(scoresByPlayer),
    )
  }, [scoresByPlayer])

  useEffect(() => {
    window.localStorage.setItem(LAST_PLAYER_STORAGE_KEY, playerName)
  }, [playerName])

  useEffect(() => {
    speakHint(hint)
  }, [hint, speakHint])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const uniqueLetters = useMemo(() => {
    const letters = new Set<string>()
    for (const ch of normalizedWord) {
      if (/[A-Z]/.test(ch)) letters.add(ch)
    }
    return letters
  }, [normalizedWord])

  const handleGuess = useCallback(
    (letter: string) => {
      if (status !== 'playing') return

      const upper = letter.toUpperCase()
      if (guessedLetters.has(upper)) return

      const newGuessed = new Set(guessedLetters)
      newGuessed.add(upper)

      const isCorrect = normalizedWord.includes(upper)
      if (isCorrect) {
        playSound('click')
      } else {
        playSound('wrong')
      }

      let newWrongCount = wrongGuesses
      if (!isCorrect) {
        newWrongCount = Math.min(wrongGuesses + 1, MAX_WRONG)
      }

      let newStatus: Status = 'playing'
      const allGuessed = Array.from(uniqueLetters).every((l) =>
        newGuessed.has(l),
      )

      if (allGuessed) {
        newStatus = 'win'
        setScoresByPlayer((current) => {
          const next = { ...current }
          next[activePlayerName] = (next[activePlayerName] ?? 0) + 1
          return next
        })
      } else if (newWrongCount >= MAX_WRONG) {
        newStatus = 'lose'
        setScoresByPlayer((current) => {
          const next = { ...current }
          const currentScore = next[activePlayerName] ?? 0
          next[activePlayerName] = Math.max(0, currentScore - 1)
          return next
        })
      }

      setGuessedLetters(newGuessed)
      setWrongGuesses(newWrongCount)
      setStatus(newStatus)
    },
    [
      status,
      guessedLetters,
      normalizedWord,
      wrongGuesses,
      uniqueLetters,
      playSound,
      activePlayerName,
    ],
  )

  const handleRestart = useCallback(() => {
    if (wordsBank.length === 0) return
    const nextIndex = (currentWordIndex + 1) % wordsBank.length
    setCurrentWordIndex(nextIndex)
    startRoundForEntry(wordsBank[nextIndex])
  }, [wordsBank, currentWordIndex, startRoundForEntry])

  const handleSavePlayerName = useCallback(() => {
    const cleaned = nameInput.trim()
    setPlayerName(cleaned)
    setNameInput(cleaned)
  }, [nameInput])

  useEffect(() => {
    if (status === 'win') {
      playSound('win')
      confetti({
        particleCount: 200,
        spread: 100,
        startVelocity: 45,
        gravity: 0.9,
        scalar: 1.2,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#22c55e', '#e5e7eb', '#38bdf8', '#fbbf24'],
      })
    } else if (status === 'lose') {
      playSound('lose')
    }
  }, [status, playSound])

  useEffect(() => {
    if (status === 'playing' && wrongGuesses >= MAX_WRONG) {
      setStatus('lose')
    }
  }, [status, wrongGuesses])

  useEffect(() => {
    if (score !== 5) return

    const key = activePlayerName.trim().toLowerCase()
    if (encouragementAnnouncedRef.current.has(key)) return

    speakFrenchText(
      `Bon travail ${activePlayerName}, tu te débrouilles très bien !`,
    )
    encouragementAnnouncedRef.current.add(key)
  }, [score, activePlayerName, speakFrenchText])

  const displayChars = useMemo(
    () => {
      if (!word) return []
      const chars = Array.from(word)
      const lastIndex = chars.length - 1

      return chars.map((char, index) => {
        const norm = normalizeLetter(char)
        const isAlpha = /[A-Z]/.test(norm)

        const isEdge = index === 0 || index === lastIndex
        const revealed =
          !isAlpha ||
          isEdge ||
          guessedLetters.has(norm) ||
          status !== 'playing'

        return {
          id: `${char}-${index}`,
          char: char.toUpperCase(),
          revealed,
        }
      })
    },
    [word, guessedLetters, status],
  )

  const wrongCountText = `${wrongGuesses} / ${MAX_WRONG}`

  return (
    <div className="h-full w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-2 py-1">
      <motion.div
        className="w-full h-full max-w-none rounded-none border-0 bg-slate-900/65 backdrop-blur-xl px-3 sm:px-5 py-2 sm:py-3 flex flex-col items-center gap-2 overflow-hidden"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <div className="w-full flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-semibold">
              <span className="text-sky-400">Le jeu des chaussettes</span>
            </h1>
            <span className="mt-1 text-2xl sm:text-3xl font-extrabold text-emerald-300">
              Score : <span className="text-emerald-200 font-black">{score}</span>
            </span>
            <div className="mt-2 w-full max-w-xs">
              <label
                htmlFor="playerName"
                className="block text-xs sm:text-sm uppercase tracking-[0.15em] text-slate-300 mb-1"
              >
                Nom du joueur
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="playerName"
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Entrez votre nom"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/90 text-slate-100 px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSavePlayerName}
                  className="appearance-none rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-500 to-green-400 text-white px-4 py-2 text-xs sm:text-sm font-extrabold shadow-[0_8px_20px_rgba(34,197,94,0.45)] hover:from-emerald-400 hover:to-green-300 transition-colors"
                >
                  Sauver
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <button
              onClick={() => setSoundOn((v) => !v)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-700/80 bg-slate-900/80 hover:border-sky-400/80 text-slate-200 hover:text-sky-300 transition-colors"
              aria-label={soundOn ? 'Désactiver le son' : 'Activer le son'}
            >
              {soundOn ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 w-full flex-1 min-h-0">
          <div className="flex flex-col items-center gap-1">
            {playerName.trim() && (
              <div className="px-4 py-1.5 rounded-full border border-emerald-800/80 bg-emerald-950/40 text-emerald-700 text-lg sm:text-2xl font-extrabold tracking-[0.08em] shadow-lg">
                Joueur:{' '}
                <span
                  className="font-black"
                  style={{
                    color: '#166534',
                    fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  }}
                >
                  {playerName.trim()}
                </span>
              </div>
            )}
            <HangmanFigure wrongGuesses={wrongGuesses} maxWrong={MAX_WRONG} />

            <button
              onClick={handleRestart}
              style={{ minHeight: '56px', fontSize: '1.35rem', lineHeight: 1.1 }}
              className="appearance-none inline-flex items-center justify-center min-w-[170px] sm:min-w-[205px] px-6 py-3 sm:px-7 sm:py-3 font-bold rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-[0_10px_24px_rgba(249,115,22,0.55)] hover:from-orange-400 hover:to-amber-300 transition-colors"
            >
              Mot suivant
            </button>

            <div className="text-lg sm:text-2xl uppercase tracking-[0.18em] text-slate-100 font-semibold">
              Erreurs:{' '}
              <span className="font-semibold text-sky-300">
                {wrongCountText}
              </span>
            </div>
          </div>

          <motion.div
            className="w-full flex flex-col items-center gap-0 flex-1 min-h-0"
            animate={
              status === 'win'
                ? {
                    y: [0, -6, 0],
                    scale: [1, 1.03, 1],
                  }
                : { y: 0, scale: 1 }
            }
            transition={
              status === 'win'
                ? {
                    duration: 0.55,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                  }
                : {}
            }
          >
            <div className="flex items-center justify-center">
              <div className="text-xl sm:text-2xl uppercase tracking-[0.25em] text-slate-100 font-bold">
                Mot mystère
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {displayChars.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-20 sm:w-24 h-20 sm:h-24 rounded-2xl border flex items-center justify-center text-[3.2rem] sm:text-[4rem] font-extrabold tracking-[0.2em] sm:tracking-[0.25em] ${
                      item.revealed
                        ? 'border-slate-500/80 bg-slate-900/90'
                        : 'border-slate-700/90 bg-slate-900/40'
                    }`}
                  >
                    {item.revealed ? item.char : '_'}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-1 flex items-center justify-center gap-3 flex-wrap">
              <p className="text-lg sm:text-xl text-slate-100 text-center max-w-2xl font-semibold">
                Indice : {hint}
              </p>
              <button
                type="button"
                onClick={() => speakHint(hint)}
                className="appearance-none inline-flex items-center gap-2 px-5 py-2.5 text-base sm:text-lg font-extrabold rounded-xl border border-amber-200 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-[0_8px_20px_rgba(251,191,36,0.45)] hover:from-amber-300 hover:to-orange-300 transition-colors"
              >
                <Volume2 className="w-6 h-6" />
                Lire l’indice
              </button>
            </div>
          </motion.div>

          <div className="w-full mt-1 shrink-0 pb-1">
            <Keyboard
              onGuess={handleGuess}
              disabledLetters={guessedLetters}
              isGameOver={status !== 'playing'}
            />
          </div>
        </div>

        <StatusBar
          status={status}
          word={word}
          playerName={activePlayerName}
          onRestart={handleRestart}
        />

        <div className="w-full text-[10px] text-slate-500 text-center mt-0">
          Les lettres avec accents sont acceptées mais devinées via leurs
          équivalents: é → E, ç → C, etc.
        </div>
      </motion.div>
    </div>
  )
}

export default App

