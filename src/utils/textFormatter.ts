/**
 * 文本格式化工具
 * 用于清理和格式化显示的文本内容
 */

/**
 * 清理和格式化文本内容
 * - 移除多余的空白字符
 * - 规范化换行符
 * - 移除特殊字符
 */
export function formatTextForDisplay(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 移除 BOM 标记
  cleaned = cleaned.replace(/^\uFEFF/, '');

  // 规范化换行符
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 移除连续的空行（超过2个换行变成2个）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 移除行首行尾的空白
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // 移除首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 截断文本到指定长度
 */
export function truncateText(text: string, maxLength: number = 500): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength) + '...';
}

/**
 * 获取文本预览（前几段内容）
 */
export function getTextPreview(text: string, maxChars: number = 300): string {
  if (!text) return '';

  const formatted = formatTextForDisplay(text);

  if (formatted.length <= maxChars) {
    return formatted;
  }

  // 在句子边界处截断
  const truncated = formatted.slice(0, maxChars);
  const lastPeriod = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？'),
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastPeriod > maxChars * 0.7) {
    return truncated.slice(0, lastPeriod + 1) + '...';
  }

  return truncated + '...';
}
