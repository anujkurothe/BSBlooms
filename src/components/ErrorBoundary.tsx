import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAF8] text-zinc-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-zinc-200 rounded-xl p-8 text-center">
            <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
              Unable to load catalog
            </h1>
            <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
              Something interrupted the connection to the flower catalog. Please reload the page to try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#1F4E3D] text-white text-sm font-medium rounded-lg hover:bg-[#16382B] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
