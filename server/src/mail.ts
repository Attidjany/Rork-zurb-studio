import nodemailer from 'nodemailer';

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<'sent' | 'logged'> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[mail] SMTP not configured — would send to ${to}: ${subject}\n${text}`);
    return 'logged';
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM || 'ZURB Studio <no-reply@zenoah.org>', to, subject, text, html });
  return 'sent';
}
