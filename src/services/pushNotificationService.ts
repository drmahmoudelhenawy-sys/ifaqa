import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { APP_ID } from '../../constants';

export interface PushNotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

type NotificationActionCallback = (actionData: any) => void;

class PushNotificationService {
  private currentToken: string | null = null;
  private actionCallback: NotificationActionCallback | null = null;
  private isInitialized = false;

  /**
   * Check if native push notifications are supported on the current device
   */
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Register a callback to execute when the user taps on a notification
   */
  public onNotificationTapped(callback: NotificationActionCallback) {
    this.actionCallback = callback;
  }

  /**
   * Request permissions and register device for Push Notifications
   */
  public async init(userId?: string): Promise<string | null> {
    if (!this.isNative()) {
      console.log('Push notifications: Running on Web/PWA, native FCM listeners skipped.');
      return null;
    }

    if (this.isInitialized) {
      if (userId && this.currentToken) {
        await this.syncTokenWithFirestore(this.currentToken, userId);
      }
      return this.currentToken;
    }

    try {
      // 1. Check existing permission status
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission was not granted:', permStatus.receive);
        return null;
      }

      // 2. Remove any previous listeners to avoid duplicates
      await PushNotifications.removeAllListeners();

      // 3. Register listeners
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log(" FCM Registration Token obtained:", token.value);
        this.currentToken = token.value;
        try {
          localStorage.setItem('ifaqa_fcm_token', token.value);
        } catch {}

        await this.syncTokenWithFirestore(token.value, userId);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error(" FCM Registration Error:", error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log(" Push Notification received in foreground:", notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log(" User tapped push notification:", action.notification);
        const data = action.notification.data || {};
        if (this.actionCallback) {
          this.actionCallback(data);
        }
      });

      // 4. Trigger native FCM registration safely
      try {
        await PushNotifications.register();
        this.isInitialized = true;
      } catch (regError) {
        console.warn('Native PushNotifications.register safely handled error:', regError);
      }

      return this.currentToken;
    } catch (err) {
      console.error('Failed to initialize push notifications:', err);
      return null;
    }
  }

  /**
   * Store device token in Firestore for broadcast and topic targeting
   */
  public async syncTokenWithFirestore(token: string, userId?: string) {
    try {
      const tokenDocId = token.replace(/[/\\.#$\[\]]/g, '_');
      const tokenRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'fcm_tokens', tokenDocId);

      await setDoc(tokenRef, {
        token,
        userId: userId || 'anonymous',
        platform: Capacitor.getPlatform(),
        topic: 'all_users',
        active: true,
        updatedAt: serverTimestamp(),
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          language: typeof navigator !== 'undefined' ? navigator.language : 'ar'
        }
      }, { merge: true });

      console.log(" Push Token successfully synced with Firestore for topic: all_users");
    } catch (err) {
      console.warn('Could not sync push token with Firestore:', err);
    }
  }

  public getToken(): string | null {
    if (this.currentToken) return this.currentToken;
    try {
      return localStorage.getItem('ifaqa_fcm_token');
    } catch {
      return null;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
