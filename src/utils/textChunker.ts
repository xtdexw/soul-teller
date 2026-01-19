/**
 * 文本分块工具
 * 将长文本按句子分割，适合TTS朗读
 */

export interface TextChunk {
  id: string;
  text: string;
  index: number;
}

// 定义句子结束标记
const SENTENCE_END_MARKS = ['。', '！', '？', '.', '!', '?'];
// 定义引号字符（使用字符码）
const QUOTE_CHARS = new Set([
  '"'.charCodeAt(0),  // U+0022 QUOTATION MARK
  '"'.charCodeAt(0),  // U+201C LEFT DOUBLE QUOTATION MARK
  '"'.charCodeAt(0),  // U+201D RIGHT DOUBLE QUOTATION MARK
  "'".charCodeAt(0),  // U+0027 APOSTROPHE
  "'".charCodeAt(0),  // U+2018 LEFT SINGLE QUOTATION MARK
  "'".charCodeAt(0),  // U+2019 RIGHT SINGLE QUOTATION MARK
]);

/**
 * 将文本按句子分割
 * 支持中文和英文标点符号
 */
export function splitTextIntoSentences(text: string): string[] {
  // 清理文本
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const sentences: string[] = [];
  let currentSentence = '';

  // 按字符遍历
  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const nextChar = cleanedText[i + 1];
    const nextCharCode = nextChar ? nextChar.charCodeAt(0) : null;

    currentSentence += char;

    // 检测句子结束标记
    const isSentenceEnd = SENTENCE_END_MARKS.includes(char);

    if (isSentenceEnd) {
      // 如果后面是引号，继续等待引号结束
      if (nextCharCode && QUOTE_CHARS.has(nextCharCode)) {
        continue;
      }

      // 当前句子结束
      const trimmed = currentSentence.trim();
      if (trimmed) {
        sentences.push(trimmed);
      }
      currentSentence = '';
    }
  }

  // 处理剩余内容
  const remaining = currentSentence.trim();
  if (remaining) {
    sentences.push(remaining);
  }

  // 如果没有句子，按段落分割
  if (sentences.length === 0) {
    return cleanedText
      .split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return sentences;
}

/**
 * 将文本分块
 * @param text 原始文本
 * @param maxChunkLength 每块最大长度（字符数）
 * @returns 分块结果
 */
export function chunkText(text: string, maxChunkLength: number = 200): TextChunk[] {
  const sentences = splitTextIntoSentences(text);
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const newLength = currentChunk.length + sentence.length;

    // 如果当前块为空，直接添加
    if (currentChunk.length === 0) {
      currentChunk = sentence;
      continue;
    }

    // 如果添加新句子后不超过限制，合并
    if (newLength <= maxChunkLength) {
      currentChunk += sentence;
    } else {
      // 保存当前块
      chunks.push({
        id: `chunk-${chunkIndex}`,
        text: currentChunk.trim(),
        index: chunkIndex,
      });

      // 开始新块
      chunkIndex++;
      currentChunk = sentence;
    }
  }

  // 保存最后一个块
  if (currentChunk.trim()) {
    chunks.push({
      id: `chunk-${chunkIndex}`,
      text: currentChunk.trim(),
      index: chunkIndex,
    });
  }

  return chunks;
}

/**
 * 计算朗读进度百分比
 */
export function calculateProgress(
  currentChunkIndex: number,
  totalChunks: number
): number {
  if (totalChunks === 0) return 0;
  return Math.round(((currentChunkIndex + 1) / totalChunks) * 100);
}

/**
 * 格式化进度显示
 */
export function formatProgress(
  currentChunkIndex: number,
  totalChunks: number
): string {
  return `${currentChunkIndex + 1} / ${totalChunks}`;
}
