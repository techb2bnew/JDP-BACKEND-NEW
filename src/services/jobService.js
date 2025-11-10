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
      const job = await Job.findById(jobId);
      if (!job) {
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
}
