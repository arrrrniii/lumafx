'use client';
/**
 * Client island that boots the lumafx runtime. Render it once, e.g. in app/layout.tsx:
 *   import { FxRuntime } from 'lumafx/react/runtime';
 *   <body>{children}<FxRuntime /></body>
 */
import { useEffect } from 'react';
import type { StartOptions } from 'lumafx';

export function FxRuntime(props: StartOptions) {
  useEffect(() => {
    let cancelled = false;
    import('lumafx').then((m) => {
      if (!cancelled) m.start(props);
    });
    return () => {
      cancelled = true;
    };
    // Options are read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
