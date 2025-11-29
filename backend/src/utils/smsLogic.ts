export function isStopKeyword(text: string): boolean {
  const t = text.trim().toUpperCase();
  return ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(t);
}

// Classify reply text into status strings (compatible with string fields in schema)
export function classifyReply(raw: string, current: string): string {
  const text = raw.toLowerCase();

  if (isStopKeyword(raw) || text.includes('wrong number') || text.includes('not interested')) {
    return 'REPLIED_NEGATIVE';
  }
  if (text.includes('maybe') || text.includes('info') || text.includes('follow up')) {
    return 'REPLIED_NEUTRAL';
  }
  if (text.includes('yes') || text.includes('call me') || text.includes('interested')) {
    return 'REPLIED_POSITIVE';
  }
  if (current === 'REPLIED_POSITIVE' || current === 'REPLIED_NEUTRAL') {
    return current;
  }
  return 'CONTACTED';
}
