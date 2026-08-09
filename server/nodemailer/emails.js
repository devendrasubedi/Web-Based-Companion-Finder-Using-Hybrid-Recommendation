import { VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, WELCOME_EMAIL_TEMPLATE } from "./emailTemplate.js"
import transporter from "./nodemailer.config.js"

export const sendVerificationEmail = async (email, verificationToken, name) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken).replace("{name}", name),
            category: "Email Verification",
        })

        console.log("Email sent sucessfully", response);
    } catch (error) {
        console.log(`Error sending the verification`, error);
        // Don't throw to avoid breaking user flows when email fails
    }
}

export const sendWelcomeEmail = async (email, name) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Welcome to our app",
            html: WELCOME_EMAIL_TEMPLATE.replace("{name}", name),
            category: "Welcome Email",
        });

        console.log("Welcome email sent sucessfully", response)
    } catch (error) {
        console.log("Error sending the welcome email", error)
        // swallow error to avoid failing verification flow
    }
}

export const sendPasswordResetEmail = async (email, resetURL, name) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Reset Your Password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL).replace("{name}", name),
            category: "Password Reset",
        });

        console.log("Password reset email sent successfully", response);
    } catch (error) {
        console.log("Error sending the password reset email", error);
        // don't throw
    }
}

export const sendResetSuccessEmail = async (email, name) => {
    try {
        const response = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Successful",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE.replace("{name}", name),
            category: "Password Reset",
        });
        console.log("Password reset success email sent successfully", response);
    } catch (error) {
        console.log("Error sending the password reset success email", error);
        // don't throw
    }
}