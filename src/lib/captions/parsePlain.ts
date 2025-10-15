/**
 * Parse plain text transcript format
 * Expected format: "mm:ss text content" per line
 * Example:
 * 0:15 Welcome to today's session
 * 2:30 Let's discuss Bitcoin trends
 * 5:45 Here are the key points
 */

export interface TranscriptSegment {
  startMs: number;
  endMs?: number;
  text: string;
}

/**
 * Convert MM:SS format to milliseconds
 */
function timeToMs(timeStr: string): number {
  const parts = timeStr.split(':');
  
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: ${timeStr}. Expected MM:SS`);
  }
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) {
    throw new Error(`Invalid time format: ${timeStr}. Minutes and seconds must be numbers`);
  }
  
  if (seconds >= 60) {
    throw new Error(`Invalid time format: ${timeStr}. Seconds must be less than 60`);
  }
  
  return (minutes * 60 + seconds) * 1000;
}

/**
 * Parse plain text transcript into segments
 * Each line should be in format: "mm:ss text content"
 */
export function parsePlain(content: string): TranscriptSegment[] {
  const lines = content.split('\n');
  const segments: TranscriptSegment[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }
    
    // Match pattern: "mm:ss text content"
    const match = trimmedLine.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
    
    if (match) {
      const [, timeStr, text] = match;
      
      try {
        const startMs = timeToMs(timeStr);
        
        segments.push({
          startMs,
          text: text.trim()
        });
      } catch (error) {
        console.warn(`Skipping invalid time format: ${timeStr}`, error);
        continue;
      }
    } else {
      // If line doesn't match pattern, treat as continuation of previous segment
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        lastSegment.text += ' ' + trimmedLine;
      } else {
        // If no previous segment, create one with 0:00 timestamp
        segments.push({
          startMs: 0,
          text: trimmedLine
        });
      }
    }
  }
  
  return segments.filter(segment => segment.text.length > 0);
}

/**
 * Validate plain text format before parsing
 * Returns array of validation errors
 */
export function validatePlainFormat(content: string): string[] {
  const errors: string[] = [];
  const lines = content.split('\n');
  let hasValidSegment = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Check if line matches expected format
    const match = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
    
    if (!match) {
      // Check if it's a continuation line (no timestamp)
      if (hasValidSegment) {
        continue; // This is fine, it's a continuation
      } else {
        errors.push(`Line ${lineNumber}: Expected format "mm:ss text content" but got "${line}"`);
      }
    } else {
      const [, timeStr] = match;
      hasValidSegment = true;
      
      try {
        timeToMs(timeStr);
      } catch (error) {
        errors.push(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  return errors;
}
