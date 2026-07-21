// Nickname rules: public, unique (case-insensitive), no spaces.
export const NICKNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;

// Strip every space while typing (nicknames never contain spaces).
export function sanitizeNicknameInput(value: string): string {
  return value.replace(/\s/g, '').trim();
}

export function isValidNickname(value: string): boolean {
  return NICKNAME_PATTERN.test(value);
}
