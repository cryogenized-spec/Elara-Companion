// src/lib/speechRecognition.ts - Web Speech API & Fallback Audio Recording

// Cross-browser SpeechRecognition type definition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isAudioRecordingSupported(): boolean {
  if (typeof window === 'undefined' || !navigator.mediaDevices) return false;
  return Boolean(navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

/**
 * Auto-capitalize helper:
 * Capitalizes first letter of sentences, handles proper spacing,
 * and fixes common lowercase 'i' / 'i am' / 'i\'m' patterns.
 */
export function formatSpeechTranscript(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.trim();

  // Capitalize start of text
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Capitalize after sentence-ending punctuation (. ? !)
  text = text.replace(/([.?!]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Capitalize standalone "i", "i'm", "i've", "i'll", "i'd"
  text = text.replace(/\b(i)\b/g, 'I');
  text = text.replace(/\b(i)('m|'ve|'ll|'d)\b/gi, (_, p1, p2) => 'I' + p2.toLowerCase());

  return text;
}

/**
 * Helper to transcribe recorded audio blob via the server's Gemini / Speech fallback API
 */
export async function transcribeAudioBlob(
  audioBlob: Blob,
  language?: string
): Promise<{ text: string }> {
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
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { text: '', error: errData.error || `HTTP ${response.status}` } as any;
    }

    const data = await response.json();
    return { text: data.text || '' };
  } catch (err: any) {
    console.warn('transcribeAudioBlob handled fetch notice:', err);
    return { text: '' };
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
