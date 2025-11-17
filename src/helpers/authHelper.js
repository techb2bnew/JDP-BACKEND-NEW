import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { sendEmail } from '../email/emailConfig.js';
import { temporaryPasswordTemplate, supplierWelcomeTemplate } from '../email/emaiTamplate.js';

export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const sendWelcomeEmail = async (userEmail, userName, temporaryPassword) => {
  try {
  
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    
    if (temporaryPassword) {
      const emailContent = temporaryPasswordTemplate(
        userName, 
        temporaryPassword, 
        loginUrl
      );
      
      await sendEmail({
        to: userEmail,
        subject: "Welcome to JDP Backend - Your Account Details",
        text: `Welcome ${userName}! Your temporary password is: ${temporaryPassword}`,
        html: emailContent
      });
    } else {
      await sendEmail({
        to: userEmail,
        subject: "Welcome to JDP Backend",
        text: `Welcome ${userName}! Your account has been created successfully. Please contact administrator for login credentials.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to JDP Backend!</h2>
            <p>Dear ${userName},</p>
            <p>Your account has been created successfully.</p>
            <p>Please contact the administrator to get your login credentials.</p>
            <p>Best regards,<br>JDP Team</p>
          </div>
        `
      });
    }
    
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

export const sendSupplierWelcomeEmail = async (userEmail, userName, companyName) => {
  try {
    const emailContent = supplierWelcomeTemplate(userName, companyName);
    
    await sendEmail({
      to: userEmail,
      subject: "Welcome to JDP Supplier Portal",
      text: `Welcome ${userName}! Your supplier account has been created successfully. Please contact administrator for login credentials.`,
      html: emailContent
    });
    
    console.log(`Supplier welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending supplier welcome email:", error);
    throw error;
  }
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
  
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};
