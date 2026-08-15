export function parseDataUrl(dataUrl: string) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (dataUrl.startsWith('data:')) {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex !== -1) {
      const header = dataUrl.slice(0, commaIndex);
      const data = dataUrl.slice(commaIndex + 1).trim();
      const mimeMatch = header.match(/^data:([^;,]+)/i);
      const rawMime = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream';
      return { mimeType: rawMime, data };
    }
  }
  return null;
}

export function sanitizeAudioMime(rawMime?: string): string {
  if (!rawMime) return 'audio/webm';
  const clean = rawMime.split(';')[0].trim().toLowerCase();
  if (clean.includes('webm')) return 'audio/webm';
  if (clean.includes('mp4') || clean.includes('m4a') || clean.includes('aac')) return 'audio/mp4';
  if (clean.includes('ogg') || clean.includes('opus')) return 'audio/ogg';
  if (clean.includes('wav')) return 'audio/wav';
  if (clean.includes('mp3') || clean.includes('mpeg')) return 'audio/mp3';
  return clean || 'audio/webm';
}
