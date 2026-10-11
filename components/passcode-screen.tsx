'use client'

import { useState } from 'react'
import { Lock, X } from 'lucide-react'
import { getSyncEngine } from '@/lib/sync-engine'
import { cn } from '@/lib/utils'

interface PasscodeScreenProps {
  onComplete: () => void
}

export function PasscodeScreen({ onComplete }: PasscodeScreenProps) {
  const [passcode, setPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')

  const syncEngine = getSyncEngine()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (step === 'enter') {
      if (passcode.length < 4) {
        setError('Passcode must be at least 4 characters')
        return
      }
      setStep('confirm')
    } else {
      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match')
        return
      }
      syncEngine.setPasscode(passcode)
      onComplete()
    }
  }

  const handleSkip = () => {
    // Allow skipping - user can set passcode later in settings
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border bg-card p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/20">
              <Lock className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Family Passcode</h2>
              <p className="text-sm text-muted-foreground">
                {step === 'enter' ? 'Set a passcode to sync across devices' : 'Confirm your passcode'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Skip"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="passcode" className="mb-2 block text-sm font-medium">
              {step === 'enter' ? 'Passcode' : 'Confirm passcode'}
            </label>
            <input
              id="passcode"
              type="password"
              value={step === 'enter' ? passcode : confirmPasscode}
              onChange={(e) => (step === 'enter' ? setPasscode(e.target.value) : setConfirmPasscode(e.target.value))}
              placeholder="Enter passcode"
              className="w-full rounded-xl border bg-secondary px-4 py-3 text-base"
              autoFocus
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {step === 'confirm' && (
              <button
                type="button"
                onClick={() => {
                  setStep('enter')
                  setConfirmPasscode('')
                  setError('')
                }}
                className="h-12 flex-1 rounded-xl bg-secondary font-medium text-secondary-foreground"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className={cn(
                'h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground',
                step === 'confirm' && 'flex-[2]'
              )}
            >
              {step === 'enter' ? 'Continue' : 'Set passcode'}
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            You can skip this and set it later in settings. Your data will still be saved locally.
          </p>
        </form>
      </div>
    </div>
  )
}
