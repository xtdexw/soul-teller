/**
 * ErrorBoundary 组件
 * 用于捕获子组件树中的JavaScript错误，显示备用UI
 */

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /**
   * 子组件
   */
  children: ReactNode;
  /**
   * 自定义错误显示函数
   */
  fallback?: (error: Error, errorInfo: { componentStack: string }) => ReactNode;
  /**
   * 错误回调函数
   */
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

/**
 * 默认错误显示UI
 */
function DefaultErrorFallback({
  error,
  resetError,
}: {
  error: Error | null;
  resetError: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
        {/* 错误图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-bold text-white text-center mb-2">哎呀，出错了！</h1>
        <p className="text-white/80 text-center mb-6">
          应用遇到了一些问题，请稍后重试
        </p>

        {/* 错误详情 */}
        {error && (
          <details className="mb-6 bg-black/20 rounded-lg p-4">
            <summary className="text-white/80 text-sm cursor-pointer hover:text-white transition-colors">
              查看错误详情
            </summary>
            <pre className="mt-3 text-xs text-red-300 overflow-auto max-h-40 whitespace-pre-wrap">
              {error.toString()}
              {error.stack}
            </pre>
          </details>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={resetError}
            className="flex-1 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-lg font-medium transition-colors"
          >
            重新加载
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
          >
            返回首页
          </button>
        </div>

        {/* 帮助信息 */}
        <p className="text-white/50 text-xs text-center mt-6">
          如果问题持续存在，请刷新页面或联系技术支持
        </p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新状态使下一次渲染能够显示降级后的UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // 可以将错误日志上报给服务器
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    // 更新状态
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleResetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用自定义的
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error!,
          this.state.errorInfo || { componentStack: '' }
        );
      }

      // 否则使用默认的错误UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.handleResetError}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
