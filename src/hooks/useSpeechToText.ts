// src/hooks/useSpeechToText.ts - Robust Continuous Speech Recognition & Audio Visualizer Hook
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  isAudioRecordingSupported,
  isSpeechRecognitionSupported,
  formatSpeechTranscript,
  transcribeAudioBlob,
} from '../lib/speechRecognition';

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

  // Audio recording & Speech recognition references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);

  // Live state refs to prevent stale closures and unneeded re-triggers
  const isListeningRef = useRef(false);
  const recognizedTextRef = useRef('');
  const finalTranscriptAccumulatorRef = useRef('');
  const activeMimeRef = useRef('audio/webm');
  const silenceStartRef = useRef<number | null>(null);

  // Settings refs
  const activeLangRef = useRef(lang);
  const autoCapitalizeRef = useRef(autoCapitalize);
  const autoSendRef = useRef(autoSendOnPause);
  const pauseThresholdRef = useRef(pauseThresholdMs);
  const onAutoSendRef = useRef(onAutoSend);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onTranscriptDoneRef = useRef(onTranscriptDone);

  useEffect(() => {
    activeLangRef.current = lang;
  }, [lang]);

  useEffect(() => {
    autoCapitalizeRef.current = autoCapitalize;
  }, [autoCapitalize]);

  useEffect(() => {
    autoSendRef.current = autoSendOnPause;
  }, [autoSendOnPause]);

  useEffect(() => {
    pauseThresholdRef.current = pauseThresholdMs;
  }, [pauseThresholdMs]);

  useEffect(() => {
    onAutoSendRef.current = onAutoSend;
  }, [onAutoSend]);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    onTranscriptDoneRef.current = onTranscriptDone;
  }, [onTranscriptDone]);

  // Stop audio visualizer nodes
  const stopAudioAnalyzer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setWaveformBars([0.15, 0.25, 0.18, 0.35, 0.22, 0.15, 0.28, 0.12]);
  }, []);

  // Stop media stream tracks
  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      mediaStreamRef.current = null;
    }
    stopAudioAnalyzer();
  }, [stopAudioAnalyzer]);

  // Start real-time audio visualizer & optional silence detection
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

        // Check for silence ONLY if auto-send is strictly enabled
        if (autoSendRef.current) {
          const isQuiet = normalizedLevel < 0.05;
          const now = Date.now();
          if (isQuiet && recognizedTextRef.current.trim()) {
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

  // Format and commit final recognized transcript to callbacks
  const finalizeAndNotify = useCallback((rawText: string, triggerAutoSend = false) => {
    const cleanText = rawText.trim();
    if (!cleanText) return;

    const formatted = autoCapitalizeRef.current ? formatSpeechTranscript(cleanText) : cleanText;
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

  // Internal Stop Listening & Finalize
  const stopListeningInternal = useCallback((triggerAutoSend = false) => {
    if (!isListeningRef.current) return;

    isListeningRef.current = false;
    setIsListening(false);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Stop WebSpeech instance
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch (_) {}
      speechRecRef.current = null;
    }

    const currentText = (recognizedTextRef.current || finalTranscriptAccumulatorRef.current || '').trim();

    // If WebSpeech already captured the text in real-time, commit immediately!
    if (currentText) {
      stopMediaStream();
      mediaRecorderRef.current = null;
      finalizeAndNotify(currentText, triggerAutoSend);
      return;
    }

    // Fallback: If no text was captured by WebSpeech, check MediaRecorder
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      stopMediaStream();
      return;
    }

    setIsTranscribing(true);

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

        // If server transcription yielded nothing, check if any interim text was available
        if (currentText) {
          finalizeAndNotify(currentText, triggerAutoSend);
        }
      } catch (err: any) {
        console.warn('Audio transcription notice:', err);
        if (currentText) {
          finalizeAndNotify(currentText, triggerAutoSend);
        }
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
      }
    } catch (_) {
      stopMediaStream();
      setIsTranscribing(false);
    }
  }, [finalizeAndNotify, stopMediaStream]);

  // Setup WebSpeech recognition instance with continuous auto-restart
  const setupSpeechRecognition = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = activeLangRef.current || 'en-US';

      rec.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += ' ' + transcriptPiece;
          } else {
            interim += ' ' + transcriptPiece;
          }
        }

        if (finalChunk.trim()) {
          finalTranscriptAccumulatorRef.current = (
            (finalTranscriptAccumulatorRef.current ? finalTranscriptAccumulatorRef.current + ' ' : '') +
            finalChunk.trim()
          ).trim();
        }

        const combined = (
          (finalTranscriptAccumulatorRef.current ? finalTranscriptAccumulatorRef.current + ' ' : '') +
          interim.trim()
        ).trim();

        recognizedTextRef.current = combined;
        setInterimText(combined);

        if (onTranscriptChangeRef.current && combined) {
          onTranscriptChangeRef.current(combined);
        }
      };

      rec.onerror = (err: any) => {
        console.debug('Speech recognition auxiliary event:', err?.error);
        if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
          setError('Microphone permission not granted for speech recognition.');
        }
      };

      // Continuous recording: If Android or Chrome fires onend while user is still recording, immediately restart!
      rec.onend = () => {
        if (isListeningRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              try {
                rec.start();
              } catch (_) {
                // Ignore already-started errors
              }
            }
          }, 60);
        }
      };

      return rec;
    } catch (e) {
      console.warn('SpeechRecognition initialization skipped:', e);
      return null;
    }
  }, []);

  // Start continuous audio recording
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimText('');
    recognizedTextRef.current = '';
    finalTranscriptAccumulatorRef.current = '';
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      // Request microphone stream for visualizer and backup recorder
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

      // Start real-time visualizer
      startAudioAnalyzer(stream);

      // 1. Try WebSpeech recognition for zero-latency live streaming text
      const rec = setupSpeechRecognition();
      if (rec) {
        speechRecRef.current = rec;
        try {
          rec.start();
        } catch (recStartErr) {
          console.warn('WebSpeech rec.start failed:', recStartErr);
        }
      }

      // 2. Also start MediaRecorder as backup
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

      const errMsg = String(micErr?.message || micErr?.name || '');
      if (
        micErr?.name === 'NotAllowedError' ||
        micErr?.name === 'PermissionDeniedError' ||
        micErr?.name === 'SecurityError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('not allowed') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        setError('Microphone permission was denied. Please allow microphone access in your browser address bar/site settings.');
      } else {
        setError(micErr?.message || 'Could not access microphone.');
      }
    }
  }, [setupSpeechRecognition, startAudioAnalyzer, stopMediaStream]);

  // Public stop listening
  const stopListening = useCallback(() => {
    stopListeningInternal(false);
  }, [stopListeningInternal]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
    recognizedTextRef.current = '';
    finalTranscriptAccumulatorRef.current = '';
    setError(null);
  }, []);

  // Stable cleanup on unmount ONLY
  const stopListeningInternalRef = useRef(stopListeningInternal);
  useEffect(() => {
    stopListeningInternalRef.current = stopListeningInternal;
  });

  useEffect(() => {
    return () => {
      if (isListeningRef.current) {
        stopListeningInternalRef.current(false);
      }
    };
  }, []);

  return {
    isListening,
    isTranscribing,
    interimText,
    transcript,
    error,
    audioLevel,
    waveformBars,
    isSupported: isSpeechRecognitionSupported() || isAudioRecordingSupported(),
    startListening,
    stopListening,
    resetTranscript,
  };
}
