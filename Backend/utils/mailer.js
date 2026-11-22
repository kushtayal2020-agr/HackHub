const nodemailer = require('nodemailer');

const port = Number(process.env.MAIL_PORT) || 465;
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port,
  secure: port === 465,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

exports.sendMail = async (to, subject, html) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log('[mail] not configured, skipping email to', to);
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mail] failed to send to', to, '-', err.message);
    return false;
  }
};
