import { db } from './db'

export async function isLogPendingSync(logId: string): Promise<boolean> {
  const log = await db.logs.where('id').equals(logId).first()
  return log?.sync_status === 'pending' ?? false
}

export async function isVitaminLogPendingSync(logId: string): Promise<boolean> {
  const log = await db.vitamin_logs.where('id').equals(logId).first()
  return log?.sync_status === 'pending' ?? false
}

export async function isGrowthLogPendingSync(logId: string): Promise<boolean> {
  const log = await db.growth_logs.where('id').equals(logId).first()
  return log?.sync_status === 'pending' ?? false
}

