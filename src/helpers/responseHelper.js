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

// Response helper object for easy usage
export const responseHelper = {
  success: (reply, data, message = 'Success', statusCode = 200) => {
    return reply.status(statusCode).send({
      success: true,
      message,
      data,
      statusCode
    });
  },
  
  error: (reply, message = 'Error occurred', statusCode = 500, errors = null) => {
    return reply.status(statusCode).send({
      success: false,
      message,
      statusCode,
      errors
    });
  },
  
  validationError: (reply, errors) => {
    return reply.status(400).send({
      success: false,
      message: 'Validation failed',
      statusCode: 400,
      errors
    });
  },
  
  unauthorized: (reply, message = 'Unauthorized access') => {
    return reply.status(401).send({
      success: false,
      message,
      statusCode: 401
    });
  },
  
  forbidden: (reply, message = 'Forbidden access') => {
    return reply.status(403).send({
      success: false,
      message,
      statusCode: 403
    });
  }
};