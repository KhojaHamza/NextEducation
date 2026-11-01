import PDFDocument from 'pdfkit';
import { currency, fmt, fmtDate } from '../utils/format.js';
import { METHOD_LABELS } from './messageTemplates.js';

const money = (d) => `${fmt(d).replace('.', ',')} ${currency()}`;
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const streamReceiptPdf = ({ payment, student, schoolYear, schoolClass, account }, res) => {
  const doc = new PDFDocument({
    size: 'A4', margin: 50, info: { Title: `Reçu ${payment.receiptNumber}` },
  });
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(16)
    .text(process.env.SCHOOL_NAME || 'Ecole primaire', 50, 50, { align: 'center', width: 495 });
  doc.fontSize(14).text('REÇU DE PAIEMENT', 50, doc.y + 10, { align: 'center', width: 495 });
  doc.font('Helvetica').fontSize(11)
    .text(`N° ${payment.receiptNumber}`, 50, doc.y + 6, { align: 'center', width: 495 });

  let y = doc.y + 40;
  const line = (label, value, { bold = false } = {}) => {
    doc.font('Helvetica-Bold').fontSize(11).text(label, 50, y, { width: 170 });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(String(value), 230, y, { width: 315 });
    y += 24;
  };
  const rule = () => {
    doc.save().moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor('#999999').stroke().restore();
    y += 14;
  };

  line('Élève', `${student.lastName.toUpperCase()} ${student.firstName}`);
  line('Matricule', student.matricule);
  line('Classe', schoolClass ? `${schoolClass.level} ${schoolClass.section}` : '-');
  line('Année scolaire', schoolYear.label);
  rule();
  line('Date du paiement', fmtDate(payment.paidAt));
  line('Mode de paiement', capitalize(METHOD_LABELS[payment.method]));
  if (payment.reference) line('Référence', payment.reference);
  line('Montant payé', money(payment.amount), { bold: true });
  if (payment.note) line('Remarque', payment.note);

  if (account) {
    rule();
    line('Total dû', money(account.due));
    line('Total payé à ce jour', money(account.paid));
    line('Solde restant', money(account.balance), { bold: true });
  }

  if (payment.cancelledAt) {
    rule();
    line('Annulé le', fmtDate(payment.cancelledAt));
    line('Motif', payment.cancelReason ?? '-');
  }

  y += 40;
  doc.font('Helvetica').fontSize(10).fillColor('#000000')
    .text(`Émis le ${fmtDate(payment.createdAt)}`, 50, y);
  doc.text('Cachet et signature', 390, y);
  doc.moveTo(380, y + 70).lineTo(520, y + 70).lineWidth(0.5).strokeColor('#000000').stroke();

  if (payment.cancelledAt) {
    doc.save();
    doc.rotate(-30, { origin: [300, 420] });
    doc.fillColor('#cc0000').fillOpacity(0.25).font('Helvetica-Bold').fontSize(90)
      .text('ANNULÉ', 90, 380, { lineBreak: false });
    doc.restore();
  }

  doc.end();
};