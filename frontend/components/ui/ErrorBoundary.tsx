"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Error Boundary Component
 */

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to external service
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // Could send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // sendToErrorTracking(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 
                            flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              An unexpected error occurred. Please try again or contact support.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-left">
                <p className="text-sm font-mono text-red-600 dark:text-red-400 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-red-500 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white 
                           rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 
                           dark:bg-gray-800 rounded-lg hover:bg-gray-200 
                           dark:hover:bg-gray-700 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>

            {process.env.NODE_ENV === "development" && (
              <button
                onClick={() => {
                  console.log("Full error:", this.state.error);
                  console.log("Error info:", this.state.errorInfo);
                }}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 
                           flex items-center gap-1 mx-auto"
              >
                <Bug className="w-3 h-3" />
                Log to console
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for async errors
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Async error handler for data fetching
 */
interface AsyncBoundaryProps {
  children: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  onRetry?: () => void;
}

export function AsyncBoundary({ 
  children, 
  loading, 
  error, 
  onRetry 
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary 
      fallback={
        error || (
          <div className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-gray-500 mb-4">Failed to load content</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg"
              >
                Retry
              </button>
            )}
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
