import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallback?: ReactNode | ((props: { error: Error | null; reset: () => void }) => ReactNode);
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Reusable Class Component Error Boundary.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error details, and displays a fallback UI with a "Try again" button.
 * Prevents a single crashing section from whiting out the entire application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // Update state so the next render will show the fallback UI
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  // Catch side effects and log diagnostics
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary - ${this.props.sectionName || "Section"}] Caught error:`, error, errorInfo);
  }

  // Reset error state and invoke optional onReset callback
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, sectionName = "Section" } = this.props;

    if (hasError) {
      // 1. Custom function fallback
      if (typeof fallback === "function") {
        return fallback({ error, reset: this.handleReset });
      }

      // 2. Custom element fallback
      if (fallback) {
        return fallback;
      }

      // 3. Default fallback UI with "Try again" button
      return (
        <div className="error-boundary-card" role="alert" aria-live="assertive">
          <div className="error-boundary-header">
            <div className="error-boundary-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="error-boundary-title-group">
              <h3 className="error-boundary-title">{sectionName} failed to load</h3>
              <p className="error-boundary-subtitle">
                An unexpected error occurred in this section. The rest of your app remains safe and operational.
              </p>
            </div>
          </div>

          {error && (
            <div className="error-boundary-message-box">
              <span className="error-boundary-error-label">Error Details:</span>
              <code className="error-boundary-error-code">{error.message || String(error)}</code>
            </div>
          )}

          <div className="error-boundary-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={this.handleReset}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
