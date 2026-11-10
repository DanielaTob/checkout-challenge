import { useEffect, useId, useRef, type ReactNode } from 'react';
import './modal.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Full-height sheet on mobile, centered card on wider screens. Esc and ✕ close it. */
export function Modal({ title, onClose, children, footer }: Props) {
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal__body" ref={bodyRef}>
          {children}
        </div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
