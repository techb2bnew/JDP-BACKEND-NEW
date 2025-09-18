import { JobService } from '../services/jobService.js';
import { errorResponse } from '../helpers/responseHelper.js';

export class JobController {
  static async createJob(request, reply) {
    try {
      const userId = request.user.id; 
      const result = await JobService.createJob(request.body, userId);
      return reply.code(201).send(result);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobs(request, reply) {
    try {
      const { 
        page, limit, search, status, priority, job_type, 
        customer_id, contractor_id, created_from, sortBy, sortOrder 
      } = request.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (job_type) filters.job_type = job_type;
      if (customer_id) filters.customer_id = parseInt(customer_id);
      if (contractor_id) filters.contractor_id = parseInt(contractor_id);
      if (created_from) filters.created_from = created_from;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc'
      };

      const result = await JobService.getJobs(filters, pagination);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobById(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.getJobById(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async updateJob(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.updateJob(parseInt(id), request.body);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async deleteJob(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.deleteJob(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobStats(request, reply) {
    try {
      const result = await JobService.getJobStats();
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByCustomer(request, reply) {
    try {
      const { customerId } = request.params;
      const result = await JobService.getJobsByCustomer(parseInt(customerId));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByContractor(request, reply) {
    try {
      const { contractorId } = request.params;
      const result = await JobService.getJobsByContractor(parseInt(contractorId));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobDashboardDetails(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.getJobDashboardDetails(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByLabor(request, reply) {
    try {
      const { 
        laborId, 
        page = 1, 
        limit = 10 
      } = request.query;

      if (!laborId) {
        return reply.code(400).send(errorResponse('laborId is required', 400));
      }

      const result = await JobService.getJobsByLabor(
        parseInt(laborId),
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByLeadLabor(request, reply) {
    try {
      const { 
        leadLaborId, 
        page = 1, 
        limit = 10 
      } = request.query;

      if (!leadLaborId) {
        return reply.code(400).send(errorResponse('leadLaborId is required', 400));
      }

      const result = await JobService.getJobsByLeadLabor(
        parseInt(leadLaborId),
        parseInt(page),
        parseInt(limit)
      );
      
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }
}
