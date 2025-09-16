export const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    statusCode
  };
};

export const errorResponse = (message = 'Error occurred', statusCode = 500, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    errors
  };
};

export const validationErrorResponse = (errors) => {
  return {
    success: false,
    message: 'Validation failed',
    statusCode: 400,
    errors
  };
};

export const unauthorizedResponse = (message = 'Unauthorized access') => {
  return {
    success: false,
    message,
    statusCode: 401
  };
};

export const forbiddenResponse = (message = 'Forbidden access') => {
  return {
    success: false,
    message,
    statusCode: 403
  };
};
