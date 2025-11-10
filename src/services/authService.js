import { User } from "../models/User.js";
import { UserToken } from "../models/UserToken.js";
import { LeadLabor } from "../models/LeadLabor.js";
import { Labor } from "../models/Labor.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
import { successResponse } from "../helpers/responseHelper.js";
import { RolePermission } from "../models/RolePermission.js";
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import { sendEmail } from "../email/emailConfig.js";
import { otpTemplate } from "../email/emaiTamplate.js";
import jwt from 'jsonwebtoken';

export class AuthService {
  static async register(userData) {
    try {
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const temporaryPassword = generateTemporaryPassword();

      const hashedPassword = await hashPassword(temporaryPassword);

      const user = await User.create({
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role.toLowerCase(),
        password: hashedPassword,
        is_temporary_password: true,
        password_changed_at: new Date()
      });


      try {
        await sendWelcomeEmail(
          user.email,
          user.full_name,
          temporaryPassword
        );
      } catch (emailError) {

      }

      let permissions = [];
      try {
        permissions = await RolePermission.getPermissionsByRoleName(user.role);
      } catch (permError) {

      }

      const { password, ...userWithoutPassword } = user;

      return successResponse({
        user: userWithoutPassword,
        permissions,
        message: 'User registered successfully. Check your email for temporary password.'
      }, 'User registered successfully');
    } catch (error) {
      throw error;
    }
  }

  static async login(email, password, login_by = 'admin', push_token = null, push_platform = null) {
    try {
      // For login, we don't need staff/labor/leadLabor data - fetch only user data for faster response
      const user = await User.findByEmail(email, false);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      if (user.status !== "active") {
        throw new Error("Your account is inactive. Please contact the administrator for assistance.");
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

     
      

      if (login_by === 'app') {
        if (user.management_type !== 'labor' && user.management_type !== 'lead_labor') {
          throw new Error("Only Team Leads and Team Members can log in here. Please use the Admin Portal for Staff login.");
        }
        } else if (login_by === 'admin') {
          if (user.management_type === 'labor' || user.management_type === 'lead_labor') {
            throw new Error("Team Leads and Team Members cannot login here. Please use the Mobile App for login.");
          }
      } else {
        throw new Error("Invalid login method");
      }

      // Optimize: Start all async operations in parallel BEFORE token generation
      // Token generation is synchronous and fast, so we do it after async operations start
      const fetchPromises = [
        // Permissions are cached (5 min TTL) - very fast if cached
        RolePermission.getPermissionsByRoleName(user.role).catch(err => {
          console.error('Error fetching permissions:', err);
          return [];
        })
      ];

      // For app login, fetch lead_labor or labor details in parallel with permissions
      // Use lightweight methods that don't fetch nested user data (we already have user)
      if (login_by === 'app') {
        if (user.management_type === 'lead_labor') {
          fetchPromises.push(
            LeadLabor.getLeadLaborByUserIdForLogin(user.id).catch(err => {
              console.error('Error fetching lead labor details:', err);
              return null;
            })
          );
        } else if (user.management_type === 'labor') {
          fetchPromises.push(
            Labor.getLaborByUserIdForLogin(user.id).catch(err => {
              console.error('Error fetching labor details:', err);
              return null;
            })
          );
        }
      }

      // Register push token if provided
      if (push_token && typeof push_token === 'string' && push_token.trim()) {
        const tokenToSave = push_token.trim();
        const platformToSave = push_platform ? push_platform.toString().trim().toLowerCase() : null;

        if (tokenToSave) {
          setImmediate(async () => {
            try {
              await User.update(user.id, {
                push_token: tokenToSave,
                push_platform: platformToSave
              });
            } catch (pushError) {
              console.error('Error saving push token:', pushError);
            }
          });
        }
      }

      // Generate token (synchronous, fast - happens while async operations run)
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        management_type: user.management_type,
        login_by: login_by
      });

      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      // Wait for all parallel fetches to complete
      const results = await Promise.all(fetchPromises);
      const permissions = results[0] || [];
      const leadLaborDetails = login_by === 'app' && user.management_type === 'lead_labor' ? results[1] : null;
      const laborDetails = login_by === 'app' && user.management_type === 'labor' ? results[1] : null;

      // Save token in background immediately (non-blocking) - don't wait for it
      // Token is already generated and will be returned in response
      setImmediate(() => {
        UserToken.create({
          user_id: user.id,
          token: token,
          token_type: 'access',
          expires_at: tokenExpiry.toISOString(),
          is_active: true
        }).catch(err => {
          console.error('Error saving token (non-critical):', err);
          // Token is already generated, so this error won't affect login
        });
      });

      // Remove password from user object
      const { 
        password: userPassword, 
        ...userWithoutPassword 
      } = user;

      // Build clean user object with only essential fields (optimize response size)
      const cleanUser = {
        id: userWithoutPassword.id,
        full_name: userWithoutPassword.full_name,
        email: userWithoutPassword.email,
        phone: userWithoutPassword.phone,
        role: userWithoutPassword.role,
        status: userWithoutPassword.status,
        photo_url: userWithoutPassword.photo_url,
        created_at: userWithoutPassword.created_at,
        is_temporary_password: userWithoutPassword.is_temporary_password,
        password_changed_at: userWithoutPassword.password_changed_at,
        management_type: userWithoutPassword.management_type
      };

      // Add lead_labor or labor details INSIDE user object
      if (leadLaborDetails) {
        cleanUser.lead_labor = leadLaborDetails;
      }
      if (laborDetails) {
        cleanUser.labor = laborDetails;
      }

      // Build response object - lead_labor/labor is now INSIDE user object
      const responseData = {
        user: cleanUser,
        token,
        permissions,
        management_type: user.management_type,
        login_by: login_by
      };

      return successResponse(
        responseData,
        "Login successful"
      );
    } catch (error) {
      throw error;
    }
  }

  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await User.update(userId, { password: hashedNewPassword });

      return successResponse(null, "Password changed successfully");
    } catch (error) {
      throw error;
    }
  }

  static async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      let permissions = [];
      try {
        permissions = await RolePermission.getPermissionsByRoleName(user.role);
      } catch (permError) {
      }

      const { password, ...userWithoutPassword } = user;

      return successResponse(
        {
          user: userWithoutPassword,
          permissions,
        },
        "Profile retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error("Email is already taken");
        }
      }

      const updatedUser = await User.update(userId, updateData);

      const { password, ...userWithoutPassword } = updatedUser;

      return successResponse(
        userWithoutPassword,
        "Profile updated successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async changeTemporaryPassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await User.update(userId, {
        password: hashedNewPassword,
        is_temporary_password: false,
        password_changed_at: new Date(),
      });

      return successResponse(
        null,
        "Password changed successfully. You can now login with your new password."
      );
    } catch (error) {
      throw error;
    }
  }

  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendForgotPasswordOTP(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("User with this email does not exist");
      }

      if (user.status !== "active") {
        throw new Error("Account is not active. Please contact administrator.");
      }

      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);



      await User.update(user.id, {
        otp: otp,
        otp_expiry: otpExpiry.toISOString()
      });


      const emailHtml = otpTemplate(user.full_name, otp);
      await sendEmail({
        to: email,
        subject: "Password Reset OTP - JDP",
        text: `Your OTP for password reset is: ${otp}. This OTP will expire in 10 minutes.`,
        html: emailHtml
      });

      return successResponse(
        { email: email },
        "OTP sent successfully to your email"
      );
    } catch (error) {
      throw error;
    }
  }

  static async verifyForgotPasswordOTP(email, otp) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("User with this email does not exist");
      }



      if (!user.otp || !user.otp_expiry) {
        throw new Error("No OTP found. Please request a new OTP.");
      }

      if (user.otp !== otp) {
        throw new Error("Invalid OTP");
      }

      const resetToken = generateToken({
        id: user.id,
        email: user.email,
        type: 'password_reset'
      }, '15m');


      await User.update(user.id, {
        otp: null,
        otp_expiry: null
      });

      return successResponse(
        {
          email: email,
          resetToken: resetToken,
          message: "OTP verified successfully"
        },
        "OTP verified successfully. You can now reset your password."
      );
    } catch (error) {
      throw error;
    }
  }


  static async resendForgotPasswordOTP(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("User with this email does not exist");
      }

      if (user.status !== "active") {
        throw new Error("Account is not active. Please contact administrator.");
      }

      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.update(user.id, {
        otp: otp,
        otp_expiry: otpExpiry
      });


      const emailHtml = otpTemplate(user.full_name, otp);
      await sendEmail({
        to: email,
        subject: "Password Reset OTP - JDP (Resent)",
        text: `Your new OTP for password reset is: ${otp}. This OTP will expire in 10 minutes.`,
        html: emailHtml
      });

      return successResponse(
        { email: email },
        "New OTP sent successfully to your email"
      );
    } catch (error) {
      throw error;
    }
  }


  static async resetPassword(email, newPassword) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error("User not found");
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await User.update(user.id, {
        password: hashedNewPassword,
        is_temporary_password: false,
        password_changed_at: new Date()
      });

      return successResponse(
        null,
        "Password reset successfully. You can now login with your new password."
      );
    } catch (error) {
      throw error;
    }
  }

  static async logout(token) {
    try {
      await UserToken.deactivateToken(token);
      
      return successResponse(
        null,
        "Logged out successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async logoutAll(userId) {
    try {
      await UserToken.deactivateAllUserTokens(userId);
      
      return successResponse(
        null,
        "Logged out from all devices successfully"
      );
    } catch (error) {
      throw error;
    }
  }
}
