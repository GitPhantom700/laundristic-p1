import { useCallback, useEffect, useState } from 'react';

/**
 * The `beforeinstallprompt` event is not in the standard DOM lib types, so we
 * describe the shape we rely on here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface UseInstallPromptReturn {
  /** iOS Safari, where installing is a manual Share → Add to Home Screen flow. */
  isIos: boolean;
  /** Running as an already-installed PWA (opened from the home screen). */
  isStandalone: boolean;
  /** The app was installed during this session (`appinstalled` fired). */
  installed: boolean;
  /** A native install prompt is available (Chromium: Android / desktop). */
  canInstall: boolean;
  /** Show the browser's native install prompt. Resolves to the user's choice. */
  promptInstall: () => Promise<InstallOutcome>;
}

// `beforeinstallprompt` fires once, early in page load — typically while the
// Welcome screen is mounted and before the post-onboarding banner exists. We
// capture it at module scope so every consumer shares the same deferred prompt
// regardless of when it mounts, and notify subscribers when the state changes.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stop Chrome's default mini-infobar; we present our own install affordance.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

function detectIos(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function detectStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  // iOS Safari exposes navigator.standalone; other browsers use the media query.
  if (nav.standalone === true) return true;
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(display-mode: standalone)').matches
    : false;
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null);
  const [wasInstalled, setWasInstalled] = useState(() => installed);
  const [isStandalone, setIsStandalone] = useState(() => detectStandalone());

  useEffect(() => {
    const sync = () => {
      setCanInstall(deferredPrompt !== null);
      setWasInstalled(installed);
      setIsStandalone(detectStandalone());
    };
    listeners.add(sync);
    // Re-sync in case the event fired between the initial render and this effect.
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // A deferred prompt can only be used once.
    deferredPrompt = null;
    notify();
    return outcome;
  }, []);

  return {
    isIos: detectIos(),
    isStandalone,
    installed: wasInstalled,
    canInstall,
    promptInstall,
  };
}
