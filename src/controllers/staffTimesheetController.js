import { StaffTimesheetService } from '../services/staffTimesheetService.js';
import { Staff } from '../models/Staff.js';
import { StaffTimesheet } from '../models/StaffTimesheet.js';
import { successResponse, errorResponse, validationErrorResponse } from '../helpers/responseHelper.js';

export class StaffTimesheetController {
  static async createStaffTimesheet(req, reply) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Request body is empty',
          statusCode: 400
        });
      }

      const timesheetData = req.body;

      if (!timesheetData.staff_id || !timesheetData.date) {
        return reply.status(400).send(validationErrorResponse([
          'Staff ID and date are required'
        ]));
      }

      const result = await StaffTimesheetService.createStaffTimesheet(timesheetData);

      return reply.status(201).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('required')) {
        return reply.status(400).send(errorResponse(error.message, 400));
      }
      return reply.status(500).send(errorResponse('Failed to create staff timesheet', 500));
    }
  }

  static async getStaffTimesheetById(req, reply) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse('Valid timesheet ID is required', 400));
      }

      const result = await StaffTimesheetService.getStaffTimesheetById(parseInt(id));

      return reply.status(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(error.message, 404));
      }
      return reply.status(500).send(errorResponse(`Failed to retrieve staff timesheet: ${error.message}`, 500));
    }
  }

  static async getAllStaffTimesheets(req, reply) {
    try {
      // Get logged-in user's ID
      const userId = req.user?.id;
      
      if (!userId) {
        return reply.status(401).send(errorResponse('User not authenticated', 401));
      }

      // Get staff_id for the logged-in user
      const staff = await Staff.getStaffByUserId(userId);
      if (!staff || !staff.id) {
        return reply.status(404).send(errorResponse('Staff record not found for this user', 404));
      }

      const loggedInStaffId = staff.id;

      const { 
        staff_id, 
        date_from, 
        date_to, 
        date, 
        title,
        page = 1, 
        limit = 10,
        sortBy = 'date',
        sortOrder = 'desc'
      } = req.query;

      const filters = {};
      // Always filter by logged-in user's staff_id
      filters.staff_id = loggedInStaffId;
      
      // Ignore staff_id from query if provided - user can only see their own timesheets
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      if (date) filters.date = date;
      if (title) filters.title = title;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return reply.status(400).send(errorResponse('Page must be a positive number', 400));
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.status(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }

      const pagination = {
        page: pageNum,
        limit: limitNum,
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      const result = await StaffTimesheetService.getAllStaffTimesheets(filters, pagination);

      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(500).send(errorResponse(`Failed to retrieve staff timesheets: ${error.message}`, 500));
    }
  }

  static async updateStaffTimesheet(req, reply) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse('Valid timesheet ID is required', 400));
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return reply.status(400).send(validationErrorResponse(['Update data is required']));
      }

      const result = await StaffTimesheetService.updateStaffTimesheet(parseInt(id), updateData);

      return reply.status(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(error.message, 404));
      }
      return reply.status(500).send(errorResponse(`Failed to update staff timesheet: ${error.message}`, 500));
    }
  }

  static async deleteStaffTimesheet(req, reply) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return reply.status(400).send(errorResponse('Valid timesheet ID is required', 400));
      }

      const result = await StaffTimesheetService.deleteStaffTimesheet(parseInt(id));

      return reply.status(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.status(404).send(errorResponse(error.message, 404));
      }
      return reply.status(500).send(errorResponse(`Failed to delete staff timesheet: ${error.message}`, 500));
    }
  }

  static async getAllStaffWeeklyTimesheetSummary(req, reply) {
    try {
      // Get logged-in user's ID
      const userId = req.user?.id;
      
      if (!userId) {
        return reply.status(401).send(errorResponse('User not authenticated', 401));
      }

      // Get staff_id for the logged-in user
      const staff = await Staff.getStaffByUserId(userId);
      if (!staff || !staff.id) {
        return reply.status(404).send(errorResponse('Staff record not found for this user', 404));
      }

      const loggedInStaffId = staff.id;
      const { start_date, end_date, page = 1, limit = 10 } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (isNaN(pageNum) || pageNum < 1) {
        return reply.code(400).send(errorResponse('Page must be a positive number', 400));
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.code(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }

      const pagination = {
        page: pageNum,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum
      };

      const result = await StaffTimesheet.getAllStaffWeeklyTimesheetSummary(start_date, end_date, pagination, loggedInStaffId);
      
      return reply.code(200).send({
        success: true,
        message: 'All staff weekly timesheet summary retrieved successfully',
        data: result
      });
    } catch (error) {
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getWeeklyTimesheetView(req, reply) {
    try {
      const { start_date, end_date, staff_id } = req.query;

      if (!start_date || !end_date) {
        return reply.code(400).send(errorResponse('start_date and end_date are required', 400));
      }

      if (!staff_id) {
        return reply.code(400).send(errorResponse('staff_id is required', 400));
      }

      const staffId = parseInt(staff_id);

      if (isNaN(staffId) || staffId < 1) {
        return reply.code(400).send(errorResponse('Invalid staff_id', 400));
      }

      const result = await StaffTimesheet.getWeeklyTimesheetView(staffId, start_date, end_date);
      
      return reply.code(200).send({
        success: true,
        message: 'Weekly timesheet view retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }
}

