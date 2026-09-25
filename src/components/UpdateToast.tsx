import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const UpdateToast: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log("[PWA] Service Worker registered successfully:", r.scope);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Service Worker registration failed:", error);
    },
  });

  const closeOfflineReady = () => {
    setOfflineReady(false);
  };

  const closeNeedRefresh = () => {
    setNeedRefresh(false);
  };

  const handleRefresh = async () => {
    try {
      await updateServiceWorker(true);
    } catch (err) {
      console.error("[PWA] Failed to update service worker:", err);
      window.location.reload();
    }
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div
      className="pwa-toast-container"
      role="region"
      aria-label="PWA notifications"
      data-testid="pwa-update-toast"
    >
      <div className="pwa-toast-card animate-slide-up" role="alert">
        <div className="pwa-toast-icon">
          {needRefresh ? (
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
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
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
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
        </div>

        <div className="pwa-toast-content">
          <div className="pwa-toast-title">
            {needRefresh ? "New version available" : "App ready to work offline"}
          </div>
          <div className="pwa-toast-message">
            {needRefresh
              ? "A fresh update is ready. Click refresh to update immediately."
              : "HabitPulse has been cached for offline use on your device."}
          </div>
        </div>

        <div className="pwa-toast-actions">
          {needRefresh && (
            <button
              type="button"
              className="pwa-toast-btn-primary"
              onClick={handleRefresh}
              aria-label="Refresh app to apply update"
            >
              Refresh
            </button>
          )}
          <button
            type="button"
            className="pwa-toast-btn-dismiss"
            onClick={needRefresh ? closeNeedRefresh : closeOfflineReady}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateToast;
