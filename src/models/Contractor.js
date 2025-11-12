import { supabase } from "../config/database.js";

export class Contractor {
  static async create(contractorData) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .insert([contractorData])
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
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

  static async findById(contractorId) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("id", contractorId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("email", email)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getContractorStatistics(contractorId) {
    try {
     
      const { count: totalJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractorId);

      if (jobsError) {
        console.error("Error fetching jobs count:", jobsError);
      }

      
      const { data: jobsData, error: jobsDataError } = await supabase
        .from("jobs")
        .select("estimated_cost")
        .eq("contractor_id", contractorId);

      if (jobsDataError) {
        console.error("Error fetching jobs data:", jobsDataError);
      }

     
      let totalCost = 0;
      let totalEstimatedCost = 0;
      
      if (jobsData) {
        totalCost = jobsData.reduce((sum, job) => {
          return sum + (parseFloat(job.estimated_cost) || 0);
        }, 0);
        
        totalEstimatedCost = jobsData.reduce((sum, job) => {
          return sum + (parseFloat(job.estimated_cost) || 0);
        }, 0);
      }

      
      const { count: totalEstimates, error: estimatesError } = await supabase
        .from("estimates")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", contractorId);

      if (estimatesError) {
        console.error("Error fetching estimates count:", estimatesError);
      }


      const { data: estimatesData, error: estimatesDataError } = await supabase
        .from("estimates")
        .select("total_amount")
        .eq("contractor_id", contractorId);

      if (estimatesDataError) {
        console.error("Error fetching estimates data:", estimatesDataError);
      }

      let totalEstimateAmount = 0;
      if (estimatesData) {
        totalEstimateAmount = estimatesData.reduce((sum, estimate) => {
          return sum + (parseFloat(estimate.total_amount) || 0);
        }, 0);
      }


      const { data: jobsByStatus, error: statusError } = await supabase
        .from("jobs")
        .select("status")
        .eq("contractor_id", contractorId);

      if (statusError) {
        console.error("Error fetching jobs by status:", statusError);
      }

      let jobsByStatusCount = {};
      if (jobsByStatus) {
        jobsByStatusCount = jobsByStatus.reduce((acc, job) => {
          const status = job.status || 'unknown';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
      }

      return {
        total_jobs: totalJobs || 0,
        total_estimated_cost: totalEstimatedCost,
        jobs_by_status: jobsByStatusCount
      };
    } catch (error) {
      console.error("Error in getContractorStatistics:", error);
      return {
        total_jobs: 0,
        total_estimated_cost: 0,
        jobs_by_status: {}
      };
    }
  }

  static async findByJobId(jobId) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("job_id", jobId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, pagination = {}) {
    try {
      let query = supabase
        .from("contractors")
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
          )
        `, { count: 'exact' });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.job_id) {
        query = query.eq("job_id", filters.job_id);
      }
      if (filters.search) {
        query = query.or(`contractor_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
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

      return {
        contractors: data || [],
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(contractorId, updateData) {
    try {
      const { data, error } = await supabase
        .from("contractors")
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq("id", contractorId)
        .select(`
          *,
          created_by_user:users!contractors_created_by_fkey(
            id,
            full_name,
            email
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

  static async delete(contractorId) {
    try {
      const { error } = await supabase
        .from("contractors")
        .delete()
        .eq("id", contractorId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
      const { data: totalContractors, error: totalError } = await supabase
        .from("contractors")
        .select("id", { count: 'exact' });

      if (totalError) {
        throw new Error(`Database error: ${totalError.message}`);
      }

      const { data: activeContractors, error: activeError } = await supabase
        .from("contractors")
        .select("id", { count: 'exact' })
        .eq("status", "active");

      if (activeError) {
        throw new Error(`Database error: ${activeError.message}`);
      }

      const { data: inactiveContractors, error: inactiveError } = await supabase
        .from("contractors")
        .select("id", { count: 'exact' })
        .eq("status", "inactive");

      if (inactiveError) {
        throw new Error(`Database error: ${inactiveError.message}`);
      }

      const total = totalContractors?.length || 0;
      const active = activeContractors?.length || 0;
      const inactive = inactiveContractors?.length || 0;

      return {
        total,
        active,
        inactive,
        activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : "0.0",
        inactivePercentage: total > 0 ? ((inactive / total) * 100).toFixed(1) : "0.0"
      };
    } catch (error) {
      throw error;
    }
  }

  static async checkContractorRelationships(contractorId) {
    try {
      if (!contractorId) {
        throw new Error('Contractor ID is required');
      }

      const relationships = [];

   
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_title')
        .eq('contractor_id', contractorId)
        .limit(1);

      if (!jobsError && jobsData && jobsData.length > 0) {
        relationships.push({
          table: 'jobs',
          count: jobsData.length,
          message: 'This contractor has associated jobs'
        });
      }

   
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('contractor_id', contractorId)
        .limit(1);

      if (!ordersError && ordersData && ordersData.length > 0) {
        relationships.push({
          table: 'orders',
          count: ordersData.length,
          message: 'This contractor has associated orders'
        });
      }

     
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select('id, estimate_title')
        .eq('contractor_id', contractorId)
        .limit(1);

      if (!estimatesError && estimatesData && estimatesData.length > 0) {
        relationships.push({
          table: 'estimates',
          count: estimatesData.length,
          message: 'This contractor has associated estimates'
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

  static async getContractorListing(filters, pagination) {
    try {
      console.log('Getting contractor listing with jobs...');
      
      let query = supabase
        .from("contractors")
        .select(`
          id,
          contractor_name,
          company_name,
          email,
          phone,
          status,
          created_at
        `, { count: 'exact' });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.search) {
        query = query.or(`contractor_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }

      if (pagination.page && pagination.limit) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data: contractors, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const contractorsWithJobs = await Promise.all(
        (contractors || []).map(async (contractor) => {
          try {
            const { data: jobs, error: jobsError } = await supabase
              .from("jobs")
              .select(`
                *,
                customer:customers!jobs_customer_id_fkey(
                  id,
                  customer_name,
                  company_name,
                  email,
                  phone
                )
              `)
              .eq("contractor_id", contractor.id)
              .order('created_at', { ascending: false });

            if (jobsError) {
              console.error(`Error fetching jobs for contractor ${contractor.id}:`, jobsError);
              return {
                ...contractor,
                jobs: [],
                total_jobs: 0,
                active_jobs: 0,
                completed_jobs: 0
              };
            }

            const jobsByAddress = {};
            const groupedJobs = [];

            (jobs || []).forEach(job => {
              const addressKey = job.address || 'No Address';
              
              if (!jobsByAddress[addressKey]) {
             
                jobsByAddress[addressKey] = {
                  ...job, 
                  isMainJob: true,
                  isSubJob: false,
                  parentJobId: null,
                  parentAddress: null,
                  subJobs: []
                };
                groupedJobs.push(jobsByAddress[addressKey]);
              } else {
               
                jobsByAddress[addressKey].subJobs.push({
                  ...job, 
                  isMainJob: false,
                  isSubJob: true,
                  parentJobId: jobsByAddress[addressKey].id,
                  parentAddress: addressKey,
                  subJobs: [] 
                });
              }
            });

            
            const jobsWithProgress = groupedJobs.map(mainJob => {
              const totalJobs = 1 + mainJob.subJobs.length; 
              const completedJobs = (mainJob.status === 'completed' ? 1 : 0) + 
                                   mainJob.subJobs.filter(job => job.status === 'completed').length;
              const progress = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
              
              
              const mainJobCost = parseFloat(mainJob.estimated_cost) || 0;
              const subJobsCost = mainJob.subJobs.reduce((sum, job) => sum + (parseFloat(job.estimated_cost) || 0), 0);
              const totalEstimatedCost = mainJobCost + subJobsCost;
              
              const mainJobHours = parseFloat(mainJob.estimated_hours) || 0;
              const subJobsHours = mainJob.subJobs.reduce((sum, job) => sum + (parseFloat(job.estimated_hours) || 0), 0);
              const totalEstimatedHours = mainJobHours + subJobsHours;
              
              return {
                ...mainJob,
                progress,
                totalSubJobs: mainJob.subJobs.length,
                totalJobs: totalJobs,
                completedSubJobs: completedJobs - (mainJob.status === 'completed' ? 1 : 0),
                completedJobs: completedJobs,
                status: progress === 100 ? 'completed' : progress > 0 ? 'ongoing' : 'pending',
                totalEstimatedCost,
                totalEstimatedHours
              };
            });

            return {
              ...contractor,
              jobs: jobsWithProgress,
              total_jobs: jobs?.length || 0,
              active_jobs: jobs?.filter(j => j.status === 'active' || j.status === 'in_progress').length || 0,
              completed_jobs: jobs?.filter(j => j.status === 'completed').length || 0
            };
          } catch (error) {
            console.error(`Error processing contractor ${contractor.id}:`, error);
            return {
              ...contractor,
              jobs: [],
              total_jobs: 0,
              active_jobs: 0,
              completed_jobs: 0
            };
          }
        })
      );

      return {
        contractors: contractorsWithJobs,
        total: count || 0,
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalPages: pagination.limit ? Math.ceil((count || 0) / pagination.limit) : 1
      };
    } catch (error) {
      console.error('Error in getContractorListing:', error);
      throw error;
    }
  }

  static async getJobDetails(jobId) {
    try {
      
      const { data: job, error: jobError } = await supabase
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
            company_name
          )
        `)
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      let progress = 0;
      if (job.status === 'completed') progress = 100;
      else if (job.status === 'in_progress') progress = 75;
      else if (job.status === 'active') progress = 25;
      else progress = 0;

      const { data: materials, error: materialsError } = await supabase
        .from("products")
        .select(`
          id,
          product_name,
          jdp_sku,
          supplier_sku,
          stock_quantity,
          jdp_price,
          unit,
          status,
          supplier_id,
          suppliers!products_supplier_id_fkey(
            company_name
          )
        `)
        .eq("job_id", jobId)
        .eq("status", "active");

      if (materialsError) {
        console.error('Error fetching materials:', materialsError);
      }

      const materialsFormatted = (materials || []).map(material => ({
        id: material.id,
        sku: material.jdp_sku || material.supplier_sku || `PROD-${material.id}`,
        item_name: material.product_name,
        ordered: material.stock_quantity || 0,
        used: material.stock_quantity || 0, 
        unit_price: parseFloat(material.jdp_price) || 0,
        total_cost: (material.stock_quantity || 0) * (parseFloat(material.jdp_price) || 0),
        status: "Received",
        supplier: material.suppliers?.company_name || "Unknown"
      }));

      const totalMaterialsCost = materialsFormatted.reduce((sum, material) => sum + material.total_cost, 0);

      let timesheetFormatted = [];
      let totalLaborCost = 0;
      let totalHours = 0;

      if (job.labor_timesheets && job.labor_timesheets.length > 0) {
        try {
          const timesheetData = typeof job.labor_timesheets === 'string' 
            ? JSON.parse(job.labor_timesheets) 
            : job.labor_timesheets;

          console.log('Parsed labor timesheet data:', timesheetData);

          const laborEntries = timesheetData.map(entry => {
            const hours = parseFloat(entry.work_hours || entry.total_hours || 0);
            const rate = parseFloat(entry.hourly_rate || 0);
            const total = hours * rate;
            
            totalHours += hours;
            totalLaborCost += total;

            return {
              labor_id: entry.labor_id,
              labor_name: entry.labor_name || "Unknown",
              date: entry.date || new Date().toISOString().split('T')[0],
              hours: hours,
              rate: rate,
              total: total,
              status: entry.status || "Approved",
              work_activity: entry.work_activity || 0,
              notes: entry.notes || ""
            };
          });

          timesheetFormatted = [...timesheetFormatted, ...laborEntries];
        } catch (parseError) {
          console.error('Error parsing labor timesheets:', parseError);
        }
      }

      if (job.lead_labor_timesheets && job.lead_labor_timesheets.length > 0) {
        try {
          const leadTimesheetData = typeof job.lead_labor_timesheets === 'string' 
            ? JSON.parse(job.lead_labor_timesheets) 
            : job.lead_labor_timesheets;

          console.log('Parsed lead labor timesheet data:', leadTimesheetData);

          const leadEntries = leadTimesheetData.map(entry => {
            const hours = parseFloat(entry.work_hours || entry.total_hours || 0);
            const rate = parseFloat(entry.hourly_rate || 0);
            const total = hours * rate;
            
            totalHours += hours;
            totalLaborCost += total;

            return {
              labor_id: entry.lead_labor_id,
              labor_name: entry.labor_name || "Unknown Lead Labor",
              date: entry.date || new Date().toISOString().split('T')[0],
              hours: hours,
              rate: rate,
              total: total,
              status: entry.status || "Approved",
              work_activity: entry.work_activity || 0,
              notes: entry.notes || "",
              is_lead_labor: true
            };
          });

          timesheetFormatted = [...timesheetFormatted, ...leadEntries];
        } catch (parseError) {
          console.error('Error parsing lead labor timesheets:', parseError);
        }
      }

      if (timesheetFormatted.length === 0) {
        const { data: laborData, error: laborError } = await supabase
          .from("labor")
          .select(`
            id,
            labor_code,
            trade,
            experience,
            hourly_rate,
            hours_worked,
            user_id,
            users!labor_user_id_fkey(
              full_name
            )
          `)
          .eq("job_id", jobId);

        if (!laborError && laborData && laborData.length > 0) {
          timesheetFormatted = laborData.map(labor => {
            const hours = parseFloat(labor.hours_worked) || 0;
            const rate = parseFloat(labor.hourly_rate) || 0;
            const total = hours * rate;
            
            totalHours += hours;
            totalLaborCost += total;

            return {
              labor_id: labor.id,
              labor_name: labor.users?.full_name || "Unknown",
              date: new Date().toISOString().split('T')[0],
              hours: hours,
              rate: rate,
              total: total,
              status: "Approved"
            };
          });
        }
      }


      const { data: estimates, error: estimatesError } = await supabase
        .from("estimates")
        .select(`
          id,
          estimate_title,
          total_amount,
          status,
          created_at,
          issue_date,
          due_date
        `)
        .eq("job_id", jobId);

      if (estimatesError) {
        console.error('Error fetching estimates:', estimatesError);
      }

      const transactionsFormatted = (estimates || []).map(estimate => ({
        type: "Estimate",
        description: estimate.estimate_title || "Job Estimate",
        date: estimate.issue_date ? estimate.issue_date.split('T')[0] : estimate.created_at.split('T')[0],
        amount: parseFloat(estimate.total_amount) || 0,
        status: estimate.status === 'accepted' ? 'Completed' : 
                estimate.status === 'sent' ? 'Sent' : 
                estimate.status === 'draft' ? 'Draft' : 'Pending',
        due_date: estimate.due_date ? estimate.due_date.split('T')[0] : null
      }));

      let leadLabor = null;
      let staffAssigned = [];

      if (job.assigned_lead_labor_ids) {
        try {
          const leadLaborIds = JSON.parse(job.assigned_lead_labor_ids);
          if (Array.isArray(leadLaborIds) && leadLaborIds.length > 0) {
            const { data: leadLaborData } = await supabase
              .from("lead_labor")
              .select(`
                id,
                users!lead_labor_user_id_fkey(
                  full_name
                )
              `)
              .eq("id", leadLaborIds[0])
              .single();
            
            if (leadLaborData && leadLaborData.users) {
              leadLabor = leadLaborData.users.full_name;
            }
          }
        } catch (error) {
          console.error('Error parsing lead labor IDs:', error);
        }
      }

      if (job.assigned_labor_ids) {
        try {
          const laborIds = JSON.parse(job.assigned_labor_ids);
          if (Array.isArray(laborIds) && laborIds.length > 0) {
            const { data: staffData } = await supabase
              .from("labor")
              .select(`
                id,
                users!labor_user_id_fkey(
                  full_name
                )
              `)
              .in("id", laborIds);

            if (staffData && staffData.length > 0) {
              staffAssigned = staffData
                .filter(staff => staff.users)
                .map(staff => staff.users.full_name);
            }
          }
        } catch (error) {
          console.error('Error parsing labor IDs:', error);
        }
      }

      if (!leadLabor && timesheetFormatted.length > 0) {
        const leadLaborEntry = timesheetFormatted.find(entry => entry.labor_name && entry.labor_name !== "Unknown");
        if (leadLaborEntry) {
          leadLabor = leadLaborEntry.labor_name;
        }
      }

      let createdByUser = null;
      if (job.created_by) {
        const { data: userData } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("id", job.created_by)
          .single();
        
        if (userData) {
          createdByUser = userData.full_name;
        }
      }

      return {
        job: {
          ...job,
          progress,
          customer_name: job.customer?.customer_name || job.customer?.company_name || "Unknown",
          contractor_name: job.contractor?.contractor_name || job.contractor?.company_name || "Unknown"
        },
        materials: {
          items: materialsFormatted,
          total_cost: totalMaterialsCost
        },
        timesheet: {
          entries: timesheetFormatted,
          total_hours: totalHours,
          total_amount: totalLaborCost
        },
        financial_transactions: transactionsFormatted,
        team_assignment: {
          lead_labor: leadLabor,
          staff_assigned: staffAssigned
        },
        job_metadata: {
          created_by: createdByUser,
          admin_assigned: "System Admin", 
          priority: job.priority,
          created_on: job.created_at.split('T')[0]
        },
        estimation_details: {
          estimated_hours: parseFloat(job.estimated_hours) || 0,
          estimated_cost: parseFloat(job.estimated_cost) || 0,
          actual_hours: totalHours,
          actual_cost: totalLaborCost + totalMaterialsCost,
          cost_difference: (totalLaborCost + totalMaterialsCost) - (parseFloat(job.estimated_cost) || 0),
          hours_difference: totalHours - (parseFloat(job.estimated_hours) || 0)
        }
      };
    } catch (error) {
      console.error('Error in getJobDetails:', error);
      throw error;
    }
  }

}
