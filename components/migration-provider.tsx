'use client'

import { useEffect } from 'react'
import { runMigration } from '@/lib/migration'
import { testDeletedAtFiltering } from '@/lib/db-test'

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      await runMigration().catch((error) => {
        console.error('Migration failed:', error)
      })

      // Run dev-only test
      await testDeletedAtFiltering().catch((error) => {
        console.error('db-test failed:', error)
      })
    }

    init()
  }, [])

  return <>{children}</>
}
