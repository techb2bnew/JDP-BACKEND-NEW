import { StaffService } from '../services/staffService.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class StaffController {
  static async createStaff(req, reply) {
    try {
      const staffData = req.body;

      if (!staffData.full_name || !staffData.email || !staffData.position || !staffData.department) {
        return reply.status(400).send(validationErrorResponse([
          'Full name, email, position, and department are required'
        ]));
      }

      try {
        StaffService.validateStaffData(staffData);
      } catch (validationError) {
        return reply.status(400).send(validationErrorResponse([validationError.message]));
      }

      const result = await StaffService.createStaffWithUser(staffData);

      return reply.status(201).send(successResponse(result, 'Staff created successfully', 201));
    } catch (error) {

      
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }

      return reply.status(500).send(errorResponse(`Failed to create staff: ${error.message}`, 500));
    }
  }

  static async getAllStaff(req, reply) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (page < 1) {
        return reply.status(400).send(errorResponse('Page must be greater than 0', 400));
      }
      if (limit < 1 || limit > 100) {
        return reply.status(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }
      
      const result = await StaffService.getAllStaff(page, limit);
      
      return reply.status(200).send(successResponse(result, 'Staff retrieved successfully'));
    } catch (error) {

      return reply.status(500).send(errorResponse(`Failed to retrieve staff: ${error.message}`, 500));
    }
  }

  static async searchStaff(req, reply) {
    try {
      const { 
        q, 
        page, 
        limit, 
        name, 
        phone, 
        email, 
        address, 
        position, 
        department, 
        dob_from,
        dob_to,
        date_of_joining_from,
        date_of_joining_to,
        status,
        role
      } = req.query;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const filters = {
        q: q || '',
        name,
        phone,
        email,
        address,
        position,
        department,
        dob_from: dob_from ? new Date(dob_from) : null,
        dob_to: dob_to ? new Date(dob_to) : null,
        date_of_joining_from: date_of_joining_from ? new Date(date_of_joining_from) : null,
        date_of_joining_to: date_of_joining_to ? new Date(date_of_joining_to) : null,
        status,
        role
      };

      const result = await StaffService.searchStaff(filters, pagination);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send(errorResponse(
        `Failed to search staff: ${error.message}`,
        500
      ));
    }
  }

  static async getStaffById(req, reply) {
    try {
      const { staffId } = req.params;

      if (!staffId) {
        return reply.status(400).send(validationErrorResponse(['Staff ID is required']));
      }

      const staffIdNum = parseInt(staffId);
      if (isNaN(staffIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Staff ID must be a valid number']));
      }

      const staff = await StaffService.getStaffById(staffIdNum);

      return reply.status(200).send(successResponse(staff, 'Staff retrieved successfully'));
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Staff not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to retrieve staff: ${error.message}`, 500));
    }
  }

  static async updateStaff(req, reply) {
    try {
      const { staffId } = req.params;
      const updateData = req.body;

      if (!staffId) {
        return reply.status(400).send(validationErrorResponse(['Staff ID is required']));
      }

      const staffIdNum = parseInt(staffId);
      if (isNaN(staffIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Staff ID must be a valid number']));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const updatedStaff = await StaffService.updateStaff(staffIdNum, updateData);

      return reply.status(200).send(successResponse(updatedStaff, 'Staff updated successfully'));
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Staff not found', 404));
      }
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse(`Failed to update staff: ${error.message}`, 500));
    }
  }

  static async deleteStaff(req, reply) {
    try {
      const { staffId } = req.params;

      if (!staffId) {
        return reply.status(400).send(validationErrorResponse(['Staff ID is required']));
      }

      const staffIdNum = parseInt(staffId);
      if (isNaN(staffIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Staff ID must be a valid number']));
      }

      const result = await StaffService.deleteStaff(staffIdNum);

      return reply.status(200).send(successResponse(result, 'Staff deleted successfully'));
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Staff not found', 404));
      }
      return reply.status(500).send(errorResponse(`Failed to delete staff: ${error.message}`, 500));
    }
  }

  static async updateProfile(req, reply) {
    try {
      const { staffId } = req.params;
      let updateData = req.body;
      const files = req.files;

      if (!staffId) {
        return reply.status(400).send(validationErrorResponse(['Staff ID is required']));
      }

      const staffIdNum = parseInt(staffId);
      if (isNaN(staffIdNum)) {
        return reply.status(400).send(validationErrorResponse(['Staff ID must be a valid number']));
      }

      if (!updateData) {
        updateData = {};
      }

      if (Object.keys(updateData).length === 0 && (!files || Object.keys(files).length === 0)) {
        return reply.status(400).send(validationErrorResponse(['At least one field or file must be provided for update']));
      }

      const updatedStaff = await StaffService.updateProfile(staffIdNum, updateData, files);

      return reply.status(200).send(successResponse(updatedStaff, 'Staff profile updated successfully'));
    } catch (error) {

      
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse('Staff not found', 404));
      }
      if (error.message.includes('Email already exists')) {
        return reply.status(400).send(errorResponse('Email already exists', 400));
      }
      return reply.status(500).send(errorResponse(`Failed to update staff profile: ${error.message}`, 500));
    }
  }

  static async getStaffStats(req, reply) {
    try {
      const stats = await StaffService.getStaffStats();
      return reply.status(200).send(successResponse(stats, 'Staff statistics retrieved successfully'));
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to retrieve staff statistics: ${error.message}`, 500));
    }
  }
}
