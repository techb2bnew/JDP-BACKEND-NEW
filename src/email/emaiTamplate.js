export const temporaryPasswordTemplate = (recipientName, temporaryPassword, loginUrl) => {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to JDP </title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1f2937; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Welcome to JDP </h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="margin-top: 0;">Hello ${recipientName},</h2>
            <p style="margin: 0 0 20px 0;">Your account has been successfully created. Here are your login credentials:</p>
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold;">
              <strong>Temporary Password:</strong><br>
              ${temporaryPassword}
            </div>
            
            <p style="margin: 0 0 20px 0;"><strong>Important:</strong> This is a temporary password. Please change it after your first login.</p>
            
            <p style="margin: 0 0 20px 0;">You can now login to your account using your email and this temporary password.</p>
            
            <a href="${loginUrl}" style="display: inline-block; background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Login Now</a>
            
            <p style="margin: 0 0 20px 0;">If you have any questions, please contact our support team.</p>
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
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset OTP - JDP</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Password Reset - JDP</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="margin-top: 0;">Hello ${recipientName},</h2>
            <p style="margin: 0 0 20px 0;">You have requested to reset your password. Use the OTP below to verify your identity:</p>
            
            <div style="background: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <h1 style="margin: 0; color: #dc3545; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
            </div>
            
            <p style="margin: 0 0 20px 0;"><strong>Important:</strong></p>
            <ul style="margin: 0 0 20px 0; padding-left: 20px;">
              <li>This OTP will expire in 10 minutes</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <p style="margin: 0 0 20px 0;">Enter this OTP in the verification form to proceed with password reset.</p>
            
            <p style="margin: 0 0 20px 0;">If you have any questions, please contact our support team.</p>
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