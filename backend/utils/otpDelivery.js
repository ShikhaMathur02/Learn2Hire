const nodemailer = require('nodemailer');

/** Gmail app passwords are often pasted with spaces; SMTP expects16 chars without spaces. */
function smtpPassFromEnv() {
  return String(process.env.SMTP_PASS || '')
    .trim()
    .replace(/\s+/g, '');
}

function isSmtpConfigured() {
  const service = String(process.env.SMTP_SERVICE || '').trim();
  const host = String(process.env.SMTP_HOST || '').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = smtpPassFromEnv();
  if (!user || !pass) return false;
  if (service) return true;
  return Boolean(host);
}

/**
 * Maps nodemailer / provider errors to a safe, actionable message for the API client.
 */
function humanizeSmtpError(err) {
  const code = err && err.responseCode;
  const response = String((err && err.response) || '');
  const msg = String((err && err.message) || err || '').toLowerCase();
  const combined = `${msg} ${response} ${code}`.toLowerCase();

  if (msg.includes('smtp is not configured')) {
    return 'Email is not configured on the server. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.';
  }

  if (
    combined.includes('invalid login') ||
    combined.includes('authentication failed') ||
    combined.includes('535') ||
    combined.includes('534') ||
    (combined.includes('auth') && combined.includes('failed'))
  ) {
    return (
      'SMTP sign-in failed. For Gmail you must use a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords), ' +
      'not your normal Gmail password. Remove spaces from the app password in .env if you paste it with spaces.'
    );
  }

  if (
    combined.includes('econnrefused') ||
    combined.includes('etimedout') ||
    combined.includes('econnreset') ||
    combined.includes('getaddrinfo') ||
    combined.includes('enotfound')
  ) {
    return (
      'Could not reach the mail server. Check SMTP_HOST and SMTP_PORT, your internet connection, and firewall. ' +
      'For Gmail try port 587 with SMTP_SECURE=false.'
    );
  }

  if (combined.includes('certificate') || combined.includes('ssl') || combined.includes('tls')) {
    return (
      'TLS error talking to the mail server. Try SMTP_PORT=587 with SMTP_SECURE=false, or port465 with SMTP_SECURE=true.'
    );
  }

  if (combined.includes('spam') || combined.includes('550') || combined.includes('blocked')) {
    return 'The mail provider rejected the message. Check From address (SMTP_FROM) and the recipient.';
  }

  return 'Could not send verification email. Check SMTP settings and try again.';
}

function createTransporter() {
  if (!isSmtpConfigured()) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment (see .env).'
    );
  }

  const user = String(process.env.SMTP_USER || '').trim();
  const pass = smtpPassFromEnv();
  const service = String(process.env.SMTP_SERVICE || '').trim();

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
      connectionTimeout: 25_000,
    });
  }

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  const isGmail = /gmail\.com/i.test(host) || String(process.env.SMTP_USE_GMAIL_PRESET || '').toLowerCase() === 'true';

  const transportOptions = {
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 25_000,
  };

  if (isGmail && !secure) {
    transportOptions.requireTLS = true;
  }

  return nodemailer.createTransport(transportOptions);
}

function fromAddress() {
  const explicit = String(process.env.SMTP_FROM || '').trim();
  if (explicit) return explicit;
  const name = String(process.env.SMTP_FROM_NAME || 'Learn2Hire').trim();
  const user = String(process.env.SMTP_USER || '').trim();
  return `"${name}" <${user}>`;
}

/**
 * Sends signup OTP via SMTP. Throws if configuration is missing or send fails.
 */
async function sendSignupOtpEmail(to, code) {
  const transporter = createTransporter();

  const subject = 'Your Learn2Hire verification code';
  const text = [
    `Hello,`,
    '',
    `You requested a code to sign up for Learn2Hire using ${to}.`,
    '',
    `Your verification code is: ${code}`,
    '',
    'It expires in 10 minutes. If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>You requested a code to sign up for Learn2Hire using <strong>${to}</strong>.</p>
    <p>Your verification code is:</p>
    <p style="font-size: 1.5rem; font-weight:700; letter-spacing: 0.2em; font-family: monospace;">${code}</p>
    <p style="color: #555; font-size: 0.9rem;">It expires in 10 minutes. If you did not request this, you can ignore this email.</p>
  `.trim();

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    err.smtpClientMessage = humanizeSmtpError(err);
    throw err;
  }
}

function passwordResetPageUrl(email) {
  const base = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/forgot-password?email=${encodeURIComponent(email)}`;
}

/**
 * Sends password-reset OTP via SMTP (student, faculty, college).
 */
async function sendPasswordResetOtpEmail(to, code) {
  const transporter = createTransporter();
  const openAppLink = passwordResetPageUrl(to);

  const subject = 'Reset your Learn2Hire password';
  const text = [
    `Hello,`,
    '',
    `We received a request to reset the password for ${to} on Learn2Hire.`,
    '',
    `Your verification code is: ${code}`,
    '',
    `Open the reset page in your browser (you will enter this code there):`,
    openAppLink,
    '',
    'This code expires in 10 minutes. If you did not request a reset, ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>We received a request to reset the password for <strong>${to}</strong> on Learn2Hire.</p>
    <p>Your verification code is:</p>
    <p style="font-size: 1.5rem; font-weight:700; letter-spacing: 0.2em; font-family: monospace;">${code}</p>
    <p><a href="${openAppLink}" style="color: #4f46e5;">Open the password reset page</a> and enter the code above.</p>
    <p style="color: #555; font-size: 0.9rem;">This code expires in 10 minutes. If you did not request a reset, you can ignore this email.</p>
  `.trim();

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    err.smtpClientMessage = humanizeSmtpError(err);
    throw err;
  }
}

module.exports = {
  isSmtpConfigured,
  humanizeSmtpError,
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail,
};
