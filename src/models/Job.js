import { supabase } from "../config/database.js";

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
          jdp_price,
          stock_quantity,
          unit,
          supplier_id,
          supplier:suppliers!products_supplier_id_fkey(
            id,
            company_name,
            contact_person
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

  static async addDetailsToJob(job) {
    const jobWithDetails = { ...job };
    
    if (job.assigned_lead_labor_ids) {
      try {
        const leadLaborIds = JSON.parse(job.assigned_lead_labor_ids);
        jobWithDetails.assigned_lead_labor = await Job.fetchLeadLaborDetails(leadLaborIds);
      } catch (error) {
        jobWithDetails.assigned_lead_labor = [];
      }
    } else {
      jobWithDetails.assigned_lead_labor = [];
    }

    if (job.assigned_labor_ids) {
      try {
        const laborIds = JSON.parse(job.assigned_labor_ids);
        jobWithDetails.assigned_labor = await Job.fetchLaborDetails(laborIds);
      } catch (error) {
        jobWithDetails.assigned_labor = [];
      }
    } else {
      jobWithDetails.assigned_labor = [];
    }

    // Fetch materials by job_id instead of assigned_material_ids
    jobWithDetails.assigned_materials = await Job.fetchMaterialsDetails(job.id);

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

      // Get all jobs and filter by labor ID
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

      // Filter jobs by labor ID
      const filteredJobs = (allJobs || []).filter(job => {
        try {
          const laborIds = JSON.parse(job.assigned_labor_ids || '[]');
          return laborIds.includes(parseInt(laborId));
        } catch (e) {
          return false;
        }
      });

      // Apply pagination
      const paginatedJobs = filteredJobs.slice(offset, offset + limit);

      // Add details to each job
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

      // Get all jobs and filter by lead labor ID
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

      // Filter jobs by lead labor ID
      const filteredJobs = (allJobs || []).filter(job => {
        try {
          const leadLaborIds = JSON.parse(job.assigned_lead_labor_ids || '[]');
          return leadLaborIds.includes(parseInt(leadLaborId));
        } catch (e) {
          return false;
        }
      });

      // Apply pagination
      const paginatedJobs = filteredJobs.slice(offset, offset + limit);

      // Add details to each job
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

       const [transactions, timeLogs, materialUsage] = await Promise.all([
         Job.getJobTransactions(jobId),
         Job.getJobTimeLogs(jobId),
         Job.getJobMaterialUsage(jobId)
       ]);

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
           totalLabourEntries: 0, 
           numberOfInvoices: 0 
         },

         
         transactionHistory: transactions,

         
         materialUsage: {
           totalCost: 0,
           materials: materialUsage
         },

        
         laborSummary: {
           totalCost: 0,
           laborEntries: timeLogs,
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

       
       if (timeLogs && timeLogs.length > 0) {
         const laborCost = timeLogs.reduce((sum, log) => {
           return sum + (parseFloat(log.total_cost) || 0);
         }, 0);
         const totalHours = timeLogs.reduce((sum, log) => {
           return sum + (parseFloat(log.hours_worked) || 0);
         }, 0);
         
         dashboardData.projectSummary.laborCost = laborCost;
         dashboardData.laborSummary.totalCost = laborCost;
         dashboardData.keyMetrics.totalLabourEntries = timeLogs.length;
         dashboardData.keyMetrics.totalHoursWorked = totalHours;
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

   
   static async getJobTransactions(jobId) {
     try {
       const { data, error } = await supabase
         .from("job_transactions")
         .select("*")
         .eq("job_id", jobId)
         .order("created_at", { ascending: false });

       if (error) {
         throw new Error(`Database error: ${error.message}`);
       }

       return data || [];
     } catch (error) {
       throw error;
     }
   }

   
   static async getJobTimeLogs(jobId) {
     try {
       const { data, error } = await supabase
         .from("job_time_logs")
         .select("*")
         .eq("job_id", jobId)
         .order("work_date", { ascending: false });

       if (error) {
         throw new Error(`Database error: ${error.message}`);
       }

       return data || [];
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
 }