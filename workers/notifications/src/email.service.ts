export class EmailService {
  async send(options: { to: string; subject: string; body: string }) {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      console.log(`[Email] SMTP no configurado — ${options.subject} → ${options.to}`);
      return { sent: false };
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'Catagce <noreply@catagce.com>',
        to: options.to,
        subject: options.subject,
        html: options.body,
      });

      console.log(`[Email] Enviado: ${options.subject} → ${options.to}`);
      return { sent: true };
    } catch (err: any) {
      console.error(`[Email] Error: ${err.message}`);
      return { sent: false };
    }
  }
}
