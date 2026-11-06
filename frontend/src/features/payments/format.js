export const methodLabel = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile money',
};

export const methodOptions = Object.entries(methodLabel).map(([value, label]) => ({ value, label }));

export const studentName = (student) => `${student.lastName} ${student.firstName}`;

// Value of an <input type="date"> for today ("2026-11-06")
export const todayInput = () => new Date().toISOString().slice(0, 10);

// Status of an installment, as computed by the backend: [badge tone, label]
export const installmentStatus = {
  PAID: ['success', 'Payé'],
  PARTIAL: ['warning', 'Partiel'],
  UNPAID: ['neutral', 'Impayé'],
};