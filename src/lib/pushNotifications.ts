// Real Web Push Notification Service for DIGIZORT
// Supports Service Worker, background push notifications, and native browser alerts
// Fully respects user preferences (NO spam on page load)

const OFFICIAL_DIGIZORT_LOGO =
  'https://i.postimg.cc/mgr8Ptsv/Chat-GPT-Image-Jul-31-2026-08-44-25-PM.png';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requestId?: string;
  data?: Record<string, any>;
}

class PushNotificationManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
      this.initServiceWorker();
    }
  }

  /**
   * Initializes and registers the service worker in the background
   */
  private async initServiceWorker() {
    if (!this.isSupported) return;
    try {
      // Register the service worker
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      this.swRegistration = reg;
      console.log('[Web Push] Service Worker registered with scope:', reg.scope);
    } catch (err) {
      console.warn('[Web Push] Service worker registration notice:', err);
    }
  }

  /**
   * Returns current notification permission state
   */
  public getPermissionStatus(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
  }

  public getPermission(): NotificationPermissionState {
    return this.getPermissionStatus();
  }

  /**
   * Requests permission politely from the user when they click an enable button
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Send a welcome test notification
        this.dispatchLocalNotification({
          title: 'DIGIZORT Notifications Enabled',
          body: 'You will now receive real-time updates on orders, payments, and supplier offers.',
          tag: 'digizort-welcome',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Web Push] Error requesting notification permission:', err);
      return false;
    }
  }

  /**
   * Dispatches a native browser notification (foreground or background via Service Worker)
   */
  public async dispatchLocalNotification(payload: PushPayload): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    const title = payload.title || 'DIGIZORT Alert';
    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || OFFICIAL_DIGIZORT_LOGO,
      badge: payload.badge || OFFICIAL_DIGIZORT_LOGO,
      tag: payload.tag || `digizort-${Date.now()}`,
      data: {
        url: payload.url || window.location.origin,
        requestId: payload.requestId,
        ...payload.data,
      },
    };

    // Try service worker notification first (better background & mobile support)
    if (this.swRegistration && 'showNotification' in this.swRegistration) {
      try {
        await this.swRegistration.showNotification(title, options);
        return true;
      } catch (e) {
        console.warn('[Web Push] SW showNotification fallback to new Notification:', e);
      }
    }

    // Fallback to standard Window Notification
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        if (payload.url) {
          try {
            window.location.href = payload.url;
          } catch {}
        }
        notif.close();
      };
      return true;
    } catch (e) {
      console.error('[Web Push] Failed to trigger notification:', e);
      return false;
    }
  }
}

export const pushManager = new PushNotificationManager();
