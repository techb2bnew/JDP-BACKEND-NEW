import { Job } from "../models/Job.js";
import { LaborTimesheet } from "../models/LaborTimesheet.js";
import { successResponse } from "../helpers/responseHelper.js";
import { supabase } from "../config/database.js";
import { NotificationService } from "./notificationService.js";

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

      return successResponse(
        job,
        "Job retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateJob(jobId, updateData, options = {}) {
    try {
      const performedByName = options.performedByName || null;

      const leadProvided = Object.prototype.hasOwnProperty.call(
        updateData,
        "assigned_lead_labor_ids"
      );
      const laborProvided = Object.prototype.hasOwnProperty.call(updateData, "assigned_labor_ids");
      const hasAssignmentUpdates = leadProvided || laborProvided;
      const statusProvided = Object.prototype.hasOwnProperty.call(updateData, "status");
      const normalizedStatus = statusProvided
        ? String(updateData.status || "")
            .trim()
            .toLowerCase()
        : null;
      const statusChangedToCompleted = normalizedStatus === "completed";

      const parseAssignedIds = (value) => {
        if (!value) {
          return [];
        }

        let arrValue = value;

        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
              arrValue = JSON.parse(trimmed);
            } catch (parseErr) {
              arrValue = trimmed
                .replace(/[\[\]\s"]/g, "")
                .split(",")
                .filter(Boolean);
            }
          } else {
            arrValue = trimmed
              .replace(/[\[\]\s"]/g, "")
              .split(",")
              .filter(Boolean);
          }
        }

        if (!Array.isArray(arrValue)) {
          return [];
        }

        const numericValues = arrValue
          .map((item) => {
            if (typeof item === "number" && Number.isFinite(item)) {
              return item;
            }
            if (typeof item === "string") {
              const parsed = parseInt(item, 10);
              return Number.isNaN(parsed) ? null : parsed;
            }
            return null;
          })
          .filter((val) => val !== null);

        return Array.from(new Set(numericValues));
      };

      const updatedJob = await Job.update(jobId, updateData);

      if (!updatedJob) {
        throw new Error("Job not found");
      }

      if (hasAssignmentUpdates || statusChangedToCompleted) {
        const resolvedLeadIdsSource = leadProvided
          ? updateData.assigned_lead_labor_ids ?? updatedJob.assigned_lead_labor_ids
          : updatedJob.assigned_lead_labor_ids;
        const resolvedLaborIdsSource = laborProvided
          ? updateData.assigned_labor_ids ?? updatedJob.assigned_labor_ids
          : updatedJob.assigned_labor_ids;

        const updatedLeadLaborIds = parseAssignedIds(resolvedLeadIdsSource);
        const updatedLaborIds = parseAssignedIds(resolvedLaborIdsSource);

        const normalizationPayload = {};
        if (leadProvided) {
          const normalizedLeadJson = JSON.stringify(updatedLeadLaborIds);
          if (normalizedLeadJson !== updatedJob.assigned_lead_labor_ids) {
            normalizationPayload.assigned_lead_labor_ids = normalizedLeadJson;
            updatedJob.assigned_lead_labor_ids = normalizedLeadJson;
          }
        }

        if (laborProvided) {
          const normalizedLaborJson = JSON.stringify(updatedLaborIds);
          if (normalizedLaborJson !== updatedJob.assigned_labor_ids) {
            normalizationPayload.assigned_labor_ids = normalizedLaborJson;
            updatedJob.assigned_labor_ids = normalizedLaborJson;
          }
        }

        if (hasAssignmentUpdates && Object.keys(normalizationPayload).length > 0) {
          const { error: normalizationError } = await supabase
            .from("jobs")
            .update(normalizationPayload)
            .eq("id", jobId);

          if (normalizationError) {
            console.error(
              "Failed to normalize assigned labor fields after update:",
              normalizationError.message
            );
          }
        }

        if (updatedLeadLaborIds.length > 0 || updatedLaborIds.length > 0) {
          const [leadLaborResult, laborResult] = await Promise.all([
            updatedLeadLaborIds.length > 0
              ? supabase
                  .from("lead_labor")
                  .select("id, labor_code, user_id")
                  .in("id", updatedLeadLaborIds)
              : Promise.resolve({ data: [], error: null }),
            updatedLaborIds.length > 0
              ? supabase.from("labor").select("id, labor_code, user_id").in("id", updatedLaborIds)
              : Promise.resolve({ data: [], error: null })
          ]);

          if (leadLaborResult.error) {
            throw new Error(`Database error: ${leadLaborResult.error.message}`);
          }

          if (laborResult.error) {
            throw new Error(`Database error: ${laborResult.error.message}`);
          }

          const userIdMeta = new Map();
          const userIdsToFetch = new Set();

          (leadLaborResult.data || []).forEach((leadLabor) => {
            if (leadLabor.user_id) {
              userIdMeta.set(leadLabor.user_id, {
                role: "lead_labor",
                fallback: leadLabor.labor_code || `Lead Labor ${leadLabor.id}`,
                name: null
              });
              userIdsToFetch.add(leadLabor.user_id);
            }
          });

          (laborResult.data || []).forEach((labor) => {
            if (labor.user_id) {
              userIdMeta.set(labor.user_id, {
                role: "labor",
                fallback: labor.labor_code || `Labor ${labor.id}`,
                name: null
              });
              userIdsToFetch.add(labor.user_id);
            }
          });

          if (userIdsToFetch.size > 0) {
            const { data: userRows, error: usersFetchError } = await supabase
              .from("users")
              .select("id, full_name")
              .in("id", Array.from(userIdsToFetch));

            if (usersFetchError) {
              throw new Error(`Database error: ${usersFetchError.message}`);
            }

            (userRows || []).forEach((userRow) => {
              const meta = userIdMeta.get(userRow.id);
              if (meta) {
                meta.name = userRow.full_name || meta.fallback;
              }
            });
          }

          const recipientUserIds = [];
          const leadLaborNames = new Set();
          const laborNames = new Set();

          userIdMeta.forEach((meta, userId) => {
            recipientUserIds.push(userId);
            const displayName = meta.name || meta.fallback;
            if (meta.role === "lead_labor") {
              leadLaborNames.add(displayName);
            } else if (meta.role === "labor") {
              laborNames.add(displayName);
            }
          });

          if (recipientUserIds.length > 0) {
            const formatDate = (value) => {
              if (!value) {
                return null;
              }
              const date = new Date(value);
              if (Number.isNaN(date.getTime())) {
                return null;
              }
              return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              });
            };

            const jobYear = updatedJob.created_at
              ? new Date(updatedJob.created_at).getFullYear()
              : new Date().getFullYear();
            const jobCode = `JOB-${jobYear}-${String(updatedJob.id).padStart(3, "0")}`;
            const leadLaborSegment =
              leadLaborNames.size > 0 ? ` Lead Labor: ${Array.from(leadLaborNames).join(", ")}.` : "";
            const laborSegment =
              laborNames.size > 0 ? ` Labor: ${Array.from(laborNames).join(", ")}.` : "";
            const estimateDate = formatDate(updatedJob.due_date);
            const dateSegment = estimateDate ? ` Estimated start date: ${estimateDate}.` : "";

            let assignmentSegment = "";
            if (updatedJob.contractor?.company_name || updatedJob.contractor?.contractor_name) {
              const contractorName =
                updatedJob.contractor.company_name || updatedJob.contractor.contractor_name;
              assignmentSegment = ` contractor ${contractorName}`;
            } else if (updatedJob.customer?.company_name || updatedJob.customer?.customer_name) {
              const customerName =
                updatedJob.customer.company_name || updatedJob.customer.customer_name;
              assignmentSegment = ` customer ${customerName}`;
            }

            const recipientRoles = [];
            const notificationTitle = statusChangedToCompleted
              ? "Job Status Updated"
              : "Job Assignment Confirmation";

            if (leadLaborNames.size > 0) {
              recipientRoles.push("lead_labor");
            }
            if (laborNames.size > 0) {
              recipientRoles.push("labor");
            }

            if (recipientRoles.length > 0 && recipientUserIds.length > 0) {
              const formatDateTime = (value) => {
                if (!value) {
                  return null;
                }
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) {
                  return null;
                }
                return date.toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                });
              };

              let notificationMessage;
              if (statusChangedToCompleted) {
                const statusLabel = (updateData.status || "completed")
                  .toString()
                  .replace(/_/g, " ")
                  .trim();
                const titleCaseStatus = statusLabel
                  .split(" ")
                  .filter(Boolean)
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");
                const performedSegment = performedByName ? ` by ${performedByName}` : "";
                const completionSegment = ` Completed on: ${
                  formatDateTime(updatedJob.updated_at) || "N/A"
                }.`;
                notificationMessage = `Job ${jobCode} ${updatedJob.job_title} status updated to ${titleCaseStatus}${performedSegment}.${completionSegment}`;
              } else {
                notificationMessage = `Job ${jobCode} ${updatedJob.job_title} assigned to${assignmentSegment}.${leadLaborSegment}${laborSegment}${dateSegment}`;
              }

              const notificationPayload = {
                notification_title: notificationTitle,
                message: notificationMessage,
                custom_link: `/jobs/${updatedJob.id}`,
                send_to_all: false,
                recipient_roles: recipientRoles,
                job_id: updatedJob.id,
                contractor_id: updatedJob.contractor?.id || null,
                customer_id: updatedJob.customer?.id || updatedJob.customer_id || null,
                recipient_user_ids: recipientUserIds
              };

              setImmediate(() => {
                NotificationService.sendNotification(notificationPayload).catch((notificationError) => {
                  console.error("Failed to send job notification:", notificationError);
                });
              });
            }
          }
        }
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

      let totalRegularSeconds = 0;

      const { data: timesheetEntries, error: timesheetError } = await supabase
        .from('labor_timesheets')
        .select(`
          *,
          labor:labor_id (
            id,
            labor_code,
            users!labor_user_id_fkey (
              id,
              full_name,
              email
            )
          ),
          lead_labor:lead_labor_id (
            id,
            labor_code,
            users!lead_labor_user_id_fkey (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('job_id', jobId)
        .order('date', { ascending: false });

      if (timesheetError) {
        throw new Error(`Database error: ${timesheetError.message}`);
      }

      (timesheetEntries || []).forEach((entry) => {
        if (entry.work_activity) {
          totalRegularSeconds += JobService.parseDurationToSeconds(entry.work_activity);
        } else if (entry.start_time && entry.end_time) {
          const start = new Date(`2000-01-01T${entry.start_time}`);
          const end = new Date(`2000-01-01T${entry.end_time}`);
          const diffSeconds = Math.max(0, Math.floor((end - start) / 1000));
          totalRegularSeconds += diffSeconds;
        }
      });

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
          },
          labor_timesheets: timesheetEntries || []
        },
        "Job activity retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }
}
