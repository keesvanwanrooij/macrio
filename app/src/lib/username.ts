/*
 * SECTION: Username rules (client)
 * WHAT: Shared format check for signup and Settings username change.
 * HOW: Letters, digits, hyphen only; length 5–30. Sanitize strips other chars while typing.
 * INPUT: raw username string from a TextInput
 * OUTPUT: sanitized string; isValidUsername → true/false
 * NOTE: DB CHECK stays looser (e.g. min 2) so founder/SQL can still insert short names.
 */
export const USERNAME_MIN = 5;
export const USERNAME_MAX = 30;

/** App-facing usernames: letters, numbers, hyphen; 5–30 chars. No underscore or spaces. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9-]{5,30}$/;

// Keep only allowed characters while the user types (spaces, _, etc. never appear).
export function sanitizeUsernameInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, '');
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}
