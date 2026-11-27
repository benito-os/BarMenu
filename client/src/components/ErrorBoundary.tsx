import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4" role="alert">
          <h1 className="font-serif text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This page did not load. The app may have just been updated. Reloading usually fixes it.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => window.location.reload()} data-testid="button-error-reload">
              Reload
            </Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false })}
              data-testid="button-error-retry"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
