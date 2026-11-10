import { useEffect, useState } from 'react';
import { truncateMiddle } from '../utils/text';

type CopyState = 'idle' | 'copied' | 'failed';

/** One-line, monospaced reference truncated in the middle, with a copy button. */
export function CopyableReference({ value }: { value: string }) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <span className="reference">
      <span className="reference__value" title={value} aria-label={`Referencia ${value}`}>
        {truncateMiddle(value)}
      </span>
      <button
        type="button"
        className="reference__copy"
        aria-label={state === 'copied' ? 'Referencia copiada' : 'Copiar referencia'}
        title="Copiar referencia"
        onClick={() => void copy()}
      >
        <span aria-hidden="true">{state === 'copied' ? '✓' : '⧉'}</span>
      </button>
      <span className="visually-hidden" aria-live="polite">
        {state === 'copied' ? 'Referencia copiada' : state === 'failed' ? 'No se pudo copiar' : ''}
      </span>
    </span>
  );
}
