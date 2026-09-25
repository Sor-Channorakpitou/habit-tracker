import React, { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error navigator.standalone is iOS Safari specific
      Boolean(window.navigator.standalone);

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      console.log("[PWA] App successfully installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Simulate or provide guidance for desktop/browsers where beforeinstallprompt fired already or is restricted
      alert("To install HabitPulse:\n• On Chrome / Edge: Click the install icon in the address bar.\n• On iOS Safari: Tap Share and select 'Add to Home Screen'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] User accepted install prompt");
        setShowBanner(false);
      } else {
        console.log("[PWA] User dismissed install prompt");
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Error during installation prompt:", err);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <aside
      className="pwa-install-banner animate-slide-down"
      role="banner"
      aria-label="Install HabitPulse Progressive Web App"
      data-testid="pwa-install-prompt"
    >
      <div className="pwa-install-content">
        <div className="pwa-install-badge-icon">
          <img
            src="/pwa-64x64.png"
            alt="HabitPulse icon"
            width="40"
            height="40"
            loading="lazy"
            className="pwa-install-logo"
          />
        </div>
        <div className="pwa-install-info">
          <div className="pwa-install-title">Install HabitPulse App</div>
          <div className="pwa-install-desc">
            Add to home screen for instant offline tracking, zero lag, and streak notifications.
          </div>
        </div>
      </div>

      <div className="pwa-install-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm pwa-install-btn"
          onClick={handleInstallClick}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Install Now</span>
        </button>
        <button
          type="button"
          className="pwa-install-close-btn"
          onClick={dismissBanner}
          aria-label="Dismiss installation prompt"
        >
          ✕
        </button>
      </div>
    </aside>
  );
};

export default InstallPrompt;
