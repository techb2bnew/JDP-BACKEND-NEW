import { ContractorService } from '../services/contractorService.js';
import { errorResponse } from '../helpers/responseHelper.js';

export class ContractorController {
  static async createContractor(request, reply) {
    try {
      const userId = request.user.id; 
      const result = await ContractorService.createContractor(request.body, userId);
      return reply.code(201).send(result);
    } catch (error) {     
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to create contractor: ${error.message}`));
    }
  }

  static async getContractors(request, reply) {
    try {
      const { page, limit, search, status, job_id, sortBy, sortOrder, include_jobs } = request.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (job_id) filters.job_id = job_id;
      if (include_jobs) filters.include_jobs = include_jobs === 'true';

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc'
      };

      const result = await ContractorService.getContractors(filters, pagination);
      return reply.code(200).send(result);
    } catch (error) {  
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get contractors: ${error.message}`));
    }
  }

  static async getContractorById(request, reply) {
    try {
      const { id } = request.params;
      const result = await ContractorService.getContractorById(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {      
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get contractor: ${error.message}`));
    }
  }

  static async getContractorsByJobId(request, reply) {
    try {
      const { jobId } = request.params;
      const result = await ContractorService.getContractorsByJobId(jobId);
      return reply.code(200).send(result);
    } catch (error) {      
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get contractors by job: ${error.message}`));
    }
  }

  static async updateContractor(request, reply) {
    try {
      const { id } = request.params;
      const result = await ContractorService.updateContractor(parseInt(id), request.body);
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
      return reply.code(500).send(errorResponse(`Failed to update contractor: ${error.message}`));
    }
  }

  static async deleteContractor(request, reply) {
    try {
      const { id } = request.params;
      const result = await ContractorService.deleteContractor(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
    
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to delete contractor: ${error.message}`));
    }
  }

  static async getContractorStats(request, reply) {
    try {
      const result = await ContractorService.getContractorStats();
      return reply.code(200).send(result);
    } catch (error) {
      
      
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get contractor stats: ${error.message}`));
    }
  }


  static async getJobDetails(request, reply) {
    try {
      
      const { jobId } = request.params;
      
      if (!jobId) {
        return reply.code(400).send(errorResponse('Job ID is required', 400));
      }

      const result = await ContractorService.getJobDetails(parseInt(jobId));
      return reply.code(200).send(result);
    } catch (error) {
      
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to get job details: ${error.message}`));
    }
  }

}
