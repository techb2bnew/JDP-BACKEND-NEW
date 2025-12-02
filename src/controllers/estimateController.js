import { EstimateService } from '../services/estimateService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';
import { createEstimateSchema, updateEstimateSchema } from '../validations/estimateValidation.js';

export class EstimateController {
  static async deleteProductFromEstimate(request, reply) {
    try {
      const { estimateProductId } = request.params;

      if (!estimateProductId) {
        return reply.status(400).send(validationErrorResponse(['Estimate product ID is required']));
      }

      const estimateProductIdNum = parseInt(estimateProductId);
      if (isNaN(estimateProductIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate product ID must be a valid number']));
      }

      const result = await EstimateService.deleteProductFromEstimate(estimateProductIdNum);
      
      return reply.status(200).send(successResponse(result, result.message));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(error.message, 404));
      }
      return reply.status(500).send(errorResponse(`Failed to delete product from estimate: ${error.message}`, 500));
    }
  }

  static async searchEstimates(req, reply) {
    try {
      const {
        q,
        page,
        limit,
        status,
        invoice_type,
        type,
        customer,
        contractor,
        job
      } = req.query;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const filters = {
        q: (q || '').trim(),
        status: status ? String(status).toLowerCase() : undefined,
        invoice_type: (invoice_type ? String(invoice_type) : (type ? String(type) : undefined)),
        customer,
        contractor,
        job
      };

      const result = await EstimateService.searchEstimates(filters, pagination);
      return reply.status(200).send(successResponse(result, 'Estimates searched successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to search estimates: ${error.message}`, 500));
    }
  }
  static async createEstimate(req, reply) {
    try {
      const estimateData = req.body;
      const createdByUserId = req.user.id;

      console.log("estimateDataestimateData",estimateData);
      
     
      const { error, value } = createEstimateSchema.validate(estimateData, { abortEarly: false });
      
      if (error) {
        const validationErrors = error.details.map(detail => detail.message);
        return reply.status(400).send(validationErrorResponse(validationErrors));
      }

      const result = await EstimateService.createEstimate(value, createdByUserId);
      
      return reply.status(201).send(successResponse(result.estimate, result.message, 201));
    } catch (error) {

      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        if (error.message.includes('invoice_number')) {
          return reply.status(400).send(errorResponse('Invoice number already exists', 400));
        }
        return reply.status(400).send(errorResponse('Duplicate entry found', 400));
      }
      
      return reply.status(500).send(errorResponse(`Failed to create estimate: ${error.message}`, 500));
    }
  }

  static async getEstimates(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        job_id: req.query.job_id,
        customer_id: req.query.customer_id,
        status: req.query.status,
        priority: req.query.priority,
        service_type: req.query.service_type,
        estimate_date: req.query.estimate_date
      };

      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const result = await EstimateService.getEstimates(page, limit, filters);
      
      return reply.status(200).send(successResponse(result, 'Estimates retrieved successfully'));
    } catch (error) {

      return reply.status(500).send(errorResponse(`Failed to retrieve estimates: ${error.message}`, 500));
    }
  }

  static async getEstimateById(req, reply) {
    try {
      const { estimateId } = req.params;

      if (!estimateId) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID is required']));
      }

      const estimateIdNum = parseInt(estimateId);
      if (isNaN(estimateIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID must be a valid number']));
      }

      const estimate = await EstimateService.getEstimateById(estimateIdNum);
      
      return reply.status(200).send(successResponse(estimate, 'Estimate retrieved successfully'));
    } catch (error) {
 
      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Estimate not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to retrieve estimate: ${error.message}`, 500));
    }
  }

  static async updateEstimate(req, reply) {
    try {
      const { estimateId } = req.params;
      const updateData = req.body;
      const updatedByUserId = req.user.id;

      if (!estimateId) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID is required']));
      }

      const estimateIdNum = parseInt(estimateId);
      if (isNaN(estimateIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID must be a valid number']));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const { error, value } = updateEstimateSchema.validate(updateData, { abortEarly: false });
      
      if (error) {
        const validationErrors = error.details.map(detail => detail.message);
        return reply.status(400).send(validationErrorResponse(validationErrors));
      }

      const result = await EstimateService.updateEstimate(estimateIdNum, value, updatedByUserId);
      
      return reply.status(200).send(successResponse(result.estimate, result.message));
    } catch (error) {
     
      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Estimate not found', 404));
      }
      
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        if (error.message.includes('email')) {
          return reply.status(400).send(errorResponse('Email already exists for custom labor', 400));
        }
        if (error.message.includes('labor_code')) {
          return reply.status(400).send(errorResponse('Labor code already exists', 400));
        }
        if (error.message.includes('jdp_sku')) {
          return reply.status(400).send(errorResponse('Product SKU already exists', 400));
        }
        return reply.status(400).send(errorResponse('Duplicate entry found', 400));
      }
      
      return reply.status(500).send(errorResponse(`Failed to update estimate: ${error.message}`, 500));
    }
  }

  static async deleteEstimate(req, reply) {
    try {
     
      const { estimateId } = req.params;

      if (!estimateId) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID is required']));
      }

      const estimateIdNum = parseInt(estimateId);
      if (isNaN(estimateIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID must be a valid number']));
      }

      const result = await EstimateService.deleteEstimate(estimateIdNum);
      
      return reply.status(200).send(successResponse(result, result.message));
    } catch (error) {      
      try {
        if (error.message.includes('not found')) {
          return reply.status(404).send(errorResponse('Estimate not found', 404));
        }
        if (error.message.includes('Cannot delete this estimate because it has related data')) {
          return reply.status(400).send(errorResponse(error.message, 400));
        }
        if (error.message.includes('Database error')) {
          return reply.status(500).send(errorResponse('Database error occurred', 500));
        }
        return reply.status(500).send(errorResponse(`Failed to delete estimate: ${error.message}`, 500));
      } catch (responseError) {
        return reply.status(500).send({
          success: false,
          message: 'Internal server error',
          statusCode: 500,
          errors: null
        });
      }
    }
  }

  static async getEstimateStats(req, reply) {
    try {
      const stats = await EstimateService.getEstimateStats();
      
      return reply.status(200).send(successResponse(stats, 'Estimate statistics retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to retrieve estimate statistics: ${error.message}`, 500));
    }
  }

  static async getEstimatesByJob(req, reply) {
    try {
      const { jobId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (!jobId) {
        return reply.status(400).send(validationErrorResponse(['Job ID is required']));
      }

      const jobIdNum = parseInt(jobId);
      if (isNaN(jobIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Job ID must be a valid number']));
      }

      const result = await EstimateService.getEstimatesByJob(jobIdNum, page, limit);
      
      return reply.status(200).send(successResponse(result, 'Job estimates retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to retrieve job estimates: ${error.message}`, 500));
    }
  }

  static async getEstimatesByCustomer(req, reply) {
    try {
      const { customerId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (!customerId) {
        return reply.status(400).send(validationErrorResponse(['Customer ID is required']));
      }

      const customerIdNum = parseInt(customerId);
      if (isNaN(customerIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Customer ID must be a valid number']));
      }

      const result = await EstimateService.getEstimatesByCustomer(customerIdNum, page, limit);
      
      return reply.status(200).send(successResponse(result, 'Customer estimates retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to retrieve customer estimates: ${error.message}`, 500));
    }
  }

  
  static async createAdditionalCost(req, reply) {
    try {
      const additionalCostData = req.body;
      const createdByUserId = req.user.id;

      const result = await EstimateService.createAdditionalCost(additionalCostData, createdByUserId);
      
      return reply.status(201).send(successResponse(result.additionalCost, result.message, 201));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to create additional cost: ${error.message}`, 500));
    }
  }

  static async getAdditionalCosts(req, reply) {
    try {
      const { estimateId } = req.params;

      if (!estimateId) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID is required']));
      }

      const estimateIdNum = parseInt(estimateId);
      if (isNaN(estimateIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID must be a valid number']));
      }

      const additionalCosts = await EstimateService.getAdditionalCosts(estimateIdNum);
      
      return reply.status(200).send(successResponse(additionalCosts, 'Additional costs retrieved successfully'));
    } catch (error) {
  
      return reply.status(500).send(errorResponse(`Failed to retrieve additional costs: ${error.message}`, 500));
    }
  }

  static async updateAdditionalCost(req, reply) {
    try {
      const { additionalCostId } = req.params;
      const updateData = req.body;
      const updatedByUserId = req.user.id;

      if (!additionalCostId) {
        return reply.status(400).send(validationErrorResponse(['Additional cost ID is required']));
      }

      const additionalCostIdNum = parseInt(additionalCostId);
      if (isNaN(additionalCostIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Additional cost ID must be a valid number']));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const result = await EstimateService.updateAdditionalCost(additionalCostIdNum, updateData, updatedByUserId);
      
      return reply.status(200).send(successResponse(result.additionalCost, result.message));
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Additional cost not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to update additional cost: ${error.message}`, 500));
    }
  }

  static async deleteAdditionalCost(req, reply) {
    try {
      const { additionalCostId } = req.params;

      if (!additionalCostId) {
        return reply.status(400).send(validationErrorResponse(['Additional cost ID is required']));
      }

      const additionalCostIdNum = parseInt(additionalCostId);
      if (isNaN(additionalCostIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Additional cost ID must be a valid number']));
      }

      const result = await EstimateService.deleteAdditionalCost(additionalCostIdNum);
      
      return reply.status(200).send(successResponse(result, result.message));
    } catch (error) {

      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Additional cost not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to delete additional cost: ${error.message}`, 500));
    }
  }

  static async calculateTotalCosts(req, reply) {
    try {
      const { estimateId } = req.params;

      if (!estimateId) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID is required']));
      }

      const estimateIdNum = parseInt(estimateId);
      if (isNaN(estimateIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Estimate ID must be a valid number']));
      }

      const costs = await EstimateService.calculateTotalCosts(estimateIdNum);
      
      return reply.status(200).send(successResponse(costs, 'Total costs calculated successfully'));
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Estimate not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to calculate total costs: ${error.message}`, 500));
    }
  }

}
