export const temporaryPasswordTemplate = (recipientName, temporaryPassword, loginUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Welcome to JDP</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

  body {
    margin: 0; padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    background: linear-gradient(135deg, #3a7bd5, #00d2ff);
    color: #333;
  }
  .email-wrapper {
    max-width: 600px;
    background: #ffffff;
    margin: 50px auto;
    border-radius: 16px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    padding: 40px 50px;
  }
  .logo {
    display: block;
    margin: 0 auto 30px;
    max-width: 140px;
  }
  h1 {
    font-weight: 700;
    font-size: 28px;
    color: #0B2F6A;
    text-align: center;
    margin-bottom: 10px;
  }
  p {
    font-size: 16px;
    line-height: 1.55;
    margin: 16px 0;
    color: #444;
  }
  .greeting {
    font-weight: 600;
    font-size: 18px;
    color: #0B2F6A;
  }
  .password-box {
    background: #f0f7ff;
    border-left: 6px solid #0B2F6A;
    font-family: 'Courier New', Courier, monospace;
    font-size: 20px;
    letter-spacing: 0.1em;
    padding: 14px 20px;
    margin: 20px 0 30px;
    border-radius: 8px;
    color: #0B2F6A;
    max-width: fit-content;
  }
  .important-note {
    font-weight: 600;
    color: #d9534f;
  }
  .btn {
    display: block;
    width: 180px;
    margin: 30px auto;
    background: #0B2F6A;
    color: #fff;
    text-decoration: none;
    font-weight: 700;
    text-align: center;
    padding: 15px 0;
    border-radius: 10px;
    box-shadow: 0 6px 12px rgba(11, 47, 106, 0.5);
    transition: background-color 0.3s ease;
  }
  .btn:hover {
    background-color: #083066;
  }
  .footer {
    margin-top: 35px;
    font-size: 13px;
    color: #777;
    text-align: center;
  }
  .security-icon {
    display: block;
    margin: 20px auto 30px;
    max-width: 60px;
  }
</style>
</head>
<body>
  <div class="email-wrapper">
    <img src="https://stagingjdp.prorevv.com/_next/image?url=%2Fassets%2Flogos%2Flogo-jdp.png&w=384&q=75" alt="JDP Logo" class="logo" alt="JDP Logo" class="logo" />

    <h1>Welcome to JDP</h1>

    <p class="greeting">Hello ${recipientName},</p>

    <p>Your account has been successfully created. Below is your temporary login password:</p>

    <div class="password-box">${temporaryPassword}</div>

    <p class="important-note">Important:</p>
    <p>Please note this is a temporary password. For your security, be sure to change it after your first login.</p>

    <p>You can now log in to your account using your email and the temporary password above.</p>

    <a href="https://stagingjdp.prorevv.com" class="btn" target="_blank" rel="noopener">Login Now</a>

    <p>If you have any questions or need help, feel free to contact our support team anytime.</p>

    <p><em>This is an automated message. Please do not reply to this email.</em></p>

    <div class="footer">© 2025 JDP Electrical Services. All rights reserved.</div>
  </div>
</body>
</html>
    `;
};

export const emailTemplate = (recipientName, senderName, message) => {
  return `
      Subject: Greetings from ${senderName}
  
      Dear ${recipientName},
  
      I hope this email finds you well. ${message}
  
      Best regards,
      ${senderName}
    `;
};

export const supplierWelcomeTemplate = (recipientName, companyName) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to JDP - Supplier Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Welcome to JDP Supplier Portal</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="margin-top: 0;">Hello ${recipientName},</h2>
            <p style="margin: 0 0 20px 0;">Welcome to JDP! We're excited to have you as our supplier partner.</p>
            
            ${companyName ? `<p style="margin: 0 0 20px 0;"><strong>Company:</strong> ${companyName}</p>` : ''}
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #28a745;">Your Account Status</h3>
              <p style="margin: 0;">Your supplier account has been successfully created and is ready for use.</p>
            </div>
            
            <p style="margin: 0 0 20px 0;"><strong>Next Steps:</strong></p>
            <ul style="margin: 0 0 20px 0; padding-left: 20px;">
              <li>Contact our administrator to get your login credentials</li>
              <li>Complete your supplier profile setup</li>
              <li>Upload your company documents and certifications</li>
              <li>Start managing your products and services</li>
            </ul>
            
            <p style="margin: 0 0 20px 0;">Our team will be in touch with you shortly to provide your login credentials and guide you through the onboarding process.</p>
            
            <p style="margin: 0 0 20px 0;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin: 0; font-weight: bold; color: #28a745;">Thank you for choosing JDP!</p>
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 0;">&copy; 2024 JDP Backend. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
};

export const otpTemplate = (recipientName, otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Password Reset - OTP Verification</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');

  body {
    margin: 0; padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    background: linear-gradient(135deg, #3a7bd5, #00d2ff);
    color: #333;
  }
  .email-wrapper {
    max-width: 600px;
    background: #ffffff;
    margin: 50px auto;
    border-radius: 16px;
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    padding: 40px 50px;
  }
  .logo {
    display: block;
    margin: 0 auto 30px;
    max-width: 140px;
  }
  h1 {
    font-weight: 700;
    font-size: 28px;
    color: #0B2F6A;
    text-align: center;
    margin-bottom: 10px;
  }
  p {
    font-size: 16px;
    line-height: 1.55;
    margin: 16px 0;
    color: #444;
  }
  .greeting {
    font-weight: 600;
    font-size: 18px;
    color: #0B2F6A;
  }
  .otp-box {
    background: #f0f7ff;
    border-left: 6px solid #0B2F6A;
    font-family: 'Courier New', Courier, monospace;
    font-size: 22px;
    letter-spacing: 0.12em;
    padding: 14px 20px;
    margin: 20px 0 30px;
    border-radius: 8px;
    color: #0B2F6A;
    max-width: fit-content;
  }
  .important-note {
    font-weight: 600;
    color: #d9534f;
  }
  .footer {
    margin-top: 35px;
    font-size: 13px;
    color: #777;
    text-align: center;
  }
</style>
</head>

<body>
  <div class="email-wrapper">

    <img src="https://stagingjdp.prorevv.com/_next/image?url=%2Fassets%2Flogos%2Flogo-jdp.png&w=384&q=75" alt="JDP Logo" class="logo" />

    <h1>Password Reset Request</h1>

    <p class="greeting">Hello ${recipientName},</p>

    <p>We received a request to reset your password. Please use the OTP below to verify your identity and continue with the reset process:</p>

    <div class="otp-box">${otp}</div>

    <p class="important-note">Important:</p>
    <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone. If you didn’t request this, please ignore the email.</p>

    <p><em><strong>Enter this OTP in the verification form to complete your password reset</strong>.</em></p>

    <p>If you need any help, our support team is always here for you.</p>

    <p><em>This is an automated message. Please do not reply to this email.</em></p>

    <div class="footer">© 2025 JDP Electrical Services  . All rights reserved.</div>

  </div>
</body>
</html>
    `;
};