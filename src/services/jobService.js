import { Job } from "../models/Job.js";
import { LaborTimesheet } from "../models/LaborTimesheet.js";
import { successResponse } from "../helpers/responseHelper.js";
import { supabase } from "../config/database.js";

export class JobService {
  static async createJob(jobData, createdByUserId) {
    try {
      const status = 'pending';

      const jobWithCreator = {
        ...jobData,
        status,
        created_by: createdByUserId
      };

      const job = await Job.create(jobWithCreator);

      return successResponse(
        job,
        "Job created successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async searchTimesheets(filters, pagination) {
    try {
      const result = await Job.searchTimesheets(filters, pagination);
      return successResponse(result, "Timesheets searched successfully");
    } catch (error) {
      throw error;
    }
  }

  static async searchJobs(searchText, pagination) {
    try {
      const result = await Job.search(searchText, pagination);
      return successResponse(
        {
          jobs: result.jobs,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Jobs searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobTypes() {
    try {
      const types = await Job.getDistinctJobTypes();
      return successResponse(types, "Job types retrieved successfully");
    } catch (error) {
      throw error;
    }
  }

  static async searchMyJobs(user, searchText, pagination) {
    try {
      const result = await Job.searchMyJobs(user, searchText, pagination);
      return successResponse(
        {
          jobs: result.jobs,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "My jobs searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobTypes() {
    try {
      const result = await Job.getDistinctJobTypes();
      return successResponse(result, "Job types retrieved successfully");
    } catch (error) {
      throw error;
    }
  }

  static async getJobs(filters, pagination) {
    try {
      const result = await Job.findAll(filters, pagination);

      return successResponse(
        {
          jobs: result.jobs,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Jobs retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobBluesheets(jobId) {
    try {
      if (!jobId) {
        throw new Error("Job ID is required");
      }

      console.time('Labor timesheet query time');
      const timesheets = await LaborTimesheet.findByJobId(jobId);
      console.timeEnd('Labor timesheet query time');

      console.time('Orders query time');
      const orders = await Job.fetchOrdersDetails(jobId);
      console.timeEnd('Orders query time');

      return {
        success: true,
        message: "Job labor timesheets and orders retrieved successfully",
        data: {
          labor_timesheets: timesheets ?? [],
          orders: orders ?? []
        },
        statusCode: 200
      };
    } catch (error) {
      throw error;
    }
  }

  static async getJobById(jobId) {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          id,
          job_title,
          job_type,
          description,
          status,
          priority,
          customer_id,
          contractor_id,
          estimated_cost,
          created_at,
          updated_at
        `)
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) {
        throw new Error(`Database error: ${jobError.message}`);
      }

      if (!jobData) {
        throw new Error("Job not found");
      }

      // Optimize: Add computed fields without async processing (just copy existing values)
      // These are already present in the data, so no need for Promise.all or async mapping
      if (Array.isArray(job.bluesheets)) {
        job.bluesheets = job.bluesheets.map((bluesheet) => {
          const sheet = { ...bluesheet };
          if (Array.isArray(sheet.labor_entries)) {
            sheet.labor_entries = sheet.labor_entries.map((entry) => {
              return {
                ...entry,
                computed_total_cost: entry.total_cost ?? null,
                computed_hourly_rate: entry.hourly_rate ?? null
              };
            });
          }
          return sheet;
        });
      }

      return successResponse(
        job,
        "Job retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateJob(jobId, updateData) {
    try {
      const updatedJob = await Job.update(jobId, updateData);

      if (!updatedJob) {
        throw new Error("Job not found");
      }

      return successResponse(
        updatedJob,
        "Job updated successfully"
      );
    } catch (error) {
      // Pass through validation errors (customer/contractor not found) directly
      if (error.message.includes("Customer with ID") || 
          error.message.includes("Contractor with ID") ||
          error.message.includes("does not exist") ||
          error.message.includes("constraint violation")) {
        throw error; // Re-throw validation/constraint errors as-is
      }
      
      // Handle job not found errors
      if (error.message.includes("Job not found") || error.message.includes("PGRST116")) {
        throw new Error("Job not found");
      }
      
      // Handle database errors
      if (error.message.includes("Database error")) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      // Re-throw any other errors
      throw error;
    }
  }

  static async deleteJob(jobId) {
    try {
      const existingJob = await Job.findById(jobId);
      if (!existingJob) {
        throw new Error("Job not found");
      }

      const relationshipCheck = await Job.checkJobRelationships(jobId);
      
      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this job because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

      await Job.delete(jobId);

      return successResponse(
        null,
        "Job deleted successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobStats() {
    try {
      const stats = await Job.getStats();

      return successResponse(
        stats,
        "Job statistics retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }


  static async getJobsByCustomer(customerId) {
    try {
      const jobs = await Job.findByCustomerId(customerId);

      return successResponse(
        jobs,
        "Customer jobs retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByContractor(contractorId) {
    try {
      const jobs = await Job.findByContractorId(contractorId);

      return successResponse(
        jobs,
        "Contractor jobs retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobDashboardDetails(jobId) {
    try {
      const jobDetails = await Job.getJobDashboardDetails(jobId);
      if (!jobDetails) {
        throw new Error("Job not found");
      }

      return successResponse(
        jobDetails,
        "Job dashboard details retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByLabor(laborId, page = 1, limit = 10) {
    try {
      const result = await Job.getJobsByLabor(laborId, page, limit);
      return successResponse(
        result,
        "Jobs by labor retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getJobsByLeadLabor(leadLaborId, page = 1, limit = 10) {
    try {
      const result = await Job.getJobsByLeadLabor(leadLaborId, page, limit);
      return successResponse(
        result,
        "Jobs by lead labor retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getTodayJobsByLeadLabor(leadLaborId, page = 1, limit = 10) {
    try {
      const result = await Job.getTodayJobsByLeadLabor(leadLaborId, page, limit);
      return successResponse(
        result,
        "Today's jobs by lead labor retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static parseDurationToSeconds(duration) {
    if (!duration || typeof duration !== 'string') {
      return 0;
    }

    if (duration.includes(':')) {
      const parts = duration.split(':').map((part) => parseInt(part, 10) || 0);
      const [hours = 0, minutes = 0, seconds = 0] = parts;
      return (hours * 3600) + (minutes * 60) + seconds;
    }

    let totalSeconds = 0;
    const hourMatch = duration.match(/(\d+)\s*h/);
    const minuteMatch = duration.match(/(\d+)\s*m/);
    const secondMatch = duration.match(/(\d+)\s*s/);

    if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    if (minuteMatch) totalSeconds += parseInt(minuteMatch[1], 10) * 60;
    if (secondMatch) totalSeconds += parseInt(secondMatch[1], 10);

    return totalSeconds;
  }

  static formatSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  static async getJobActivity(jobId) {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          id,
          job_title,
          job_type,
          description,
          status,
          priority,
          customer_id,
          contractor_id,
          estimated_cost,
          due_date,
          created_at,
          updated_at,
          created_by_user:users!jobs_created_by_fkey (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) {
        throw new Error(`Database error: ${jobError.message}`);
      }

      if (!jobData) {
        throw new Error("Job not found");
      }

      const ordersQuery = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId);

      if (ordersQuery.error) {
        throw new Error(`Database error: ${ordersQuery.error.message}`);
      }
      const totalOrders = ordersQuery.count || 0;

      const { data: bluesheets, error: bluesheetsError } = await supabase
        .from('job_bluesheet')
        .select('id')
        .eq('job_id', jobId);

      if (bluesheetsError) {
        throw new Error(`Database error: ${bluesheetsError.message}`);
      }

      let totalRegularSeconds = 0;

      if (bluesheets && bluesheets.length > 0) {
        const bluesheetIds = bluesheets.map((sheet) => sheet.id);

      const { data: laborEntries, error: laborError } = await supabase
          .from('job_bluesheet_labor')
          .select('regular_hours')
          .in('job_bluesheet_id', bluesheetIds);

        if (laborError) {
          throw new Error(`Database error: ${laborError.message}`);
        }

        (laborEntries || []).forEach((entry) => {
          totalRegularSeconds += JobService.parseDurationToSeconds(entry.regular_hours);
        });
      }

      return successResponse(
        {
          job: {
            id: jobData.id,
            job_title: jobData.job_title,
            job_type: jobData.job_type,
            description: jobData.description,
            status: jobData.status,
            priority: jobData.priority,
            customer_id: jobData.customer_id,
            contractor_id: jobData.contractor_id,
            estimated_cost: jobData.estimated_cost,
            due_date: jobData.due_date,
            created_at: jobData.created_at,
            updated_at: jobData.updated_at,
            created_by_user: jobData.created_by_user
              ? {
                  id: jobData.created_by_user.id,
                  full_name: jobData.created_by_user.full_name,
                  email: jobData.created_by_user.email,
                  role: jobData.created_by_user.role
                }
              : null
          },
          total_orders: totalOrders,
          regular_hours: {
            total_seconds: totalRegularSeconds,
            formatted: JobService.formatSeconds(totalRegularSeconds)
          }
        },
        "Job activity retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }
}
