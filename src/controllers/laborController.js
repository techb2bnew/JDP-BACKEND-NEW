import { LaborService } from '../services/laborService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class LaborController {
  static async createLabor(req, reply) {
    try {
      const laborData = req.body;

      if (!laborData.full_name || !laborData.email ) {
        return reply.status(400).send(validationErrorResponse([
          'Full name, email  required'
        ]));
      }

      try {
        LaborService.validateLaborData(laborData);
      } catch (validationError) {
        return reply.status(400).send(validationErrorResponse([validationError.message]));
      }

      const result = await LaborService.createLaborWithUser(laborData);
      
      return reply.status(201).send(successResponse(result, 'Labor created successfully', 201));
    } catch (error) {
      console.error('Error in createLabor:', error);
      
      if (error.message === 'Email already exists') {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      
      if (error.message === 'Labor code already exists') {
        return reply.status(400).send(errorResponse('Labor code already exists', 400));
      }
      
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        if (error.message.includes('labor_labor_code_key')) {
          return reply.status(400).send(errorResponse('Labor code already exists', 400));
        }
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      
      return reply.status(500).send(errorResponse('Failed to create labor', 500));
    }
  }

  static async getAllLabor(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (page < 1) {
        return reply.status(400).send(errorResponse('Page must be greater than 0', 400));
      }
      if (limit < 1 || limit > 100) {
        return reply.status(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }
      
      const result = await LaborService.getAllLabor(page, limit);
      
      return reply.status(200).send(successResponse(result, 'Labor retrieved successfully'));
    } catch (error) {
      console.error('Error in getAllLabor:', error);
      return reply.status(500).send(errorResponse('Failed to retrieve labor', 500));
    }
  }

  static async getLaborById(req, reply) {
    try {
      const { laborId } = req.params;

      if (!laborId) {
        return reply.status(400).send(validationErrorResponse(['Labor ID is required']));
      }

      const laborIdNum = parseInt(laborId);
      if (isNaN(laborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Labor ID must be a valid number']));
      }

      const labor = await LaborService.getLaborById(laborIdNum);
      
      return reply.status(200).send(successResponse(labor, 'Labor retrieved successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Labor not found', 404));
      }
      return reply.status(500).send(errorResponse('Failed to retrieve labor', 500));
    }
  }

  static async updateLabor(req, reply) {
    try {
      const { laborId } = req.params;
      const updateData = req.body;

      if (!laborId) {
        return reply.status(400).send(validationErrorResponse(['Labor ID is required']));
      }

      const laborIdNum = parseInt(laborId);
      if (isNaN(laborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Labor ID must be a valid number']));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const updatedLabor = await LaborService.updateLabor(laborIdNum, updateData);
      
      return reply.status(200).send(successResponse(updatedLabor, 'Labor updated successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Labor not found', 404));
      }
      if (error.message === 'Email already exists') {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      if (error.message === 'Labor code already exists') {
        return reply.status(400).send(errorResponse('Labor code already exists', 400));
      }
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        if (error.message.includes('labor_labor_code_key')) {
          return reply.status(400).send(errorResponse('Labor code already exists', 400));
        }
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse('Failed to update labor', 500));
    }
  }

  static async deleteLabor(req, reply) {
    try {
      const { laborId } = req.params;

      if (!laborId) {
        return reply.status(400).send(validationErrorResponse(['Labor ID is required']));
      }

      const laborIdNum = parseInt(laborId);
      if (isNaN(laborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Labor ID must be a valid number']));
      }

      const result = await LaborService.deleteLabor(laborIdNum);
      
      return reply.status(200).send(successResponse(result, 'Labor deleted successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Labor not found', 404));
      }
      return reply.status(500).send(errorResponse('Failed to delete labor', 500));
    }
  }

  static async updateProfile(req, reply) {
    try {
      const { laborId } = req.params;
      let updateData = req.body;
      const files = req.files;

      if (!laborId) {
        return reply.status(400).send(validationErrorResponse(['Labor ID is required']));
      }

      const laborIdNum = parseInt(laborId);
      if (isNaN(laborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Labor ID must be a valid number']));
      }

      if (!updateData) {
        updateData = {};
      }

      if (Object.keys(updateData).length === 0 && (!files || Object.keys(files).length === 0)) {
        return reply.status(400).send(validationErrorResponse(['At least one field or file must be provided for update']));
      }

      const updatedLabor = await LaborService.updateProfile(laborIdNum, updateData, files);

      return reply.status(200).send(successResponse(updatedLabor, 'Labor profile updated successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Labor not found', 404));
      }
      if (error.message.includes('Email already exists')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse('Failed to update labor profile', 500));
    }
  }

  static async getCustomLabor(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await LaborService.getCustomLabor(page, limit);
      
      return reply.status(200).send(successResponse(result, 'Custom labor retrieved successfully'));
    } catch (error) {
      console.error('Error in getCustomLabor:', error);
      return reply.status(500).send(errorResponse('Failed to retrieve custom labor', 500));
    }
  }

  static async getLaborByJob(req, reply) {
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

      const result = await LaborService.getLaborByJob(jobIdNum, page, limit);
      
      return reply.status(200).send(successResponse(result, 'Job labor retrieved successfully'));
    } catch (error) {
      console.error('Error in getLaborByJob:', error);
      return reply.status(500).send(errorResponse('Failed to retrieve job labor', 500));
    }
  }
}
