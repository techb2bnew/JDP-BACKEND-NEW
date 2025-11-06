import { supabase } from '../config/database.js';
import { safeJsonParse } from '../utils/helpers.js';

export class LeadLabor {
  static async create(leadLaborData) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .insert([leadLaborData])
        .select(`
          *,
          users (
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

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getAllLeadLabor(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Optimize: Run count and data queries in parallel
      const [countResult, dataResult, jobsResult] = await Promise.all([
        supabase
          .from('lead_labor')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('lead_labor')
          .select(`
            *,
            users!inner (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              created_at
            )
          `)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1),
        // Optimize: Fetch jobs in parallel (only required fields)
        supabase
          .from('jobs')
          .select('id, assigned_lead_labor_ids')
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];

      // Optimize: Build leadLaborId -> assigned jobs count map efficiently
      let leadLaborIdToJobCount = {};
      if (!jobsResult.error && jobsResult.data) {
        // Use Map for O(1) lookups during counting
        const leadLaborIdsSet = new Set(data.map(l => l.id));
        
        for (const job of jobsResult.data) {
          let ids = [];
          if (typeof job.assigned_lead_labor_ids === 'string') {
            try {
              ids = JSON.parse(job.assigned_lead_labor_ids || '[]') || [];
            } catch (_) {
              ids = [];
            }
          } else if (Array.isArray(job.assigned_lead_labor_ids)) {
            ids = job.assigned_lead_labor_ids;
          }

          // Only process IDs that are in the current page's lead labor
          for (const id of ids) {
            const leadLaborIdNum = parseInt(id);
            if (!Number.isNaN(leadLaborIdNum) && leadLaborIdsSet.has(leadLaborIdNum)) {
              leadLaborIdToJobCount[leadLaborIdNum] = (leadLaborIdToJobCount[leadLaborIdNum] || 0) + 1;
            }
          }
        }
      }

      const totalPages = Math.ceil(count / limit);

      // Optimize: Pre-allocate array for better performance
      const resultData = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        resultData[i] = {
          ...data[i],
          assigned_jobs_count: leadLaborIdToJobCount[data[i].id] || 0
        };
      }

      return {
        data: resultData,
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

  static async getLeadLaborById(leadLaborId) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users (
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
        .eq('id', leadLaborId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Lead Labor not found with ID: ${leadLaborId}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(leadLaborId, updateData) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .update(updateData)
        .eq('id', leadLaborId)
        .select(`
          *,
          users (
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

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async checkLeadLaborRelationships(leadLaborId) {
    try {
      if (!leadLaborId) {
        throw new Error('Lead Labor ID is required');
      }

      const relationships = [];

      // Check if lead labor is assigned to any jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title, assigned_lead_labor_ids')
        .limit(1000); // Get all jobs to check arrays

      if (!jobsError && jobsData) {
        const assignedJobs = jobsData.filter(job => {
          if (!job.assigned_lead_labor_ids) return false;
          
          let leadLaborIds = [];
          try {
            // Try to parse as JSON array
            if (typeof job.assigned_lead_labor_ids === 'string') {
              leadLaborIds = JSON.parse(job.assigned_lead_labor_ids);
            } else if (Array.isArray(job.assigned_lead_labor_ids)) {
              leadLaborIds = job.assigned_lead_labor_ids;
            }
          } catch (e) {
            // If parsing fails, try to handle as comma-separated string
            if (typeof job.assigned_lead_labor_ids === 'string') {
              leadLaborIds = job.assigned_lead_labor_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            }
          }
          
          return leadLaborIds.includes(parseInt(leadLaborId));
        });

        if (assignedJobs.length > 0) {
          relationships.push({
            table: 'jobs',
            count: assignedJobs.length,
            message: `This lead labor is assigned to ${assignedJobs.length} job(s)`
          });
        }
      }

      // Check if lead labor is referenced in job_bluesheet_labor
      const { data: bluesheetData, error: bluesheetError } = await supabase
        .from('job_bluesheet_labor')
        .select('id')
        .eq('lead_labor_id', leadLaborId)
        .limit(1);

      if (!bluesheetError && bluesheetData && bluesheetData.length > 0) {
        relationships.push({
          table: 'job_bluesheet_labor',
          count: bluesheetData.length,
          message: 'This lead labor has bluesheet entries'
        });
      }

      // Check if lead labor is referenced in labor_timesheets
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('labor_timesheets')
        .select('id')
        .eq('lead_labor_id', leadLaborId)
        .limit(1);

      if (!timesheetError && timesheetData && timesheetData.length > 0) {
        relationships.push({
          table: 'labor_timesheets',
          count: timesheetData.length,
          message: 'This lead labor has timesheet entries'
        });
      }

      // Check if lead labor is referenced in orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('lead_labour_id', leadLaborId)
        .limit(1);

      if (!ordersError && ordersData && ordersData.length > 0) {
        relationships.push({
          table: 'orders',
          count: ordersData.length,
          message: 'This lead labor has associated orders'
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

  static async delete(leadLaborId) {
    try {
      const leadLabor = await this.getLeadLaborById(leadLaborId);
      const userId = leadLabor.user_id;
      
      const { error: leadLaborError } = await supabase
        .from('lead_labor')
        .delete()
        .eq('id', leadLaborId);

      if (leadLaborError) {
        throw new Error(`Database error: ${leadLaborError.message}`);
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
        message: `Lead Labor "${leadLabor.users.full_name}" deleted successfully`,
        deleted_lead_labor: {
          id: leadLabor.id,
          full_name: leadLabor.users.full_name,
          email: leadLabor.users.email,
          labor_code: leadLabor.labor_code,
          department: leadLabor.department
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLeadLaborByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users (
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

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByLaborCode(laborCode) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select('*')
        .eq('labor_code', laborCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async generateNextLaborCode() {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `LL-${currentYear}-`;
      
      const { data, error } = await supabase
        .from('lead_labor')
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
        const lastNumber = parseInt(lastCode.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      throw error;
    }
  }

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

      // Fetch all lead labor with user relationships
      const { data, error } = await supabase
        .from("lead_labor")
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (leadLabor) => {
        // Text search across multiple fields
        if (q) {
          const leadLaborMatch = inStr(leadLabor.users?.full_name) || 
                                inStr(leadLabor.users?.email) || 
                                inStr(leadLabor.users?.phone) || 
                                inStr(leadLabor.department) ||
                                inStr(leadLabor.specialization) ||
                                inStr(leadLabor.trade) ||
                                inStr(leadLabor.experience);
          if (!leadLaborMatch) return false;
        }

        // Exact field filters
        if (filters.name && !inStr(leadLabor.users?.full_name)) return false;
        if (filters.contact && !inStr(leadLabor.users?.phone) && !inStr(leadLabor.users?.email)) return false;
        if (filters.department && !inStr(leadLabor.department)) return false;
        if (filters.specialization && !inStr(leadLabor.specialization)) return false;
        if (filters.experience && !inStr(leadLabor.experience)) return false;
        if (filters.trade && !inStr(leadLabor.trade)) return false;
        if (filters.status && leadLabor.users?.status !== filters.status) return false;

        return true;
      };

      let filtered = (data || []).filter(matches);

      // Build leadLaborId -> assigned jobs count map
      let leadLaborIdToJobCount = {};
      try {
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select('id, assigned_lead_labor_ids');
        if (jobsError) {
          throw new Error(jobsError.message);
        }

        leadLaborIdToJobCount = (jobs || []).reduce((acc, job) => {
          let ids = [];
          if (typeof job.assigned_lead_labor_ids === 'string') {
            try {
              ids = JSON.parse(job.assigned_lead_labor_ids || '[]') || [];
            } catch (_) {
              ids = [];
            }
          } else if (Array.isArray(job.assigned_lead_labor_ids)) {
            ids = job.assigned_lead_labor_ids;
          }

          ids.forEach((id) => {
            const leadLaborIdNum = parseInt(id);
            if (!Number.isNaN(leadLaborIdNum)) {
              acc[leadLaborIdNum] = (acc[leadLaborIdNum] || 0) + 1;
            }
          });

          return acc;
        }, {});
      } catch (_) {
        leadLaborIdToJobCount = {};
      }

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
        leadLabor: sliced.map(l => ({
          ...l,
          assigned_jobs_count: leadLaborIdToJobCount[l.id] || 0
        })),
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
      // Get all lead labor with user relationships to check status
      const { data: allLeadLabor, error: leadLaborError } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users (
            id,
            status
          )
        `);

      if (leadLaborError) {
        throw new Error(`Database error: ${leadLaborError.message}`);
      }

      // Count active and inactive
      const activeLeadLabor = (allLeadLabor || []).filter(ll => ll.users?.status === 'active').length;
      const inactiveLeadLabor = (allLeadLabor || []).filter(ll => ll.users?.status !== 'active').length;
      const totalLeadLabor = allLeadLabor?.length || 0;

      // Count total jobs assigned to any lead labor
      const { data: allJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, assigned_lead_labor_ids');

      if (jobsError) {
        throw new Error(`Database error: ${jobsError.message}`);
      }

      // Count jobs that have at least one lead labor assigned
      let totalJobs = 0;
      if (allJobs && allJobs.length > 0) {
        totalJobs = allJobs.filter(job => {
          let ids = [];
          if (typeof job.assigned_lead_labor_ids === 'string') {
            try {
              ids = JSON.parse(job.assigned_lead_labor_ids || '[]') || [];
            } catch (_) {
              ids = [];
            }
          } else if (Array.isArray(job.assigned_lead_labor_ids)) {
            ids = job.assigned_lead_labor_ids;
          }
          return ids && ids.length > 0;
        }).length;
      }

      return {
        total_lead_labor: totalLeadLabor,
        active_lead_labor: activeLeadLabor,
        inactive_lead_labor: inactiveLeadLabor,
        total_jobs: totalJobs
      };
    } catch (error) {
      throw error;
    }
  }
}
