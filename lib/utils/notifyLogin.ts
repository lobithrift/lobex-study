export type LoginEventType = 'login' | 'signup' | 'demo_access';

export interface LoginNotificationPayload {
  email: string;
  displayName?: string;
  event: LoginEventType;
}

/**
 * Asynchronously triggers a notification to the admin
 * when a user logs in, signs up, or uses the demo fast-pass.
 *
 * Awaited before router.push so the browser doesn't abort the HTTP request
 * during client-side navigation. Includes a 2.5s timeout fail-safe so users are
 * never kept waiting.
 */
export async function triggerLoginNotification(payload: LoginNotificationPayload): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const body = JSON.stringify({
      email: payload.email.trim(),
      displayName: payload.displayName?.trim() || undefined,
      event: payload.event,
      userAgent,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('/api/auth/notify-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('Login notification pipeline status:', res.status);
    }
  } catch (err) {
    // Fail-safe: never block authentication even on network hitches
    console.warn('Login notification dispatch note:', err);
  }
}
