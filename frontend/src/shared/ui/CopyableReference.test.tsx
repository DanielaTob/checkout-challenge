import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { truncateMiddle } from '../utils/text';
import { CopyableReference } from './CopyableReference';

const REF = 'TX-c92a8f13-4b7e-4f0a-9d2c-5e8b1a7c2661';

describe('truncateMiddle', () => {
  it('keeps the head and the last 4 characters', () => {
    expect(truncateMiddle(REF)).toBe('TX-c92a…2661');
  });
  it('leaves short values untouched', () => {
    expect(truncateMiddle('TX-7a1d2c3a')).toBe('TX-7a1d2c3a');
  });
});

describe('CopyableReference', () => {
  const writeText = jest.fn<Promise<void>, [string]>();
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  });
  afterEach(() => jest.useRealTimers());

  it('shows the truncated reference with the full value in title and aria-label', () => {
    render(<CopyableReference value={REF} />);
    const ref = screen.getByText('TX-c92a…2661');
    expect(ref).toHaveAttribute('title', REF);
    expect(ref).toHaveAttribute('aria-label', `Referencia ${REF}`);
    expect(ref).toHaveClass('reference__value');
  });

  it('copies the full reference and confirms it', async () => {
    render(<CopyableReference value={REF} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar referencia' }));
    expect(writeText).toHaveBeenCalledWith(REF);
    expect(screen.getByRole('button', { name: 'Referencia copiada' })).toBeInTheDocument();
    expect(screen.getByText('Referencia copiada', { selector: '[aria-live]' })).toBeInTheDocument();
  });

  it('returns to the copy state after a moment', async () => {
    jest.useFakeTimers();
    render(<CopyableReference value={REF} />);
    await act(async () => {
      screen.getByRole('button', { name: 'Copiar referencia' }).click();
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Referencia copiada' })).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copiar referencia' })).toBeInTheDocument();
  });

  it('tells the user when the clipboard is not available', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<CopyableReference value={REF} />);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar referencia' }));
    expect(screen.getByText('No se pudo copiar', { selector: '[aria-live]' })).toBeInTheDocument();
  });
});
