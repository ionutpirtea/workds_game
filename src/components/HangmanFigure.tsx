import { memo } from 'react'
import { motion } from 'framer-motion'

const STAGES = 6

type Props = {
  wrongGuesses: number
  maxWrong: number
}

const HangmanFigure = memo(function HangmanFigure({
  wrongGuesses,
  maxWrong,
}: Props) {
  const ratio = wrongGuesses / maxWrong
  const sockXStart = 42
  const sockSpacing = 43

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative w-[26rem] h-44">
        <svg
          viewBox="0 0 320 210"
          className="w-full h-full text-slate-200"
          aria-hidden="true"
        >
          <line
            x1="14"
            y1="188"
            x2="306"
            y2="188"
            stroke="#8b5a2b"
            strokeWidth="10"
          />
          <line
            x1="22"
            y1="35"
            x2="22"
            y2="188"
            stroke="#8b5a2b"
            strokeWidth="10"
          />
          <line
            x1="298"
            y1="35"
            x2="298"
            y2="188"
            stroke="#8b5a2b"
            strokeWidth="10"
          />
          <line
            x1="22"
            y1="35"
            x2="298"
            y2="35"
            stroke="#1e3a8a"
            strokeWidth="3"
          />

          {Array.from({ length: maxWrong }).map((_, index) => {
            const x = sockXStart + index * sockSpacing

            return (
              <g key={index}>
                <line
                  x1={x}
                  y1="35"
                  x2={x}
                  y2="41"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {wrongGuesses > index && (
                  <motion.text
                    x={x}
                    y="34"
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    initial={{ opacity: 0, y: 28, scale: 0.75 }}
                    animate={{ opacity: 1, y: 34, scale: 1 }}
                    style={{ fontSize: '42px' }}
                  >
                    🧦
                  </motion.text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="text-2xl sm:text-3xl text-slate-100 font-extrabold">
        Chaussettes pendues:{' '}
        <span className="font-extrabold text-sky-300">{wrongGuesses}</span> /{' '}
        {maxWrong}
      </div>

      <div className="relative w-40 h-2 rounded-full overflow-hidden bg-slate-800/80">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-sky-400"
          initial={false}
          animate={{ width: `${Math.max(0, (1 - ratio)) * 100}%` }}
          transition={{ type: 'spring', stiffness: 140, damping: 18 }}
        />
      </div>
    </motion.div>
  )
})

;(HangmanFigure as any).STAGES = STAGES

export default HangmanFigure

