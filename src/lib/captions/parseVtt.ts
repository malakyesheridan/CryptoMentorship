/**
 * Parse WebVTT (Video Text Tracks) format into transcript segments
 * Supports both WebVTT and SRT formats with timecode conversion
 */

export interface TranscriptSegment {
  startMs: number;
  endMs?: number;
  text: string;
}

/**
 * Convert WebVTT/SRT timecode to milliseconds
 * Supports formats: HH:MM:SS.mmm or MM:SS.mmm
 */
function timecodeToMs(timecode: string): number {
  const parts = timecode.split(':');
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm format
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = parseInt(secondsParts[1]?.padEnd(3, '0') || '0', 10);
    
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  } else if (parts.length === 2) {
    // MM:SS.mmm format
    const minutes = parseInt(parts[0], 10);
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = parseInt(secondsParts[1]?.padEnd(3, '0') || '0', 10);
    
    return (minutes * 60 + seconds) * 1000 + milliseconds;
  }
  
  throw new Error(`Invalid timecode format: ${timecode}`);
}

/**
 * Parse WebVTT content into transcript segments
 */
export function parseVtt(content: string): TranscriptSegment[] {
  const lines = content.split('\n');
  const segments: TranscriptSegment[] = [];
  let currentSegment: Partial<TranscriptSegment> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and WebVTT header
    if (!line || line === 'WEBVTT' || line.startsWith('NOTE')) {
      continue;
    }
    
    // Check if line contains timecode (contains -->)
    if (line.includes('-->')) {
      const timecodeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})/);
      
      if (timecodeMatch) {
        // Save previous segment if it exists
        if (currentSegment.text) {
          segments.push({
            startMs: currentSegment.startMs!,
            endMs: currentSegment.endMs,
            text: currentSegment.text.trim()
          });
        }
        
        // Start new segment
        currentSegment = {
          startMs: timecodeToMs(timecodeMatch[1]),
          endMs: timecodeToMs(timecodeMatch[2]),
          text: ''
        };
      }
    } else if (currentSegment.startMs !== undefined) {
      // This is text content for the current segment
      if (currentSegment.text) {
        currentSegment.text += ' ' + line;
      } else {
        currentSegment.text = line;
      }
    }
  }
  
  // Add the last segment
  if (currentSegment.text) {
    segments.push({
      startMs: currentSegment.startMs!,
      endMs: currentSegment.endMs,
      text: currentSegment.text.trim()
    });
  }
  
  return segments.filter(segment => segment.text.length > 0);
}

/**
 * Parse SRT content into transcript segments
 * SRT format is very similar to WebVTT but without the WEBVTT header
 */
export function parseSrt(content: string): TranscriptSegment[] {
  const lines = content.split('\n');
  const segments: TranscriptSegment[] = [];
  let currentSegment: Partial<TranscriptSegment> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Check if line contains timecode (contains -->)
    if (line.includes('-->')) {
      const timecodeMatch = line.match(/(\d{2}:\d{2}:\d{2},\d{3}|\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3}|\d{2}:\d{2},\d{3})/);
      
      if (timecodeMatch) {
        // Save previous segment if it exists
        if (currentSegment.text) {
          segments.push({
            startMs: currentSegment.startMs!,
            endMs: currentSegment.endMs,
            text: currentSegment.text.trim()
          });
        }
        
        // Convert SRT comma format to WebVTT dot format
        const startTime = timecodeMatch[1].replace(',', '.');
        const endTime = timecodeMatch[2].replace(',', '.');
        
        // Start new segment
        currentSegment = {
          startMs: timecodeToMs(startTime),
          endMs: timecodeToMs(endTime),
          text: ''
        };
      }
    } else if (currentSegment.startMs !== undefined) {
      // This is text content for the current segment
      if (currentSegment.text) {
        currentSegment.text += ' ' + line;
      } else {
        currentSegment.text = line;
      }
    }
  }
  
  // Add the last segment
  if (currentSegment.text) {
    segments.push({
      startMs: currentSegment.startMs!,
      endMs: currentSegment.endMs,
      text: currentSegment.text.trim()
    });
  }
  
  return segments.filter(segment => segment.text.length > 0);
}
