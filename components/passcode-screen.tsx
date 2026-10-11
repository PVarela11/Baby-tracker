'use client'

import { useState } from 'react'
import { Lock, X, CloudOff } from 'lucide-react'
import { getSyncEngine } from '@/lib/sync-engine'
import { cn } from '@/lib/utils'

interface PasscodeScreenProps {
  onComplete: () => void
}

export function PasscodeScreen({ onComplete }: PasscodeScreenProps) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const syncEngine = getSyncEngine()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedPasscode = passcode.trim()
    if (trimmedPasscode.length < 4) {
      setError('Passcode must be at least 4 characters')
      return
    }

    // If online, verify against server
    if (navigator.onLine) {
      setIsVerifying(true)
      try {
        const response = await fetch('/api/sync/pull', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-passcode': trimmedPasscode,
          },
          body: JSON.stringify({}),
        })

        if (!response.ok) {
          setError('Wrong passcode')
          setIsVerifying(false)
          return
        }
      } catch (err) {
        // Network error - accept passcode but will verify on next sync
        console.error('Passcode verification failed, accepting anyway:', err)
      }
      setIsVerifying(false)
    }

    syncEngine.setPasscode(trimmedPasscode)
    onComplete()
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
                {navigator.onLine ? 'Set a passcode to sync across devices' : 'Set a passcode (will verify when online)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip"
            className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="passcode" className="mb-2 block text-sm font-medium">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              className="w-full rounded-xl border bg-secondary px-4 py-3 text-base"
              autoFocus
              disabled={isVerifying}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="h-12 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isVerifying ? 'Verifying…' : 'Set passcode'}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {!navigator.onLine && (
              <span className="flex items-center justify-center gap-1">
                <CloudOff className="size-3" />
                Offline - passcode will be verified when you reconnect
              </span>
            )}
            {navigator.onLine && 'You can skip this and set it later in settings.'}
          </p>
        </form>
      </div>
    </div>
  )
}
