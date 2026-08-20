// Audio recorder hook with Gemini-backed transcription.
import { useState, useRef, useEffect, useCallback } from 'react';
import { transcribeAudioBlob } from '../lib/geminiTranscription';

export interface SpeechToTextOptions {
  lang?: string;
  autoCapitalize?: boolean;
  autoSendOnPause?: boolean;
  pauseThresholdMs?: number;
  onTranscriptChange?: (text: string) => void;
  onTranscriptDone?: (text: string) => void;
  onAutoSend?: (text: string) => void;
}

function getBestMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/aac',
    'audio/wav',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'audio/webm';
}

export function useSpeechToText(options: SpeechToTextOptions = {}) {
  const {
    lang = 'en-US',
    autoCapitalize = true,
    autoSendOnPause = false,
    pauseThresholdMs = 3000,
    onTranscriptChange,
    onTranscriptDone,
    onAutoSend,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([0.15, 0.25, 0.18, 0.35, 0.22, 0.15, 0.28, 0.12]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isListeningRef = useRef(false);
  const activeMimeRef = useRef('audio/webm');
  const silenceStartRef = useRef<number | null>(null);

  const activeLangRef = useRef(lang);
  const autoCapitalizeRef = useRef(autoCapitalize);
  const autoSendRef = useRef(autoSendOnPause);
  const pauseThresholdRef = useRef(pauseThresholdMs);
  const onAutoSendRef = useRef(onAutoSend);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onTranscriptDoneRef = useRef(onTranscriptDone);

  useEffect(() => { activeLangRef.current = lang; }, [lang]);
  useEffect(() => { autoCapitalizeRef.current = autoCapitalize; }, [autoCapitalize]);
  useEffect(() => { autoSendRef.current = autoSendOnPause; }, [autoSendOnPause]);
  useEffect(() => { pauseThresholdRef.current = pauseThresholdMs; }, [pauseThresholdMs]);
  useEffect(() => { onAutoSendRef.current = onAutoSend; }, [onAutoSend]);
  useEffect(() => { onTranscriptChangeRef.current = onTranscriptChange; }, [onTranscriptChange]);
  useEffect(() => { onTranscriptDoneRef.current = onTranscriptDone; }, [onTranscriptDone]);

  const stopAudioAnalyzer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setWaveformBars([0.15, 0.25, 0.18, 0.35, 0.22, 0.15, 0.28, 0.12]);
  }, []);

  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (_) {}
      });
      mediaStreamRef.current = null;
    }
    stopAudioAnalyzer();
  }, [stopAudioAnalyzer]);

  const startAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      silenceStartRef.current = null;

      const updateLevels = () => {
        if (!analyserRef.current || !isListeningRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 8));

        for (let i = 0; i < 8; i++) {
          const val = dataArray[i * step] || 0;
          bars.push(Math.max(0.1, val / 255));
          sum += val;
        }

        const avg = sum / (dataArray.length * 255);
        const normalizedLevel = Math.min(1, avg * 2.5);
        setAudioLevel(normalizedLevel);
        setWaveformBars(bars);

        if (autoSendRef.current) {
          const isQuiet = normalizedLevel < 0.05;
          const now = Date.now();
          if (isQuiet) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current >= Math.max(2500, pauseThresholdRef.current)) {
              silenceStartRef.current = null;
              stopListeningInternal(true);
              return;
            }
          } else {
            silenceStartRef.current = null;
          }
        }

        animFrameRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (e) {
      console.warn('Audio visualizer init skipped:', e);
    }
  }, []);

  const finalizeAndNotify = useCallback((rawText: string, triggerAutoSend = false) => {
    const cleanText = rawText.trim();
    if (!cleanText) return;

    let formatted = cleanText;
    if (autoCapitalizeRef.current) {
      formatted = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
    }

    setTranscript(formatted);
    setInterimText('');

    if (onTranscriptChangeRef.current) {
      onTranscriptChangeRef.current(formatted);
    }
    if (onTranscriptDoneRef.current) {
      onTranscriptDoneRef.current(formatted);
    }

    if (triggerAutoSend && autoSendRef.current && onAutoSendRef.current) {
      onAutoSendRef.current(formatted);
    }
  }, []);

  const stopListeningInternal = useCallback((triggerAutoSend = false) => {
    if (!isListeningRef.current) return;

    isListeningRef.current = false;
    setIsListening(false);

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      stopMediaStream();
      return;
    }

    setIsTranscribing(true);
    setInterimText('Transcribing via Gemini...');

    recorder.onstop = async () => {
      stopMediaStream();
      mediaRecorderRef.current = null;

      try {
        const mime = activeMimeRef.current;
        const audioChunks = audioChunksRef.current;

        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mime });
          if (audioBlob.size > 300) {
            const result = await transcribeAudioBlob(audioBlob, activeLangRef.current);
            const parsedText = (result?.text || '').trim();
            if (parsedText) {
              finalizeAndNotify(parsedText, triggerAutoSend);
              setIsTranscribing(false);
              return;
            }
          }
        }
        setInterimText('');
      } catch (err: any) {
        console.warn('Audio transcription notice:', err);
        setError('Transcription failed.');
        setInterimText('');
      } finally {
        setIsTranscribing(false);
      }
    };

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        stopMediaStream();
        setIsTranscribing(false);
        setInterimText('');
      }
    } catch (_) {
      stopMediaStream();
      setIsTranscribing(false);
      setInterimText('');
    }
  }, [finalizeAndNotify, stopMediaStream]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimText('Recording...');
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      isListeningRef.current = true;
      setIsListening(true);

      startAudioAnalyzer(stream);

      try {
        const mimeType = getBestMimeType();
        activeMimeRef.current = mimeType;
        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000);
      } catch (recErr) {
        console.warn('MediaRecorder backup init notice:', recErr);
      }
    } catch (micErr: any) {
      console.warn('Microphone start error:', micErr);
      isListeningRef.current = false;
      setIsListening(false);
      stopMediaStream();
      setError('Could not access microphone.');
    }
  }, [startAudioAnalyzer, stopMediaStream]);

  const stopListening = useCallback(() => {
    stopListeningInternal(false);
  }, [stopListeningInternal]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
    setError(null);
  }, []);

  const stopListeningInternalRef = useRef(stopListeningInternal);
  useEffect(() => { stopListeningInternalRef.current = stopListeningInternal; });
  useEffect(() => { return () => { if (isListeningRef.current) { stopListeningInternalRef.current(false); } }; }, []);

  return {
    isListening,
    isTranscribing,
    interimText,
    transcript,
    error,
    audioLevel,
    waveformBars,
    isSupported: typeof MediaRecorder !== 'undefined',
    startListening,
    stopListening,
    resetTranscript,
  };
}
