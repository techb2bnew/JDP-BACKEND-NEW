import { LeadLaborService } from '../services/leadLaborService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class LeadLaborController {
  static async createLeadLabor(req, reply) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return reply.status(400).send({
          success: false,
          message: "Request body is empty",
          statusCode: 400
        });
      }
      
      const leadLaborData = req.body;
      const files = req.files; 

      if (!leadLaborData.full_name || !leadLaborData.email || !leadLaborData.dob || !leadLaborData.address || !leadLaborData.department || !leadLaborData.date_of_joining) {
        return reply.status(400).send(validationErrorResponse([
          'Full name, email, date of birth, address, department, and date of joining are required'
        ]));
      }

      try {
        LeadLaborService.validateLeadLaborData(leadLaborData);
      } catch (validationError) {
        return reply.status(400).send(validationErrorResponse([validationError.message]));
      }

      const result = await LeadLaborService.createLeadLaborWithUser(leadLaborData, files);

      return reply.status(201).send(successResponse(result, 'Lead Labor created successfully', 201));
    } catch (error) {

      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }

      if (error.message.includes('Email already exists')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }

      if (error.message.includes('Labor code already exists')) {
        return reply.status(400).send(errorResponse('Labor code already exists', 400));
      }

      if (error.message.includes('Invalid file type')) {
        return reply.status(400).send(errorResponse(error.message, 400));
      }

      return reply.status(500).send(errorResponse('Failed to create lead labor', 500));
    }
  }

  static async getAllLeadLabor(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (page < 1) {
        return reply.status(400).send(errorResponse('Page must be greater than 0', 400));
      }
      if (limit < 1 || limit > 100) {
        return reply.status(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }
      
      const result = await LeadLaborService.getAllLeadLabor(page, limit);

      return reply.status(200).send(successResponse(result, 'Lead labor retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse('Failed to retrieve lead labor', 500));
    }
  }

  static async getLeadLaborById(req, reply) {
    try {
      const { leadLaborId } = req.params;

      if (!leadLaborId) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID is required']));
      }

      const leadLaborIdNum = parseInt(leadLaborId);
      if (isNaN(leadLaborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID must be a valid number']));
      }

      const leadLabor = await LeadLaborService.getLeadLaborById(leadLaborIdNum);

      return reply.status(200).send(successResponse(leadLabor, 'Lead Labor retrieved successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Lead Labor not found', 404));
      }
      return reply.status(500).send(errorResponse('Failed to retrieve lead labor', 500));
    }
  }

  static async updateLeadLabor(req, reply) {
    try {
      const { leadLaborId } = req.params;
      const updateData = req.body;

      if (!leadLaborId) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID is required']));
      }

      const leadLaborIdNum = parseInt(leadLaborId);
      if (isNaN(leadLaborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID must be a valid number']));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const files = req.files; 
      const updatedLeadLabor = await LeadLaborService.updateLeadLabor(leadLaborIdNum, updateData, files);

      return reply.status(200).send(successResponse(updatedLeadLabor, 'Lead Labor updated successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Lead Labor not found', 404));
      }
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      if (error.message.includes('Email already exists')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse('Failed to update lead labor', 500));
    }
  }

  static async deleteLeadLabor(req, reply) {
    try {
      const { leadLaborId } = req.params;

      if (!leadLaborId) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID is required']));
      }

      const leadLaborIdNum = parseInt(leadLaborId);
      if (isNaN(leadLaborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID must be a valid number']));
      }

      const result = await LeadLaborService.deleteLeadLabor(leadLaborIdNum);

      return reply.status(200).send(successResponse(result, 'Lead Labor deleted successfully'));
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Lead Labor not found', 404));
      }
      return reply.status(500).send(errorResponse('Failed to delete lead labor', 500));
    }
  }

  static async updateProfile(req, reply) {
    try {
      const { leadLaborId } = req.params;
      let updateData = req.body;
      const files = req.files;

      if (!leadLaborId) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID is required']));
      }

      const leadLaborIdNum = parseInt(leadLaborId);
      if (isNaN(leadLaborIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Lead Labor ID must be a valid number']));
      }

      if (!updateData) {
        updateData = {};
      }

      if (Object.keys(updateData).length === 0 && (!files || Object.keys(files).length === 0)) {
        return reply.status(400).send(validationErrorResponse(['At least one field or file must be provided for update']));
      }

      const updatedLeadLabor = await LeadLaborService.updateProfile(leadLaborIdNum, updateData, files);

      return reply.status(200).send(successResponse(updatedLeadLabor, 'Lead Labor profile updated successfully'));
    } catch (error) {
      console.error('Error in updateProfile:', error);
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Lead Labor not found', 404));
      }
      if (error.message.includes('Email already exists')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse('Failed to update lead labor profile', 500));
    }
  }
}
