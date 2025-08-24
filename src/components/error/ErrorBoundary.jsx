import React from 'react';
import loggingService from '../../services/logging/LoggingService.js';

/**
 * React Error Boundary with comprehensive error tracking
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = 'error-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error with comprehensive context
    loggingService.critical('React Component Error', error, {
      errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown',
      props: this.props.logProps ? this.props : undefined,
      errorInfo
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    loggingService.info('Error Boundary Retry', {
      errorId: this.state.errorId,
      component: this.props.name
    });
  };

  handleReportError = () => {
    const errorData = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      .then(() => {
        alert('Error details copied to clipboard');
      })
      .catch(() => {
        console.log('Error details:', errorData);
      });
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  משהו השתבש
                </h3>
                <p className="text-sm text-gray-500">
                  אירעה שגיאה בלתי צפויה באפליקציה
                </p>
              </div>
            </div>

            {import.meta.env.MODE === 'development' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Error Details (Development):
                </p>
                <p className="text-xs text-red-700 font-mono break-all">
                  {this.state.error?.message}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                נסה שוב
              </button>
              
              {import.meta.env.MODE === 'development' && (
                <button
                  onClick={this.handleReportError}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  העתק שגיאה
                </button>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                רענן דף
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;