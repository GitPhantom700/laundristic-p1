import { useState, useRef, useCallback, useEffect } from 'react';
import {
  isGetUserMediaSupported,
  getRearCameraStream,
  captureFrame,
  downscaleImageFile,
  stopStream,
  type CaptureOptions,
} from './camera';

export type CameraMode = 'stream' | 'fallback' | 'idle';

export interface UseCameraReturn {
  /** Attach to a <video> element to show the live viewfinder. */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Ref for the hidden <input type="file"> used in fallback mode. */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Current mode. 'stream' = live viewfinder; 'fallback' = file picker; 'idle' = not started. */
  mode: CameraMode;
  /** True while the stream is starting or a capture is processing. */
  busy: boolean;
  /** Last error message, cleared on next start/capture. */
  error: string | null;
  /** Start the live viewfinder. Falls back to file-input if getUserMedia unavailable. */
  start: () => Promise<void>;
  /** Stop the live stream and release the camera. */
  stop: () => void;
  /** Capture a frame from the live viewfinder. Returns a JPEG Blob. */
  capture: () => Promise<Blob>;
  /** Open the file picker (fallback path). Resolves when user picks a file. */
  pickFile: () => Promise<Blob>;
}

export function useCamera(options: CaptureOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileResolverRef = useRef<((blob: Blob) => void) | null>(null);
  const fileRejectorRef = useRef<((err: Error) => void) | null>(null);

  const [mode, setMode] = useState<CameraMode>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unmountedRef = useRef(false);
  const requestRef = useRef(0);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (streamRef.current) stopStream(streamRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    requestRef.current += 1;
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMode('idle');
    setError(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (streamRef.current) {
        const video = videoRef.current;
        if (video) {
          video.srcObject = streamRef.current;
          video.playsInline = true;
          video.muted = true;
          await video.play();
        }
        if (!unmountedRef.current) setMode('stream');
        return;
      }

      if (!isGetUserMediaSupported()) {
        if (!unmountedRef.current) setMode('fallback');
        return;
      }

      const reqId = ++requestRef.current;
      const stream = await getRearCameraStream();

      // If unmounted or a new request/stop occurred while requesting camera, stop it immediately
      if (unmountedRef.current || requestRef.current !== reqId) {
        stopStream(stream);
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        throw new Error('videoRef not attached to a <video> element');
      }

      video.srcObject = stream;
      // iOS Safari requires playsInline + muted to autoplay
      video.playsInline = true;
      video.muted = true;

      await video.play();
      if (!unmountedRef.current) setMode('stream');
    } catch (err) {
      if (unmountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      // Permission denied or no camera → fall back to file picker
      if (
        msg.includes('Permission denied') ||
        msg.includes('NotAllowedError') ||
        msg.includes('NotFoundError') ||
        msg.includes('OverconstrainedError')
      ) {
        setMode('fallback');
      } else {
        setError(msg);
        setMode('fallback');
      }
    } finally {
      if (!unmountedRef.current) setBusy(false);
    }
  }, []);

  const capture = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || mode !== 'stream') {
      throw new Error('Camera is not streaming — call start() first');
    }
    setBusy(true);
    try {
      return await captureFrame(video, options);
    } finally {
      setBusy(false);
    }
  }, [mode, options]);

  const pickFile = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const input = fileInputRef.current;
      if (!input) {
        reject(new Error('fileInputRef not attached to an <input> element'));
        return;
      }

      // Store resolvers so the onChange handler can call them
      fileResolverRef.current = resolve;
      fileRejectorRef.current = reject;

      // Reset value so re-picking the same file still fires onChange
      input.value = '';
      input.click();
    });
  }, []);

  // Called by the hidden file input's onChange event
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const resolve = fileResolverRef.current;
      const reject = fileRejectorRef.current;
      fileResolverRef.current = null;
      fileRejectorRef.current = null;

      if (!file || !resolve || !reject) return;

      setBusy(true);
      try {
        const blob = await downscaleImageFile(file, options);
        resolve(blob);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        reject(err instanceof Error ? err : new Error(msg));
      } finally {
        setBusy(false);
      }
    },
    [options],
  );

  // Expose the file change handler so callers can wire it to the input
  // We attach it via the ref pattern to avoid prop drilling
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;
    const handler = (e: Event) =>
      handleFileChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
    input.addEventListener('change', handler);
    return () => input.removeEventListener('change', handler);
  }, [handleFileChange]);

  return {
    videoRef,
    fileInputRef,
    mode,
    busy,
    error,
    start,
    stop,
    capture,
    pickFile,
  };
}
