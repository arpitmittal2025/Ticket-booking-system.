import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const fromEmail = process.env.MAIL_FROM || 'Ticketing <onboarding@resend.dev>';

// Ethereal mock transporter
let mockTransporter: nodemailer.Transporter | null = null;
async function getMockTransporter() {
  if (mockTransporter) return mockTransporter;
  const testAccount = await nodemailer.createTestAccount();
  mockTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  return mockTransporter;
}

export async function sendBookingConfirmation(to: string, reference: string, qrPng: Buffer) {
  try {
    const isResendConfigured = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxx';
    
    if (isResendConfigured) {
      await resend.emails.send({
        from: fromEmail,
        to,
        subject: `Your Booking Confirmation: ${reference}`,
        html: `<p>Thank you for your booking!</p><p>Your reference is <strong>${reference}</strong>.</p><p>Please find your ticket attached below.</p><img src="cid:qr" alt="QR Ticket" />`,
        attachments: [
          {
            filename: 'ticket.png',
            content: qrPng,
            content_id: 'qr'
          }
        ]
      });
      console.log(`[Email] Sent confirmation to ${to} for booking ${reference}`);
    } else {
      console.log(`[Email Mock] Sending confirmation to ${to} for booking ${reference} via Ethereal...`);
      const transporter = await getMockTransporter();
      const info = await transporter.sendMail({
        from: '"Ticketing System" <mock@ethereal.email>',
        to,
        subject: `Your Booking Confirmation: ${reference}`,
        html: `<p>Thank you for your booking!</p><p>Your reference is <strong>${reference}</strong>.</p><p>Please find your ticket attached below.</p><img src="cid:qr" alt="QR Ticket" />`,
        attachments: [
          {
            filename: 'ticket.png',
            content: qrPng,
            cid: 'qr' // nodemailer uses 'cid' instead of 'content_id'
          }
        ]
      });
      console.log(`[Email Mock Success] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error('[Email Error]', error);
  }
}

export async function sendWaitlistOffer(to: string, token: string) {
  try {
    const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/offers/${token}`;
    const isResendConfigured = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxx';

    if (isResendConfigured) {
      await resend.emails.send({
        from: fromEmail,
        to,
        subject: `Waitlist Seat Available!`,
        html: `<p>A seat has opened up for a show you waitlisted for.</p><p>Click <a href="${link}">here</a> to claim it before it expires.</p>`
      });
      console.log(`[Email] Sent waitlist offer to ${to}`);
    } else {
      console.log(`[Email Mock] Sending waitlist offer to ${to} via Ethereal...`);
      const transporter = await getMockTransporter();
      const info = await transporter.sendMail({
        from: '"Ticketing System" <mock@ethereal.email>',
        to,
        subject: `Waitlist Seat Available!`,
        html: `<p>A seat has opened up for a show you waitlisted for.</p><p>Click <a href="${link}">here</a> to claim it before it expires.</p>`
      });
      console.log(`[Email Mock Success] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error('[Email Error]', error);
  }
}
