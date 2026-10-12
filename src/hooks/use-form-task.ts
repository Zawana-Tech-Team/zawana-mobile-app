import { useEffect, useRef, useState } from 'react';

/** Prevent duplicate taps and avoid UI updates after navigating away. */
export function useFormTask() {
  const active = useRef(true);
  const locked = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const run = async (task: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setLoading(true);
    setError(null);
    try { await task(); }
    catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : 'Unable to continue. Please try again.'); }
    finally { locked.current = false; if (active.current) setLoading(false); }
  };
  return { loading, error, setError, run };
}
