import { JobDocumentService } from '../services/jobDocumentService.js';
import { responseHelper } from '../helpers/responseHelper.js';

export class JobDocumentController {
  static async createDocument(request, reply) {
    try {
      const { job_id, document_title, document_file } = request.body;
      const createdByUserId = request.user?.id;

      if (!job_id || !document_title || !document_file) {
        return responseHelper.validationError(reply, {
          job_id: job_id ? null : 'Job ID is required',
          document_title: document_title ? null : 'Document title is required',
          document_file: document_file ? null : 'Document file is required'
        });
      }

      const result = await JobDocumentService.createDocument({
        job_id: parseInt(job_id),
        document_title,
        document_file
      }, createdByUserId);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getDocumentById(request, reply) {
    try {
      const { id } = request.params;

      if (!id || isNaN(id)) {
        return responseHelper.validationError(reply, {
          id: 'Valid document ID is required'
        });
      }

      const result = await JobDocumentService.getDocumentById(parseInt(id));

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getDocumentsByJobId(request, reply) {
    try {
      const { jobId } = request.params;

      if (!jobId || isNaN(jobId)) {
        return responseHelper.validationError(reply, {
          jobId: 'Valid job ID is required'
        });
      }

      const result = await JobDocumentService.getDocumentsByJobId(parseInt(jobId));

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async updateDocument(request, reply) {
    try {
      const { id } = request.params;
      const { document_title, document_file } = request.body;

      if (!id || isNaN(id)) {
        return responseHelper.validationError(reply, {
          id: 'Valid document ID is required'
        });
      }

      const updateData = {};
      if (document_title !== undefined) updateData.document_title = document_title;
      if (document_file !== undefined) updateData.document_file = document_file;

      if (Object.keys(updateData).length === 0) {
        return responseHelper.validationError(reply, {
          message: 'At least one field must be provided for update'
        });
      }

      const result = await JobDocumentService.updateDocument(parseInt(id), updateData);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async deleteDocument(request, reply) {
    try {
      const { id } = request.params;

      if (!id || isNaN(id)) {
        return responseHelper.validationError(reply, {
          id: 'Valid document ID is required'
        });
      }

      const result = await JobDocumentService.deleteDocument(parseInt(id));

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getAllDocuments(request, reply) {
    try {
      const { page = 1, limit = 10, job_id, document_title } = request.query;

      const filters = {};
      if (job_id) filters.job_id = parseInt(job_id);
      if (document_title) filters.document_title = document_title;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const result = await JobDocumentService.getAllDocuments(filters, pagination);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }
}

