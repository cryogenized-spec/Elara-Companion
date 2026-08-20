// Gemini-backed audio transcription utilities.

/**
 * Auto-capitalize helper for finalized Gemini transcripts.
 * Keeps formatting deterministic before text reaches the composer.
 */
export function formatSpeechTranscript(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.trim();

  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text.replace(/([.?!]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  text = text.replace(/\b(i)\b/g, 'I');
  text = text.replace(/\b(i)('m|'ve|'ll|'d)\b/gi, (_, p1, p2) => 'I' + p2.toLowerCase());

  return text;
}

/**
 * Transcribes a recorded audio blob through the application's Gemini API route.
 * Gemini receives the audio as inline multimodal input; no browser SpeechRecognition
 * or alternate transcription provider is used by the active voice pipeline.
 */
export async function transcribeAudioBlob(
  audioBlob: Blob,
  language?: string
): Promise<{ text: string; error?: string }> {
  if (!audioBlob || audioBlob.size < 200) {
    return { text: '' };
  }

  try {
    const base64 = await blobToBase64(audioBlob);
    if (!base64 || base64.length < 50) {
      return { text: '' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64,
          mimeType: audioBlob.type || 'audio/webm',
          language,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { text: '', error: errData.error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { text: data.text || '' };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: unknown) {
    console.warn('Gemini audio transcription request failed:', err);
    return { text: '', error: err instanceof Error ? err.message : 'Transcription request failed' };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
