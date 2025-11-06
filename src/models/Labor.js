import { supabase } from '../config/database.js';

export class Labor {
  static parseLaborData(data) {
    if (!data) return data;
    
    if (!Array.isArray(data)) {
      const parsedData = { ...data }; 
      
      if (parsedData.certifications && typeof parsedData.certifications === 'string') {
        try {
          parsedData.certifications = JSON.parse(parsedData.certifications);
        } catch (e) {
        }
      }
      if (parsedData.skills && typeof parsedData.skills === 'string') {
        try {
          parsedData.skills = JSON.parse(parsedData.skills);
        } catch (e) {
        }
      }
      return parsedData;
    }
    
    return data.map(item => this.parseLaborData(item));
  }
  static async create(laborData) {
    try {
      // Use frontend total_cost if provided, otherwise calculate
      if (!laborData.total_cost || laborData.total_cost === 0) {
        if (laborData.hours_worked && laborData.hourly_rate) {
          laborData.total_cost = laborData.hours_worked * laborData.hourly_rate;
        } else {
          laborData.total_cost = 0;
        }
      }
      
     
      
      const { data, error } = await supabase
        .from('labor')
        .insert([laborData])
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async getAllLabor(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Optimize: Run count, data, and jobs queries in parallel
      const [countResult, dataResult, jobsResult] = await Promise.all([
        supabase
          .from('labor')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('labor')
          .select(`
            *,
            users!labor_user_id_fkey (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            ),
            supervisor:users!labor_supervisor_id_fkey (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            )
          `)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1),
        // Optimize: Fetch jobs in parallel (only required fields)
        supabase
          .from('jobs')
          .select('id, assigned_labor_ids')
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];

      // Optimize: Build laborId -> assigned jobs count map efficiently
      // Only process jobs for current page's labor IDs
      let laborIdToJobCount = {};
      if (!jobsResult.error && jobsResult.data) {
        // Use Set for O(1) lookups during counting
        const laborIdsSet = new Set(data.map(l => l.id));
        
        for (const job of jobsResult.data) {
          let ids = [];
          if (typeof job.assigned_labor_ids === 'string') {
            try {
              ids = JSON.parse(job.assigned_labor_ids || '[]') || [];
            } catch (_) {
              ids = [];
            }
          } else if (Array.isArray(job.assigned_labor_ids)) {
            ids = job.assigned_labor_ids;
          }

          // Only process IDs that are in the current page's labor
          for (const id of ids) {
            const laborIdNum = parseInt(id);
            if (!Number.isNaN(laborIdNum) && laborIdsSet.has(laborIdNum)) {
              laborIdToJobCount[laborIdNum] = (laborIdToJobCount[laborIdNum] || 0) + 1;
            }
          }
        }
      }

      const totalPages = Math.ceil(count / limit);

      return {
        data: this.parseLaborData((data || []).map(l => ({
          ...l,
          assigned_jobs_count: laborIdToJobCount[l.id] || 0
        }))),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLaborById(laborId) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('id', laborId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Labor not found with ID: ${laborId}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async update(laborId, updateData) {
    try {
      // Auto-calculate total_cost if not provided but hours_worked or hourly_rate is updated
      if (!updateData.total_cost && (updateData.hours_worked || updateData.hourly_rate)) {
        // Optimize: Only fetch required fields for calculation
        const { data: currentLabor } = await supabase
          .from('labor')
          .select('hours_worked, hourly_rate')
          .eq('id', laborId)
          .single();
        
        if (currentLabor) {
          const hours = updateData.hours_worked || currentLabor.hours_worked || 0;
          const rate = updateData.hourly_rate || currentLabor.hourly_rate || 0;
          updateData.total_cost = hours * rate;
        }
      }
      
      const { data, error } = await supabase
        .from('labor')
        .update(updateData)
        .eq('id', laborId)
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async checkLaborRelationships(laborId) {
    try {
      if (!laborId) {
        throw new Error('Labor ID is required');
      }

      // Optimize: Run all relationship checks in parallel
      // For jobs, we use text search to find potential matches (fast with index), then verify only those
      // This is much faster than fetching all jobs - we only fetch jobs that might contain this ID
      const [jobsResult, bluesheetResult, timesheetResult] = await Promise.all([
        // Use text search to find jobs that might contain this labor ID
        // This is fast because it uses database indexes, then we verify only the matches
        supabase
          .from('jobs')
          .select('id, job_title, assigned_labor_ids')
          .ilike('assigned_labor_ids', `%${laborId}%`), // Fast text search - finds potential matches
        supabase
          .from('job_bluesheet_labor')
          .select('id')
          .eq('labor_id', laborId)
          .limit(1),
        supabase
          .from('labor_timesheets')
          .select('id')
          .eq('labor_id', laborId)
          .limit(1)
      ]);

      const relationships = [];

      // Check if labor is assigned to any jobs
      // We verify the matches to ensure the ID is actually in the array (not just a substring)
      if (!jobsResult.error && jobsResult.data) {
        const assignedJobs = jobsResult.data.filter(job => {
          if (!job.assigned_labor_ids) return false;
          
          let laborIds = [];
          try {
            // Try to parse as JSON array
            if (typeof job.assigned_labor_ids === 'string') {
              laborIds = JSON.parse(job.assigned_labor_ids);
            } else if (Array.isArray(job.assigned_labor_ids)) {
              laborIds = job.assigned_labor_ids;
            }
          } catch (e) {
            // If parsing fails, try to handle as comma-separated string
            if (typeof job.assigned_labor_ids === 'string') {
              laborIds = job.assigned_labor_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            }
          }
          
          // Verify the ID is actually in the array (not just a substring match like "157" matching "57")
          return laborIds.some(id => parseInt(id) === parseInt(laborId));
        });

        if (assignedJobs.length > 0) {
          relationships.push({
            table: 'jobs',
            count: assignedJobs.length,
            message: `This labor is assigned to ${assignedJobs.length} job(s)`
          });
        }
      }

      // Check if labor is referenced in job_bluesheet_labor
      if (!bluesheetResult.error && bluesheetResult.data && bluesheetResult.data.length > 0) {
        relationships.push({
          table: 'job_bluesheet_labor',
          count: bluesheetResult.data.length,
          message: 'This labor has bluesheet entries'
        });
      }

      // Check if labor is referenced in labor_timesheets
      if (!timesheetResult.error && timesheetResult.data && timesheetResult.data.length > 0) {
        relationships.push({
          table: 'labor_timesheets',
          count: timesheetResult.data.length,
          message: 'This labor has timesheet entries'
        });
      }

      return {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async delete(laborId) {
    try {
      const labor = await this.getLaborById(laborId);
      const userId = labor.user_id;
      
      const { error: laborError } = await supabase
        .from('labor')
        .delete()
        .eq('id', laborId);

      if (laborError) {
        throw new Error(`Database error: ${laborError.message}`);
      }

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        throw new Error(`Database error: ${userError.message}`);
      }

      return {
        success: true,
        message: `Labor "${labor.users.full_name}" deleted successfully`,
        deleted_labor: {
          id: labor.id,
          full_name: labor.users.full_name,
          email: labor.users.email,
          labor_code: labor.labor_code,
          trade: labor.trade
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLaborByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async findByLaborCode(laborCode) {
    try {
      const { data, error } = await supabase
        .from('labor')
        .select('*')
        .eq('labor_code', laborCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return this.parseLaborData(data);
    } catch (error) {
      throw error;
    }
  }

  static async generateNextLaborCode() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `LB-${currentYear}-`;
      
      const { data, error } = await supabase
        .from('labor')
        .select('labor_code')
        .like('labor_code', `${prefix}%`)
        .order('labor_code', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      let nextNumber = 1;
      
      if (data && data.length > 0) {
        const lastCode = data[0].labor_code;
        const match = lastCode.match(new RegExp(`${prefix}(\\d+)`));
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const formattedNumber = nextNumber.toString().padStart(3, '0');
      
      return `${prefix}${formattedNumber}`;
    } catch (error) {
      throw error;
    }
  }

  static async getCustomLabor(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `, { count: 'exact' })
        .eq('is_custom', true)
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        labor: this.parseLaborData(data || []),
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLaborByJob(jobId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          ),
          supervisor:users!labor_supervisor_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `, { count: 'exact' })
        .eq('job_id', jobId)
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        labor: this.parseLaborData(data || []),
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

      // Optimize: Fetch labor and jobs in parallel
      const [laborResult, jobsResult] = await Promise.all([
        supabase
          .from("labor")
          .select(`
            *,
            users!labor_user_id_fkey (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            ),
            supervisor:users!labor_supervisor_id_fkey (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            )
          `),
        // Optimize: Fetch jobs in parallel (only required fields)
        supabase
          .from('jobs')
          .select('id, assigned_labor_ids')
      ]);

      if (laborResult.error) {
        throw new Error(`Database error: ${laborResult.error.message}`);
      }

      const data = laborResult.data || [];

      // Build a map of laborId -> assigned jobs count
      // Optimize: Only process jobs for filtered labor IDs
      let laborIdToJobCount = {};
      if (!jobsResult.error && jobsResult.data) {
        // First filter labor to get the IDs we need
        const inStr = (s) => (s || '').toString().toLowerCase().includes(q);
        const matches = (labor) => {
          if (q) {
            const laborMatch = inStr(labor.users?.full_name) || 
                              inStr(labor.users?.email) || 
                              inStr(labor.users?.phone) || 
                              inStr(labor.trade) ||
                              inStr(labor.experience) ||
                              inStr(labor.availability);
            if (!laborMatch) return false;
          }
          if (filters.name && !inStr(labor.users?.full_name)) return false;
          if (filters.contact && !inStr(labor.users?.phone) && !inStr(labor.users?.email)) return false;
          if (filters.trade && !inStr(labor.trade)) return false;
          if (filters.experience && !inStr(labor.experience)) return false;
          if (filters.availability && !inStr(labor.availability)) return false;
          if (filters.status && labor.users?.status !== filters.status) return false;
          return true;
        };
        
        const filteredLaborIds = new Set(data.filter(matches).map(l => l.id));
        
        // Only process jobs for filtered labor IDs
        for (const job of jobsResult.data) {
          let ids = [];
          if (typeof job.assigned_labor_ids === 'string') {
            try {
              ids = JSON.parse(job.assigned_labor_ids || '[]') || [];
            } catch (_) {
              ids = [];
            }
          } else if (Array.isArray(job.assigned_labor_ids)) {
            ids = job.assigned_labor_ids;
          }

          for (const id of ids) {
            const laborIdNum = parseInt(id);
            if (!Number.isNaN(laborIdNum) && filteredLaborIds.has(laborIdNum)) {
              laborIdToJobCount[laborIdNum] = (laborIdToJobCount[laborIdNum] || 0) + 1;
            }
          }
        }
      }

      // Define inStr and matches functions (reuse from above if needed, but define here for clarity)
      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (labor) => {
        // Text search across multiple fields
        if (q) {
          const laborMatch = inStr(labor.users?.full_name) || 
                            inStr(labor.users?.email) || 
                            inStr(labor.users?.phone) || 
                            inStr(labor.trade) ||
                            inStr(labor.experience) ||
                            inStr(labor.availability);
          if (!laborMatch) return false;
        }

        // Exact field filters
        if (filters.name && !inStr(labor.users?.full_name)) return false;
        if (filters.contact && !inStr(labor.users?.phone) && !inStr(labor.users?.email)) return false;
        if (filters.trade && !inStr(labor.trade)) return false;
        if (filters.experience && !inStr(labor.experience)) return false;
        if (filters.availability && !inStr(labor.availability)) return false;
        if (filters.status && labor.users?.status !== filters.status) return false;

        return true;
      };

      let filtered = data.filter(matches).map((labor) => ({
        ...labor,
        assigned_jobs_count: laborIdToJobCount[labor.id] || 0
      }));

      // Sort by created_at (most recent first)
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        labor: this.parseLaborData(sliced),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      // Get all labor with user relationships to check status
      const { data: allLabor, error: laborError } = await supabase
        .from('labor')
        .select(`
          *,
          users!labor_user_id_fkey (
            id,
            status
          )
        `);

      if (laborError) {
        throw new Error(`Database error: ${laborError.message}`);
      }

      // Count active and inactive
      const activeLabor = (allLabor || []).filter(l => l.users?.status === 'active').length;
      const inactiveLabor = (allLabor || []).filter(l => l.users?.status !== 'active').length;
      const totalLabor = allLabor?.length || 0;

      // Count total jobs assigned to any labor
      const { data: allJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, assigned_labor_ids');

      if (jobsError) {
        throw new Error(`Database error: ${jobsError.message}`);
      }

      // Count jobs that have at least one labor assigned
      let totalJobs = 0;
      if (allJobs && allJobs.length > 0) {
        totalJobs = allJobs.filter(job => {
          let ids = [];
          if (typeof job.assigned_labor_ids === 'string') {
            try {
              ids = JSON.parse(job.assigned_labor_ids || '[]') || [];
            } catch (_) {
              ids = [];
            }
          } else if (Array.isArray(job.assigned_labor_ids)) {
            ids = job.assigned_labor_ids;
          }
          return ids && ids.length > 0;
        }).length;
      }

      return {
        total_labor: totalLabor,
        active_labor: activeLabor,
        inactive_labor: inactiveLabor,
        total_jobs: totalJobs
      };
    } catch (error) {
      throw error;
    }
  }
}
