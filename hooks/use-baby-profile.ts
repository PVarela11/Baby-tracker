'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import type { BabyProfile } from '@/lib/types'
import { db, deviceId, type DbBabyProfile } from '@/lib/db'

function dbToBabyProfile(dbProfile: DbBabyProfile | undefined): BabyProfile | null {
  if (!dbProfile) return null
  return {
    name: dbProfile.name,
    date_of_birth: dbProfile.date_of_birth,
    gender: dbProfile.gender,
  }
}

export function useBabyProfile() {
  const profile = useLiveQuery(
    () => db.baby_profile.get(1).then(dbToBabyProfile),
    [],
    null
  )

  async function updateProfile(profile: BabyProfile) {
    const now = new Date().toISOString()

    await db.baby_profile.put(
      {
        id: 1,
        name: profile.name,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        updated_at: now,
        deleted_at: null,
        device_id: deviceId,
        user_id: null,
        server_updated_at: null,
        sync_status: 'pending',
      },
      1
    )
  }

  return { profile: profile ?? null, error: null, isLoading: false, updateProfile, syncError: null, mutate: () => {} }
}

export type BabyProfileApi = ReturnType<typeof useBabyProfile>
