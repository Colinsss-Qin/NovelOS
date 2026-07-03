// ================================================================
// Writing Skill — 字数统计工具
// 中文字符 + 英文单词 + 段落/行数 + 阅读时间
// ================================================================

import type { WordStats } from "./types";

/** 统计文本的字数、段落、行数、阅读时间 */
export function countWords(text: string): WordStats {
  if (!text) {
    return { totalChars: 0, chineseChars: 0, englishWords: 0, paragraphs: 0, lines: 0, readingTimeMinutes: 0 };
  }

  const totalChars = text.length;

  // 中文字符（Unicode 范围：基本汉字 + 扩展A-F）
  const chineseChars = (text.match(/[一-鿿㐀-䶿豈-﫿\u{20000}-\u{2ffff}]/gu) || []).length;

  // 英文单词（字母序列）
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  // 段落（双换行分隔）
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

  // 行数
  const lines = text.split("\n").length;

  // 阅读时间：中文 500字/分钟 + 英文 200词/分钟
  const readingTimeMinutes = Math.max(1, Math.ceil((chineseChars / 500) + (englishWords / 200)));

  return { totalChars, chineseChars, englishWords, paragraphs, lines, readingTimeMinutes };
}

/** 快速估数字数（仅中文字符数，性能优化版，适合超大文本） */
export function quickCount(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // 基本汉字范围
    if (code >= 0x4e00 && code <= 0x9fff) count++;
    else if (code >= 0x3400 && code <= 0x4dbf) count++;
  }
  return count;
}

/** 将字数格式化为可读字符串 */
export function formatWordCount(stats: WordStats): string {
  if (stats.chineseChars >= 10000) {
    return (stats.chineseChars / 10000).toFixed(1) + "万字";
  }
  return stats.chineseChars.toLocaleString() + "字";
}
