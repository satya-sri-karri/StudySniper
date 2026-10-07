import nodemailer from 'nodemailer';

interface SendOtpOptions {
  to: string;
  code: string;
  purpose: 'email_verification' | 'password_reset';
  userName?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else {
    // Fallback transport for development / zero-config environment
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return transporter;
}

export async function sendOtpEmail(options: SendOtpOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, code, purpose, userName } = options;
  const isPasswordReset = purpose === 'password_reset';

  const subject = isPasswordReset
    ? `🔒 ${code} is your StudySniper AI Password Reset Code`
    : `🎯 ${code} is your StudySniper AI Verification Code`;

  const title = isPasswordReset ? 'Reset Your Password' : 'Verify Your Email Address';
  const subtitle = isPasswordReset
    ? 'We received a request to reset the password for your StudySniper AI account.'
    : 'Welcome to StudySniper AI! Please confirm your email address to complete your registration.';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; background: linear-gradient(135deg, #1e1b4b 0%, #31104b 100%); border-bottom: 1px solid #334155;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: #8b5cf6; color: #ffffff; font-size: 24px; font-weight: bold; border-radius: 12px; margin-bottom: 12px;">🎯</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">StudySniper AI</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #a78bfa; font-weight: 500;">Academic Intelligence Engine</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #f1f5f9;">${title}</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hi ${userName || 'there'},<br>${subtitle}
              </p>

              <!-- OTP Code Display Box -->
              <div style="background-color: #0f172a; border: 1px dashed #8b5cf6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #a78bfa; font-weight: 600; margin-bottom: 8px;">Your 6-Digit Verification Code</div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', Courier, monospace; margin: 4px 0;">
                  ${code}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px;">⏱️ Expires in <strong>5 minutes</strong></div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you did not request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #475569;">
              This is an automated security message from StudySniper AI. Please do not reply to this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const fromAddress = process.env.SMTP_FROM || '"StudySniper AI" <noreply@studysniper.ai>';

  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: `${title}\n\nYour 6-digit verification code is: ${code}\nThis code expires in 5 minutes.`
    });

    console.log(`[MAILER] OTP email processed for ${to}. MessageId: ${info.messageId || 'json-mode'}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[MAILER_ERROR] Failed to dispatch OTP email to ${to}:`, err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}
