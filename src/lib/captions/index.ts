/**
 * Caption parsing utilities
 * Supports VTT, SRT, and plain text formats
 */

import { parseVtt, parseSrt, TranscriptSegment } from './parseVtt';
import { parsePlain, validatePlainFormat } from './parsePlain';

export { parseVtt, parseSrt, parsePlain, validatePlainFormat };
export type { TranscriptSegment };

/**
 * Auto-detect format and parse accordingly
 */
export function parseTranscript(content: string, format?: 'vtt' | 'srt' | 'plain'): TranscriptSegment[] {
  if (format) {
    switch (format) {
      case 'vtt':
        return parseVtt(content);
      case 'srt':
        return parseSrt(content);
      case 'plain':
        return parsePlain(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  // Auto-detect format
  const trimmedContent = content.trim();
  
  if (trimmedContent.startsWith('WEBVTT')) {
    return parseVtt(content);
  } else if (trimmedContent.match(/^\d+\s*$/m)) {
    // SRT format typically starts with a number
    return parseSrt(content);
  } else {
    // Assume plain text format
    return parsePlain(content);
  }
}
