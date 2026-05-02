import { Component } from "react";
import { Link } from "react-router-dom";

/**
 * Catches render errors so a single bug does not white-screen the whole app.
 */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env?.DEV) {
      console.error("[Learn2Hire]", error, info?.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-800">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-slate-600">
            Please refresh the page. If this keeps happening, try signing in again or contact support.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <Link
              to="/"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
