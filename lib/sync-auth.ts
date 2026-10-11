import 'server-only'

export function checkSyncPasscode(request: Request): boolean {
  const passcode = request.headers.get('x-sync-passcode')
  const expected = process.env.SYNC_PASSCODE

  if (!expected) {
    console.error('SYNC_PASSCODE not configured')
    return false
  }

  if (!passcode) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (passcode.length !== expected.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < passcode.length; i++) {
    result |= passcode.charCodeAt(i) ^ expected.charCodeAt(i)
  }

  return result === 0
}
