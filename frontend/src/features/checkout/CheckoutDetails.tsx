import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Modal } from '../../shared/ui/Modal';
import { formatCardNumber, onlyDigits } from '../../shared/utils/card';
import { validateDelivery, type DeliveryForm } from '../../shared/utils/delivery';
import { CardFields } from './CardFields';
import { setCardSession } from './cardSessionSlice';
import { cardBrand, emptyCard, validateCard, type CardForm } from './cardForm';
import { closeCheckout, saveDetails } from './checkoutSlice';
import { DeliveryFields } from './DeliveryFields';
import './checkout.css';

/** Screen 2: card + delivery modal. The full card number/CVC stay in local state until "Continuar". */
export function CheckoutDetails() {
  const dispatch = useAppDispatch();
  const savedDelivery = useAppSelector((s) => s.checkout.delivery);
  const cardSession = useAppSelector((s) => s.cardSession);

  // Coming back from the summary ("Editar datos") the card is still in memory: prefill it.
  const [card, setCard] = useState<CardForm>(() =>
    cardSession ? { ...cardSession, number: formatCardNumber(cardSession.number) } : emptyCard,
  );
  const [delivery, setDelivery] = useState<DeliveryForm>(savedDelivery);
  const [cardTouched, setCardTouched] = useState<Partial<Record<keyof CardForm, boolean>>>({});
  const [deliveryTouched, setDeliveryTouched] = useState<Partial<Record<keyof DeliveryForm, boolean>>>({});

  const cardErrors = validateCard(card);
  const deliveryErrors = validateDelivery(delivery);
  const brand = cardBrand(card);
  const valid = Object.keys(cardErrors).length === 0 && Object.keys(deliveryErrors).length === 0 && brand !== null;

  const onClose = useCallback(() => dispatch(closeCheckout({ delivery })), [dispatch, delivery]);

  const onContinue = () => {
    if (!valid) return;
    const number = onlyDigits(card.number);
    dispatch(setCardSession({ number, expiry: card.expiry, cvc: card.cvc, holderName: card.holderName.trim() }));
    dispatch(saveDetails({ delivery, card: { brand, last4: number.slice(-4) } }));
  };

  return (
    <Modal
      title="Pago con tarjeta"
      onClose={onClose}
      footer={
        <button type="submit" form="checkout-form" className="button button--primary button--block" disabled={!valid}>
          Continuar
        </button>
      }
    >
      <form
        id="checkout-form"
        className="checkout-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
      >
        <CardFields
          value={card}
          errors={cardErrors}
          touched={cardTouched}
          onChange={setCard}
          onBlur={(f) => setCardTouched((t) => ({ ...t, [f]: true }))}
        />
        <DeliveryFields
          value={delivery}
          errors={deliveryErrors}
          touched={deliveryTouched}
          onChange={setDelivery}
          onBlur={(f) => setDeliveryTouched((t) => ({ ...t, [f]: true }))}
        />
      </form>
    </Modal>
  );
}
