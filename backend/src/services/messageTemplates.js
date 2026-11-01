import { currency, fmt, fmtDate } from '../utils/format.js';

export const METHOD_LABELS = {
  CASH: 'espèces',
  BANK_TRANSFER: 'virement',
  MOBILE_MONEY: 'mobile money',
};

const full = (s) => `${s.firstName} ${s.lastName}`;

export const paymentReceivedMessage = ({ student, payment, balance }) => ({
  type: 'PAYMENT_RECEIVED',
  title: `Paiement reçu - ${full(student)}`,
  body:
    `Nous avons bien reçu un paiement de ${fmt(payment.amount)} ${currency()} pour ${full(student)}, ` +
    `le ${fmtDate(payment.paidAt)}, par ${METHOD_LABELS[payment.method]}. ` +
    `Reçu n° ${payment.receiptNumber}. Solde restant : ${fmt(balance)} ${currency()}.`,
  data: {
    paymentId: payment.id,
    receiptNumber: payment.receiptNumber,
    receiptPath: `/api/payments/${payment.id}/receipt`,
    studentId: student.id,
    amount: fmt(payment.amount),
    balance: fmt(balance),
  },
  link: `${process.env.CLIENT_URL || ''}/receipts/${payment.id}`,
});

export const paymentCancelledMessage = ({ student, payment, balance }) => ({
  type: 'PAYMENT_CANCELLED',
  title: `Paiement annulé - ${full(student)}`,
  body:
    `Le paiement de ${fmt(payment.amount)} ${currency()} (reçu n° ${payment.receiptNumber}) ` +
    `a été annulé. Solde restant : ${fmt(balance)} ${currency()}. Contactez le secrétariat pour plus d'informations.`,
  data: { paymentId: payment.id, receiptNumber: payment.receiptNumber, studentId: student.id, balance: fmt(balance) },
});

export const reminderMessage = ({ student, balance, overdueAmount }) => ({
  type: 'PAYMENT_REMINDER',
  title: `Rappel de paiement - ${full(student)}`,
  body:
    `Il reste ${fmt(balance)} ${currency()} à régler pour ${full(student)}, dont ` +
    `${fmt(overdueAmount)} ${currency()} d'échéances dépassées. Merci de régulariser la situation auprès du secrétariat.`,
  data: { studentId: student.id, balance: fmt(balance), overdueAmount: fmt(overdueAmount) },
});