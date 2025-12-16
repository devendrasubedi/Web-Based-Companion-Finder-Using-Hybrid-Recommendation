import { VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE , PASSWORD_RESET_SUCCESS_TEMPLATE} from "./emailTemplate.js"
import { mailtrapClient, sender } from "./mailtrap.config.js"

export const sendVerificationEmail = async (email , verificationToken) =>{
    const recipient = [{email}]
    try {
        const response = await mailtrapClient.send({
            from : sender,
            to: recipient,
            subject:"Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken  ),
            category: "Email Verification",
        })

        console.log("Email sent sucessfully", response);
    } catch (error) {
        console.log(`Error sending the verification`, error);
        throw new Error(`Error sending the verification email: ${error}`);
    }
}

export const sendWelcomeEmail = async (email , name)=>{
    const recipient = [{email}];
    try {
        const response = await mailtrapClient.send({
            from: sender,
            to:recipient,
            template_uuid: "966cd881-7b0e-4c82-b2d7-e8032d99820c",
            template_variables:{
                "name": name,
            }
        });

        console.log("Welcome email sent sucessfully", response)
    } catch (error) {
        console.log("Error sending the welcome email", response)
        throw new Error(`Error sending the welcome email: ${error}`)
    }
}

export const sendPasswordResetEmail = async (email, resetURL) =>{
    const recipient = [{email}];
    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: "Reset Your Password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
            category: "Password Reset",
        });

        console.log("Password reset email sent successfully", response);
    } catch (error) {
        console.log("Error sending the password reset email", error);
        throw new Error(`Error sending the password reset email: ${error}`);
    }
}

export const sendResetSuccessEmail = async (email) =>{
    const recipient = [{email}];
    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: "Password Reset Successful",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
            category: "Password Reset",
        });
        console.log("Password reset success email sent successfully", response);

    } catch (error) {
        console.log("Error sending the password reset success email", error);
        throw new Error(`Error sending the password reset success email: ${error}`);
    }
}