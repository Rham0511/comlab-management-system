import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const envFallback = (keys) => keys.map((key) => process.env[key]?.trim()).find((value) => value);

const smtpConfigKeys = {
  host: ['SMTP_HOST', 'MAIL_HOST'],
  port: ['SMTP_PORT', 'MAIL_PORT'],
  user: ['SMTP_USER', 'MAIL_USERNAME'],
  pass: ['SMTP_PASS', 'MAIL_PASSWORD'],
  from: ['MAIL_FROM', 'MAIL_FROM_ADDRESS', 'SMTP_USER', 'SMTP_USERNAME']
};

export const getSmtpConfigStatus = () => {
  const missing = Object.entries(smtpConfigKeys)
    .filter(([key, names]) => {
      if (key === 'from') return false;
      return !envFallback(names);
    })
    .map(([key, names]) => names.join(' / '));

  return {
    isConfigured: missing.length === 0,
    missing
  };
};

const getTransportConfig = () => {
  const host = envFallback(smtpConfigKeys.host);
  const port = Number(envFallback(smtpConfigKeys.port) || 587);
  const user = envFallback(smtpConfigKeys.user);
  const pass = envFallback(smtpConfigKeys.pass);
  return { host, port, user, pass };
};

const getTransport = () => {
  const { host, port, user, pass } = getTransportConfig();
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    family: 4, // Force IPv4
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000
  });
};

const maskValue = (value) => {
  if (!value) return 'undefined';
  return value.length <= 4 ? '****' : `${value.slice(0, 2)}***${value.slice(-1)}`;
};

export const sendMail = async ({ to, subject, html, text }) => {
  console.log('[mailer] Email attempting to send...');
  console.log(`[mailer] Recipient: ${to}`);

  const config = getTransportConfig();
  console.log(`[mailer] SMTP config resolved: host=${config.host || 'missing'}, port=${config.port}, user=${maskValue(config.user)}, pass=${config.pass ? '***' : 'missing'}`);

  const transport = getTransport();
  if (!transport) {
    const error = new Error('SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS or MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD)');
    console.error('[mailer] Email failed:', error.message);
    throw error;
  }

  const from =
  envFallback(smtpConfigKeys.from) ||
  envFallback(smtpConfigKeys.user);

const fromName =
  envFallback(['MAIL_FROM_NAME']) ||
  'ComLab';

const formattedFrom = `"${fromName}" <${from}>`;

console.log(`[mailer] SMTP sender: ${formattedFrom}`);

try {
  const info = await transport.sendMail({
    from: formattedFrom,
    to,
    subject,
    html,
    text
  });
    console.log('[mailer] Email sent successfully');
    console.log(`[mailer] Message ID: ${info?.messageId || 'unknown'}`);
    return info;
  } catch (error) {
    console.error('[mailer] Email failed:', error?.message || error);
    throw error;
  }
};

/**
 * Send a styled 6-digit OTP email.
 * @param {object} opts
 * @param {string} opts.to       - recipient email
 * @param {string} opts.name     - recipient display name
 * @param {string} opts.otp      - 6-digit code
 * @param {'registration'|'password_reset'} opts.purpose
 */
export const sendOtpMail = async ({ to, name, otp, purpose }) => {
  const isReset   = purpose === 'password_reset';
  const subject   = isReset ? '🔐 Reset Your ComLab Password' : '✅ Verify Your ComLab Account';
  const heading   = isReset ? 'Password Reset Request' : 'Welcome to ComLab!';
  const subheading = isReset ? 'Secure your account' : 'Verify your email address';
  const bodyText  = isReset
    ? `We received a request to reset your password for your ComLab account. To proceed with resetting your password, please use the verification code below.`
    : `Thank you for registering with ComLab! We're excited to have you on board. Please verify your email address using the code below to complete your registration and access all features.`;
  const actionText = isReset
    ? `Enter this code on the password reset page to create your new password.`
    : `Enter this code on the registration page to activate your account.`;

  // Plain text version (fallback if HTML is blocked)
  const text = `
${heading}

Hello ${name || 'there'},

${bodyText}

Your verification code is:

    ${otp}

${actionText}

⏱️ This code will expire in 10 minutes for security reasons.

If you did not request this, please ignore this email. Your account remains secure.

---
ComLab - Computer Laboratory Facilities Management System
This is an automated message. Please do not reply to this email.
`;

  // Enhanced HTML with premium UI design and improved messaging
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  
  <!-- Outer Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#0a0f1e;padding:40px 20px;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background-color:#1a1f2e;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;border:1px solid rgba(16,185,129,0.15);">

          <!-- Decorative Top Bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#059669 0%,#10b981 50%,#34d399 100%);height:6px;"></td>
          </tr>

          <!-- Header Section with Icon -->
          <tr>
            <td style="background:linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%);padding:48px 40px;text-align:center;position:relative;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center">
                    <!-- Icon Container -->
                    <div style="background:rgba(16,185,129,0.2);width:96px;height:96px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:24px;border:3px solid rgba(16,185,129,0.3);box-shadow:0 10px 25px rgba(16,185,129,0.15);">
                      <div style="font-size:52px;line-height:1;">${isReset ? '🔐' : '✉️'}</div>
                    </div>
                    
                    <!-- Main Heading -->
                    <h1 style="margin:0 0 8px;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">
                      ${heading}
                    </h1>
                    
                    <!-- Subheading -->
                    <p style="margin:0;color:#6ee7b7;font-size:15px;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;">
                      ${subheading}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Section -->
          <tr>
            <td style="padding:56px 48px;background-color:#1a1f2e;">
              
              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;color:#f8fafc;font-size:20px;font-weight:600;line-height:1.4;">
                      Hello <span style="color:#10b981;font-weight:700;">${name || 'there'}</span> 👋
                    </p>
                    <p style="margin:0 0 32px;color:#cbd5e1;font-size:16px;line-height:1.7;">
                      ${bodyText}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- OTP Code Section - Centered & Enhanced -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center" style="padding:40px 0;">
                    
                    <!-- OTP Container -->
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:linear-gradient(135deg,#022c22 0%,#064e3b 100%);border:4px solid #10b981;border-radius:20px;box-shadow:0 20px 25px -5px rgba(16,185,129,0.25),0 10px 10px -5px rgba(16,185,129,0.15),inset 0 2px 4px rgba(16,185,129,0.1);padding:40px 56px;">
                      <tr>
                        <td align="center">
                          <!-- Label -->
                          <p style="margin:0 0 20px;color:#6ee7b7;font-size:11px;text-transform:uppercase;letter-spacing:3px;font-weight:800;">
                            YOUR VERIFICATION CODE
                          </p>
                          
                          <!-- OTP Code -->
                          <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                            <tr>
                              <td align="center" style="background:rgba(16,185,129,0.1);border-radius:12px;padding:8px 16px;">
                                <p style="margin:0;color:#10b981;font-size:56px;font-weight:900;letter-spacing:16px;font-family:'Courier New',Courier,monospace;text-shadow:0 4px 8px rgba(0,0,0,0.4);line-height:1;">
                                  ${otp}
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Copy Note -->
                          <p style="margin:20px 0 0;color:#6ee7b7;font-size:13px;font-weight:500;">
                            📋 Copy and paste this code
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>

              <!-- Action Text -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center" style="padding:0 0 40px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.6;">
                      ${actionText}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiry Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="background:linear-gradient(135deg,rgba(251,191,36,0.08) 0%,rgba(251,191,36,0.12) 100%);border-left:5px solid #fbbf24;border-radius:12px;padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="padding-right:16px;vertical-align:top;width:32px;">
                          <div style="font-size:28px;line-height:1;">⏱️</div>
                        </td>
                        <td>
                          <p style="margin:0 0 6px;color:#fcd34d;font-size:15px;font-weight:700;line-height:1.5;">
                            Time-Sensitive Code
                          </p>
                          <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.6;">
                            This verification code will <strong style="color:#fbbf24;">expire in 10 minutes</strong> for security purposes. Please complete the verification process promptly.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:32px;">
                <tr>
                  <td style="background:rgba(148,163,184,0.08);border-radius:12px;padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="padding-right:16px;vertical-align:top;width:32px;">
                          <div style="font-size:24px;line-height:1;">🔒</div>
                        </td>
                        <td>
                          <p style="margin:0 0 4px;color:#94a3b8;font-size:14px;line-height:1.6;">
                            <strong style="color:#cbd5e1;">Didn't request this?</strong>
                          </p>
                          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                            If you didn't initiate this request, you can safely ignore this email. Your account remains secure and no changes have been made.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0;height:1px;background:linear-gradient(90deg,transparent 0%,rgba(148,163,184,0.2) 50%,transparent 100%);"></td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color:#0f1419;padding:40px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center">
                    <!-- Logo/Brand Name -->
                    <p style="margin:0 0 12px;color:#10b981;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                      🖥️ ComLab
                    </p>
                    
                    <!-- System Name -->
                    <p style="margin:0 0 20px;color:#64748b;font-size:13px;font-weight:600;line-height:1.5;">
                      Computer Laboratory Facilities Management System
                    </p>
                    
                    <!-- Disclaimer -->
                    <p style="margin:0 0 16px;color:#475569;font-size:12px;line-height:1.6;">
                      This is an automated message from ComLab. Please do not reply to this email.<br>
                      For support or inquiries, please contact your system administrator.
                    </p>
                    
                    <!-- Divider Line -->
                    <div style="margin:20px auto;width:80px;height:3px;background:linear-gradient(90deg,transparent 0%,#10b981 50%,transparent 100%);border-radius:2px;"></div>
                    
                    <!-- Copyright -->
                    <p style="margin:0;color:#3f4a5a;font-size:11px;">
                      © ${new Date().getFullYear()} ComLab. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Bottom Spacing & Additional Info -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;margin-top:24px;">
          <tr>
            <td align="center">
              <p style="margin:0;color:#475569;font-size:11px;line-height:1.5;">
                If you're having trouble viewing this email, please check your email client settings.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
  
</body>
</html>`;

  return sendMail({ to, subject, html, text });
};