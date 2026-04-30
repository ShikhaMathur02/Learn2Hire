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
    return (
      'Email is not configured on the server. Set SMTP_HOST (or SMTP_SERVICE), SMTP_USER, and SMTP_PASS in backend/.env. ' +
      'For local development without mail, set OTP_ECHO_TO_CLIENT=true (never in production).'
    );
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

const frontendBaseUrl = () =>
  String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Table-based button — renders reliably in Gmail, Outlook, Apple Mail. */
function emailPrimaryButtonHtml(href, label) {
  const safeHref = String(href || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
  const safeLabel = String(label || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-collapse:separate;">
  <tr>
    <td style="border-radius:8px;background-color:#4f46e5;">
      <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 24px;color:#ffffff!important;font-weight:600;font-size:15px;line-height:1.25;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`.trim();
}

function signupPageUrl(email) {
  return `${frontendBaseUrl()}/signup?email=${encodeURIComponent(email)}`;
}

/**
 * Sends signup OTP via SMTP. Throws if configuration is missing or send fails.
 */
async function sendSignupOtpEmail(to, code) {
  const transporter = createTransporter();
  const openSignup = signupPageUrl(to);
  const openSignupAttr = openSignup.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  const subject = 'Your Learn2Hire verification code';
  const text = [
    `Hello,`,
    '',
    `You requested a code to sign up for Learn2Hire using ${to}.`,
    '',
    `Your verification code is: ${code}`,
    '',
    'NEXT STEP — open this link in your browser, paste the code, then tap the green "Verify" button on the page:',
    openSignup,
    '',
    'It expires in 10 minutes. If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>You requested a code to sign up for Learn2Hire using <strong>${to}</strong>.</p>
    <p>Your verification code is:</p>
    <p style="font-size: 1.5rem; font-weight:700; letter-spacing: 0.2em; font-family: monospace;">${code}</p>
    <p style="margin:16px 0 8px;font-weight:600;font-size:15px;color:#111827;font-family:Arial,Helvetica,sans-serif;">Verify this code on the website</p>
    ${emailPrimaryButtonHtml(openSignup, 'Go to signup — then tap Verify')}
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">If the button does not work, copy this link into your browser:<br/><a href="${openSignupAttr}" style="color:#4f46e5;word-break:break-all;">${openSignup}</a></p>
    <p style="color:#555;font-size:0.9rem;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">On the signup page: paste the code into <strong>Email verification code</strong>, then press the green <strong>Verify</strong> button. The code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
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
  return `${frontendBaseUrl()}/forgot-password?email=${encodeURIComponent(email)}`;
}

/**
 * Sends password-reset OTP via SMTP (student, faculty, college).
 */
async function sendPasswordResetOtpEmail(to, code) {
  const transporter = createTransporter();
  const openAppLink = passwordResetPageUrl(to);
  const openAppLinkAttr = openAppLink.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  const subject = 'Reset your Learn2Hire password';
  const text = [
    `Hello,`,
    '',
    `We received a request to reset the password for ${to} on Learn2Hire.`,
    '',
    `Your verification code is: ${code}`,
    '',
    `Open the reset page, enter the code, click "Verify code", then set a new password:`,
    openAppLink,
    '',
    'This code expires in 10 minutes. If you did not request a reset, ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>We received a request to reset the password for <strong>${to}</strong> on Learn2Hire.</p>
    <p>Your verification code is:</p>
    <p style="font-size: 1.5rem; font-weight:700; letter-spacing: 0.2em; font-family: monospace;">${code}</p>
    <p style="margin:16px 0 8px;font-weight:600;font-size:15px;color:#111827;font-family:Arial,Helvetica,sans-serif;">Check your code on the website</p>
    ${emailPrimaryButtonHtml(openAppLink, 'Go to reset page — then tap Verify code')}
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">If the button does not work, copy this link:<br/><a href="${openAppLinkAttr}" style="color:#4f46e5;word-break:break-all;">${openAppLink}</a></p>
    <p style="color:#555;font-size:0.9rem;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">Enter the code, tap <strong>Verify code</strong>, then set a new password and tap <strong>Update password</strong>. This code expires in 10 minutes. If you did not request a reset, you can ignore this email.</p>
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

const loginPageUrl = () => `${frontendBaseUrl()}/login`;

/**
 * Notifies a user by email that their registration/approval request was approved.
 * Does not throw: logs on failure. Skips silently when SMTP is not configured.
 *
 * @param {string} toEmail
 * @param {{ recipientName?: string, variant: string }} opts
 *   variant: 'college' | 'student' | 'company' | 'faculty_full' | 'faculty_pending_platform' | 'faculty_pending_campus'
 */
async function sendApprovalGrantedEmail(toEmail, opts) {
  const to = String(toEmail || '').trim().toLowerCase();
  if (!to) {
    console.warn('[Learn2Hire] Approval email skipped (no recipient address)');
    return { sent: false, reason: 'no_email' };
  }

  if (!isSmtpConfigured()) {
    console.error(
      '[Learn2Hire] Approval email NOT sent — SMTP is not configured. Set SMTP_USER, SMTP_PASS, and SMTP_HOST or SMTP_SERVICE in backend/.env (same as signup OTP). Recipient:',
      to
    );
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const name = String(opts?.recipientName || '').trim();
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const variant = opts?.variant || 'student';
  const loginUrl = loginPageUrl();
  const loginUrlAttr = loginUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  const copy = {
    college: {
      subject: 'Your account request was approved - Learn2Hire',
      lead: 'Your college account request on Learn2Hire has been approved.',
      detail:
        'You can sign in now with the email you registered with and your password. After signing in, you can manage your campus, roster, learning materials, and more.',
    },
    student: {
      subject: 'Your account request was approved - Learn2Hire',
      lead: 'Your student account request on Learn2Hire has been approved.',
      detail:
        'You can sign in now with the email you registered with and your password to access learning materials, assessments, jobs, and your profile.',
    },
    company: {
      subject: 'Your account request was approved - Learn2Hire',
      lead: 'Your company account request on Learn2Hire has been approved.',
      detail:
        'You can sign in now with the email you registered with and your password to post roles and manage hiring.',
    },
    faculty_full: {
      subject: 'Your account request was approved - Learn2Hire',
      lead: 'Your faculty account request on Learn2Hire has been fully approved.',
      detail:
        'You can sign in now with the email you registered with and your password to manage learning content, assessments, and campus tools.',
    },
    faculty_pending_platform: {
      subject: 'Your college approved your faculty request — Learn2Hire',
      lead: 'Your college has approved your faculty request on Learn2Hire.',
      detail:
        'A Learn2Hire platform administrator must still approve your account. You will receive another email when you can sign in and use the full platform.',
    },
    faculty_pending_campus: {
      subject: 'Platform approved your faculty account — Learn2Hire',
      lead: 'The Learn2Hire platform has approved your faculty account.',
      detail:
        'Your college must still approve your join request before you can access the platform. You will receive another email when your campus has approved you.',
    },
  };

  const block = copy[variant] || copy.student;
  const subject = block.subject;
  const text = [
    greeting,
    '',
    block.lead,
    '',
    block.detail,
    '',
    'Sign in:',
    loginUrl,
    '',
    'If you did not register on Learn2Hire, you can ignore this email.',
  ].join('\n');

  const safeName = name
    ? name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : '';
  const greetingHtml = name
    ? `<p>Hello <strong>${safeName}</strong>,</p>`
    : '<p>Hello,</p>';

  const html = `
    ${greetingHtml}
    <p>${block.lead}</p>
    <p style="color:#374151;font-size:15px;line-height:1.55;font-family:Arial,Helvetica,sans-serif;">${block.detail}</p>
    <p style="margin:16px 0 8px;font-weight:600;font-size:15px;color:#111827;font-family:Arial,Helvetica,sans-serif;">Sign in to Learn2Hire</p>
    ${emailPrimaryButtonHtml(loginUrl, 'Go to sign in')}
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">If the button does not work, copy this link:<br/><a href="${loginUrlAttr}" style="color:#4f46e5;word-break:break-all;">${loginUrl}</a></p>
    <p style="color:#555;font-size:0.9rem;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">If you did not register on Learn2Hire, you can ignore this email.</p>
  `.trim();

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
    });
    console.info(`[Learn2Hire] Approval email sent to ${to} (${variant})`);
    return { sent: true };
  } catch (err) {
    console.error(
      '[Learn2Hire] sendApprovalGrantedEmail failed for',
      to,
      humanizeSmtpError(err) || err.message || err
    );
    return { sent: false, reason: 'send_failed', error: humanizeSmtpError(err) };
  }
}

/** User-facing message when OTP email cannot be sent because SMTP env vars are missing. */
function smtpNotConfiguredClientMessage() {
  return (
    'Email is not configured on the server. In the backend folder, copy .env.example to .env, set SMTP_HOST (or SMTP_SERVICE), SMTP_USER, and SMTP_PASS, then restart the API. ' +
    'Gmail needs an App Password, not your normal password. Signup and password reset use the same SMTP. ' +
    'For local development without mail, set OTP_ECHO_TO_CLIENT=true in backend/.env (never in production).'
  );
}

module.exports = {
  isSmtpConfigured,
  humanizeSmtpError,
  smtpNotConfiguredClientMessage,
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail,
  sendApprovalGrantedEmail,
};
