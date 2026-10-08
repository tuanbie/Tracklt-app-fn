import { useState } from 'react';

/** Timestamp captured once at mount — keeps render pure (no Date.now() during render). */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
