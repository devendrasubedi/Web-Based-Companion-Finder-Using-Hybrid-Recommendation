import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter;
if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn("EMAIL_USER or EMAIL_PASS not set. Email sending will be skipped.");
  // Provide a no-op transporter with a sendMail method to avoid throwing
  transporter = {
    sendMail: async (mailOptions) => {
      console.warn("Skipping sendMail. Mail options:", mailOptions);
      return { accepted: [], rejected: [], response: 'skipped' };
    },
  };
}

export default transporter;