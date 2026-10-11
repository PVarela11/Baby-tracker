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

  // Trim both sides before comparison
  const trimmedPasscode = passcode.trim()
  const trimmedExpected = expected.trim()

  // Constant-time comparison to prevent timing attacks
  if (trimmedPasscode.length !== trimmedExpected.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < trimmedPasscode.length; i++) {
    result |= trimmedPasscode.charCodeAt(i) ^ trimmedExpected.charCodeAt(i)
  }

  return result === 0
}
