import { supabase } from "../config/database.js";
import { safeJsonParse } from "../utils/helpers.js";

export class Job {
  static async fetchLeadLaborDetails(leadLaborIds) {
    try {
      if (!Array.isArray(leadLaborIds) || leadLaborIds.length === 0) {
        return [];
      }

      const { data: leadLaborData, error } = await supabase
        .from("lead_labor")
        .select(`
          id,
          labor_code,
          department,
          specialization,
          trade,
          experience,
          user_id
        `)
        .in("id", leadLaborIds);

      if (error) {
        console.error("Error fetching lead labor:", error);
        return [];
      }

      const leadLaborWithUsers = await Promise.all(
        (leadLaborData || []).map(async (leadLabor) => {
          const { data: userData } = await supabase
            .from("users")
            .select("id, full_name, email, phone")
            .eq("id", leadLabor.user_id)
            .single();

          return {
            ...leadLabor,
            user: userData || null
          };
        })
      );

      return leadLaborWithUsers;
    } catch (error) {
      console.error("Error in fetchLeadLaborDetails:", error);
      return [];
    }
  }

  static async fetchLaborDetails(laborIds) {
    try {
      if (!Array.isArray(laborIds) || laborIds.length === 0) {
        return [];
      }

      const { data: laborData, error } = await supabase
        .from("labor")
        .select(`
          id,
          labor_code,
          trade,
          experience,
          hourly_rate,
          hours_worked,
          availability,
          user_id
        `)
        .in("id", laborIds);

      if (error) {
        console.error("Error fetching labor:", error);
        return [];
      }

      const laborWithUsers = await Promise.all(
        (laborData || []).map(async (labor) => {
          const { data: userData } = await supabase
            .from("users")
            .select("id, full_name, email, phone")
            .eq("id", labor.user_id)
            .single();

          return {
            ...labor,
            user: userData || null
          };
        })
      );

      return laborWithUsers;
    } catch (error) {
      console.error("Error in fetchLaborDetails:", error);
      return [];
    }
  }

  static async fetchMaterialsDetails(jobId) {
    try {
      if (!jobId) {
        return [];
      }

      const { data: materialData, error } = await supabase
        .from("products")
        .select(`
          id,
          product_name,
          supplier_sku,
          jdp_sku,
          unit_cost,
          stock_quantity,
          unit,
          supplier_id,
          created_at,
          updated_at,
          supplier:suppliers!products_supplier_id_fkey(
            id,
            user_id,
            supplier_code,
            company_name,
            contact_person,
            address,
            contract_start,
            contract_end,
            notes,
            created_at,
            user:users!suppliers_user_id_fkey(
              id,
              full_name,
              email,
              phone,
              photo_url
            )
          )
        `)
        .eq("job_id", jobId);

      if (error) {
        console.error("Error fetching materials:", error);
        return [];
      }

      return materialData || [];
    } catch (error) {
      console.error("Error in fetchMaterialsDetails:", error);
      return [];
    }
  }

  static async fetchCustomLaborDetails(jobId) {
    try {
      if (!jobId) {
        return [];
      }

      const { data: customLaborData, error } = await supabase
        .from("labor")
        .select(`
          id,
          labor_code,
          trade,
          experience,
          hourly_rate,
          hours_worked,
          availability,
          is_custom,
          job_id,
          user_id,
          user:users!labor_user_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq("job_id", jobId)
        .eq("is_custom", true);

      if (error) {
        console.error("Error fetching custom labor:", error);
        return [];
      }

      return customLaborData || [];
    } catch (error) {
      console.error("Error in fetchCustomLaborDetails:", error);
      return [];
    }
  }

  static async addDetailsToJob(job) {
    const jobWithDetails = { ...job };

    const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
        jobWithDetails.assigned_lead_labor = await Job.fetchLeadLaborDetails(leadLaborIds);

    const laborIds = safeJsonParse(job.assigned_labor_ids, []);
        jobWithDetails.assigned_labor = await Job.fetchLaborDetails(laborIds);

    jobWithDetails.assigned_materials = await Job.fetchMaterialsDetails(job.id);

    jobWithDetails.custom_labor = await Job.fetchCustomLaborDetails(job.id);

    // Parse timesheet data
    jobWithDetails.labor_timesheets = safeJsonParse(job.labor_timesheets, []);

    return jobWithDetails;
  }

  static async create(jobData) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert([jobData])
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Job.addDetailsToJob(data);
    } catch (error) {
      throw error;
    }
  }

  static async findById(jobId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", jobId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Job.addDetailsToJob(data);
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.job_type) {
        query = query.eq("job_type", filters.job_type);
      }
      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }
      if (filters.contractor_id) {
        query = query.eq("contractor_id", filters.contractor_id);
      }
      if (filters.created_from) {
        query = query.eq("created_from", filters.created_from);
      }
      if (filters.search) {
        query = query.or(`job_title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      return {
        jobs: jobsWithDetails,
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(jobId, updateData) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) return null;

      return await Job.addDetailsToJob(data);
    } catch (error) {
      throw error;
    }
  }

  static async delete(jobId) {
    try {
      const { error } = await supabase
        .from("jobs")
        .delete()
        .eq("id", jobId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByLabor(laborId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      if (!laborId) {
        throw new Error('laborId is required');
      }

      let allJobsQuery = supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      const { data: allJobs, error: allJobsError } = await allJobsQuery
        .order('created_at', { ascending: false });

      if (allJobsError) {
        throw new Error(`Database error: ${allJobsError.message}`);
      }


      const filteredJobs = (allJobs || []).filter(job => {
        try {
          const laborIds = safeJsonParse(job.assigned_labor_ids, []);
          return laborIds.includes(parseInt(laborId));
        } catch (e) {
          return false;
        }
      });


      const paginatedJobs = filteredJobs.slice(offset, offset + limit);


      const jobsWithDetails = await Promise.all(
        paginatedJobs.map(job => Job.addDetailsToJob(job))
      );

      const totalPages = Math.ceil(filteredJobs.length / limit);

      return {
        jobs: jobsWithDetails,
        total: filteredJobs.length,
        page: page,
        limit: limit,
        totalPages: totalPages,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: filteredJobs.length,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByLeadLabor(leadLaborId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      if (!leadLaborId) {
        throw new Error('leadLaborId is required');
      }


      let allJobsQuery = supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          ),
          created_by_user:users!jobs_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      const { data: allJobs, error: allJobsError } = await allJobsQuery
        .order('created_at', { ascending: false });

      if (allJobsError) {
        throw new Error(`Database error: ${allJobsError.message}`);
      }


      const filteredJobs = (allJobs || []).filter(job => {
        try {
          const leadLaborIds = safeJsonParse(job.assigned_lead_labor_ids, []);
          return leadLaborIds.includes(parseInt(leadLaborId));
        } catch (e) {
          return false;
        }
      });


      const paginatedJobs = filteredJobs.slice(offset, offset + limit);


      const jobsWithDetails = await Promise.all(
        paginatedJobs.map(job => Job.addDetailsToJob(job))
      );

      const totalPages = Math.ceil(filteredJobs.length / limit);

      return {
        jobs: jobsWithDetails,
        total: filteredJobs.length,
        page: page,
        limit: limit,
        totalPages: totalPages,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: filteredJobs.length,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalJobs, error: totalError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: activeJobs, error: activeError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "active");

      if (activeError) {
        throw new Error(`Database error: ${activeError.message}`);
      }

      const { data: completedJobs, error: completedError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "completed");

      if (completedError) {
        throw new Error(`Database error: ${completedError.message}`);
      }

      const { data: draftJobs, error: draftError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "draft");

      if (draftError) {
        throw new Error(`Database error: ${draftError.message}`);
      }

      const { data: pendingJobs, error: pendingError } = await supabase
        .from("jobs")
        .select("id", { count: 'exact' })
        .eq("status", "pending");

      if (pendingError) {
        throw new Error(`Database error: ${pendingError.message}`);
      }
      const { data: revenueData, error: revenueError } = await supabase
        .from("jobs")
        .select("estimated_cost");

      if (revenueError) {
        throw new Error(`Database error: ${revenueError.message}`);
      }

      const total = totalJobs?.length || 0;
      const active = activeJobs?.length || 0;
      const completed = completedJobs?.length || 0;
      const draft = draftJobs?.length || 0;
      const pending = pendingJobs?.length || 0;

      const totalRevenue = (revenueData || []).reduce((sum, job) => {
        return sum + (parseFloat(job.estimated_cost) || 0);
      }, 0);

      return {
        total,
        active,
        completed,
        draft,
        pending,
        totalRevenue: totalRevenue.toFixed(2),
        activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
        completedPercentage: total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0",
        draftPercentage: total > 0 ? ((draft / total) * 100).toFixed(1) : "0.0",
        pendingPercentage: total > 0 ? ((pending / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByCustomerId(customerId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      return jobsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  static async findByContractorId(contractorId) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey(
            id,
            customer_name,
            company_name,
            email,
            phone
          ),
          contractor:contractors!jobs_contractor_id_fkey(
            id,
            contractor_name,
            company_name,
            email,
            phone
          )
        `)
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const jobsWithDetails = await Promise.all(
        (data || []).map(job => Job.addDetailsToJob(job))
      );

      return jobsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  static async getJobDashboardDetails(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        return null;
      }

      const materialUsage = await Job.getJobMaterialUsage(jobId);

      const dashboardData = {
        ...job,

        projectSummary: {
          jobEstimate: parseFloat(job.estimated_cost) || 0,
          materialCost: 0,
          laborCost: 0,
          actualProjectCost: 0,
          projectProgress: 0
        },

        keyMetrics: {
          totalHoursWorked: 0,
          totalMaterialUsed: 0,
          totalLabourEntries: 0
        },


        materialUsage: {
          totalCost: 0,
          materials: materialUsage
        },


        laborSummary: {
          totalCost: 0,
          laborEntries: [],
          leadLaborEntries: job.assigned_lead_labor || []
        }
      };


      if (materialUsage && materialUsage.length > 0) {
        const materialCost = materialUsage.reduce((sum, material) => {
          return sum + (parseFloat(material.total_cost) || 0);
        }, 0);
        dashboardData.projectSummary.materialCost = materialCost;
        dashboardData.materialUsage.totalCost = materialCost;
        dashboardData.keyMetrics.totalMaterialUsed = materialUsage.length;
      }



      if (transactions && transactions.length > 0) {
        const invoiceCount = transactions.filter(t =>
          t.invoice_type.includes('invoice')
        ).length;
        dashboardData.keyMetrics.numberOfInvoices = invoiceCount;
      }


      dashboardData.projectSummary.actualProjectCost =
        dashboardData.projectSummary.materialCost +
        dashboardData.projectSummary.laborCost;


      const progressMap = {
        'draft': 0,
        'active': 25,
        'in_progress': 50,
        'completed': 100,
        'cancelled': 0,
        'on_hold': 25
      };
      dashboardData.projectSummary.projectProgress = progressMap[job.status] || 0;

      return dashboardData;
    } catch (error) {
      throw error;
    }
  }





  static async getJobMaterialUsage(jobId) {
    try {
      const { data, error } = await supabase
        .from("job_material_usage")
        .select("*")
        .eq("job_id", jobId)
        .order("usage_date", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }


  static async createJobTransaction(transactionData) {
    try {
      const { data, error } = await supabase
        .from("job_transactions")
        .insert([transactionData])
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


  static async createJobTimeLog(timeLogData) {
    try {
      const { data, error } = await supabase
        .from("job_time_logs")
        .insert([timeLogData])
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


  static async createJobMaterialUsage(materialUsageData) {
    try {
      const { data, error } = await supabase
        .from("job_material_usage")
        .insert([materialUsageData])
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


  static async updateWorkActivity(jobId, activityCount) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      if (typeof activityCount !== 'number' || activityCount < 0) {
        throw new Error('Activity count must be a positive number');
      }


      const { data, error } = await supabase
        .from("jobs")
        .update({
          work_activity: activityCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
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

  static async updateTotalWorkTime(jobId, workTime) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }


      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(workTime)) {
        throw new Error('Invalid time format. Use HH:MM:SS');
      }

      const { data, error } = await supabase
        .from("jobs")
        .update({
          total_work_time: workTime,
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
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

  static async getWorkActivityHistory(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }


      let totalHoursWorked = 0;
      if (job.assigned_labor && job.assigned_labor.length > 0) {
        totalHoursWorked = job.assigned_labor.reduce((total, labor) => {
          return total + (parseFloat(labor.hours_worked) || 0);
        }, 0);
      }

      if (job.custom_labor && job.custom_labor.length > 0) {
        const customHours = job.custom_labor.reduce((total, labor) => {
          return total + (parseFloat(labor.hours_worked) || 0);
        }, 0);
        totalHoursWorked += customHours;
      }

      let totalMaterialUsed = 0;
      if (job.assigned_materials && job.assigned_materials.length > 0) {
        totalMaterialUsed = job.assigned_materials.length; // Count of assigned materials
      }

      let totalLabourEntries = 0;
      if (job.assigned_labor) {
        totalLabourEntries += job.assigned_labor.length;
      }
      if (job.custom_labor) {
        totalLabourEntries += job.custom_labor.length;
      }

      const numberOfInvoices = 0;

      return {
        jobId: job.id,
        jobTitle: job.job_title,
        jobStatus: job.status,
        jobPriority: job.priority,
        dashboardMetrics: {
          totalHoursWorked: {
            value: totalHoursWorked,
            unit: "hours",
            color: "blue"
          },
          totalMaterialUsed: {
            value: totalMaterialUsed,
            unit: "items",
            color: "green"
          },
          totalLabourEntries: {
            value: totalLabourEntries,
            unit: "entries",
            color: "purple"
          },
          numberOfInvoices: {
            value: numberOfInvoices,
            unit: "invoices",
            color: "orange"
          }
        },
        workTracking: {
          workActivity: job.work_activity || 0,
          totalWorkTime: job.total_work_time || '00:00:00',
          startTimer: job.start_timer,
          endTimer: job.end_timer,
          pauseTimer: safeJsonParse(job.pause_timer, [])
        },
        jobDetails: {
          jobType: job.job_type,
          estimatedHours: job.estimated_hours || 0,
          estimatedCost: job.estimated_cost || 0,
          dueDate: job.due_date,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        },
        totalWorkTime: job.total_work_time,
        activityCount: job.work_activity || 0
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateWorkData(jobId, updateData) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Force fresh data fetch to avoid caching issues
      const { data: freshJobData, error: freshJobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (freshJobError) {
        throw new Error(`Database error: ${freshJobError.message}`);
      }

      if (!freshJobData) {
        throw new Error('Job not found');
      }

      console.log(`Fresh job data fetched - labor_timesheets:`, freshJobData.labor_timesheets ? 'exists' : 'null');
      if (freshJobData.labor_timesheets) {
        console.log(`Raw labor_timesheets length:`, freshJobData.labor_timesheets.length);
      }

      const job = freshJobData;

      const updateFields = {
        updated_at: new Date().toISOString()
      };


      if (updateData.work_activity !== undefined) {
        if (typeof updateData.work_activity !== 'number' || updateData.work_activity < 0) {
          throw new Error('Work activity must be a positive number');
        }
        updateFields.work_activity = updateData.work_activity;
      }


      if (updateData.total_work_time) {

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(updateData.total_work_time)) {
          throw new Error('Invalid time format. Use HH:MM:SS');
        }
        updateFields.total_work_time = updateData.total_work_time;
      }

      if (updateData.start_timer) {
        updateFields.start_timer = updateData.start_timer;
      }

      if (updateData.end_timer) {
        updateFields.end_timer = updateData.end_timer;
      }

      if (updateData.pause_timer !== undefined) {
        if (Array.isArray(updateData.pause_timer)) {
          updateFields.pause_timer = JSON.stringify(updateData.pause_timer);
        } else {
          updateFields.pause_timer = JSON.stringify([updateData.pause_timer]);
        }
      }

      if (updateData.status) {
        const validStatuses = ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold'];
        if (!validStatuses.includes(updateData.status)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        updateFields.status = updateData.status;
      }

      // Handle bulk timesheet updates (multiple labor for multiple days)
      if (updateData.bulk_timesheets) {
        const bulkTimesheets = updateData.bulk_timesheets;
        
        if (!Array.isArray(bulkTimesheets)) {
          throw new Error('bulk_timesheets must be an array');
        }

        // Get current labor timesheets
        const currentTimesheets = safeJsonParse(job.labor_timesheets, []);
        
        // Process each timesheet entry
        for (const timesheetData of bulkTimesheets) {
          // Validate required fields
          if (!timesheetData.labor_id || !timesheetData.date) {
            throw new Error('labor_id and date are required for each timesheet entry');
          }

          // Check if this labor already has an entry for this date
          const existingIndex = currentTimesheets.findIndex(
            ts => ts.labor_id === timesheetData.labor_id && ts.date === timesheetData.date
          );

          // Auto-calculate fields from provided data
          let totalHours = "00:00:00";
          let workHours = timesheetData.work_hours || "00:00:00";
          let breakDuration = "00:00:00";
          
          // Calculate total hours from start_time and end_time if provided
          if (timesheetData.start_time && timesheetData.end_time) {
            totalHours = Job.calculateTimeDifference(timesheetData.start_time, timesheetData.end_time);
            
            // If work_hours not provided, calculate it (total - breaks)
            if (!timesheetData.work_hours) {
              const totalHoursDecimal = Job.timeToHours(totalHours);
              const breakHoursDecimal = Job.timeToHours(breakDuration);
              const calculatedWorkHours = Math.max(0, totalHoursDecimal - breakHoursDecimal);
              workHours = Job.hoursToTime(calculatedWorkHours);
            }
          }

          // Get labor details to fetch hourly_rate and user_id if not provided
          let hourlyRate = timesheetData.hourly_rate || 0;
          let userId = timesheetData.user_id;
          let laborName = timesheetData.labor_name || 'Unknown Labor';

          if (!userId || !hourlyRate) {
            try {
              const { data: laborData } = await supabase
                .from('labor')
                .select('user_id, hourly_rate')
                .eq('id', timesheetData.labor_id)
                .single();

              if (laborData) {
                userId = userId || laborData.user_id;
                hourlyRate = hourlyRate || parseFloat(laborData.hourly_rate) || 0;
              }

              // Get user name
              if (userId) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('full_name')
                  .eq('id', userId)
                  .single();
                
                if (userData) {
                  laborName = userData.full_name;
                }
              }
            } catch (error) {
              console.warn('Could not fetch labor details:', error.message);
            }
          }

          // Calculate total cost
          const workHoursDecimal = Job.timeToHours(workHours);
          const totalCost = workHoursDecimal * hourlyRate;

          // Handle pause_timer if provided
          let pauseTimerData = [];
          if (timesheetData.pause_timer && Array.isArray(timesheetData.pause_timer)) {
            pauseTimerData = timesheetData.pause_timer;
            
            // Calculate total break duration from pause_timer
            const totalBreakSeconds = pauseTimerData.reduce((total, pause) => {
              const duration = pause.duration || "00:00:00";
              const [hours, minutes, seconds] = duration.split(':').map(Number);
              return total + (hours * 3600) + (minutes * 60) + seconds;
            }, 0);
            
            breakDuration = Job.hoursToTime(totalBreakSeconds / 3600);
            
            // Recalculate work hours if pause_timer provided
            if (timesheetData.start_time && timesheetData.end_time) {
              const totalHoursDecimal = Job.timeToHours(totalHours);
              const breakHoursDecimal = Job.timeToHours(breakDuration);
              const calculatedWorkHours = Math.max(0, totalHoursDecimal - breakHoursDecimal);
              workHours = Job.hoursToTime(calculatedWorkHours);
            }
          }

          // Prepare timesheet entry
          const timesheetEntry = {
            labor_id: timesheetData.labor_id,
            user_id: userId,
            labor_name: laborName,
            date: timesheetData.date,
            start_time: timesheetData.start_time || null,
            end_time: timesheetData.end_time || null,
            total_hours: totalHours,
            break_duration: breakDuration,
            work_hours: workHours,
            hourly_rate: hourlyRate,
            total_cost: parseFloat(totalCost.toFixed(2)),
            work_activity: timesheetData.work_activity || 0,
            status: timesheetData.status || 'active',
            job_status: timesheetData.job_status || 'in_progress',
            notes: timesheetData.notes || '',
            pause_timer: pauseTimerData,
            created_at: timesheetData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          if (existingIndex >= 0) {
            // Update existing entry
            currentTimesheets[existingIndex] = timesheetEntry;
          } else {
            // Add new entry
            currentTimesheets.push(timesheetEntry);
          }
        }

        updateFields.labor_timesheets = JSON.stringify(currentTimesheets);
      }

      // Handle individual labor timesheet updates
      if (updateData.labor_timesheet) {
        const timesheetData = updateData.labor_timesheet;
        
        // Validate required fields
        if (!timesheetData.date) {
          throw new Error('date is required for timesheet');
        }
        
        if (!timesheetData.labor_id && !timesheetData.lead_labor_id) {
          throw new Error('either labor_id or lead_labor_id is required for timesheet');
        }

        // Get current labor timesheets
        const currentTimesheets = safeJsonParse(job.labor_timesheets, []);
        
        console.log(`Current timesheets before update:`, currentTimesheets.map(ts => ({ labor_id: ts.labor_id, date: ts.date })));
        console.log(`New timesheet data:`, { labor_id: timesheetData.labor_id, date: timesheetData.date });
        
        // Determine the ID to use for lookup
        const lookupId = timesheetData.labor_id || timesheetData.lead_labor_id;
        const isLeadLabor = !!timesheetData.lead_labor_id;
        
        // Check if this labor already has an entry for this date
        const existingIndex = currentTimesheets.findIndex(ts => {
          if (isLeadLabor) {
            return ts.lead_labor_id === timesheetData.lead_labor_id && ts.date === timesheetData.date;
          } else {
            return ts.labor_id === timesheetData.labor_id && ts.date === timesheetData.date;
          }
        });
        
        console.log(`Existing index found: ${existingIndex} (${existingIndex >= 0 ? 'UPDATE' : 'ADD NEW'})`);

        // Auto-calculate fields from provided data
        let totalHours = "00:00:00";
        let workHours = timesheetData.work_hours || "00:00:00";
        let breakDuration = "00:00:00";
        
        // Calculate total hours from start_time and end_time if provided
        if (timesheetData.start_time && timesheetData.end_time) {
          totalHours = Job.calculateTimeDifference(timesheetData.start_time, timesheetData.end_time);
          
          // If work_hours not provided, calculate it (total - breaks)
          if (!timesheetData.work_hours) {
            const totalHoursDecimal = Job.timeToHours(totalHours);
            const breakHoursDecimal = Job.timeToHours(breakDuration);
            const calculatedWorkHours = Math.max(0, totalHoursDecimal - breakHoursDecimal);
            workHours = Job.hoursToTime(calculatedWorkHours);
          }
        }

        // Get labor details to fetch hourly_rate and user_id if not provided
        let hourlyRate = timesheetData.hourly_rate || 0;
        let userId = timesheetData.user_id;
        let laborName = timesheetData.labor_name || 'Unknown Labor';

        if (!userId || !hourlyRate) {
          try {
            let laborData = null;
            
            if (isLeadLabor) {
              // Fetch lead labor details
              const { data } = await supabase
                .from('lead_labor')
                .select('user_id')
                .eq('id', timesheetData.lead_labor_id)
                .single();
              laborData = data;
            } else {
              // Fetch regular labor details
              const { data } = await supabase
                .from('labor')
                .select('user_id, hourly_rate')
                .eq('id', timesheetData.labor_id)
                .single();
              laborData = data;
            }

            if (laborData) {
              userId = userId || laborData.user_id;
              if (!isLeadLabor) {
                hourlyRate = hourlyRate || parseFloat(laborData.hourly_rate) || 0;
              }
            }

            // Get user name
            if (userId) {
              const { data: userData } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', userId)
                .single();
              
              if (userData) {
                laborName = userData.full_name;
              }
            }
          } catch (error) {
            console.warn('Could not fetch labor details:', error.message);
          }
        }

        // Calculate total cost
        const workHoursDecimal = Job.timeToHours(workHours);
        const totalCost = workHoursDecimal * hourlyRate;

        // Handle pause_timer if provided
        let pauseTimerData = [];
        if (timesheetData.pause_timer && Array.isArray(timesheetData.pause_timer)) {
          pauseTimerData = timesheetData.pause_timer;
          
          // Calculate total break duration from pause_timer
          const totalBreakSeconds = pauseTimerData.reduce((total, pause) => {
            const duration = pause.duration || "00:00:00";
            const [hours, minutes, seconds] = duration.split(':').map(Number);
            return total + (hours * 3600) + (minutes * 60) + seconds;
          }, 0);
          
          breakDuration = Job.hoursToTime(totalBreakSeconds / 3600);
          
          // Recalculate work hours if pause_timer provided
          if (timesheetData.start_time && timesheetData.end_time) {
            const totalHoursDecimal = Job.timeToHours(totalHours);
            const breakHoursDecimal = Job.timeToHours(breakDuration);
            const calculatedWorkHours = Math.max(0, totalHoursDecimal - breakHoursDecimal);
            workHours = Job.hoursToTime(calculatedWorkHours);
          }
        }

        // Prepare timesheet entry
        const timesheetEntry = {
          labor_id: timesheetData.labor_id || null,
          lead_labor_id: timesheetData.lead_labor_id || null,
          user_id: userId,
          labor_name: laborName,
          date: timesheetData.date,
          start_time: timesheetData.start_time || null,
          end_time: timesheetData.end_time || null,
          total_hours: totalHours,
          break_duration: breakDuration,
          work_hours: workHours,
          hourly_rate: hourlyRate,
          total_cost: parseFloat(totalCost.toFixed(2)),
          work_activity: timesheetData.work_activity || 0,
          status: timesheetData.status || 'active',
          job_status: timesheetData.job_status || 'in_progress',
          notes: timesheetData.notes || '',
          pause_timer: pauseTimerData,
          created_at: timesheetData.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          // Update existing entry
          console.log(`Updating existing entry at index ${existingIndex}`);
          currentTimesheets[existingIndex] = timesheetEntry;
        } else {
          // Add new entry
          console.log(`Adding new entry to timesheets array`);
          currentTimesheets.push(timesheetEntry);
        }

        console.log(`Final timesheets after update:`, currentTimesheets.map(ts => ({ labor_id: ts.labor_id, date: ts.date })));
        updateFields.labor_timesheets = JSON.stringify(currentTimesheets);
      }

      // Handle individual lead labor timesheet updates
      if (updateData.lead_labor_timesheet) {
        const timesheetData = updateData.lead_labor_timesheet;
        
        // Validate required fields
        if (!timesheetData.lead_labor_id || !timesheetData.user_id || !timesheetData.date) {
          throw new Error('lead_labor_id, user_id, and date are required for lead labor timesheet');
        }

        // Get current lead labor timesheets
        const currentLeadTimesheets = safeJsonParse(job.lead_labor_timesheets, []);
        
        // Check if this lead labor already has an entry for this date
        const existingIndex = currentLeadTimesheets.findIndex(
          ts => ts.lead_labor_id === timesheetData.lead_labor_id && ts.date === timesheetData.date
        );

        // Prepare timesheet entry
        const timesheetEntry = {
          lead_labor_id: timesheetData.lead_labor_id,
          user_id: timesheetData.user_id,
          labor_name: timesheetData.labor_name || 'Unknown Lead Labor',
          date: timesheetData.date,
          start_time: timesheetData.start_time || null,
          end_time: timesheetData.end_time || null,
          total_hours: timesheetData.total_hours || "00:00:00",
          break_duration: timesheetData.break_duration || "00:00:00",
          work_hours: timesheetData.work_hours || "00:00:00",
          hourly_rate: timesheetData.hourly_rate || 0,
          total_cost: timesheetData.total_cost || 0,
          work_activity: timesheetData.work_activity || 0,
          status: timesheetData.status || 'active',
          notes: timesheetData.notes || '',
          created_at: timesheetData.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          // Update existing entry
          currentLeadTimesheets[existingIndex] = timesheetEntry;
        } else {
          // Add new entry
          currentLeadTimesheets.push(timesheetEntry);
        }

        updateFields.lead_labor_timesheets = JSON.stringify(currentLeadTimesheets);
      }

      console.log(`Updating job ${jobId} with fields:`, Object.keys(updateFields));
      if (updateFields.labor_timesheets) {
        console.log(`Labor timesheets to save:`, updateFields.labor_timesheets);
      }

      const { data, error } = await supabase
        .from("jobs")
        .update(updateFields)
        .eq("id", jobId)
        .select()
        .single();

      if (error) {
        console.error(`Database update error:`, error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`Database update successful. Returned data:`, {
        id: data.id,
        labor_timesheets_length: data.labor_timesheets ? data.labor_timesheets.length : 'null',
        labor_timesheets_preview: data.labor_timesheets ? data.labor_timesheets.substring(0, 100) + '...' : 'null'
      });

      // Parse JSON fields before returning
      const parsedData = { ...data };
      parsedData.labor_timesheets = safeJsonParse(data.labor_timesheets, []);
      parsedData.lead_labor_timesheets = safeJsonParse(data.lead_labor_timesheets, []);
      parsedData.pause_timer = safeJsonParse(data.pause_timer, []);

      console.log(`Final parsed data - labor_timesheets count:`, parsedData.labor_timesheets.length);

      // Fetch fresh data to ensure we have the latest
      console.log(`Fetching fresh data to verify update...`);
      const { data: freshData, error: freshError } = await supabase
        .from("jobs")
        .select("labor_timesheets, lead_labor_timesheets, pause_timer")
        .eq("id", jobId)
        .single();

      if (!freshError && freshData) {
        console.log(`Fresh data verification - labor_timesheets length:`, freshData.labor_timesheets ? freshData.labor_timesheets.length : 'null');
        if (freshData.labor_timesheets) {
          const freshParsed = safeJsonParse(freshData.labor_timesheets, []);
          console.log(`Fresh parsed data - labor_timesheets count:`, freshParsed.length);
        }
      }

      return parsedData;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to calculate time difference in HH:MM:SS format
  static calculateTimeDifference(startTime, endTime) {
    if (!startTime || !endTime) return "00:00:00";
    
    const start = new Date(`1970-01-01T${startTime}Z`);
    const end = new Date(`1970-01-01T${endTime}Z`);
    const diffMs = end - start;
    
    if (diffMs < 0) return "00:00:00";
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Helper method to convert time string to hours (decimal)
  static timeToHours(timeString) {
    if (!timeString || timeString === "00:00:00") return 0;
    
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    return hours + (minutes / 60) + (seconds / 3600);
  }

  // Helper method to convert hours (decimal) to time string
  static hoursToTime(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Get weekly timesheet summary for a job
  static async getWeeklyTimesheetSummary(jobId, startDate, endDate) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Check what raw data we get from database
      console.log('DEBUG - Raw job.labor_timesheets value:', job.labor_timesheets);
      console.log('DEBUG - Raw job.data type check:', typeof job.labor_timesheets);
      console.log('DEBUG - Job data available keys:', Object.keys(job).filter(key => key.includes('timesheet') || key.includes('lab')));
      
      // Parse timesheet data - handle both string and already parsed array cases
      let allTimesheets = [];
      let laborTimesheets = [];
      let leadLaborTimesheets = [];
      
      if (typeof job.labor_timesheets === 'string') {
        allTimesheets = safeJsonParse(job.labor_timesheets, []);
      } else if (Array.isArray(job.labor_timesheets)) {
        allTimesheets = job.labor_timesheets;
      }

      // Separate regular labor and lead labor from all timesheets
      laborTimesheets = allTimesheets.filter(ts => ts.labor_id);
      leadLaborTimesheets = allTimesheets.filter(ts => ts.lead_labor_id);

      console.log('DEBUG - Input dates:', {startDate, endDate});
      console.log('DEBUG - Labor timesheets before filter:', laborTimesheets.length);
      console.log('DEBUG - Lead labor timesheets before filter:', leadLaborTimesheets.length);
      console.log('DEBUG - Parsed labor data sample:', laborTimesheets.slice(0, 1));
      console.log('DEBUG - Parsed lead labor data sample:', leadLaborTimesheets.slice(0, 1));
      
      // Filter timesheets by date range - both labor and lead labor
      const filteredLaborTimesheets = laborTimesheets.filter(ts => {
        const tsDateStr = ts.date;
        console.log('DEBUG - Checking labor date:', tsDateStr, 'v', startDate, 'to', endDate);
        return tsDateStr >= startDate && tsDateStr <= endDate;
      });

      const filteredLeadLaborTimesheets = leadLaborTimesheets.filter(ts => {
        const tsDateStr = ts.date;
        console.log('DEBUG - Checking lead date:', tsDateStr, 'vs', startDate, 'to', endDate);
        return tsDateStr >= startDate && tsDateStr <= endDate;
      });
      
      console.log('DEBUG - Filtered labor after check:', filteredLaborTimesheets.length);
      console.log('DEBUG - Filtered lead labor after check:', filteredLeadLaborTimesheets.length);

      // Create weekly breakdown
      const weeklyBreakdown = {};
      const laborSummary = {};
      const leadLaborSummary = {};

      // Process labor timesheets - COMBINED LOGIC FOR LABOR AND LEAD LABOR
      let allFilteredTimesheets = [...filteredLaborTimesheets, ...filteredLeadLaborTimesheets];
      
      console.log('DEBUG - Processing all timesheets combined:', allFilteredTimesheets.length);
      
      allFilteredTimesheets.forEach(timesheet => {
        const date = timesheet.date;
        
        if (!weeklyBreakdown[date]) {
          weeklyBreakdown[date] = { labor: [], lead_labor: [] };
        }

        // Check if this is regular labor or lead labor
        if (timesheet.labor_id) {
          // Regular labor entry
          const laborId = timesheet.labor_id;
          
          weeklyBreakdown[date].labor.push({
            labor_id: timesheet.labor_id,
            labor_name: timesheet.labor_name,
            start_time: timesheet.start_time,
            end_time: timesheet.end_time,
            total_hours: timesheet.total_hours,
            work_hours: timesheet.work_hours,
            break_duration: timesheet.break_duration,
            hourly_rate: timesheet.hourly_rate,
            total_cost: timesheet.total_cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status,
            notes: timesheet.notes,
            pause_timer: timesheet.pause_timer,
            job_status: timesheet.job_status
          });

          // Calculate labor summary
          if (!laborSummary[laborId]) {
            laborSummary[laborId] = {
              labor_id: laborId,
              labor_name: timesheet.labor_name,
              total_hours: 0,
              total_cost: 0,
              days_worked: 0,
              daily_breakdown: {}
            };
          }

          const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
          const cost = parseFloat(timesheet.total_cost) || 0;

          laborSummary[laborId].total_hours += hours;
          laborSummary[laborId].total_cost += cost;
          laborSummary[laborId].days_worked += 1;
          laborSummary[laborId].daily_breakdown[date] = {
            hours: timesheet.work_hours || timesheet.total_hours,
            cost: cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status || 'active',
            billable: timesheet.billable !== undefined ? timesheet.billable : null
          };
        } else if (timesheet.lead_labor_id) {
          // Lead labor entry
          const leadLaborId = timesheet.lead_labor_id;
          
          weeklyBreakdown[date].lead_labor.push({
            lead_labor_id: timesheet.lead_labor_id,
            labor_name: timesheet.labor_name,
            start_time: timesheet.start_time,
            end_time: timesheet.end_time,
            total_hours: timesheet.total_hours,
            work_hours: timesheet.work_hours,
            break_duration: timesheet.break_duration,
            hourly_rate: timesheet.hourly_rate,
            total_cost: timesheet.total_cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status,
            job_status: timesheet.job_status,
            notes: timesheet.notes,
            pause_timer: timesheet.pause_timer
          });

          // Calculate lead labor summary
          if (!leadLaborSummary[leadLaborId]) {
            leadLaborSummary[leadLaborId] = {
              lead_labor_id: leadLaborId,
              labor_name: timesheet.labor_name,
              total_hours: 0,
              total_cost: 0,
              days_worked: 0,
              daily_breakdown: {}
            };
          }

          const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
          const cost = parseFloat(timesheet.total_cost) || 0;

          leadLaborSummary[leadLaborId].total_hours += hours;
          leadLaborSummary[leadLaborId].total_cost += cost;
          leadLaborSummary[leadLaborId].days_worked += 1;
          leadLaborSummary[leadLaborId].daily_breakdown[date] = {
            hours: timesheet.work_hours || timesheet.total_hours,
            cost: cost,
            work_activity: timesheet.work_activity,
            status: timesheet.status || 'active',
            billable: timesheet.billable !== undefined ? timesheet.billable : null
          };
        }
      });

      // REMOVED DUPLICATE LEAD LABOR PROCESSING - ALREADY HANDLED ABOVE

      // Calculate totals
      const totalLaborHours = Object.values(laborSummary).reduce((sum, labor) => sum + labor.total_hours, 0);
      const totalLaborCost = Object.values(laborSummary).reduce((sum, labor) => sum + labor.total_cost, 0);
      const totalLeadLaborHours = Object.values(leadLaborSummary).reduce((sum, labor) => sum + labor.total_hours, 0);
      const totalLeadLaborCost = Object.values(leadLaborSummary).reduce((sum, labor) => sum + labor.total_cost, 0);
      
      console.log('DEBUG - Summary counts after processing:', {
        laborSummaryCount: Object.keys(laborSummary).length,
        leadLaborSummaryCount: Object.keys(leadLaborSummary).length,
        totalLaborHours,
        totalLeadLaborHours
      });

      // Create dashboard format array for each labor/day
      const dashboardFormat = [];
      
      // Get all timesheets from job to check what data exists
      const allLaborTimesheets = safeJsonParse(job.labor_timesheets, []);
      const allLeadLaborTimesheets = allLaborTimesheets.filter(ts => ts.lead_labor_id);
      
      console.log('DEBUG - Total raw timesheets in job:', allLaborTimesheets.length, allLeadLaborTimesheets.length);
      console.log('DEBUG - Date range being queried:', startDate, 'to', endDate);
      
      // If no data in filtered timesheets but we have raw data, process all available data
      if (Object.keys(laborSummary).length === 0 && Object.keys(leadLaborSummary).length === 0) {
        console.log('DEBUG - No timesheets in requested date range, checking for any available data');
        
        // Check if at least some raw timesheets exist
        if (allLaborTimesheets.length > 0 || allLeadLaborTimesheets.length > 0) {
          console.log('DEBUG - Found timesheets outside date range, will show all available timesheets');
          
          // Process all raw labor timesheets regardless of date range
          allLaborTimesheets.forEach(timesheet => {
            const laborId = timesheet.labor_id;
            if (!laborSummary[laborId]) {
              laborSummary[laborId] = {
                labor_id: laborId,
                labor_name: timesheet.labor_name,
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }
            
            const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
            const cost = parseFloat(timesheet.total_cost) || 0;
            
            laborSummary[laborId].total_hours += hours;
            laborSummary[laborId].total_cost += cost;
            laborSummary[laborId].days_worked += 1;
            laborSummary[laborId].daily_breakdown[timesheet.date] = {
              hours: timesheet.work_hours || timesheet.total_hours,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || 'pending',
              billable: timesheet.billable !== undefined ? timesheet.billable : null
            };
          });
          
          // Process all raw lead labor timesheets regardless of date range
          allLeadLaborTimesheets.forEach(timesheet => {
            const leadLaborId = timesheet.lead_labor_id;
            if (!leadLaborSummary[leadLaborId]) {
              leadLaborSummary[leadLaborId] = {
                lead_labor_id: leadLaborId,
                labor_name: timesheet.labor_name,
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }
            
            const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
            const cost = parseFloat(timesheet.total_cost) || 0;
            
            leadLaborSummary[leadLaborId].total_hours += hours;
            leadLaborSummary[leadLaborId].total_cost += cost;
            leadLaborSummary[leadLaborId].days_worked += 1;
            leadLaborSummary[leadLaborId].daily_breakdown[timesheet.date] = {
              hours: timesheet.work_hours || timesheet.total_hours,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || 'pending',
              billable: timesheet.billable !== undefined ? timesheet.billable : null
            };
          });
          
          console.log('DEBUG - After fallback processing:', {
            laborSummaryCount: Object.keys(laborSummary).length,
            leadLaborSummaryCount: Object.keys(leadLaborSummary).length
          });
        } else {
          console.log('DEBUG - No timesheet data found at all in job');
        }
      }
      
      // Get job info for display
      const jobInfo = {
        job_title: job.job_title,
        job_id: jobId
      };

      // Process labor employees for dashboard
      Object.values(laborSummary).forEach(labor => {
        console.log('DEBUG - Processing labor:', labor.labor_name);
        const employeeHours = {};
        let totalHours = 0;
        let billableHours = 0;
        let weekDays = [];

        // Create week array for order and get the correct day names
        const start = new Date(startDate);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          weekDays.push(day.toISOString().split('T')[0]);
        }

        let laborStatus = "Draft"; // Default status
        const statusCounts = {};

        // Get daily hours for each day of the week
        weekDays.forEach((dayDate, index) => {
          const actualDay = new Date(dayDate);
          const dayOfWeek = actualDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Map day number to day name (Sunday = 0 maps to index 6, Monday = 1 maps to index 0, etc.)
          const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayName = dayNames[dayNameIndex];
          
          const dailyData = labor.daily_breakdown[dayDate];
          
          if (dailyData) {
            const hoursValue = Job.timeToHours(dailyData.hours);
            employeeHours[dayName.toLowerCase()] = `${Math.round(hoursValue)}h`;
            totalHours += hoursValue;
            billableHours += hoursValue; // Assume all hours are billable
            
            // Count status occurrences for this labor
            if (dailyData.status) {
              const normalizedStatus = dailyData.status.toLowerCase();
              statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
              console.log(`DEBUG getWeeklySummary - Status: '${dailyData.status}' -> normalized: '${normalizedStatus}'`);
            }
          } else {
            employeeHours[dayName.toLowerCase()] = '0h';
          }
        });

        // Determine overall status based on status counts
        const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        console.log(`DEBUG getWeeklySummary StatusCheck: statusCounts = `, statusCounts);
        if (totalDays > 0) {
          if (statusCounts.approved > 0) {
            laborStatus = "Approved";
            console.log(`DEBUG getWeeklySummary - Setting status to Approved`);
          } else if (statusCounts.submitted > 0) {
            laborStatus = "Submitted";
          } else if (statusCounts.active > 0) {
            laborStatus = "Active";
          } else if (statusCounts.pending > 0) {
            laborStatus = "Pending";
          }
          if (statusCounts.rejected > 0) {
            laborStatus = "Rejected";
          }
        } else if (totalHours > 0) {
          laborStatus = "Active"; // If hours worked but no specific status tracked
        }
        
        console.log(`DEBUG getWeeklySummary Final status for ${labor.labor_name}: ${laborStatus}`);

        dashboardFormat.push({
          employee: labor.labor_name,
          job: `${jobInfo.job_title} (Job-${jobId})`,
          week: `${startDate} - ${endDate}`,
          ...employeeHours,
          total: `${Math.round(totalHours)}h`,
          billable: `${Math.round(billableHours)}h`,
          status: laborStatus, // Actual status from timesheet data
          actions: ["approve", "reject"]
        });
      });

      // Process lead labor employees for dashboard
      Object.values(leadLaborSummary).forEach(labor => {
        const employeeHours = {};
        let totalHours = 0;
        let billableHours = 0;
        let weekDays = [];

        // Create week array for order and get the correct day names
        const start = new Date(startDate);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          weekDays.push(day.toISOString().split('T')[0]);
        }

        let leadStatus = "Draft"; // Default status
        const statusCounts = {};

        // Get daily hours for each day of the week
        weekDays.forEach((dayDate, index) => {
          const actualDay = new Date(dayDate);
          const dayOfWeek = actualDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
          
          // Map day number to day name (Sunday = 0 maps to index 6, Monday = 1 maps to index 0, etc.)
          const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayName = dayNames[dayNameIndex];
          
          const dailyData = labor.daily_breakdown[dayDate];
          
          if (dailyData) {
            const hoursValue = Job.timeToHours(dailyData.hours);
            employeeHours[dayName.toLowerCase()] = `${Math.round(hoursValue)}h`;
            totalHours += hoursValue;
            billableHours += hoursValue;
            
            // Count status occurrences for this lead labor
            if (dailyData.status) {
              const normalizedStatus = dailyData.status.toLowerCase();
              statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
              console.log(`DEBUG getWeeklySummary LeadLabor - Status: '${dailyData.status}' -> normalized: '${normalizedStatus}'`);
            }
          } else {
            employeeHours[dayName.toLowerCase()] = '0h';
          }
        });

        // Determine overall status based on status counts
        const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        console.log(`DEBUG getWeeklySummary LeadLabor StatusCheck: statusCounts = `, statusCounts);
        if (totalDays > 0) {
          if (statusCounts.approved > 0) {
            leadStatus = "Approved";
            console.log(`DEBUG getWeeklySummary LeadLabor - Setting status to Approved`);
          } else if (statusCounts.submitted > 0) {
            leadStatus = "Submitted";
          } else if (statusCounts.active > 0) {
            leadStatus = "Active";
          } else if (statusCounts.pending > 0) {
            leadStatus = "Pending";
          }
          if (statusCounts.rejected > 0) {
            leadStatus = "Rejected";
          }
        } else if (totalHours > 0) {
          leadStatus = "Active"; // If hours worked but no specific status tracked
        }
        
        console.log(`DEBUG getWeeklySummary LeadLabor Final status for ${labor.labor_name}: ${leadStatus}`);

        dashboardFormat.push({
          employee: labor.labor_name,
          job: `${jobInfo.job_title} (Job-${jobId})`,
          week: `${startDate} - ${endDate}`,
          ...employeeHours,
          total: `${Math.round(totalHours)}h`,
          billable: `${Math.round(billableHours)}h`,
          status: leadStatus, // Actual status from timesheet data
          actions: ["approve", "reject"]
        });
      });

      return {
        job_id: jobId,
        period: {
          start_date: startDate,
          end_date: endDate,
          week_range: `${startDate} - ${endDate}`
        },
        dashboard_timesheets: dashboardFormat
      };
    } catch (error) {
      throw error;
    }
  }

  // Approve timesheet - Update status for specific labor and date
  static async approveTimesheet(jobId, laborId, date, status = 'approved', billable = null) {
    try {
      if (!jobId || !laborId || !date) {
        throw new Error('jobId, laborId, and date are required for timesheet approval');
      }

      // Get job details
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Parse current labor timesheets
      const allTimesheets = safeJsonParse(job.labor_timesheets, []);
      const laborTimesheets = allTimesheets.filter(ts => ts.labor_id);
      const leadLaborTimesheets = allTimesheets.filter(ts => ts.lead_labor_id);

      let timesheetUpdated = false;

      // Check in regular labor timesheets
      for (let i = 0; i < laborTimesheets.length; i++) {
        if (((laborTimesheets[i].labor_id && parseInt(laborTimesheets[i].labor_id) === parseInt(laborId)) || 
             (laborTimesheets[i].lead_labor_id && parseInt(laborTimesheets[i].lead_labor_id) === parseInt(laborId))) && 
             laborTimesheets[i].date === date) {
          laborTimesheets[i].status = status;
          laborTimesheets[i].updated_at = new Date().toISOString();
          
          // Update billable hours if provided  
          if (billable !== null && billable !== undefined) {
            // Supported formats: number (direct hours) or string like "30h" or "30:00"
            if (typeof billable === 'number') {
              laborTimesheets[i].billable = billable;
            } else if (typeof billable === 'string') {
              // Handle string formats like "30h", "30:00", or just "30"
              const cleanBillable = billable.replace(/[h]/gi, '').trim();
              if (cleanBillable.includes(':')) {
                // Convert time format "30:00" to decimal hours
                const [hours, minutes] = cleanBillable.split(':');
                laborTimesheets[i].billable = parseFloat(hours) + (parseFloat(minutes || 0) / 60);
              } else {
                // Direct number format
                laborTimesheets[i].billable = parseFloat(cleanBillable) || billable;
              }
            } else {
              laborTimesheets[i].billable = billable;
            }
          }
          
          timesheetUpdated = true;
          // Update the corresponding entry in all timesheets
          const allTimesheetIndex = allTimesheets.findIndex(ts => 
            ((ts.labor_id && parseInt(ts.labor_id) === parseInt(laborId)) || 
             (ts.lead_labor_id && parseInt(ts.lead_labor_id) === parseInt(laborId))) && ts.date === date
          );
          if (allTimesheetIndex >= 0) {
            allTimesheets[allTimesheetIndex] = laborTimesheets[i];
          }
        }
      }

      // Check in lead labor timesheets  
      for (let i = 0; i < leadLaborTimesheets.length; i++) {
        if (((leadLaborTimesheets[i].labor_id && parseInt(leadLaborTimesheets[i].labor_id) === parseInt(laborId)) || 
             (leadLaborTimesheets[i].lead_labor_id && parseInt(leadLaborTimesheets[i].lead_labor_id) === parseInt(laborId))) && 
             leadLaborTimesheets[i].date === date) {
          leadLaborTimesheets[i].status = status;
          leadLaborTimesheets[i].updated_at = new Date().toISOString();
          
          // Update billable hours if provided  
          if (billable !== null && billable !== undefined) {
            // Supported formats: number (direct hours) or string like "30h" or "30:00"
            if (typeof billable === 'number') {
              leadLaborTimesheets[i].billable = billable;
            } else if (typeof billable === 'string') {
              // Handle string formats like "30h", "30:00", or just "30"
              const cleanBillable = billable.replace(/[h]/gi, '').trim();
              if (cleanBillable.includes(':')) {
                // Convert time format "30:00" to decimal hours
                const [hours, minutes] = cleanBillable.split(':');
                leadLaborTimesheets[i].billable = parseFloat(hours) + (parseFloat(minutes || 0) / 60);
              } else {
                // Direct number format
                leadLaborTimesheets[i].billable = parseFloat(cleanBillable) || billable;
              }
            } else {
              leadLaborTimesheets[i].billable = billable;
            }
          }
          
          timesheetUpdated = true;
          // Update the corresponding entry in all timesheets
          const allTimesheetIndex = allTimesheets.findIndex(ts => 
            ((ts.labor_id && parseInt(ts.labor_id) === parseInt(laborId)) || 
             (ts.lead_labor_id && parseInt(ts.lead_labor_id) === parseInt(laborId))) && ts.date === date
          );
          if (allTimesheetIndex >= 0) {
            allTimesheets[allTimesheetIndex] = leadLaborTimesheets[i];
          }
        }
      }

      if (!timesheetUpdated) {
        throw new Error('Timesheet entry not found for the given labor_id and date');
      }

      // Update the job with modified timesheet data
      const { data, error: updateError } = await supabase
        .from("jobs")
        .update({
          labor_timesheets: JSON.stringify(allTimesheets),
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        message: `Timesheet ${status} successfully`,
        data: {
          job_id: jobId,
          labor_id: laborId,
          date: date,
          status: status,
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Approve entire week timesheet - Update status for specific labor and entire week
  static async approveWeekTimesheet(jobId, laborId, startDate, endDate, status = 'approved') {
    try {
      if (!jobId || !laborId || !startDate || !endDate) {
        throw new Error('jobId, laborId, startDate, and endDate are required for weekly timesheet approval');
      }

      // Fetch raw job data directly - bypassing processed findById
      const { data: jobData, error: jobFetchError } = await supabase
        .from("jobs")
        .select(`
          id,
          labor_timesheets
        `)
        .eq("id", jobId)
        .single();

      if (jobFetchError) {
        throw new Error(`Database error: ${jobFetchError.message}`);
      }

      if (!jobData) {
        throw new Error('Job not found');
      }

      console.log('DEBUG: Raw job data fetched. ID:', jobData.id);
      console.log('DEBUG: labor_timesheets type:', typeof jobData.labor_timesheets);
      console.log('DEBUG: labor_timesheets content preview:', jobData.labor_timesheets ? String(jobData.labor_timesheets).substring(0, 200) + '...' : 'NULL');

      // Parse labor_timesheets to get inline array
      let allTimesheets = [];
      if (jobData.labor_timesheets) {
        allTimesheets = safeJsonParse(jobData.labor_timesheets, []);
        console.log('DEBUG: Parsed timesheets successfully. Count:', allTimesheets.length);
      } else {
        console.log('DEBUG: no labor_timesheets found in raw data');
      }

      if (allTimesheets.length > 0) {
        console.log('DEBUG: Sample timesheet:', JSON.stringify(allTimesheets[0], null, 1).substring(0, 200) + '...');
      }
      console.log('DEBUG: Search criteria - laborId:', laborId, 'start:', startDate, 'end:', endDate);
      
      let timesheetsUpdated = 0;

      // Update all timesheet entries for this labor within the date range
      for (let i = 0; i < allTimesheets.length; i++) {
        const timesheet = allTimesheets[i];
        
        console.log('DEBUG: Timesheet', i + 1, ':', {
          id: timesheet.labor_id || timesheet.lead_labor_id,
          date: timesheet.date,
          status: timesheet.status || 'no status'
        });
        
        // Check if this timesheet belongs to the labor and is within date range
        const matchesLaborId = (timesheet.labor_id && parseInt(timesheet.labor_id) === parseInt(laborId)) || 
                              (timesheet.lead_labor_id && parseInt(timesheet.lead_labor_id) === parseInt(laborId));
        const inDateRange = timesheet.date >= startDate && timesheet.date <= endDate;
        
        if (matchesLaborId && inDateRange) {
          console.log('✓ MATCH FOUND - Updating timesheet at index', i, 'for labor/lead', timesheet.labor_id || timesheet.lead_labor_id);
          allTimesheets[i].status = status;
          allTimesheets[i].updated_at = new Date().toISOString();
          
          
          timesheetsUpdated++;
        } else {
          console.log('✗ Skipping timesheet at index', i, '- labor match:', matchesLaborId, 'date match:', inDateRange);
        }
      }
      
      console.log('DEBUG: Total timesheets updated:', timesheetsUpdated);

      if (timesheetsUpdated === 0) {
        throw new Error('No timesheet entries found for the given labor_id and date range');
      }
      

      // Update the job with modified timesheet data
      const { data, error: updateError } = await supabase
        .from("jobs")
        .update({
          labor_timesheets: JSON.stringify(allTimesheets),
          updated_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        message: `${timesheetsUpdated} timesheet entries ${status} successfully for the week`,
        data: {
          job_id: jobId,
          labor_id: laborId,
          start_date: startDate,
          end_date: endDate,
          status: status,
          entries_updated: timesheetsUpdated,
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get weekly timesheet summary for all jobs
  static async getAllJobsWeeklyTimesheetSummary(startDate, endDate) {
    try {
      // Get all jobs with timesheet data - Force fresh data by selecting the most updated entries
      const { data: allJobs, error } = await supabase
        .from("jobs")
        .select(`
          id,
          job_title,
          labor_timesheets,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`DEBUG getAllJobsSummary - Fetched ${allJobs?.length || 0} jobs with fresh data at: ${new Date().toISOString()}`);

      const allDashboardTimesheets = [];

      // Process each job
      for (const job of allJobs || []) {
        // Parse timesheet data for each job
        let allTimesheets = [];
        
        if (typeof job.labor_timesheets === 'string') {
          allTimesheets = safeJsonParse(job.labor_timesheets, []);
        } else if (Array.isArray(job.labor_timesheets)) {
          allTimesheets = job.labor_timesheets;
        }

        console.log(`DEBUG Job Id: ${job.id}, Raw timesheets length: ${allTimesheets?.length || 0}, Updated: ${job.updated_at}`);

        // Filter timesheets by date range and separate regular and lead labor
        const filteredLaborTimesheets = allTimesheets.filter(ts => {
          const tsDateStr = ts.date;
          return (tsDateStr >= startDate && tsDateStr <= endDate) && ts.labor_id;
        });

        const filteredLeadLaborTimesheets = allTimesheets.filter(ts => {
          const tsDateStr = ts.date;
          return (tsDateStr >= startDate && tsDateStr <= endDate) && ts.lead_labor_id;
        });

        // Process labor and lead labor data for this job
        const laborSummary = {};
        const leadLaborSummary = {};

        // Process labor timesheets
        [...filteredLaborTimesheets, ...filteredLeadLaborTimesheets].forEach(timesheet => {
          // DEBUG: Log raw timesheet data
          console.log(`DEBUG getAllJobs - Processing raw timesheet:`, {
            laborId: timesheet.labor_id,
            leadLaborId: timesheet.lead_labor_id,
            date: timesheet.date,
            status: timesheet.status,
            employee: timesheet.labor_name
          });
          if (timesheet.labor_id) {
            const laborId = timesheet.labor_id;
            if (!laborSummary[laborId]) {
              laborSummary[laborId] = {
                labor_id: laborId,
                labor_name: timesheet.labor_name,
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }
            
            const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
            const cost = parseFloat(timesheet.total_cost) || 0;
            
            laborSummary[laborId].total_hours += hours;
            laborSummary[laborId].total_cost += cost;
            laborSummary[laborId].days_worked += 1;
            laborSummary[laborId].daily_breakdown[timesheet.date] = {
              hours: timesheet.work_hours || timesheet.total_hours,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || 'pending',
              billable: timesheet.billable !== undefined ? timesheet.billable : null
            };
          } else if (timesheet.lead_labor_id) {
            const leadLaborId = timesheet.lead_labor_id;
            if (!leadLaborSummary[leadLaborId]) {
              leadLaborSummary[leadLaborId] = {
                lead_labor_id: leadLaborId,
                labor_name: timesheet.labor_name,
                total_hours: 0,
                total_cost: 0,
                days_worked: 0,
                daily_breakdown: {}
              };
            }
            
            const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
            const cost = parseFloat(timesheet.total_cost) || 0;
            
            leadLaborSummary[leadLaborId].total_hours += hours;
            leadLaborSummary[leadLaborId].total_cost += cost;
            leadLaborSummary[leadLaborId].days_worked += 1;
            leadLaborSummary[leadLaborId].daily_breakdown[timesheet.date] = {
              hours: timesheet.work_hours || timesheet.total_hours,
              cost: cost,
              work_activity: timesheet.work_activity,
              status: timesheet.status || 'pending',
              billable: timesheet.billable !== undefined ? timesheet.billable : null
            };
          }
        });

        // Process labor employees for dashboard
        Object.values(laborSummary).forEach(labor => {
          const employeeHours = {};
          let totalHours = 0;
          let billableHours = 0;
          let weekDays = [];

          // Create week array and get correct day names
          const start = new Date(startDate);
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          
          for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            weekDays.push(day.toISOString().split('T')[0]);
          }

          // Status calculation logic
          let laborStatus = "Draft"; // Default status
          const statusCounts = {};
          
          console.log(`DEBUG Processing labor ${labor.labor_name} - checking ${weekDays.length} weekdays`)

          // Get daily hours for each day of the week
          weekDays.forEach((dayDate) => {
            const actualDay = new Date(dayDate);
            const dayOfWeek = actualDay.getDay();
            const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const dayName = dayNames[dayNameIndex];
            
            const dailyData = labor.daily_breakdown[dayDate];
            
            if (dailyData) {
              const hoursValue = Job.timeToHours(dailyData.hours);
              employeeHours[dayName.toLowerCase()] = `${Math.round(hoursValue)}h`;
              totalHours += hoursValue;
              
              // Count status for aggregation
              const rawStatus = dailyData.status || 'pending';
              const currentStatus = rawStatus.toLowerCase(); // Normalize to lowercase for consistent matching
              console.log(`DEBUG getAllJobs - Date ${dayDate}, Raw: '${dailyData.status}' -> Normalized: '${currentStatus}'`);
              if (statusCounts[currentStatus]) {
                statusCounts[currentStatus]++;
              } else {
                statusCounts[currentStatus] = 1;
              }
              
              // Use billable hours from timesheet, or default to all hours if not specified  
              if (dailyData.billable !== null && dailyData.billable !== undefined) {
                billableHours += parseFloat(dailyData.billable) || 0;
              } else {
                billableHours += hoursValue;
              }
            } else {
              employeeHours[dayName.toLowerCase()] = '0h';
            }
          });

          // Determine overall status based on status counts (same logic as getWeeklyTimesheetSummary)
          const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
          console.log(`DEBUG StatusCheck: statusCounts = `, statusCounts);
          if (totalDays > 0) {
            // Check for all possible case variations - prioritize approved/Approved
            if (statusCounts.approved > 0) {
              laborStatus = "Approved";
              console.log(`DEBUG - Setting status to Approved (lowercase check)`);
            } else if (statusCounts.submitted > 0) {
              laborStatus = "Submitted";
            } else if (statusCounts.active > 0) {
              laborStatus = "Active";
            } else if (statusCounts.pending > 0) {
              laborStatus = "Pending";
            }
            if (statusCounts.rejected > 0) {
              laborStatus = "Rejected";
            }
          } else if (totalHours > 0) {
            laborStatus = "Active"; // If hours worked but no specific status tracked
          }
          
          console.log(`DEBUG Final status for ${labor.labor_name}: ${laborStatus}`);

          allDashboardTimesheets.push({
            employee: labor.labor_name,
            job: `${job.job_title} (Job-${job.id})`,
            week: `${startDate} - ${endDate}`,
            ...employeeHours,
            total: `${Math.round(totalHours)}h`,
            billable: `${Math.round(billableHours)}h`,
            status: laborStatus, // Actual calculated status
            actions: ["approve", "reject"]
          });
        });

        // Process lead labor employees for dashboard
        Object.values(leadLaborSummary).forEach(labor => {
          const employeeHours = {};
          let totalHours = 0;
          let billableHours = 0;
          let weekDays = [];

          // Create week array and get correct day names
          const start = new Date(startDate);
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          
          for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            weekDays.push(day.toISOString().split('T')[0]);
          }

          // Status calculation logic for lead labor
          let laborStatus = "Draft"; // Default status
          const statusCounts = {};

          // Get daily hours for each day of the week
          weekDays.forEach((dayDate) => {
            const actualDay = new Date(dayDate);
            const dayOfWeek = actualDay.getDay();
            const dayNameIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const dayName = dayNames[dayNameIndex];
            
            const dailyData = labor.daily_breakdown[dayDate];
            
            if (dailyData) {
              const hoursValue = Job.timeToHours(dailyData.hours);
              employeeHours[dayName.toLowerCase()] = `${Math.round(hoursValue)}h`;
              totalHours += hoursValue;
              
              // Count status for aggregation
              const rawStatus = dailyData.status || 'pending';
              const currentStatus = rawStatus.toLowerCase(); // Normalize to lowercase for consistent matching
              console.log(`DEBUG getAllJobs - Date ${dayDate}, Raw: '${dailyData.status}' -> Normalized: '${currentStatus}'`);
              if (statusCounts[currentStatus]) {
                statusCounts[currentStatus]++;
              } else {
                statusCounts[currentStatus] = 1;
              }
              
              // Use billable hours from timesheet, or default to all hours if not specified  
              if (dailyData.billable !== null && dailyData.billable !== undefined) {
                billableHours += parseFloat(dailyData.billable) || 0;
              } else {
                billableHours += hoursValue;
              }
            } else {
              employeeHours[dayName.toLowerCase()] = '0h';
            }
          });

          // Determine overall status based on status counts (same logic as getWeeklyTimesheetSummary)
          const totalDays = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
          console.log(`DEBUG StatusCheck: statusCounts = `, statusCounts);
          if (totalDays > 0) {
            // Check for all possible case variations - prioritize approved/Approved
            if (statusCounts.approved > 0) {
              laborStatus = "Approved";
              console.log(`DEBUG - Setting status to Approved (lowercase check)`);
            } else if (statusCounts.submitted > 0) {
              laborStatus = "Submitted";
            } else if (statusCounts.active > 0) {
              laborStatus = "Active";
            } else if (statusCounts.pending > 0) {
              laborStatus = "Pending";
            }
            if (statusCounts.rejected > 0) {
              laborStatus = "Rejected";
            }
          } else if (totalHours > 0) {
            laborStatus = "Active"; // If hours worked but no specific status tracked
          }
          
          console.log(`DEBUG Final status for ${labor.labor_name}: ${laborStatus}`);

          allDashboardTimesheets.push({
            employee: labor.labor_name,
            job: `${job.job_title} (Job-${job.id})`,
            week: `${startDate} - ${endDate}`,
            ...employeeHours,
            total: `${Math.round(totalHours)}h`,
            billable: `${Math.round(billableHours)}h`,
            status: laborStatus, // Actual calculated status
            actions: ["approve", "reject"]
          });
        });
      }

      return {
        period: {
          start_date: startDate,
          end_date: endDate,
          week_range: `${startDate} - ${endDate}`
        },
        dashboard_timesheets: allDashboardTimesheets
      };
    } catch (error) {
      throw error;
    }
  }

  // Get timesheet summary for a job
  static async getTimesheetSummary(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const allTimesheets = safeJsonParse(job.labor_timesheets, []);
      const laborTimesheets = allTimesheets.filter(ts => ts.labor_id);
      const leadLaborTimesheets = allTimesheets.filter(ts => ts.lead_labor_id);

      // Calculate totals for labor timesheets
      let totalLaborHours = 0;
      let totalLaborCost = 0;
      const laborSummary = {};

      laborTimesheets.forEach(timesheet => {
        const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
        const cost = parseFloat(timesheet.total_cost) || (hours * (parseFloat(timesheet.hourly_rate) || 0));
        
        totalLaborHours += hours;
        totalLaborCost += cost;

        if (!laborSummary[timesheet.labor_id]) {
          laborSummary[timesheet.labor_id] = {
            labor_id: timesheet.labor_id,
            labor_name: timesheet.labor_name,
            total_hours: 0,
            total_cost: 0,
            days_worked: 0
          };
        }

        laborSummary[timesheet.labor_id].total_hours += hours;
        laborSummary[timesheet.labor_id].total_cost += cost;
        laborSummary[timesheet.labor_id].days_worked += 1;
      });

      // Calculate totals for lead labor timesheets
      let totalLeadLaborHours = 0;
      let totalLeadLaborCost = 0;
      const leadLaborSummary = {};

      leadLaborTimesheets.forEach(timesheet => {
        const hours = Job.timeToHours(timesheet.work_hours || timesheet.total_hours);
        const cost = parseFloat(timesheet.total_cost) || (hours * (parseFloat(timesheet.hourly_rate) || 0));
        
        totalLeadLaborHours += hours;
        totalLeadLaborCost += cost;

        if (!leadLaborSummary[timesheet.lead_labor_id]) {
          leadLaborSummary[timesheet.lead_labor_id] = {
            lead_labor_id: timesheet.lead_labor_id,
            labor_name: timesheet.labor_name,
            total_hours: 0,
            total_cost: 0,
            days_worked: 0
          };
        }

        leadLaborSummary[timesheet.lead_labor_id].total_hours += hours;
        leadLaborSummary[timesheet.lead_labor_id].total_cost += cost;
        leadLaborSummary[timesheet.lead_labor_id].days_worked += 1;
      });

      return {
        job_id: jobId,
        summary: {
          total_labor_hours: Job.hoursToTime(totalLaborHours),
          total_lead_labor_hours: Job.hoursToTime(totalLeadLaborHours),
          total_hours: Job.hoursToTime(totalLaborHours + totalLeadLaborHours),
          total_labor_cost: totalLaborCost.toFixed(2),
          total_lead_labor_cost: totalLeadLaborCost.toFixed(2),
          total_cost: (totalLaborCost + totalLeadLaborCost).toFixed(2)
        },
        labor_breakdown: Object.values(laborSummary).map(labor => ({
          ...labor,
          total_hours: Job.hoursToTime(labor.total_hours),
          total_cost: labor.total_cost.toFixed(2)
        })),
        lead_labor_breakdown: Object.values(leadLaborSummary).map(labor => ({
          ...labor,
          total_hours: Job.hoursToTime(labor.total_hours),
          total_cost: labor.total_cost.toFixed(2)
        })),
        all_timesheets: {
          labor: laborTimesheets,
          lead_labor: leadLaborTimesheets
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getProjectSummary(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      let materialsCost = 0;
      if (job.assigned_materials && job.assigned_materials.length > 0) {
        materialsCost = job.assigned_materials.reduce((total, material) => {
          const quantity = material.stock_quantity || 0;
          const unitCost = parseFloat(material.unit_cost) || 0;
          return total + (quantity * unitCost);
        }, 0);
      }

      let laborCost = 0;
      if (job.assigned_labor && job.assigned_labor.length > 0) {
        laborCost = job.assigned_labor.reduce((total, labor) => {
          const hourlyRate = parseFloat(labor.hourly_rate) || 0;
          const hoursWorked = parseFloat(labor.hours_worked) || 0;
          return total + (hourlyRate * hoursWorked);
        }, 0);
      }

      if (job.custom_labor && job.custom_labor.length > 0) {
        const customLaborCost = job.custom_labor.reduce((total, labor) => {
          const hourlyRate = parseFloat(labor.hourly_rate) || 0;
          const hoursWorked = parseFloat(labor.hours_worked) || 0;
          return total + (hourlyRate * hoursWorked);
        }, 0);
        laborCost += customLaborCost;
      }

      const actualProjectCost = materialsCost + laborCost;


      const jobEstimate = parseFloat(job.estimated_cost) || 0;

      return {
        jobId: job.id,
        jobTitle: job.job_title,
        projectSummary: {
          jobEstimate: jobEstimate,
          materialsCost: materialsCost,
          laborCost: laborCost,
          actualProjectCost: actualProjectCost
        },
        costBreakdown: {
          materials: {
            totalCost: materialsCost,
            items: job.assigned_materials || [],
            count: job.assigned_materials ? job.assigned_materials.length : 0
          },
          labor: {
            totalCost: laborCost,
            regularLabor: job.assigned_labor || [],
            customLabor: job.custom_labor || [],
            totalWorkers: (job.assigned_labor ? job.assigned_labor.length : 0) + (job.custom_labor ? job.custom_labor.length : 0)
          }
        },
        workTracking: {
          workActivity: job.work_activity || 0,
          totalWorkTime: job.total_work_time || '00:00:00',
          startTimer: job.start_timer,
          endTimer: job.end_timer,
          pauseTimer: safeJsonParse(job.pause_timer, [])
        }
      };
    } catch (error) {
      throw error;
    }
  }


  static async getJobDashboard(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }


      let totalHoursWorked = 0;
      if (job.assigned_labor && job.assigned_labor.length > 0) {
        totalHoursWorked = job.assigned_labor.reduce((total, labor) => {
          return total + (parseFloat(labor.hours_worked) || 0);
        }, 0);
      }


      if (job.custom_labor && job.custom_labor.length > 0) {
        const customHours = job.custom_labor.reduce((total, labor) => {
          return total + (parseFloat(labor.hours_worked) || 0);
        }, 0);
        totalHoursWorked += customHours;
      }


      let totalMaterialUsed = 0;
      if (job.assigned_materials && job.assigned_materials.length > 0) {
        totalMaterialUsed = job.assigned_materials.length; // Count of assigned materials
      }


      let totalLabourEntries = 0;
      if (job.assigned_labor) {
        totalLabourEntries += job.assigned_labor.length;
      }
      if (job.custom_labor) {
        totalLabourEntries += job.custom_labor.length;
      }


      const numberOfInvoices = 0;

      return {
        jobId: job.id,
        jobTitle: job.job_title,
        jobStatus: job.status,
        jobPriority: job.priority,
        dashboardMetrics: {
          totalHoursWorked: {
            value: totalHoursWorked,
            unit: "hours",
            color: "blue"
          },
          totalMaterialUsed: {
            value: totalMaterialUsed,
            unit: "items",
            color: "green"
          },
          totalLabourEntries: {
            value: totalLabourEntries,
            unit: "entries",
            color: "purple"
          },
          numberOfInvoices: {
            value: numberOfInvoices,
            unit: "invoices",
            color: "orange"
          }
        },
        workTracking: {
          workActivity: job.work_activity || 0,
          totalWorkTime: job.total_work_time || '00:00:00',
          startTimer: job.start_timer,
          endTimer: job.end_timer,
          pauseTimer: safeJsonParse(job.pause_timer, [])
        },
        jobDetails: {
          jobType: job.job_type,
          estimatedHours: job.estimated_hours || 0,
          estimatedCost: job.estimated_cost || 0,
          dueDate: job.due_date,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        }
      };
    } catch (error) {
      throw error;
    }
  }


  static async checkJobRelationships(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const relationships = [];


      const { data: laborData, error: laborError } = await supabase
        .from('labor')
        .select('id, user_id, labor_code')
        .eq('job_id', jobId)
        .limit(1);

      if (!laborError && laborData && laborData.length > 0) {
        relationships.push({
          table: 'labor',
          count: laborData.length,
          message: 'This job has assigned labor workers'
        });
      }


      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, product_name')
        .eq('job_id', jobId)
        .limit(1);

      if (!productsError && productsData && productsData.length > 0) {
        relationships.push({
          table: 'products',
          count: productsData.length,
          message: 'This job has assigned materials/products'
        });
      }


      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select('id, estimate_title')
        .eq('job_id', jobId)
        .limit(1);

      if (!estimatesError && estimatesData && estimatesData.length > 0) {
        relationships.push({
          table: 'estimates',
          count: estimatesData.length,
          message: 'This job has associated estimates'
        });
      }


      const { data: transactionsData, error: transactionsError } = await supabase
        .from('job_transactions')
        .select('id, invoice_type')
        .eq('job_id', jobId)
        .limit(1);

      if (!transactionsError && transactionsData && transactionsData.length > 0) {
        relationships.push({
          table: 'job_transactions',
          count: transactionsData.length,
          message: 'This job has associated transactions/invoices'
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
}