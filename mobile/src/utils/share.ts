import { Platform, Share } from 'react-native';

export interface ShareContent {
  title: string;
  message: string;
  url?: string;
}

export interface ShareResult {
  success: boolean;
  action?: 'shared' | 'copied' | 'dismissed';
}

/**
 * Platform branch for sharing habit streaks and progress.
 * Uses Platform.select to guarantee:
 * - Native (iOS/Android) invokes the native OS sharing sheet via React Native's Share.share.
 * - Web invokes navigator.share (or falls back to navigator.clipboard).
 * - Zero web-only APIs (window, navigator, document) leak into the native execution path.
 */
export const shareProgress = async ({ title, message, url = '' }: ShareContent): Promise<ShareResult> => {
  const handler = Platform.select({
    web: async (): Promise<ShareResult> => {
      // Guarded browser APIs strictly isolated to the web branch
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title,
            text: message,
            url: url || window.location.href,
          });
          return { success: true, action: 'shared' };
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            return { success: false, action: 'dismissed' };
          }
        }
      }

      // Fallback to clipboard for desktop browsers without Web Share API
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(`${message}${url ? `\n${url}` : ''}`);
          return { success: true, action: 'copied' };
        } catch (err) {
          console.error('Web clipboard copy failed:', err);
        }
      }

      return { success: false };
    },
    default: async (): Promise<ShareResult> => {
      // Native iOS & Android execution: strictly uses React Native Share primitive
      try {
        const fullMessage = url ? `${message}\n${url}` : message;
        const res = await Share.share({
          title,
          message: fullMessage,
        });

        if (res.action === Share.sharedAction) {
          return { success: true, action: 'shared' };
        }
        return { success: false, action: 'dismissed' };
      } catch (err) {
        console.error('Native Share failed:', err);
        return { success: false };
      }
    },
  });

  if (handler) {
    return await handler();
  }
  return { success: false };
};
