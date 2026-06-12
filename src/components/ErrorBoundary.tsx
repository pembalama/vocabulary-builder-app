import { Component, type ReactNode } from "react";
import { Button } from "./ui";

interface State {
  error: Error | null;
}

// Last-resort guard: a render crash in one view shouldn't take down the whole
// app (IndexedDB data is untouched either way — a reload always recovers).
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-center sm:p-8"
        >
          <h2 className="text-base font-semibold text-red-900">
            Something went wrong
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-red-800">
            {this.state.error.message || "An unexpected error occurred."} Your
            vocabulary and progress are safe — reloading usually fixes this.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Reload app
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
