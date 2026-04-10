'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StandardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center border-2 border-dashed rounded-[0.1rem] bg-destructive/5 border-destructive/20">
          <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-4">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">시스템 오류가 발생했습니다</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            예상치 못한 문제가 발생하여 화면을 표시할 수 없습니다. <br />
            잠시 후 다시 시도하거나 관리자에게 문의해 주세요.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw size={18} />
              다시 시도
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-6 py-2.5 border rounded-md font-semibold hover:bg-accent transition-colors"
            >
              <Home size={18} />
              메인으로
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-black text-red-400 text-sm text-left overflow-auto max-w-full rounded-lg">
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
