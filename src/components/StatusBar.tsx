import { motion, AnimatePresence } from 'framer-motion'
import { PartyPopper, Skull, RotateCw } from 'lucide-react'

type Props = {
  status: 'playing' | 'win' | 'lose'
  word: string
  playerName: string
  onRestart: () => void
}

function StatusBar({ status, word, playerName, onRestart }: Props) {
  const isWin = status === 'win'
  const isLose = status === 'lose'

  return (
    <AnimatePresence>
      {(isWin || isLose) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className={`mt-5 w-full max-w-lg rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
            isWin
              ? 'bg-emerald-500/10 border-emerald-400/60 text-emerald-50'
              : 'bg-rose-500/10 border-rose-400/60 text-rose-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isWin ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              }`}
            >
              {isWin ? (
                <PartyPopper className="w-5 h-5" />
              ) : (
                <Skull className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.18em] font-semibold opacity-80">
                {isWin ? 'Victoire' : 'Défaite'}
              </span>
              <span className="text-sm">
                {isWin ? (
                  <>
                    Contratulations{' '}
                    <span className="font-semibold underline decoration-dotted">
                      {playerName}
                    </span>
                    {' !'}
                  </>
                ) : (
                  <>
                    Tu as fait 6 erreurs. Le mot était{' '}
                    <span className="font-semibold underline decoration-dotted">
                      {word}
                    </span>
                    .
                  </>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/90 text-slate-950 text-xs font-semibold px-3 py-1.5 shadow-sm hover:bg-sky-400 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Rejouer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default StatusBar

