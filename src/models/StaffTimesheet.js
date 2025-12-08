import { supabase } from '../config/database.js';

export class StaffTimesheet {
  static async create(timesheetData) {
    try {
      // Calculate total_hours if start_time and end_time are provided
      if (timesheetData.start_time && timesheetData.end_time && !timesheetData.total_hours) {
        const start = new Date(`2000-01-01T${timesheetData.start_time}`);
        const end = new Date(`2000-01-01T${timesheetData.end_time}`);
        const diffMs = end - start;
        timesheetData.total_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      const { data, error } = await supabase
        .from('staff_timesheets')
        .insert([timesheetData])
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
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
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.staff_id) {
        query = query.eq('staff_id', filters.staff_id);
      }

      if (filters.job_id) {
        query = query.eq('job_id', filters.job_id);
      }

      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }

      if (filters.date) {
        query = query.eq('date', filters.date);
      }

      if (filters.title) {
        query = query.ilike('title', `%${filters.title}%`);
      }

      // Apply pagination
      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      // Apply sorting
      const sortBy = pagination.sortBy || 'date';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        data: data || [],
        count: count || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByStaffId(staffId, filters = {}) {
    try {
      let query = supabase
        .from('staff_timesheets')
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .eq('staff_id', staffId);

      if (filters.date_from) {
        query = query.gte('date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('date', filters.date_to);
      }

      if (filters.date) {
        query = query.eq('date', filters.date);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

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
      // Calculate total_hours if start_time and end_time are provided
      if (updateData.start_time && updateData.end_time && !updateData.total_hours) {
        const start = new Date(`2000-01-01T${updateData.start_time}`);
        const end = new Date(`2000-01-01T${updateData.end_time}`);
        const diffMs = end - start;
        updateData.total_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('staff_timesheets')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          staff:staff_id (
            id,
            position,
            department,
            users!staff_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          job:job_id (
            id,
            job_title,
            job_type,
            status,
            priority,
            description
          )
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Staff timesheet not found');
        }
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const { error } = await supabase
        .from('staff_timesheets')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}

