import { Job } from "../models/Job.js";
import { JobBluesheetLabor } from "../models/JobBluesheetLabor.js";
import { successResponse } from "../helpers/responseHelper.js";

export class JobService {
  static async createJob(jobData, createdByUserId) {
    try {
      const jobWithCreator = {
        ...jobData,
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

  static async getJobById(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error("Job not found");
      }

      // Add derived computed fields for labor entries without mutating DB
      const jobWithComputed = { ...job };
      if (Array.isArray(jobWithComputed.bluesheets)) {
        jobWithComputed.bluesheets = await Promise.all(
          jobWithComputed.bluesheets.map(async (bluesheet) => {
            const sheet = { ...bluesheet };
            if (Array.isArray(sheet.labor_entries)) {
              sheet.labor_entries = await Promise.all(
                sheet.labor_entries.map(async (entry) => {
                  const e = { ...entry };
                  try {
                    // Only compute if stored values are missing; otherwise preserve snapshot
                    if (e.total_cost == null || e.hourly_rate == null) {
                      const reg = e.regular_hours || '0h';
                      const ot = e.overtime_hours || '0h';
                      const regDec = JobBluesheetLabor.convertHoursToDecimal(reg);
                      const otDec = JobBluesheetLabor.convertHoursToDecimal(ot);
                      const computedCost = await JobBluesheetLabor.calculateDynamicCost(regDec, otDec);
                      const computedRate = await JobBluesheetLabor.getHourlyRateFromConfig(regDec);
                      e.computed_total_cost = computedCost;
                      e.computed_hourly_rate = computedRate;
                    } else {
                      e.computed_total_cost = e.total_cost;
                      e.computed_hourly_rate = e.hourly_rate;
                    }
                  } catch (_) {
                    e.computed_total_cost = null;
                    e.computed_hourly_rate = null;
                  }
                  return e;
                })
              );
            }
            return sheet;
          })
        );
      }

      return successResponse(
        jobWithComputed,
        "Job retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateJob(jobId, updateData) {
    try {
      const existingJob = await Job.findById(jobId);
      if (!existingJob) {
        throw new Error("Job not found");
      }

      const updatedJob = await Job.update(jobId, updateData);

      return successResponse(
        updatedJob,
        "Job updated successfully"
      );
    } catch (error) {
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
}
