const styles = {
  main: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;`,
  container: `max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05); border: 1px solid #e4e4e7;`,
  header: `background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid #f4f4f5;`,
  brand: `color: #556B2F; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin: 0; text-decoration: none;`,
  body: `padding: 40px;`,
  heading: `color: #18181b; font-size: 24px; font-weight: 600; margin: 0 0 24px; letter-spacing: -0.5px;`,
  text: `color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;`,
  buttonContainer: `text-align: center; margin: 32px 0;`,
  button: `background-color: #556B2F; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 12px rgba(85, 107, 47, 0.2); transition: all 0.2s ease;`,
  codeContainer: `background-color: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; border: 1px solid #e4e4e7;`,
  code: `font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #556B2F;`,
  footer: `background-color: #fafafa; padding: 32px 40px; text-align: center; border-top: 1px solid #f4f4f5;`,
  footerText: `color: #a1a1aa; font-size: 12px; line-height: 1.5; margin: 0;`,
  link: `color: #556B2F; text-decoration: underline;`
};

export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="${styles.main}">
  <div style="${styles.container}">
    <div style="${styles.header}">
      <span style="${styles.brand}">TrekMate</span>
    </div>
    <div style="${styles.body}">
      <h1 style="${styles.heading}">Verify your email address</h1>
      <p style="${styles.text}">Hi <strong>{name}</strong>,</p>
      <p style="${styles.text}">Thanks for starting your journey with TrekMate. We want to make sure it's really you. Please enter the following verification code when prompted. If you don't want to create an account, you can ignore this message.</p>
      
      <div style="${styles.codeContainer}">
        <span style="${styles.code}">{verificationCode}</span>
      </div>
      
      <p style="${styles.text}">This code will expire in 15 minutes.</p>
    </div>
    <div style="${styles.footer}">
      <p style="${styles.footerText}">&copy; ${new Date().getFullYear()} TrekMate Inc. All rights reserved.</p>
      <p style="${styles.footerText}">123 Trailhead Blvd, Mountain View, CA</p>
    </div>
  </div>
</body>
</html>
`;

export const WELCOME_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TrekMate</title>
</head>
<body style="${styles.main}">
  <div style="${styles.container}">
    <div style="${styles.header}">
      <span style="${styles.brand}">TrekMate</span>
    </div>
    <div style="${styles.body}">
      <h1 style="${styles.heading}">Welcome to the trail, {name}!</h1>
      <p style="${styles.text}">We're thrilled to have you join the TrekMate community. You've taken the first step towards discovering your next great adventure.</p>
      <p style="${styles.text}">With TrekMate, you can explore thousands of trails, track your progress, and connect with fellow outdoor enthusiasts.</p>
      
      <div style="${styles.buttonContainer}">
        <a href="#" style="${styles.button}">Start Exploring</a>
      </div>
      
      <p style="${styles.text}">If you have any questions or need help getting started, just reply to this email.</p>
      <p style="${styles.text}">Happy trails,<br>The TrekMate Team</p>
    </div>
    <div style="${styles.footer}">
      <p style="${styles.footerText}">&copy; ${new Date().getFullYear()} TrekMate Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="${styles.main}">
  <div style="${styles.container}">
    <div style="${styles.header}">
      <span style="${styles.brand}">TrekMate</span>
    </div>
    <div style="${styles.body}">
      <h1 style="${styles.heading}">Reset your password</h1>
      <p style="${styles.text}">Hi <strong>{name}</strong>,</p>
      <p style="${styles.text}">We received a request to reset the password for your TrekMate account. If you didn't make this request, you can safely ignore this email.</p>
      
      <div style="${styles.buttonContainer}">
        <a href="{resetURL}" style="${styles.button}">Reset Password</a>
      </div>
      
      <p style="${styles.text}">This link will expire in 1 hour.</p>
    </div>
    <div style="${styles.footer}">
      <p style="${styles.footerText}">&copy; ${new Date().getFullYear()} TrekMate Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password reset successful</title>
</head>
<body style="${styles.main}">
  <div style="${styles.container}">
    <div style="${styles.header}">
      <span style="${styles.brand}">TrekMate</span>
    </div>
    <div style="${styles.body}">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="background-color: #556B2F; color: white; width: 64px; height: 64px; line-height: 64px; border-radius: 50%; display: inline-block; font-size: 32px; box-shadow: 0 4px 12px rgba(85, 107, 47, 0.3);"></div>
      </div>
      <h1 style="${styles.heading}; text-align: center;">Password reset complete</h1>
      <p style="${styles.text}">Hi <strong>{name}</strong>,</p>
      <p style="${styles.text}">Your password has been successfully reset. You can now log in to your account with your new password.</p>
      <p style="${styles.text}">If you didn't make this change, please contact our support team immediately.</p>
      
      <div style="${styles.buttonContainer}">
        <a href="#" style="${styles.button}">Log In</a>
      </div>
    </div>
    <div style="${styles.footer}">
      <p style="${styles.footerText}">&copy; ${new Date().getFullYear()} TrekMate Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;