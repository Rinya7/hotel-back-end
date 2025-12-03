// src/services/email.service.ts
// Сервіс для відправки email через SMTP

import nodemailer, { Transporter } from "nodemailer";

/**
 * Створює транспортер для відправки email
 * Використовує налаштування з environment variables
 */
function createTransporter(): Transporter {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || "noreply@hotel-lotse.app";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error(
      "SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env"
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Відправка email з посиланням на бронювання
 * @param to - email адреса отримувача
 * @param subject - тема листа
 * @param link - посилання на бронювання
 * @param guestName - ім'я гостя (опціонально)
 * @returns Promise з результатом відправки
 */
export async function sendGuestAccessLinkEmail(
  to: string,
  subject: string,
  link: string,
  guestName?: string
): Promise<void> {
  const transporter = createTransporter();
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@hotel-lotse.app";

  // Формуємо текст листа
  const greeting = guestName ? `Вітаємо, ${guestName}!` : "Вітаємо!";
  const body = `${greeting}\n\nОсь ваш лінк для доступу до інформації про проживання:\n\n${link}\n\nЗ повагою,\nКоманда Hotel Lotse`;

  const mailOptions = {
    from: smtpFrom,
    to,
    subject,
    text: body,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">${greeting}</h2>
        <p>Ось ваш лінк для доступу до інформації про проживання:</p>
        <p style="margin: 20px 0;">
          <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px;">
            Відкрити інформацію про проживання
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Або скопіюйте це посилання в браузер:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">З повагою,<br>Команда Hotel Lotse</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${to}:`, info.messageId);
  } catch (error) {
    console.error("[Email Service] Error sending email:", error);
    throw new Error(
      `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}


