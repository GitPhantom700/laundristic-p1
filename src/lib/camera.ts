export interface CaptureOptions {
  maxDimension?: number; // default 1200px
  jpegQuality?: number; // default 0.82
}

/**
 * Downscales a video frame from a <video> element to a JPEG Blob.
 * Maintains aspect ratio; never upscales.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  options: CaptureOptions = {},
): Promise<Blob> {
  const { maxDimension = 1200, jpegQuality = 0.82 } = options;

  const srcW = video.videoWidth;
  const srcH = video.videoHeight;

  if (srcW === 0 || srcH === 0) {
    throw new Error('Video has no dimensions — stream may not be ready');
  }

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  ctx.drawImage(video, 0, 0, dstW, dstH);

  return canvasToJpeg(canvas, jpegQuality);
}

/**
 * Downscales an image File/Blob to a JPEG Blob.
 * Used for the file-input fallback path.
 */
export async function downscaleImageFile(
  file: File | Blob,
  options: CaptureOptions = {},
): Promise<Blob> {
  const { maxDimension = 1200, jpegQuality = 0.82 } = options;

  const bitmap = await createImageBitmap(file);
  const { width: srcW, height: srcH } = bitmap;

  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  ctx.drawImage(bitmap, 0, 0, dstW, dstH);
  bitmap.close();

  return canvasToJpeg(canvas, jpegQuality);
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob produced null'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/** Returns true if getUserMedia is available in this browser. */
export function isGetUserMediaSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Requests the rear camera stream.
 * On iOS Safari, `facingMode: { exact: 'environment' }` can fail on some
 * older devices — we fall back to `facingMode: 'environment'` (non-exact).
 */
export async function getRearCameraStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: { facingMode: { exact: 'environment' } },
    audio: false,
  };
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    // iOS fallback: drop the `exact` constraint
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
  }
}

export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}
