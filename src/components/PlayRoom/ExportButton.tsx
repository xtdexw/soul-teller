/**
 * 故事导出按钮组件 - 简化版
 * 适合嵌入到操作菜单中
 */

import { useState } from 'react';
import { storyExporter } from '../../services/StoryExporter';
import type { InteractionSession } from '../../types/interaction';
import type { ExportFormat } from '../../types/interaction';

interface ExportButtonProps {
  session: InteractionSession | null;
  disabled?: boolean;
}

export function ExportButton({ session, disabled = false }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (!session || isExporting) return;

    setIsExporting(true);
    setExportStatus(`正在导出${format.toUpperCase()}...`);

    try {
      await storyExporter.exportAndDownload(session, format);
      setExportStatus('导出成功！');

      setTimeout(() => {
        setExportStatus(null);
      }, 2000);
    } catch (error) {
      console.error('[ExportButton] Export error:', error);
      setExportStatus('导出失败');

      setTimeout(() => {
        setExportStatus(null);
      }, 2000);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const formats: ExportFormat[] = ['txt', 'markdown', 'json'];

  return (
    <div className="relative">
      {/* 导出触发按钮 */}
      <button
        onClick={() => !isExporting && setIsOpen(!isOpen)}
        disabled={disabled || !session || isExporting}
        className="w-full px-3 py-2 bg-blue-600/80 hover:bg-blue-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          {isExporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          <span>{isExporting ? '导出中...' : '导出故事'}</span>
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 格式选择下拉菜单 */}
      {isOpen && !isExporting && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl z-[100]">
          <div className="py-1">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span className="text-white/60 text-xs font-mono">.{format}</span>
                <span className="text-white text-sm">
                  {format === 'txt' && '文本文件'}
                  {format === 'markdown' && 'Markdown'}
                  {format === 'json' && 'JSON数据'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 导出状态提示 */}
      {exportStatus && !isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 bg-gray-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl text-center">
          <p className="text-xs text-white">{exportStatus}</p>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
