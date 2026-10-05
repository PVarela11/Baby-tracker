'use client'

import useSWR from 'swr'
import type { BabyProfile } from '@/lib/types'

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
  const res = await fetch('/api/baby-profile', { cache: 'no-store' })
  if (!res.ok) {
    console.error('Failed to fetch baby profile from cloud, using local storage')
    return readLocal()
  }
  const data = (await res.json()) as BabyProfile
  return data
}

async function request(url: string, init: RequestInit) {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
    if (!res.ok) throw new Error('Request failed')
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

  async function updateProfile(profile: BabyProfile) {
    await mutate(
      async () => {
        try {
          const res = await request('/api/baby-profile', { method: 'POST', body: JSON.stringify(profile) })
          return (await res.json()) as BabyProfile
        } catch (error) {
          console.error('Failed to update baby profile on cloud, falling back to local:', error)
          writeLocal(profile)
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

  return { profile, error, isLoading, updateProfile }
}

export type BabyProfileApi = ReturnType<typeof useBabyProfile>
