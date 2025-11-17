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

     
      let leadLaborIdToJobCount = {};
      if (!jobsResult.error && jobsResult.data) {

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

    
          for (const id of ids) {
            const leadLaborIdNum = parseInt(id);
            if (!Number.isNaN(leadLaborIdNum) && leadLaborIdsSet.has(leadLaborIdNum)) {
              leadLaborIdToJobCount[leadLaborIdNum] = (leadLaborIdToJobCount[leadLaborIdNum] || 0) + 1;
            }
          }
        }
      }

      const totalPages = Math.ceil(count / limit);

   
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

  static async getLeadLaborByIdForMobile(leadLaborId) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          *,
          users!lead_labor_user_id_fkey (
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
        throw new Error(`Lead labor not found with ID: ${leadLaborId}`);
      }

      return data;
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

      return data || null;
    } catch (error) {
      throw error;
    }
  }
  
  static async getLeadLaborByUserIdForLogin(userId) {
    try {
      const { data, error } = await supabase
        .from('lead_labor')
        .select(`
          id,
          labor_code,
          dob,
          address,
          notes,
          department,
          date_of_joining,
          specialization,
          trade,
          experience,
          id_proof_url,
          photo_url,
          resume_url,
          agreed_terms,
          management_type,
          system_ip,
          created_at
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
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

     
      const [jobsResult, bluesheetResult, timesheetResult, ordersResult] = await Promise.all([
   
        supabase
          .from('jobs')
          .select('id, job_title, assigned_lead_labor_ids')
          .ilike('assigned_lead_labor_ids', `%${leadLaborId}%`), 
        supabase
          .from('job_bluesheet_labor')
          .select('id')
          .eq('lead_labor_id', leadLaborId)
          .limit(1),
        supabase
          .from('labor_timesheets')
          .select('id')
          .eq('lead_labor_id', leadLaborId)
          .limit(1),
        supabase
          .from('orders')
          .select('id')
          .eq('lead_labour_id', leadLaborId)
          .limit(1)
      ]);

      const relationships = [];

    
      if (!jobsResult.error && jobsResult.data) {
        const assignedJobs = jobsResult.data.filter(job => {
          if (!job.assigned_lead_labor_ids) return false;
          
          let leadLaborIds = [];
          try {
      
            if (typeof job.assigned_lead_labor_ids === 'string') {
              leadLaborIds = JSON.parse(job.assigned_lead_labor_ids);
            } else if (Array.isArray(job.assigned_lead_labor_ids)) {
              leadLaborIds = job.assigned_lead_labor_ids;
            }
          } catch (e) {
 
            if (typeof job.assigned_lead_labor_ids === 'string') {
              leadLaborIds = job.assigned_lead_labor_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            }
          }
          
     
          return leadLaborIds.some(id => parseInt(id) === parseInt(leadLaborId));
        });

        if (assignedJobs.length > 0) {
          relationships.push({
            table: 'jobs',
            count: assignedJobs.length,
            message: `This lead labor is assigned to ${assignedJobs.length} job(s)`
          });
        }
      }


      if (!bluesheetResult.error && bluesheetResult.data && bluesheetResult.data.length > 0) {
        relationships.push({
          table: 'job_bluesheet_labor',
          count: bluesheetResult.data.length,
          message: 'This lead labor has bluesheet entries'
        });
      }


      if (!timesheetResult.error && timesheetResult.data && timesheetResult.data.length > 0) {
        relationships.push({
          table: 'labor_timesheets',
          count: timesheetResult.data.length,
          message: 'This lead labor has timesheet entries'
        });
      }

     
      if (!ordersResult.error && ordersResult.data && ordersResult.data.length > 0) {
        relationships.push({
          table: 'orders',
          count: ordersResult.data.length,
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
      
      const { data: leadLabor, error: fetchError } = await supabase
        .from('lead_labor')
        .select(`
          id,
          user_id,
          labor_code,
          department,
          users!inner (
            id,
            full_name,
            email
          )
        `)
        .eq('id', leadLaborId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!leadLabor) {
        throw new Error('Lead Labor not found');
      }

      const userId = leadLabor.user_id;

      const [leadLaborDeleteResult, userDeleteResult] = await Promise.all([
        supabase
          .from('lead_labor')
          .delete()
          .eq('id', leadLaborId),
        supabase
          .from('users')
          .delete()
          .eq('id', userId)
      ]);

      if (leadLaborDeleteResult.error) {
        throw new Error(`Database error: ${leadLaborDeleteResult.error.message}`);
      }

      if (userDeleteResult.error) {
        throw new Error(`Database error: ${userDeleteResult.error.message}`);
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

      const [leadLaborResult, jobsResult] = await Promise.all([
        supabase
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
          `),
        supabase
          .from('jobs')
          .select('id, assigned_lead_labor_ids')
      ]);

      if (leadLaborResult.error) {
        throw new Error(`Database error: ${leadLaborResult.error.message}`);
      }

      const data = leadLaborResult.data || [];
      const jobs = jobsResult.data || [];

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (leadLabor) => {
     
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

  
        if (filters.name && !inStr(leadLabor.users?.full_name)) return false;
        if (filters.contact && !inStr(leadLabor.users?.phone) && !inStr(leadLabor.users?.email)) return false;
        if (filters.department && !inStr(leadLabor.department)) return false;
        if (filters.specialization && !inStr(leadLabor.specialization)) return false;
        if (filters.experience && !inStr(leadLabor.experience)) return false;
        if (filters.trade && !inStr(leadLabor.trade)) return false;
        if (filters.status && leadLabor.users?.status !== filters.status) return false;

        return true;
      };

      let filtered = data.filter(matches);

    
      let leadLaborIdToJobCount = {};
      
      if (jobs.length > 0) {
        leadLaborIdToJobCount = jobs.reduce((acc, job) => {
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
      }

 
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
     
      const [leadLaborResult, jobsResult] = await Promise.all([
        supabase
          .from('lead_labor')
          .select(`
            id,
            users!inner (
              id,
              status
            )
          `),
        supabase
          .from('jobs')
          .select('id, assigned_lead_labor_ids')
      ]);

      if (leadLaborResult.error) {
        throw new Error(`Database error: ${leadLaborResult.error.message}`);
      }

      if (jobsResult.error) {
        throw new Error(`Database error: ${jobsResult.error.message}`);
      }

      const allLeadLabor = leadLaborResult.data || [];
      const allJobs = jobsResult.data || [];

      
      const activeLeadLabor = allLeadLabor.filter(ll => ll.users?.status === 'active').length;
      const inactiveLeadLabor = allLeadLabor.filter(ll => ll.users?.status !== 'active').length;
      const totalLeadLabor = allLeadLabor.length;

      
      let totalJobs = 0;
      if (allJobs.length > 0) {
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
