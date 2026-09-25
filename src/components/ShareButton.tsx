import React, { useState } from "react";

interface ShareButtonProps {
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  completedCount,
  totalCount,
  completionPercentage,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleShare = async () => {
    const shareText = `🔥 HabitPulse Streak: I've completed ${completedCount}/${totalCount} (${completionPercentage}%) of my habits today! Building consistency daily.`;
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://habitpulse.io";

    const shareData = {
      title: "HabitPulse — Daily Habit Streak",
      text: shareText,
      url: shareUrl,
    };

    // 1. Try Web Share API (native mobile bottom sheet on iOS / Android)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareFeedback("Shared!");
        setTimeout(() => setShareFeedback(null), 2500);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // User canceled the native share dialog
        }
        // Fall through to clipboard copy
      }
    }

    // 2. Clipboard Fallback
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = `${shareText}\n${shareUrl}`;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setShareFeedback("Copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setShareFeedback(null);
      }, 2500);
    } catch (clipErr) {
      console.error("Clipboard copy failed:", clipErr);
      setShareFeedback("Unable to copy");
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div className="share-btn-wrapper">
      <button
        type="button"
        className={`btn btn-secondary share-action-btn ${className} ${copied ? "copied" : ""}`}
        onClick={handleShare}
        aria-label="Share your daily habit progress"
        title="Share your streak via native share or copy to clipboard"
      >
        {copied ? (
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
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        )}
        <span>{copied ? "Copied Link!" : "Share Progress"}</span>
      </button>

      {shareFeedback && !copied && (
        <span className="share-toast-bubble animate-fade" role="status">
          {shareFeedback}
        </span>
      )}
    </div>
  );
};

export default ShareButton;
