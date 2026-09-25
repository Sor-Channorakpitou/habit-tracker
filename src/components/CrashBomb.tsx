interface CrashBombProps {
  shouldThrow: boolean;
  sectionName: string;
}

/**
 * Diagnostic component to test ErrorBoundary resilience.
 * When shouldThrow is true, this component throws a runtime render error,
 * verifying that the enclosing ErrorBoundary intercepts it and displays
 * the fallback UI with a "Try again" button without crashing the entire app.
 */
export default function CrashBomb({ shouldThrow, sectionName }: CrashBombProps) {
  if (shouldThrow) {
    throw new Error(`Deliberate runtime error triggered in ${sectionName} to audit ErrorBoundary isolation.`);
  }
  return null;
}
