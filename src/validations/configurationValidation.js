import Joi from 'joi';

export const hourlyRateValidation = {
  create: {
    body: Joi.object({
      description: Joi.string().max(200).required().messages({
        'string.empty': 'Description is required',
        'string.max': 'Description must not exceed 200 characters'
      }),
      min_hours: Joi.number().integer().min(0).required().messages({
        'number.base': 'Minimum hours must be a number',
        'number.integer': 'Minimum hours must be an integer',
        'number.min': 'Minimum hours must be 0 or greater'
      }),
      max_hours: Joi.number().integer().min(0).allow(null).messages({
        'number.base': 'Maximum hours must be a number',
        'number.integer': 'Maximum hours must be an integer',
        'number.min': 'Maximum hours must be 0 or greater'
      }),
      rate: Joi.number().positive().precision(2).required().messages({
        'number.base': 'Rate must be a number',
        'number.positive': 'Rate must be greater than 0',
        'number.precision': 'Rate can have maximum 2 decimal places'
      })
    })
  },

  update: {
    body: Joi.object({
      description: Joi.string().max(200).messages({
        'string.max': 'Description must not exceed 200 characters'
      }),
      min_hours: Joi.number().integer().min(0).messages({
        'number.base': 'Minimum hours must be a number',
        'number.integer': 'Minimum hours must be an integer',
        'number.min': 'Minimum hours must be 0 or greater'
      }),
      max_hours: Joi.number().integer().min(0).allow(null).messages({
        'number.base': 'Maximum hours must be a number',
        'number.integer': 'Maximum hours must be an integer',
        'number.min': 'Maximum hours must be 0 or greater'
      }),
      rate: Joi.number().positive().precision(2).messages({
        'number.base': 'Rate must be a number',
        'number.positive': 'Rate must be greater than 0',
        'number.precision': 'Rate can have maximum 2 decimal places'
      })
    }).min(1).messages({
      'object.min': 'At least one field must be provided for update'
    })
  },

  updateOrder: {
    body: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().required().messages({
          'number.base': 'ID must be a number',
          'number.integer': 'ID must be an integer',
          'number.positive': 'ID must be positive'
        }),
        sort_order: Joi.number().integer().min(0).required().messages({
          'number.base': 'Sort order must be a number',
          'number.integer': 'Sort order must be an integer',
          'number.min': 'Sort order must be 0 or greater'
        })
      })
    ).min(1).messages({
      'array.min': 'At least one rate must be provided for reordering'
    })
  }
};

export const systemSettingValidation = {
  updateMarkup: {
    body: Joi.object({
      percentage: Joi.number().min(0).max(100).precision(2).required().messages({
        'number.base': 'Percentage must be a number',
        'number.min': 'Percentage must be 0 or greater',
        'number.max': 'Percentage must not exceed 100',
        'number.precision': 'Percentage can have maximum 2 decimal places'
      })
    })
  }
};

export const configurationValidation = {
  updateFull: {
    body: Joi.object({
        hourly_rates: Joi.array().items(
          Joi.object({
            id: Joi.number().integer().positive().optional().messages({
              'number.base': 'ID must be a number',
              'number.integer': 'ID must be an integer',
              'number.positive': 'ID must be positive'
            }),
            description: Joi.string().max(200).allow(null, '').optional().messages({
              'string.max': 'Description must not exceed 200 characters'
            }),
            min_hours: Joi.number().integer().min(0).allow(null).optional().messages({
              'number.base': 'Minimum hours must be a number',
              'number.integer': 'Minimum hours must be an integer',
              'number.min': 'Minimum hours must be 0 or greater'
            }),
            max_hours: Joi.number().integer().min(0).allow(null).optional().messages({     
              'number.base': 'Maximum hours must be a number',
              'number.integer': 'Maximum hours must be an integer',
              'number.min': 'Maximum hours must be 0 or greater'
            }),
            rate: Joi.number().min(0).precision(2).allow(null).optional().messages({
              'number.base': 'Rate must be a number',
              'number.min': 'Rate must be 0 or greater',
              'number.precision': 'Rate can have maximum 2 decimal places'
            })
          })
        ).optional(),
      markup_percentage: Joi.number().min(0).max(100).precision(2).optional().messages({
        'number.base': 'Markup percentage must be a number',
        'number.min': 'Markup percentage must be 0 or greater',
        'number.max': 'Markup percentage must not exceed 100',
        'number.precision': 'Markup percentage can have maximum 2 decimal places'
      })
    }).min(1).messages({
      'object.min': 'At least one configuration field must be provided'
    })
  }
};


export const validateHourlyRateLogic = (data) => {
  const errors = [];

  if (data.min_hours !== undefined && data.max_hours !== undefined) {
    if (data.min_hours > data.max_hours) {
      errors.push('Minimum hours cannot be greater than maximum hours');
    }
  }

  if (data.min_hours !== undefined && data.min_hours < 0) {
    errors.push('Minimum hours cannot be negative');
  }

  if (data.max_hours !== undefined && data.max_hours !== null && data.max_hours < 0) {
    errors.push('Maximum hours cannot be negative');
  }

  if (data.rate !== undefined && data.rate !== null && data.rate < 0) {
    errors.push('Rate cannot be negative');
  }

  return errors;
};


export const validateMarkupPercentage = (percentage) => {
  const errors = [];

  if (percentage < 0) {
    errors.push('Markup percentage cannot be negative');
  }

  if (percentage > 100) {
    errors.push('Markup percentage cannot exceed 100%');
  }

  return errors;
};


export const removeHourlyRates = {
  body: Joi.object({
    rate_ids: Joi.array().items(
      Joi.number().integer().positive().required().messages({
        'number.base': 'Rate ID must be a number',
        'number.integer': 'Rate ID must be an integer',
        'number.positive': 'Rate ID must be positive',
        'any.required': 'Rate ID is required'
      })
    ).min(1).required().messages({
      'array.min': 'At least one rate ID is required',
      'any.required': 'Rate IDs array is required'
    })
  }).required().messages({
    'object.base': 'Request body must be an object',
    'any.required': 'Request body is required'
  })
};
