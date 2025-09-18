import { Job } from "../models/Job.js";
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
}
