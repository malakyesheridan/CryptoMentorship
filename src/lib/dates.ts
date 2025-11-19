import { format, parseISO, formatDistanceToNowStrict, isValid } from 'date-fns';

export type Dateish = Date | string | number | null | undefined;

export function toDate(v: Dateish): Date | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isValid(v) ? v : null;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isValid(d) ? d : null;
  }
  if (typeof v === 'string') {
    const d = parseISO(v);
    return isValid(d) ? d : null;
  }
  return null;
}

export function formatDate(v: Dateish, fmt: string = 'PPP'): string {
  const d = toDate(v);
  if (!d) return '—';
  
  // Handle custom format aliases
  const formatMap: Record<string, string> = {
    'short': 'MMM d', // Jan 5
    'long': 'PPP', // Jan 5, 2025
    'full': 'PPpp', // Jan 5, 2025 at 3:04 PM
  };
  
  const actualFormat = formatMap[fmt] || fmt;
  return format(d, actualFormat);
  // Examples: 'PPP' → Jan 5, 2025; 'PPpp' → Jan 5, 2025 at 3:04 PM; 'short' → Jan 5
}

export function formatDateTime(v: Dateish): string {
  const d = toDate(v);
  if (!d) return '—';
  return format(d, 'PPP p');
}

export function formatTime(v: Dateish): string {
  const d = toDate(v);
  if (!d) return '—';
  return format(d, 'p');
}

export function formatRelative(v: Dateish): string {
  const d = toDate(v);
  if (!d) return '—';
  
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return formatDate(d, 'MMM d');
}

export function timeago(v: Dateish): string {
  const d = toDate(v);
  if (!d) return '—';
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function formatTimeline(v: Dateish): { relative: string; absolute: string } {
  const d = toDate(v);
  if (!d) {
    return { relative: '—', absolute: '—' };
  }

  return {
    relative: formatRelative(d),
    absolute: formatDateTime(d),
  };
}
