import React, { useState, useEffect } from "react";
import { getQueuedHabits } from "../utils/offlineQueue";

interface OfflineBannerProps {
  onSyncTrigger?: () => Promise<void>;
  isSyncing?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  onSyncTrigger,
  isSyncing = false,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [showReconnectedBanner, setShowReconnectedBanner] = useState<boolean>(false);

  const updateQueueCount = () => {
    const queue = getQueuedHabits();
    setQueuedCount(queue.length);
  };

  useEffect(() => {
    updateQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);
      updateQueueCount();

      if (onSyncTrigger) {
        onSyncTrigger().then(() => {
          updateQueueCount();
        });
      }

      // Hide the "reconnected" confirmation banner after 4 seconds
      const timer = setTimeout(() => {
        setShowReconnectedBanner(false);
      }, 4000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
      updateQueueCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Listen for custom queue update events if triggered locally
    window.addEventListener("habit-queue-updated", updateQueueCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("habit-queue-updated", updateQueueCount);
    };
  }, [onSyncTrigger]);

  if (isOnline && !showReconnectedBanner && queuedCount === 0) {
    return null;
  }

  return (
    <div
      className={`offline-banner-root ${!isOnline ? "is-offline" : "is-reconnected"}`}
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
    >
      <div className="offline-banner-inner">
        <div className="offline-banner-icon">
          {!isOnline ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          ) : isSyncing ? (
            <span className="spinner-tiny" aria-hidden="true" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="offline-banner-text">
          {!isOnline ? (
            <>
              <strong>Offline Mode Active:</strong> You are currently disconnected.
              Habits created or updated offline are safely queued on this device and
              will sync automatically once internet connectivity is restored.
              {queuedCount > 0 && (
                <span className="offline-queue-badge">
                  {queuedCount} {queuedCount === 1 ? "habit" : "habits"} queued
                </span>
              )}
            </>
          ) : isSyncing ? (
            <>
              <strong>Back Online:</strong> Syncing your queued habits with cloud
              database...
            </>
          ) : (
            <>
              <strong>Connection Restored:</strong> HabitPulse is online. All changes
              are synchronized.
            </>
          )}
        </div>

        {isOnline && queuedCount > 0 && onSyncTrigger && !isSyncing && (
          <button
            type="button"
            className="offline-sync-now-btn"
            onClick={() => onSyncTrigger()}
          >
            Sync Now ({queuedCount})
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineBanner;
