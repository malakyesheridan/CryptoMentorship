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

function normalizeDateFormat(fmt: string): string {
  const formatMap: Record<string, string> = {
    short: 'dd-MM-yyyy',
    long: 'dd-MM-yyyy',
    full: 'dd-MM-yyyy h:mm a',
    PPP: 'dd-MM-yyyy',
    PPpp: 'dd-MM-yyyy h:mm a',
    'PPP p': 'dd-MM-yyyy h:mm a',
    'MMM d, yyyy': 'dd-MM-yyyy',
    'MMM dd, yyyy': 'dd-MM-yyyy',
    'MMMM d, yyyy': 'dd-MM-yyyy',
    'MMMM yyyy': 'dd-MM-yyyy',
    'MMM d': 'dd-MM-yyyy',
    'MMM dd': 'dd-MM-yyyy',
    'MMM d, yyyy h:mm a': 'dd-MM-yyyy h:mm a',
    'MMM d, h:mm a': 'dd-MM-yyyy h:mm a',
    'MMM d, yyyy HH:mm': 'dd-MM-yyyy HH:mm',
  };

  if (formatMap[fmt]) {
    return formatMap[fmt];
  }

  const hasDateTokens = /[yYMdP]/.test(fmt);
  if (!hasDateTokens) {
    return fmt;
  }

  const hasTimeTokens = /[Hhmsa]|p/.test(fmt);
  if (!hasTimeTokens) {
    return 'dd-MM-yyyy';
  }

  const use24Hour = fmt.includes('H');
  return use24Hour ? 'dd-MM-yyyy HH:mm' : 'dd-MM-yyyy h:mm a';
}

export function formatDate(v: Dateish, fmt: string = 'dd-MM-yyyy'): string {
  const d = toDate(v);
  if (!d) return '—';

  const actualFormat = normalizeDateFormat(fmt);
  return format(d, actualFormat);
}

export function formatDateTime(v: Dateish): string {
  const d = toDate(v);
  if (!d) return '—';
  return format(d, 'dd-MM-yyyy h:mm a');
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
  
  return formatDate(d, 'dd-MM-yyyy');
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
