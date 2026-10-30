export type LoginEventType = 'login' | 'signup' | 'demo_access';

export interface LoginNotificationPayload {
  email: string;
  displayName?: string;
  event: LoginEventType;
}

/**
 * Asynchronously triggers a non-blocking background notification to the admin
 * when a user logs in, signs up, or uses the demo fast-pass.
 *
 * Uses `keepalive: true` so the request completes even if the page immediately
 * navigates to /dashboard.
 */
export function triggerLoginNotification(payload: LoginNotificationPayload): void {
  if (typeof window === 'undefined') return;

  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const body = JSON.stringify({
      email: payload.email.trim(),
      displayName: payload.displayName?.trim() || undefined,
      event: payload.event,
      userAgent,
    });

    fetch('/api/auth/notify-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    }).catch((error) => {
      console.warn('Login notification pipeline notice:', error);
    });
  } catch (err) {
    console.warn('Failed to dispatch login notification:', err);
  }
}
