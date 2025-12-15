import { StaffTimesheetController } from '../controllers/staffTimesheetController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function staffTimesheetRoutes(fastify, options) {
  // Create Staff Timesheet
  fastify.post('/createStaffTimesheet', {
    preHandler: authenticateToken
  }, StaffTimesheetController.createStaffTimesheet);

  // Get Staff Timesheet by ID
  fastify.get('/getStaffTimesheetById/:id', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, StaffTimesheetController.getStaffTimesheetById);

  // Get All Staff Timesheets
  fastify.get('/getAllStaffTimesheets', {
    preHandler: authenticateToken
  }, StaffTimesheetController.getAllStaffTimesheets);

  // Update Staff Timesheet
  fastify.post('/updateStaffTimesheet/:id', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, StaffTimesheetController.updateStaffTimesheet);

  // Delete Staff Timesheet
  fastify.delete('/deleteStaffTimesheet/:id', {
    preHandler: authenticateToken,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, StaffTimesheetController.deleteStaffTimesheet);

  // Get All Staff Weekly Timesheet Summary
  fastify.get('/getAllStaffWeeklyTimesheetSummary', {
    preHandler: authenticateToken
  }, StaffTimesheetController.getAllStaffWeeklyTimesheetSummary);

  // Get Weekly Timesheet View
  fastify.get('/getWeeklyTimesheetView', {
    preHandler: authenticateToken
  }, StaffTimesheetController.getWeeklyTimesheetView);
}

