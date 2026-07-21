// Username rules: public, unique (case-insensitive), no spaces.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{2,30}$/;

// Strip every space while typing (usernames never contain spaces).
export function sanitizeUsernameInput(value: string): string {
  return value.replace(/\s/g, '').trim();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
