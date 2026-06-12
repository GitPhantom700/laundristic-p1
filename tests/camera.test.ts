import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isGetUserMediaSupported,
  captureFrame,
  downscaleImageFile,
  stopStream,
} from '../src/lib/camera';

// ─── isGetUserMediaSupported ──────────────────────────────────────────────────

describe('isGetUserMediaSupported', () => {
  const original = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: original,
      configurable: true,
    });
  });

  it('returns true when mediaDevices.getUserMedia exists', () => {
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: { getUserMedia: vi.fn() },
      },
      configurable: true,
    });
    expect(isGetUserMediaSupported()).toBe(true);
  });

  it('returns false when mediaDevices is absent', () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      configurable: true,
    });
    expect(isGetUserMediaSupported()).toBe(false);
  });

  it('returns false when getUserMedia is absent on mediaDevices', () => {
    Object.defineProperty(global, 'navigator', {
      value: { mediaDevices: {} },
      configurable: true,
    });
    expect(isGetUserMediaSupported()).toBe(false);
  });
});

// ─── captureFrame ─────────────────────────────────────────────────────────────

describe('captureFrame', () => {
  function makeVideo(w: number, h: number): HTMLVideoElement {
    const v = document.createElement('video');
    Object.defineProperty(v, 'videoWidth', { value: w, configurable: true });
    Object.defineProperty(v, 'videoHeight', { value: h, configurable: true });
    return v;
  }

  beforeEach(() => {
    // jsdom canvas.toBlob is a no-op; stub it to return a JPEG blob
    HTMLCanvasElement.prototype.toBlob = function (
      cb: (blob: Blob | null) => void,
      type?: string,
    ) {
      cb(new Blob(['jpeg'], { type: type ?? 'image/jpeg' }));
    };
    // Stub getContext to return a minimal 2d context
    HTMLCanvasElement.prototype.getContext = function () {
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    };
  });

  it('returns a Blob', async () => {
    const blob = await captureFrame(makeVideo(800, 600));
    expect(blob).toBeInstanceOf(Blob);
  });

  it('blob type is image/jpeg', async () => {
    const blob = await captureFrame(makeVideo(800, 600));
    expect(blob.type).toBe('image/jpeg');
  });

  it('throws when video has no dimensions', async () => {
    await expect(captureFrame(makeVideo(0, 0))).rejects.toThrow();
  });

  it('downscales to maxDimension when image exceeds it', async () => {
    let capturedW = 0;
    let capturedH = 0;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        drawImage: (
          _src: unknown,
          _x: unknown,
          _y: unknown,
          w: number,
          h: number,
        ) => {
          capturedW = w;
          capturedH = h;
        },
      } as unknown as CanvasRenderingContext2D;
    };

    await captureFrame(makeVideo(2400, 1800), { maxDimension: 1200 });
    expect(capturedW).toBe(1200);
    expect(capturedH).toBe(900);
  });

  it('does not upscale when image is smaller than maxDimension', async () => {
    let capturedW = 0;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        drawImage: (_src: unknown, _x: unknown, _y: unknown, w: number) => {
          capturedW = w;
        },
      } as unknown as CanvasRenderingContext2D;
    };

    await captureFrame(makeVideo(400, 300), { maxDimension: 1200 });
    expect(capturedW).toBe(400);
  });

  it('maintains aspect ratio on downscale', async () => {
    let capturedW = 0;
    let capturedH = 0;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        drawImage: (
          _s: unknown,
          _x: unknown,
          _y: unknown,
          w: number,
          h: number,
        ) => {
          capturedW = w;
          capturedH = h;
        },
      } as unknown as CanvasRenderingContext2D;
    };

    // 3000×1000 → max 1200 → scale by 1200/3000 = 0.4 → 1200×400
    await captureFrame(makeVideo(3000, 1000), { maxDimension: 1200 });
    expect(capturedW).toBe(1200);
    expect(capturedH).toBe(400);
  });
});

// ─── downscaleImageFile ───────────────────────────────────────────────────────

describe('downscaleImageFile', () => {
  beforeEach(() => {
    // Stub createImageBitmap
    vi.stubGlobal('createImageBitmap', async () => ({
      width: 2400,
      height: 1800,
      close: vi.fn(),
    }));

    HTMLCanvasElement.prototype.getContext = function () {
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    };

    HTMLCanvasElement.prototype.toBlob = function (
      cb: (blob: Blob | null) => void,
      type?: string,
    ) {
      cb(new Blob(['jpeg'], { type: type ?? 'image/jpeg' }));
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a JPEG Blob', async () => {
    const blob = await downscaleImageFile(
      new Blob(['img'], { type: 'image/jpeg' }),
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('respects maxDimension option', async () => {
    let capturedW = 0;
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        drawImage: (_s: unknown, _x: unknown, _y: unknown, w: number) => {
          capturedW = w;
        },
      } as unknown as CanvasRenderingContext2D;
    };

    await downscaleImageFile(new Blob(['img']), { maxDimension: 600 });
    expect(capturedW).toBe(600);
  });
});

// ─── stopStream ───────────────────────────────────────────────────────────────

describe('stopStream', () => {
  it('calls stop() on every track', () => {
    const t1 = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const t2 = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { getTracks: () => [t1, t2] } as unknown as MediaStream;
    stopStream(stream);
    expect(t1.stop).toHaveBeenCalledOnce();
    expect(t2.stop).toHaveBeenCalledOnce();
  });

  it('is a no-op for a stream with no tracks', () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    expect(() => stopStream(stream)).not.toThrow();
  });
});
