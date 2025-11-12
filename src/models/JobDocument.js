import { supabase } from '../config/database.js';

export class JobDocument {
  static async create(documentData) {
    try {
      const { data, error } = await supabase
        .from('job_documents')
        .insert([documentData])
        .select(`
          *,
          job:jobs!job_documents_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('job_documents')
        .select(`
          *,
          job:jobs!job_documents_job_id_fkey(
            id,
            job_title,
            job_type,
            status,
            priority
          )
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByJobId(jobId) {
    try {
      const { data, error } = await supabase
        .from('job_documents')
        .select(`
          *,
          job:jobs!job_documents_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('job_documents')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          job:jobs!job_documents_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('job_documents')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('job_documents')
        .select(`
          *,
          job:jobs!job_documents_job_id_fkey(
            id,
            job_title,
            job_type,
            status
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }

      if (filters.document_title) {
        query = query.ilike('document_title', `%${filters.document_title}%`);
      }

    
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        documents: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw error;
    }
  }
}

