const PDFDocument = require('pdfkit');
const qrcode = require('qrcode');

/**
 * Generates an official, publication-quality A4 landscape PDF certificate.
 * Returns a readable stream of the PDF.
 */
async function generateCertificateStream({
  recipientName,
  recipientCollege,
  roleInTeam,
  teamName,
  hackathonTitle,
  rank,
  certificateId,
  issueDate,
  verificationUrl,
}) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
  });

  const pageWidth = 841.89;
  const pageHeight = 595.28;

  // 1. Double Border Frame
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
    .lineWidth(2.5)
    .stroke('#0f2b5c');

  doc.rect(26, 26, pageWidth - 52, pageHeight - 52)
    .lineWidth(1)
    .stroke('#d97706');

  // Decorative corner accents
  const corners = [
    [32, 32],
    [pageWidth - 32, 32],
    [32, pageHeight - 32],
    [pageWidth - 32, pageHeight - 32],
  ];
  for (const [cx, cy] of corners) {
    doc.circle(cx, cy, 3).fill('#d97706');
  }

  // 2. Organization Header
  doc.fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#0f2b5c')
    .text('HACKHUB COLLEGE INNOVATION NETWORK', 0, 52, { align: 'center', characterSpacing: 2 });

  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('NATIONAL STUDENT PROJECT-BASED LEARNING (PBL) INITIATIVE', 0, 68, { align: 'center', characterSpacing: 1 });

  // 3. Certificate Type Title
  let certType = 'CERTIFICATE OF PARTICIPATION';
  let titleColor = '#0f2b5c';
  let badgeSubtitle = 'for successful completion and project submission in the hackathon';

  if (rank === 1) {
    certType = 'CERTIFICATE OF EXCELLENCE — 1ST PLACE WINNER';
    titleColor = '#b45309';
    badgeSubtitle = 'awarded for achieving the Highest Evaluation Score across all judging rubrics';
  } else if (rank === 2) {
    certType = 'CERTIFICATE OF MERIT — 2ND PLACE RUNNER UP';
    titleColor = '#334155';
    badgeSubtitle = 'awarded for distinguished innovation and outstanding project performance';
  } else if (rank === 3) {
    certType = 'CERTIFICATE OF MERIT — 3RD PLACE';
    titleColor = '#c2410c';
    badgeSubtitle = 'awarded for exceptional creativity and technical implementation';
  }

  doc.fontSize(20)
    .font('Helvetica-Bold')
    .fillColor(titleColor)
    .text(certType, 0, 108, { align: 'center', characterSpacing: 1 });

  doc.fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('THIS IS PROUDLY PRESENTED TO', 0, 142, { align: 'center', characterSpacing: 1.5 });

  // 4. Recipient Name
  doc.fontSize(28)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(recipientName || 'Participant', 0, 168, { align: 'center' });

  // Underline beneath name
  const nameWidth = doc.widthOfString(recipientName || 'Participant');
  const startX = (pageWidth - nameWidth) / 2 - 20;
  doc.moveTo(startX, 202)
    .lineTo(startX + nameWidth + 40, 202)
    .lineWidth(1)
    .stroke('#cbd5e1');

  // 5. College & Performance Statement
  const collegeText = recipientCollege ? `representing ${recipientCollege}` : 'as an individual student innovator';
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#475569')
    .text(collegeText, 0, 212, { align: 'center' });

  doc.fontSize(11)
    .font('Helvetica')
    .fillColor('#475569')
    .text(badgeSubtitle, 0, 234, { align: 'center' });

  // 6. Hackathon Title & Team Name
  doc.fontSize(18)
    .font('Helvetica-Bold')
    .fillColor('#1e40af')
    .text(hackathonTitle, 0, 258, { align: 'center' });

  if (teamName) {
    const roleText = roleInTeam === 'leader' ? 'Team Leader' : 'Team Member';
    doc.fontSize(11)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`as ${roleText} of Team "${teamName}"`, 0, 286, { align: 'center' });
  }

  // 7. Verification QR Code
  try {
    const qrBuffer = await qrcode.toBuffer(verificationUrl || `https://hackhub.test/verify/${certificateId}`, {
      width: 76,
      margin: 1,
      color: { dark: '#0f2b5c', light: '#ffffff' },
    });
    doc.image(qrBuffer, 52, 440, { width: 76, height: 76 });
    doc.fontSize(7)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Scan to Verify', 52, 520, { width: 76, align: 'center' });
  } catch (e) {
    // skip qr on buffer error
  }

  // 8. Signatures & Metadata Block
  // Date
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(issueDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 160, 480);
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Date of Issuance', 160, 496);

  // Certificate ID
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(certificateId, 340, 480, { width: 160, align: 'center' });
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Certificate Identifier', 340, 496, { width: 160, align: 'center' });

  // Signature lines
  // Signature 1: Organiser
  doc.moveTo(560, 474).lineTo(670, 474).lineWidth(1).stroke('#94a3b8');
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('Lead Organiser', 560, 480, { width: 110, align: 'center' });
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Academic Host', 560, 496, { width: 110, align: 'center' });

  // Signature 2: Director / Admin
  doc.moveTo(690, 474).lineTo(800, 474).lineWidth(1).stroke('#94a3b8');
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('HackHub Director', 690, 480, { width: 110, align: 'center' });
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Platform Verification', 690, 496, { width: 110, align: 'center' });

  // 9. Watermark / Security Code at Bottom
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#94a3b8')
    .text(`Digitally generated and cryptographically verifiable by HackHub • ID: ${certificateId}`, 0, 542, {
      align: 'center',
    });

  doc.end();
  return doc;
}

module.exports = {
  generateCertificateStream,
};
