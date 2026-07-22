/*
 * SECTION: Password-recovery gate
 * WHAT: Lets RootNavigator keep the user on reset-password while a recovery session is active.
 * HOW: Flag set when deep link / PASSWORD_RECOVERY fires; cleared after password update or cancel.
 * INPUT: boolean from auth callback / auth listener
 * OUTPUT: isPasswordRecoveryPending() for navigation guards
 */
let pending = false;

export function setPasswordRecoveryPending(value: boolean) {
  pending = value;
}

export function isPasswordRecoveryPending(): boolean {
  return pending;
}
