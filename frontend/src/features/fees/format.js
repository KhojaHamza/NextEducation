// Amounts come from the backend as strings with 3 decimals ("150.000")
export const CURRENCY = 'TND';

const amountFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const formatAmount = (value) => `${amountFormat.format(Number(value))} ${CURRENCY}`;

export const feeTypeLabel = {
  REGISTRATION: 'Inscription',
  TUITION: 'Scolarité',
  OTHER: 'Autre',
};

export const feeTypeTone = { REGISTRATION: 'info', TUITION: 'success', OTHER: 'neutral' };

// "2026-09-15T00:00:00.000Z" -> "2026-09-15" (value of an <input type="date">)
export const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');