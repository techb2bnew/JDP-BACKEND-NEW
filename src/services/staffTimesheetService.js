import { StaffTimesheet } from '../models/StaffTimesheet.js';
import { Staff } from '../models/Staff.js';
import { successResponse } from '../helpers/responseHelper.js';

export class StaffTimesheetService {
  static async createStaffTimesheet(timesheetData) {
    try {
      // Validate required fields
      if (!timesheetData.staff_id) {
        throw new Error('Staff ID is required');
      }

      if (!timesheetData.date) {
        throw new Error('Date is required');
      }

      // Verify staff exists
      const staff = await Staff.getStaffById(timesheetData.staff_id);
      if (!staff) {
        throw new Error('Staff not found');
      }

      // Create timesheet
      const timesheet = await StaffTimesheet.create(timesheetData);

      return successResponse(timesheet, 'Staff timesheet created successfully', 201);
    } catch (error) {
      throw error;
    }
  }

  static async getStaffTimesheetById(id) {
    try {
      const timesheet = await StaffTimesheet.findById(id);

      if (!timesheet) {
        throw new Error('Staff timesheet not found');
      }

      return successResponse(timesheet, 'Staff timesheet retrieved successfully');
    } catch (error) {
      throw error;
    }
  }

  static async getAllStaffTimesheets(filters = {}, pagination = {}) {
    try {
      const result = await StaffTimesheet.findAll(filters, pagination);

      const totalPages = pagination.limit 
        ? Math.ceil(result.count / pagination.limit) 
        : 1;

      return successResponse(
        {
          timesheets: result.data,
          pagination: {
            current_page: pagination.page || 1,
            total_pages: totalPages,
            total_records: result.count,
            records_per_page: pagination.limit || result.count,
            has_next_page: pagination.page ? pagination.page < totalPages : false,
            has_prev_page: pagination.page ? pagination.page > 1 : false
          }
        },
        'Staff timesheets retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateStaffTimesheet(id, updateData) {
    try {
      // Check if timesheet exists
      const existingTimesheet = await StaffTimesheet.findById(id);
      if (!existingTimesheet) {
        throw new Error('Staff timesheet not found');
      }

      // If staff_id is being updated, verify new staff exists
      if (updateData.staff_id && updateData.staff_id !== existingTimesheet.staff_id) {
        const staff = await Staff.getStaffById(updateData.staff_id);
        if (!staff) {
          throw new Error('Staff not found');
        }
      }

      // Update timesheet
      const updatedTimesheet = await StaffTimesheet.update(id, updateData);

      return successResponse(updatedTimesheet, 'Staff timesheet updated successfully');
    } catch (error) {
      throw error;
    }
  }

  static async deleteStaffTimesheet(id) {
    try {
      // Check if timesheet exists
      const existingTimesheet = await StaffTimesheet.findById(id);
      if (!existingTimesheet) {
        throw new Error('Staff timesheet not found');
      }

      // Delete timesheet
      await StaffTimesheet.delete(id);

      return successResponse(null, 'Staff timesheet deleted successfully');
    } catch (error) {
      throw error;
    }
  }
}

