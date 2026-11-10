import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

const renderModal = (onClose = jest.fn()) => {
  render(
    <Modal title="Pago con tarjeta" onClose={onClose}>
      <label>
        Número <input name="first" />
      </label>
      <button type="button">Otro</button>
    </Modal>,
  );
  return onClose;
};

describe('Modal', () => {
  it('AC-002-11 is an accessible modal dialog labelled by its title', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Pago con tarjeta' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('AC-002-11 moves focus to the first field when it opens', () => {
    renderModal();
    expect(screen.getByRole('textbox', { name: 'Número' })).toHaveFocus();
  });

  it('AC-002-10 closes with the ✕ button', async () => {
    const onClose = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-002-10 closes with the Escape key', async () => {
    const onClose = renderModal();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', async () => {
    const onClose = renderModal();
    await userEvent.keyboard('a');
    expect(onClose).not.toHaveBeenCalled();
  });
});
