import PDFDocument from 'pdfkit';

const TERM_LABELS = {
  T1: '1er trimestre', T2: '2ème trimestre', T3: '3ème trimestre', ANNUAL: 'Année complète',
};

const fmt = (n) => (n === null || n === undefined ? '-' : n.toFixed(2).replace('.', ','));
const fmtDate = (d) => new Date(d).toISOString().slice(0, 10).split('-').reverse().join('/');

export const streamReportCardPdf = (card, res) => {
  const doc = new PDFDocument({
    size: 'A4', margin: 50,
    info: { Title: `Bulletin - ${card.student.lastName} ${card.student.firstName}` },
  });
  doc.pipe(res);

  // Header
  doc.font('Helvetica-Bold').fontSize(16)
    .text(process.env.SCHOOL_NAME || 'Ecole primaire', { align: 'center' });
  doc.moveDown(0.5).fontSize(14).text('BULLETIN SCOLAIRE', { align: 'center' });
  doc.font('Helvetica').fontSize(10)
    .text(`Année scolaire ${card.schoolYear.label} - ${TERM_LABELS[card.term]}`, { align: 'center' });
  doc.moveDown(1.5);

  // Student block
  doc.fontSize(11).font('Helvetica-Bold')
    .text(`${card.student.lastName.toUpperCase()} ${card.student.firstName}`);
  doc.font('Helvetica')
    .text(`Matricule : ${card.student.matricule}     Né(e) le : ${fmtDate(card.student.birthDate)}`);
  doc.text(`Classe : ${card.class.level} ${card.class.section}`);

  // Table
  const cols = [
    { label: 'Matière', x: 50, w: 235, align: 'left' },
    { label: 'Coef.', x: 285, w: 60, align: 'center' },
    { label: 'Moyenne /20', x: 345, w: 100, align: 'center' },
    { label: 'Moy. classe', x: 445, w: 100, align: 'center' },
  ];
  let y = doc.y + 18;

  const drawRow = (cells, { bold = false, fill = null } = {}) => {
    if (y > 740) { doc.addPage(); y = 50; }
    if (fill) doc.save().rect(50, y - 4, 495, 22).fill(fill).restore();
    doc.save().moveTo(50, y + 18).lineTo(545, y + 18).lineWidth(0.5).strokeColor('#bbbbbb').stroke().restore();
    doc.fillColor('#000000').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    cells.forEach((text, i) => {
      doc.text(text, cols[i].x + 4, y, { width: cols[i].w - 8, align: cols[i].align, lineBreak: false });
    });
    y += 22;
  };

  drawRow(cols.map((c) => c.label), { bold: true, fill: '#e6e6e6' });
  card.subjects.forEach((s) =>
    drawRow([s.name, String(s.coefficient).replace('.', ','), fmt(s.average), fmt(s.classAverage)]));
  drawRow(['Moyenne générale', '', fmt(card.general), fmt(card.classAverage)], { bold: true, fill: '#f3f3f3' });

  // Summary
  y += 14;
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
  doc.text(`Rang : ${card.rank ? `${card.rank} / ${card.rankedCount}` : '-'}`, 50, y);
  doc.text(`Mention : ${card.mention || '-'}`, 50, y + 18);
  doc.font('Helvetica').fontSize(10).text(
    `Absences (demi-journées) : ${card.absences.total} dont ${card.absences.justified} justifiée(s) ` +
    `et ${card.absences.unjustified} non justifiée(s)`,
    50, y + 38,
  );

  // Signatures
  y += 100;
  if (y > 700) { doc.addPage(); y = 80; }
  doc.font('Helvetica').fontSize(10);
  doc.text('Le directeur', 70, y);
  doc.text('Les parents', 390, y);
  doc.moveTo(60, y + 60).lineTo(200, y + 60).lineWidth(0.5).strokeColor('#000000').stroke();
  doc.moveTo(380, y + 60).lineTo(520, y + 60).stroke();

  doc.end();
};