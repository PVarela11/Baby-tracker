'use client'

import { useEffect } from 'react'
import { runMigration } from '@/lib/migration'

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      await runMigration().catch((error) => {
        console.error('Migration failed:', error)
      })
    }

    init()
  }, [])

  return <>{children}</>
}
