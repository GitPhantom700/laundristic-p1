/* eslint-disable react-hooks/set-state-in-effect --
 * This hook exists to centralise the one place the app legitimately needs the
 * pattern, so the rule is disabled here rather than at nine call sites.
 */
import { useEffect, useState } from 'react';

/**
 * Derives an object URL from a Blob and revokes it once the blob changes or
 * the component unmounts. Returns null when there is no blob.
 *
 * Every garment/receipt thumbnail in the app needs this, and each one used to
 * carry its own useState + useEffect copy.
 *
 * The URL has to be created inside the effect rather than memoised during
 * render: the cleanup revokes it, and StrictMode runs mount -> cleanup ->
 * mount, so a render-time value would be revoked by that first cleanup and
 * never recreated (the blob dependency has not changed). That left the receipt
 * on the proof screen pointing at a revoked URL.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return url;
}
