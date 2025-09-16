import { ROLES, STATUS } from '../constants/roles.js';

export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'User password (minimum 6 characters)'
      }
    }
  }
};


export const changeTemporaryPasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: {
        type: 'string',
        minLength: 1
      },
      newPassword: {
        type: 'string',
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,}$'
      }
    }
  }
};



export const registerSchema = {
  body: {
    type: 'object',
    required: ['full_name', 'email', 'role'], 
    properties: {
      full_name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'User full name'
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      phone: {
        type: 'string',
        pattern: '^\\+?[\\d\\s\\-\\(\\)]+$',
        description: 'User phone number'
      },
      role: {
        type: 'string',
        enum: Object.values(ROLES),
        description: 'User role'
      },
      status: {
        type: 'string',
        enum: Object.values(STATUS),
        default: 'active',
        description: 'User status'
      },
      system_ip: {
        type: 'string',
        maxLength: 45,
        description: 'System IP address'
      }
     
    }
  }
};


export const changePasswordSchema = {
  body: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: {
        type: 'string',
        description: 'Current password'
      },
      newPassword: {
        type: 'string',
        minLength: 6,
        description: 'New password (minimum 6 characters)'
      }
    }
  }
};

export const forgotPasswordSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      }
    }
  }
};

export const resetPasswordSchema = {
  body: {
    type: 'object',
    required: ['token', 'newPassword', 'confirmPassword'],
    properties: {
      token: {
        type: 'string',
        description: 'Reset token'
      },
      newPassword: {
        type: 'string',
        minLength: 6,
        description: 'New password (minimum 6 characters)'
      },
      confirmPassword: {
        type: 'string',
        description: 'Password confirmation'
      }
    }
  }
};


export const sendForgotPasswordOTPSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      }
    }
  }
};

export const verifyForgotPasswordOTPSchema = {
  body: {
    type: 'object',
    required: ['email', 'otp'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      otp: {
        type: 'string',
        pattern: '^[0-9]{6}$',
        description: '6-digit OTP'
      }
    }
  }
};

export const resendForgotPasswordOTPSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      }
    }
  }
};

export const resetPasswordWithTokenSchema = {
  body: {
    type: 'object',
    required: ['email', 'newPassword', 'confirmPassword'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        description: 'User email address'
      },
      newPassword: {
        type: 'string',
        minLength: 6,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,}$',
        description: 'New password (minimum 6 characters with uppercase, lowercase, number and special character)'
      },
      confirmPassword: {
        type: 'string',
        minLength: 6,
        description: 'Confirm new password'
      }
    }
  }
};