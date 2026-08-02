import { Component, type ErrorInfo, type ReactNode } from 'react';
import { log } from '../core/log';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * BUG-11: catch unexpected render errors and show a recovery message instead of
 * a blank page (the journey promises "a specific banner, no stack traces").
 * Logs the error NAME only — never document/note content (Bible §10 rule 7).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    void _info;
    log('error', 'ui.crashed', { errorName: error.name });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="app-crash" role="alert">
          <h1>Something went wrong</h1>
          <p>
            DocNote hit an unexpected error. Your saved highlights and notes are safe. Reload the
            page to continue.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
