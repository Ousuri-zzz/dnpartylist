'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function ErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  const isOnline = useNetworkStatus();
  const isOfflineError = error?.message.includes('offline') || 
                        error?.message.includes('network');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {!isOnline || isOfflineError ? 'คุณกำลัง Offline อยู่' : 'เกิดข้อผิดพลาด'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {!isOnline || isOfflineError 
              ? 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง'
              : 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณารีเฟรชหน้าเว็บ'}
          </p>
        </div>
        <div className="mt-5 sm:mt-8 sm:flex sm:justify-center">
          <button
            onClick={resetError}
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private resetError = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
} 