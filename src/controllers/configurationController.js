import { ConfigurationService } from '../services/configurationService.js';
import { 
  hourlyRateValidation, 
  systemSettingValidation, 
  configurationValidation,
  validateHourlyRateLogic,
  validateMarkupPercentage,
  removeHourlyRates
} from '../validations/configurationValidation.js';
import { errorResponse, successResponse } from '../helpers/responseHelper.js';

export class ConfigurationController {
  static async getAllHourlyRates(request, reply) {
    try {
      const result = await ConfigurationService.getAllHourlyRates();
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async getHourlyRateById(request, reply) {
    try {
      const { id } = request.params;
      const result = await ConfigurationService.getHourlyRateById(parseInt(id));
      
      if (!result.success) {
        return reply.status(404).send(createResponse(false, null, result.message));
      }
      
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async createHourlyRate(request, reply) {
    try {
      const { error, value } = hourlyRateValidation.create.body.validate(request.body);
      if (error) {
        return reply.status(400).send(createResponse(false, null, error.details[0].message));
      }

    
      const logicErrors = validateHourlyRateLogic(value);
      if (logicErrors.length > 0) {
        return reply.status(400).send(createResponse(false, null, logicErrors.join(', ')));
      }

      const data = {
        ...value,
        created_by: request.user.id
      };

      const result = await ConfigurationService.createHourlyRate(data);
      return reply.status(201).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async updateHourlyRate(request, reply) {
    try {
     
      const { error, value } = hourlyRateValidation.update.body.validate(request.body);
      if (error) {
        return reply.status(400).send(createResponse(false, null, error.details[0].message));
      }

    
      const logicErrors = validateHourlyRateLogic(value);
      if (logicErrors.length > 0) {
        return reply.status(400).send(createResponse(false, null, logicErrors.join(', ')));
      }

      const { id } = request.params;
      const result = await ConfigurationService.updateHourlyRate(parseInt(id), value);
      
      if (!result.success) {
        return reply.status(404).send(createResponse(false, null, result.message));
      }
      
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async deleteHourlyRate(request, reply) {
    try {
      const { id } = request.params;
      const result = await ConfigurationService.deleteHourlyRate(parseInt(id));
      
      if (!result.success) {
        return reply.status(404).send(createResponse(false, null, result.message));
      }
      
      return reply.status(200).send(createResponse(result.success, null, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async updateHourlyRatesOrder(request, reply) {
    try {
      
      const { error, value } = hourlyRateValidation.updateOrder.body.validate(request.body);
      if (error) {
        return reply.status(400).send(createResponse(false, null, error.details[0].message));
      }

      const result = await ConfigurationService.updateHourlyRatesOrder(value);
      return reply.status(200).send(createResponse(result.success, null, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  
  static async getMarkupPercentage(request, reply) {
    try {
      const result = await ConfigurationService.getMarkupPercentage();
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async updateMarkupPercentage(request, reply) {
    try {
     
      const { error, value } = systemSettingValidation.updateMarkup.body.validate(request.body);
      if (error) {
        return reply.status(400).send(createResponse(false, null, error.details[0].message));
      }

     
      const logicErrors = validateMarkupPercentage(value.percentage);
      if (logicErrors.length > 0) {
        return reply.status(400).send(createResponse(false, null, logicErrors.join(', ')));
      }

      const result = await ConfigurationService.updateMarkupPercentage(value.percentage, request.user.id);
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async getAllSystemSettings(request, reply) {
    try {
      const result = await ConfigurationService.getAllSystemSettings();
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

  static async getSystemSettingByKey(request, reply) {
    try {
      const { key } = request.params;
      const result = await ConfigurationService.getSystemSettingByKey(key);
      
      if (!result.success) {
        return reply.status(404).send(createResponse(false, null, result.message));
      }
      
      return reply.status(200).send(createResponse(result.success, result.data, result.message));
    } catch (error) {
      return reply.status(500).send(createResponse(false, null, error.message));
    }
  }

 
  static async getFullConfiguration(request, reply) {
    try {
      const result = await ConfigurationService.getFullConfiguration();
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get configuration: ${error.message}`));
    }
  }

  static async createOrUpdateConfiguration(request, reply) {
    try {
     
      const { error, value } = configurationValidation.updateFull.body.validate(request.body);
      if (error) {
        return reply.code(400).send(errorResponse(error.details[0].message, 400));
      }

     
      if (value.markup_percentage !== undefined) {
        const logicErrors = validateMarkupPercentage(value.markup_percentage);
        if (logicErrors.length > 0) {
          return reply.code(400).send(errorResponse(logicErrors.join(', '), 400));
        }
      }

    
      if (value.hourly_rates && Array.isArray(value.hourly_rates)) {
        for (const rate of value.hourly_rates) {
          const logicErrors = validateHourlyRateLogic(rate);
          if (logicErrors.length > 0) {
            return reply.code(400).send(errorResponse(logicErrors.join(', '), 400));
          }
        }
      }

      const result = await ConfigurationService.createOrUpdateConfiguration(value, request.user.id);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to create/update configuration: ${error.message}`));
    }
  }

  static async removeHourlyRates(request, reply) {
    try {

      const { error, value } = removeHourlyRates.body.validate(request.body);
      if (error) {
        return reply.code(400).send(errorResponse(error.details[0].message, 400));
      }

      if (!value.rate_ids || !Array.isArray(value.rate_ids) || value.rate_ids.length === 0) {
        return reply.code(400).send(errorResponse('Rate IDs array is required and cannot be empty', 400));
      }

     
      for (const id of value.rate_ids) {
        if (!Number.isInteger(id) || id <= 0) {
          return reply.code(400).send(errorResponse('All rate IDs must be positive integers', 400));
        }
      }

      const result = await ConfigurationService.removeHourlyRates(value.rate_ids, request.user.id);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to remove hourly rates: ${error.message}`));
    }
  }

}
