import { memo } from 'react'
import { motion } from 'framer-motion'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

type Props = {
  onGuess: (letter: string) => void
  disabledLetters: Set<string>
  isGameOver: boolean
}

const Keyboard = memo(function Keyboard({
  onGuess,
  disabledLetters,
  isGameOver,
}: Props) {
  return (
    <div className="grid grid-cols-6 gap-1.5 w-full max-w-none">
      {LETTERS.map((letter) => {
        const disabled = disabledLetters.has(letter) || isGameOver
        return (
          <motion.button
            key={letter}
            data-keyboard-letter="true"
            whileTap={!disabled ? { scale: 0.9 } : {}}
            whileHover={!disabled ? { y: -1 } : {}}
            onClick={() => !disabled && onGuess(letter)}
            disabled={disabled}
            style={{ height: 'clamp(3.2rem, 5.6vh, 3.9rem)' }}
            className={`rounded-xl text-2xl sm:text-3xl leading-none font-extrabold tracking-wide border transition-colors ${
              disabled
                ? 'bg-slate-800/70 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900/60 border-slate-700 text-slate-100 hover:bg-sky-500/20 hover:border-sky-400'
            }`}
          >
            {letter}
          </motion.button>
        )
      })}
    </div>
  )
})

export default Keyboard

