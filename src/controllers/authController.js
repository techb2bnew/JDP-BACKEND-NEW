import { AuthService } from '../services/authService.js';
import { errorResponse } from '../helpers/responseHelper.js';

export class AuthController {
  static async register(request, reply) {
    try {
      const result = await AuthService.register(request.body);
      return reply.code(201).send(result);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async login(request, reply) {
    try {
      const { email, password, login_by = 'admin' } = request.body;
      const result = await AuthService.login(email, password, login_by);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Invalid email or password') || 
          error.message.includes('Account is not active')) {
        return reply.code(401).send(errorResponse(error.message, 401));
      }
      if (error.message.includes('Only Team Leads and Team Members can log in here')) {
        return reply.code(403).send(errorResponse(error.message, 403));
      }
      if (error.message.includes('Invalid login method')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async changePassword(request, reply) {
    try {
      const { currentPassword, newPassword } = request.body;
      const userId = request.user.id;
      
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Current password is incorrect')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      if (error.message.includes('User not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }


  static async changeTemporaryPassword(request, reply) {
    try {
      const { currentPassword, newPassword } = request.body;
      const userId = request.user.id;
      console.log("AuthController.changeTemporaryPassword called for userId:", request.user);
      
      const result = await AuthService.changeTemporaryPassword(userId, currentPassword, newPassword);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Current password is incorrect')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      if (error.message.includes('User not found')) {
        return reply.code(404).send(errorResponse(errorResponse, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getProfile(request, reply) {
    try {
      const userId = request.user.id;
      const result = await AuthService.getProfile(userId);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('User not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async updateProfile(request, reply) {
    try {
      const userId = request.user.id;
      const result = await AuthService.updateProfile(userId, request.body);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Email is already taken')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('User not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async sendForgotPasswordOTP(request, reply) {
    try {
      const { email } = request.body;
      const result = await AuthService.sendForgotPasswordOTP(email);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('not active')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async verifyForgotPasswordOTP(request, reply) {
    try {
      const { email, otp } = request.body;
      const result = await AuthService.verifyForgotPasswordOTP(email, otp);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Invalid OTP') || error.message.includes('expired') || error.message.includes('No OTP found')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      if (error.message.includes('does not exist')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async resendForgotPasswordOTP(request, reply) {
    try {
      const { email } = request.body;
      const result = await AuthService.resendForgotPasswordOTP(email);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('not active')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async resetPassword(request, reply) {
    try {
      const { email, newPassword, confirmPassword } = request.body;
      
      if (newPassword !== confirmPassword) {
        return reply.code(400).send(errorResponse("Passwords do not match", 400));
      }
      
      const result = await AuthService.resetPassword(email, newPassword);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      if (error.message.includes('User not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async logout(req, reply) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return reply.code(400).send(errorResponse('Token is required', 400));
      }
      
      const result = await AuthService.logout(token);
      
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse('Failed to logout', 500));
    }
  }

  static async logoutAll(req, reply) {
    try {
      const userId = req.user.id; 
      
      const result = await AuthService.logoutAll(userId);
      
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse('Failed to logout from all devices', 500));
    }
  }
}
