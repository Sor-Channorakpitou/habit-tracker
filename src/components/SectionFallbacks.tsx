interface SectionFallbackProps {
  error: Error | null;
  reset: () => void;
}

export function NavFallback({ error, reset }: SectionFallbackProps) {
  return (
    <header className="dashboard-nav nav-fallback-active" role="alert">
      <div className="nav-brand">
        <div className="brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <span className="brand-name">HabitPulse</span>
      </div>

      <div className="nav-fallback-status">
        <div className="fallback-chip-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Nav Bar Error: {error?.message || "Something went wrong"}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={reset}
          title="Recover Navigation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Try Again</span>
        </button>
      </div>
    </header>
  );
}

export function StatsFallback({ error, reset }: SectionFallbackProps) {
  return (
    <section className="stats-fallback-card" role="alert">
      <div className="stats-fallback-header">
        <div className="stats-fallback-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        </div>
        <div className="stats-fallback-text">
          <h3 className="stats-fallback-title">Overview Statistics Unavailable</h3>
          <p className="stats-fallback-subtitle">
            This section experienced a runtime fault: {error?.message || "Unexpected calculation failure"}. The rest of the dashboard remains intact.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={reset}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Try Again</span>
        </button>
      </div>
    </section>
  );
}

export function HabitListFallback({ error, reset }: SectionFallbackProps) {
  return (
    <div className="habit-list-fallback-card" role="alert">
      <div className="fallback-inner">
        <div className="fallback-warning-badge">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="fallback-heading">Habits List Temporarily Unavailable</h3>
        <p className="fallback-desc">
          We couldn't render your habit checklist due to an isolated error: {error?.message || "Component crash"}.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={reset}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
