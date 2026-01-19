/**
 * Loading 组件
 * 用于显示加载状态
 */

import { ReactNode } from 'react';

interface LoadingProps {
  /**
   * 加载文本提示
   */
  text?: string;
  /**
   * 加载大小：sm | md | lg
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 是否全屏居中显示
   */
  fullscreen?: boolean;
  /**
   * 自定义样式类名
   */
  className?: string;
  /**
   * 子元素（自定义加载内容）
   */
  children?: ReactNode;
}

function Loading({
  text = '加载中...',
  size = 'md',
  fullscreen = false,
  className = '',
  children,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-t-2 border-b-2',
    lg: 'h-16 w-16 border-t-3 border-b-3',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const spinner = (
    <div
      className={`inline-block rounded-full border-purple-400 animate-spin ${sizeClasses[size]}`}
    />
  );

  const content = children || (
    <div className="flex flex-col items-center gap-4">
      {spinner}
      {text && (
        <p className={`text-white ${textSizeClasses[size]}`}>{text}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {content}
    </div>
  );
}

export default Loading;
