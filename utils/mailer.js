const nodemailer = require('nodemailer');

async function buildTransport() {
  const useEthereal = process.env.SMTP_USE_ETHEREAL === 'true';
  const pass = process.env.SMTP_PASS || '';

  if (useEthereal || !pass) {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return { transporter, from: 'SistoXen <no-reply@sistoxen.test>', isTest: true };
  }

  const host = process.env.SMTP_HOST || 'smtp-mail.outlook.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' ? true : false;
  const user = process.env.SMTP_USER || 'sistoxen@outlook.com';
  const from = process.env.SMTP_FROM || 'sistoxen@outlook.com';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return { transporter, from, isTest: false };
}

async function sendMail({ to, subject, html, text }) {
  const { transporter, from, isTest } = await buildTransport();
  const info = await transporter.sendMail({ from, to, subject, html, text });
  if (isTest) {
    const preview = nodemailer.getTestMessageUrl(info);
    console.warn('📧 Email de teste (Ethereal). Preview URL:', preview);
  }
}

module.exports = { sendMail };
