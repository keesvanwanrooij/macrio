/*
 * SECTION: Sentry crash / error reporting
 * WHAT: Optional Sentry init for JS crashes and captureException helpers.
 * HOW: If EXPO_PUBLIC_SENTRY_DSN is set, init SDK with no default PII and scrub
 *      emails / auth-looking data in beforeSend. Missing DSN = no-op (OSS clones OK).
 * INPUT: EXPO_PUBLIC_SENTRY_DSN env; Error / message from app code
 * OUTPUT: Events in Sentry when enabled; isSentryEnabled for UI smoke test
 */
import * as Sentry from '@sentry/react-native';

const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();

export const isSentryEnabled = dsn.length > 0;

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  // Drop obvious email strings from breadcrumbs / extra
  const scrubText = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    if (value.includes('@') && value.includes('.')) return '[filtered]';
    if (/bearer\s+/i.test(value) || /eyJ[a-zA-Z0-9_-]+\./.test(value)) return '[filtered]';
    return value;
  };

  if (event.request?.headers) {
    const headers = { ...event.request.headers };
    for (const key of Object.keys(headers)) {
      if (/authorization|cookie|token/i.test(key)) {
        headers[key] = '[filtered]';
      }
    }
    event.request.headers = headers;
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }

  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      event.extra[key] = scrubText(event.extra[key]);
    }
  }

  return event;
}

if (isSentryEnabled) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}

export function captureException(error: unknown): string | undefined {
  if (!isSentryEnabled) return undefined;
  return Sentry.captureException(error);
}

export function captureMessage(message: string): string | undefined {
  if (!isSentryEnabled) return undefined;
  return Sentry.captureMessage(message);
}

export { Sentry };
