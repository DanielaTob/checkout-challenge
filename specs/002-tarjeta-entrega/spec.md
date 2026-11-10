# 002 · Tarjeta y datos de entrega

## Objetivo
Capturar en un modal los datos de la tarjeta y de entrega, validarlos en el cliente y detectar la marca, sin que el número completo ni el CVC salgan de la memoria del navegador.

## Alcance
- Modal (pantalla 2) con dos secciones: **Tarjeta** y **Entrega**.
- Utilidades puras: Luhn, detección de marca, validación de fecha y CVC, formateo.
- Logos de VISA y MasterCard (SVG propios, inline).

## Fuera de alcance
- Otras marcas (AMEX, Diners): se rechazan con mensaje.
- Cuotas: siempre 1.
- Autocompletar direcciones.

## Criterios de aceptación
- **AC-002-01** — Dado un número de tarjeta, cuando se valida, entonces es válido solo si pasa el algoritmo de Luhn y tiene 16 dígitos (p. ej. `4242 4242 4242 4242` válido, `4242 4242 4242 4241` inválido).
- **AC-002-02** — Dado que escribo el número, cuando empieza por `4`, entonces se muestra el logo VISA; cuando empieza por `51–55` o `2221–2720`, el logo MasterCard; con cualquier otro prefijo, el mensaje "Solo aceptamos VISA o MasterCard".
- **AC-002-03** — Dado que escribo dígitos, cuando el campo se actualiza, entonces se agrupan de 4 en 4, se ignoran caracteres no numéricos y no se aceptan más de 16 dígitos.
- **AC-002-04** — Dada una fecha `MM/YY`, cuando se valida, entonces es inválida si el mes no está entre 01 y 12, si ya venció (el mes actual es válido) o si está a más de 20 años.
- **AC-002-05** — Dado un CVC, cuando se valida, entonces es válido solo con exactamente 3 dígitos; el campo es de tipo password y `autocomplete="cc-csc"`.
- **AC-002-06** — Dado el nombre del titular, cuando se valida, entonces es obligatorio, solo letras y espacios, y entre 5 y 60 caracteres.
- **AC-002-07** — Dados los datos de entrega, cuando se validan, entonces nombre completo, email válido, teléfono de 10 dígitos, dirección, ciudad, departamento/región y código postal (6 dígitos) son obligatorios, cada error se muestra bajo su campo al salir de él (`blur`) y se anuncia con `aria-invalid` y `aria-describedby`.
- **AC-002-08** — Dado el formulario, cuando hay algún campo inválido, entonces **Continuar** está deshabilitado; cuando todo es válido y lo toco, entonces paso al resumen (`step = 'summary'`).
- **AC-002-09** — Dado que continúo, cuando se guarda el estado, entonces en el slice persistido solo quedan la marca, los últimos 4 dígitos y los datos de entrega; el número completo, la fecha y el CVC quedan solo en un slice en memoria (`cardSession`) que no se persiste.
- **AC-002-10** — Dado el modal abierto, cuando lo cierro (botón ✕ o tecla Esc), entonces vuelvo a la pantalla de producto y los datos de entrega se conservan; los de tarjeta se borran.
- **AC-002-11** — Dado el modal, cuando se abre, entonces tiene `role="dialog"`, `aria-modal="true"`, título asociado y el foco va al primer campo; los campos usan `inputmode="numeric"` y `autocomplete` adecuados (`cc-number`, `cc-exp`, `cc-name`, `email`, `tel`…).

## Casos borde
- Pegar el número con espacios o guiones → se normaliza.
- Fecha escrita como `1/27` → se normaliza a `01/27`.
- Pantalla de 375×667 con teclado abierto → el botón Continuar sigue accesible (contenido con scroll dentro del modal).
