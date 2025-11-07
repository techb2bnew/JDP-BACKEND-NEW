import { JobDocument } from '../models/JobDocument.js';
import { successResponse } from '../helpers/responseHelper.js';

export class JobDocumentService {
  static async createDocument(documentData, createdByUserId) {
    try {
      // Optimize: Lightweight job existence check
      const { supabase } = await import('../config/database.js');
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', documentData.job_id)
        .maybeSingle();

      if (jobError && jobError.code !== 'PGRST116') {
        throw new Error(`Database error: ${jobError.message}`);
      }

      if (!job) {
        throw new Error('Job not found');
      }

      const document = await JobDocument.create({
        ...documentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return successResponse(
        document,
        'Document created successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async getDocumentById(id) {
    try {
      const document = await JobDocument.findById(id);
      if (!document) {
        throw new Error('Document not found');
      }

      return successResponse(
        document,
        'Document retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async getDocumentsByJobId(jobId) {
    try {
      // Optimize: Lightweight job existence check
      const { supabase } = await import('../config/database.js');
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError && jobError.code !== 'PGRST116') {
        throw new Error(`Database error: ${jobError.message}`);
      }

      if (!job) {
        throw new Error('Job not found');
      }

      const documents = await JobDocument.findByJobId(jobId);

      return successResponse(
        documents,
        'Documents retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateDocument(id, updateData) {
    try {
      const existingDocument = await JobDocument.findById(id);
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      const updatedDocument = await JobDocument.update(id, updateData);

      return successResponse(
        updatedDocument,
        'Document updated successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async deleteDocument(id) {
    try {
      const existingDocument = await JobDocument.findById(id);
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      await JobDocument.delete(id);

      return successResponse(
        { id },
        'Document deleted successfully'
      );
    } catch (error) {
      throw error;
    }
  }

  static async getAllDocuments(filters = {}, pagination = {}) {
    try {
      const result = await JobDocument.findAll(filters, pagination);

      return successResponse(
        result,
        'Documents retrieved successfully'
      );
    } catch (error) {
      throw error;
    }
  }
}

