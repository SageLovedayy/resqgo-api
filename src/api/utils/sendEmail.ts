import { EMAIL_USER, EMAIL_PASS, SENDGRID_API_KEY } from "../../config/keys.js";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "sendgrid";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

export class GmailSmtpProvider implements EmailProvider {
  private transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS, // App password
    },
  });

  async send({ to, subject, html }: EmailPayload): Promise<void> {
    await this.transporter.sendMail({
      //   from: EMAIL_USER!,
      from: `"Digital Health Africa" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  }
}

export class SendGridProvider implements EmailProvider {
  constructor() {
    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not defined");
    }
    sgMail.setApiKey(SENDGRID_API_KEY);
  }

  async send({ to, subject, html }: EmailPayload): Promise<void> {
    await sgMail.send({
      to,
      //   from: EMAIL_USER!,
      from: `"Digital Health Africa" <${EMAIL_USER}>`,
      subject,
      html,
    });
  }
}

export function createEmailProvider(): EmailProvider {
  switch (EMAIL_PROVIDER) {
    case "gmail":
      return new GmailSmtpProvider();
    case "sendgrid":
      return new SendGridProvider();
    default:
      return new SendGridProvider();
  }
}

const provider = createEmailProvider();

//Generic and used in password reset function too
export default async function sendEmail(
  to: string,
  subject: string,
  html: string,
) {
  try {
    await provider.send({ to, subject, html });
    console.log(`✅ Email sent to: ${to}`);
  } catch (error: any) {
    console.error("SendGrid status:", error.code);
    console.error("SendGrid body:", error.response?.body);
    console.error("EMAIL FROM: ", EMAIL_USER, "key: ", SENDGRID_API_KEY);
    throw error;
  }
  // } catch (error) {
  //   console.error("🚨 Email sending failed:", error);
  //   throw error;
  // }
}

// const sendEmail = async (
//   to: string,
//   subject: string,
//   html: string,
// ): Promise<SentMessageInfo> => {
//   try {
//     const mailOptions = {
//       from: `"Digital Health Africa" <${EMAIL_USER}>`,
//       to,
//       subject,
//       html,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log(`✅ Email sent to: ${to}`);
//     console.log("📩 Message ID:", info.messageId);
//     return info;
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       console.error("🚨 Email sending failed:", error.message);
//       throw new AppError("Internal Server Error", 500);
//     }
//     console.error("Failed to send email: unknown error");
//     throw new AppError("Internal Server Error", 500);
//   }
// };
