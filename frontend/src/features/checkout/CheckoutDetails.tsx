import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Modal } from '../../shared/ui/Modal';
import { validateDelivery, type DeliveryForm } from '../../shared/utils/delivery';
import { CardFields } from './CardFields';
import { emptyCard, validateCard, type CardForm } from './cardForm';
import { closeCheckout } from './checkoutSlice';
import { DeliveryFields } from './DeliveryFields';
import './checkout.css';

/** Screen 2: card + delivery modal. The full card number/CVC stay in local state until "Continuar". */
export function CheckoutDetails() {
  const dispatch = useAppDispatch();
  const savedDelivery = useAppSelector((s) => s.checkout.delivery);

  const [card, setCard] = useState<CardForm>(emptyCard);
  const [delivery, setDelivery] = useState<DeliveryForm>(savedDelivery);
  const [cardTouched, setCardTouched] = useState<Partial<Record<keyof CardForm, boolean>>>({});
  const [deliveryTouched, setDeliveryTouched] = useState<Partial<Record<keyof DeliveryForm, boolean>>>({});

  const onClose = useCallback(() => dispatch(closeCheckout()), [dispatch]);

  return (
    <Modal title="Pago con tarjeta" onClose={onClose}>
      <form className="checkout-form" noValidate onSubmit={(e) => e.preventDefault()}>
        <CardFields
          value={card}
          errors={validateCard(card)}
          touched={cardTouched}
          onChange={setCard}
          onBlur={(f) => setCardTouched((t) => ({ ...t, [f]: true }))}
        />
        <DeliveryFields
          value={delivery}
          errors={validateDelivery(delivery)}
          touched={deliveryTouched}
          onChange={setDelivery}
          onBlur={(f) => setDeliveryTouched((t) => ({ ...t, [f]: true }))}
        />
      </form>
    </Modal>
  );
}
