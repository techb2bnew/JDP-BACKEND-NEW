import { JobTimeLogService } from '../services/jobTimeLogService.js';
import { successResponse, errorResponse } from '../helpers/responseHelper.js';

export class JobTimeLogController {
  static async createTimeLog(request, reply) {
    try {
      const timeLogData = request.body;
      const userId = request.user.id;
      
      const result = await JobTimeLogService.createTimeLog(timeLogData, userId);
      
      return reply.status(201).send(successResponse(
        result.timeLog,
        result.message,
        201
      ));
    } catch (error) {
      return reply.status(400).send(errorResponse(
        error.message,
        400
      ));
    }
  }

  static async getTimeLogs(request, reply) {
    try {
      const {
        page = 1,
        limit = 10,
        job_id,
        labor_id,
        lead_labor_id,
        work_date,
        worker_name,
        role,
        status,
        sortBy,
        sortOrder
      } = request.query;

      const filters = {};
      if (job_id) filters.job_id = parseInt(job_id);
      if (labor_id) filters.labor_id = parseInt(labor_id);
      if (lead_labor_id) filters.lead_labor_id = parseInt(lead_labor_id);
      if (work_date) filters.work_date = work_date;
      if (worker_name) filters.worker_name = worker_name;
      if (role) filters.role = role;
      if (status) filters.status = status;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sortBy || 'work_date',
        sortOrder: sortOrder || 'desc'
      };

      const result = await JobTimeLogService.getTimeLogs(
        pagination.page,
        pagination.limit,
        filters
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Time logs retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async getTimeLogById(request, reply) {
    try {
      const { id } = request.params;
      const timeLog = await JobTimeLogService.getTimeLogById(parseInt(id));
      
      return reply.status(200).send(successResponse(
        timeLog,
        'Time log retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(404).send(errorResponse(
        error.message,
        404
      ));
    }
  }

  static async updateTimeLog(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;
      const userId = request.user.id;
      
      const result = await JobTimeLogService.updateTimeLog(
        parseInt(id),
        updateData,
        userId
      );
      
      return reply.status(200).send(successResponse(
        result.timeLog,
        result.message,
        200
      ));
    } catch (error) {
      return reply.status(400).send(errorResponse(
        error.message,
        400
      ));
    }
  }

  static async deleteTimeLog(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobTimeLogService.deleteTimeLog(parseInt(id));
      
      return reply.status(200).send(successResponse(
        result.deletedTimeLog,
        result.message,
        200
      ));
    } catch (error) {
      return reply.status(404).send(errorResponse(
        error.message,
        404
      ));
    }
  }

  static async getTimeLogsByJob(request, reply) {
    try {
      const { jobId } = request.params;
      const {
        page = 1,
        limit = 10
      } = request.query;

      const result = await JobTimeLogService.getTimeLogsByJob(
        parseInt(jobId),
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Time logs for job retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async getTimeLogsByLabor(request, reply) {
    try {
      const { laborId } = request.params;
      const {
        page = 1,
        limit = 10
      } = request.query;

      const result = await JobTimeLogService.getTimeLogsByLabor(
        parseInt(laborId),
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.status(200).send(successResponse(
        result,
        'Time logs for labor retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }

  static async getTimeLogStats(request, reply) {
    try {
      const stats = await JobTimeLogService.getTimeLogStats();
      
      return reply.status(200).send(successResponse(
        stats,
        'Time log statistics retrieved successfully',
        200
      ));
    } catch (error) {
      return reply.status(500).send(errorResponse(
        error.message,
        500
      ));
    }
  }
}
