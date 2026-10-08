'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { BabyProfile } from '@/lib/types'
import { addToSyncQueue } from '@/lib/sync-queue'

const LOCAL_KEY = 'baby-tracker:baby-profile'

function readLocal(): BabyProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as BabyProfile) : null
  } catch {
    return null
  }
}

function writeLocal(profile: BabyProfile) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(profile))
}

async function fetchBabyProfile(): Promise<BabyProfile | null> {
  // Initialize from localStorage first
  const localProfile = readLocal()

  try {
    const res = await fetch('/api/baby-profile', { cache: 'no-store' })
    if (!res.ok) {
      console.error('Failed to fetch baby profile from cloud, using local storage')
      return localProfile
    }
    const data = (await res.json()) as BabyProfile
    // If cloud returns empty or fails, use local data
    if (!data || (!data.name && !data.date_of_birth)) {
      return localProfile
    }
    return data
  } catch (error) {
    console.error('Failed to fetch baby profile from cloud, using local storage:', error)
    return localProfile
  }
}

async function request(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Request failed: ${res.status} - ${errorText}`)
    }
    return res
  } catch (error) {
    console.error('Request failed:', error)
    throw error
  }
}

export function useBabyProfile() {
  const { data, error, isLoading, mutate } = useSWR<BabyProfile | null>('baby-profile', fetchBabyProfile, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  const profile = data ?? null
  const [syncError, setSyncError] = useState<string | null>(null)

  async function updateProfile(profile: BabyProfile) {
    // Save to localStorage immediately (local-first)
    writeLocal(profile)

    await mutate(
      async () => {
        try {
          const res = await request('/api/baby-profile', { method: 'POST', body: JSON.stringify(profile) })
          const saved = (await res.json()) as BabyProfile
          setSyncError(null)
          // Update localStorage with server response
          writeLocal(saved)
          return saved
        } catch (error) {
          console.error('Failed to update baby profile on cloud, using local storage:', error)
          setSyncError('Saved locally - will sync when online')
          // Add to sync queue with new format
          addToSyncQueue({
            type: 'update_profile',
            endpoint: '/api/baby-profile',
            payload: profile,
            action: 'POST',
          })
          // Data already saved locally above
          return profile
        }
      },
      {
        optimisticData: profile,
        rollbackOnError: true,
        revalidate: false,
      },
    )
  }

  return { profile, error, isLoading, updateProfile, syncError, mutate }
}

export type BabyProfileApi = ReturnType<typeof useBabyProfile>
