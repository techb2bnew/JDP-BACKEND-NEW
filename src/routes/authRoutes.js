import { AuthController } from '../controllers/authController.js';
import { 
  loginSchema, 
  registerSchema, 
  changePasswordSchema, 
  changeTemporaryPasswordSchema,
  sendForgotPasswordOTPSchema,
  verifyForgotPasswordOTPSchema,
  resendForgotPasswordOTPSchema,
  resetPasswordWithTokenSchema
} from '../validations/authValidation.js';

export default async function authRoutes(fastify, options) {
  fastify.post('/register', {
    schema: registerSchema,
    handler: AuthController.register
  });

  fastify.post('/login', {
    schema: loginSchema,
    handler: AuthController.login
  });

  fastify.post('/logout', {
    preHandler: fastify.authenticateToken,
    handler: AuthController.logout
  });

  fastify.post('/logout-all', {
    preHandler: fastify.authenticateToken,
    handler: AuthController.logoutAll
  });

   fastify.post('/change-temporary-password', {
    preHandler: fastify.authenticateToken,
    schema: changeTemporaryPasswordSchema,
    handler: AuthController.changeTemporaryPassword
  });

  fastify.post('/change-password', {
    preHandler: fastify.authenticateToken,
    schema: changePasswordSchema,
    handler: AuthController.changePassword
  });

  fastify.get('/profile', {
    preHandler: fastify.authenticateToken,
    handler: AuthController.getProfile
  });

  fastify.put('/profile', {
    preHandler: fastify.authenticateToken,
    handler: AuthController.updateProfile
  });

  fastify.post('/forgot-password/send-otp', {
    schema: sendForgotPasswordOTPSchema,
    handler: AuthController.sendForgotPasswordOTP
  });

  fastify.post('/forgot-password/verify-otp', {
    schema: verifyForgotPasswordOTPSchema,
    handler: AuthController.verifyForgotPasswordOTP
  });

  fastify.post('/forgot-password/resend-otp', {
    schema: resendForgotPasswordOTPSchema,
    handler: AuthController.resendForgotPasswordOTP
  });

  fastify.post('/forgot-password/reset', {
    schema: resetPasswordWithTokenSchema,
    handler: AuthController.resetPassword
  });

  fastify.put('/deactivate-account', {
    preHandler: fastify.authenticateToken,
    handler: AuthController.deactivateAccount
  });
}
