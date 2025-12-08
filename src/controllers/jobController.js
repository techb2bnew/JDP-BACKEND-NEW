import { JobService } from '../services/jobService.js';
import { Job } from '../models/Job.js';
import { errorResponse } from '../helpers/responseHelper.js';

export class JobController {
  static async createJob(request, reply) {
    try {
      const userId = request.user.id;
      const result = await JobService.createJob(request.body, userId);
      return reply.code(201).send(result);
    } catch (error) {


      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(`Failed to create job: ${error.message}`));
    }
  }

  static async searchTimesheets(request, reply) {
    try {
      const { q, employee, job, status, start_date, end_date, page, limit, name } = request.query;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: 'date',
        sortOrder: 'desc'
      };

      const filters = {
        q: (q || '').trim(),
        employee: employee || '',
        job: job || '',
        status: status || '',
        start_date: start_date || '',
        end_date: end_date || '',
        name: name || ''
      };

      const result = await JobService.searchTimesheets(filters, pagination);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobs(request, reply) {
    try {
      const {
        page, limit, search, status, priority, job_type,
        customer_id, contractor_id, created_from, sortBy, sortOrder
      } = request.query;

      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (job_type) filters.job_type = job_type;
      if (customer_id) filters.customer_id = parseInt(customer_id);
      if (contractor_id) filters.contractor_id = parseInt(contractor_id);
      if (created_from) filters.created_from = created_from;

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc'
      };

      const result = await JobService.getJobs(filters, pagination);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async searchJobs(request, reply) {
    try {
      const { q, page, limit, job_type, status, priority } = request.query;
      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };
      const result = await JobService.searchJobs(q || '', { ...pagination, job_type, status, priority });
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobTypes(request, reply) {
    try {
      const result = await JobService.getJobTypes();
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async searchMyJobs(request, reply) {
    try {
      const { q, page, limit, job_type, status, priority } = request.query;
      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };
      const user = request.user;
      const result = await JobService.searchMyJobs(user, q || '', { ...pagination, job_type, status, priority });
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobById(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.getJobById(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async updateJob(request, reply) {
    try {
      const { id } = request.params;
      const performerName =
        request.user?.full_name ||
        request.user?.name ||
        request.user?.email ||
        (request.user?.id ? `User ${request.user.id}` : null);

      const result = await JobService.updateJob(parseInt(id), request.body, {
        performedByName: performerName,
        assignedByUserId: request.user?.id || null
      });
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('already exists')) {
        return reply.code(409).send(errorResponse(error.message, 409));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async completeJob(request, reply) {
    try {
      const { id } = request.params;
      const { status } = request.body || {};
      const finalStatus = status || 'completed';

      const performerName =
        request.user?.full_name ||
        request.user?.name ||
        request.user?.email ||
        (request.user?.id ? `User ${request.user.id}` : null);

      const result = await JobService.updateJob(parseInt(id), { status: finalStatus }, {
        performedByName: performerName
      });
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async deleteJob(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.deleteJob(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobStats(request, reply) {
    try {
      const result = await JobService.getJobStats();
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }


  static async getJobsByCustomer(request, reply) {
    try {
      // Check both params and query for customerId
      const customerId = request.params?.customerId || request.query?.customerId;
      
      // If customerId is provided, validate and use it; otherwise return all customers' jobs
      let customerIdNum = null;
      if (customerId) {
        customerIdNum = parseInt(customerId);
        if (isNaN(customerIdNum)) {
          return reply.code(400).send(errorResponse('Invalid customer ID', 400));
        }
      }

      const result = await JobService.getJobsByCustomer(customerIdNum);
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      if (error.message.includes('required') || error.message.includes('Invalid')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByContractor(request, reply) {
    try {
      const { contractorId } = request.params;
      const result = await JobService.getJobsByContractor(parseInt(contractorId));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobDashboardDetails(request, reply) {
    try {
      const { id } = request.params;
      const result = await JobService.getJobDashboardDetails(parseInt(id));
      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByLabor(request, reply) {
    try {
      const {
        laborId,
        page = 1,
        limit = 10
      } = request.query;

      if (!laborId) {
        return reply.code(400).send(errorResponse('laborId is required', 400));
      }

      const result = await JobService.getJobsByLabor(
        parseInt(laborId),
        parseInt(page),
        parseInt(limit)
      );

      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobBluesheets(request, reply) {
    try {
      const { jobId } = request.params;

      if (!jobId || isNaN(jobId)) {
        return reply.code(400).send(errorResponse('Valid job ID is required', 400));
      }

      console.time('Response send time');
      const result = await JobService.getJobBluesheets(parseInt(jobId));
      console.timeEnd('Response send time');

      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobActivity(request, reply) {
    try {
      const { jobId } = request.params;

      if (!jobId || isNaN(jobId)) {
        return reply.code(400).send(errorResponse('Valid job ID is required', 400));
      }

      const result = await JobService.getJobActivity(parseInt(jobId));

      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('Job not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobsByLeadLabor(request, reply) {
    try {
      const {
        leadLaborId,
        page = 1,
        limit = 10
      } = request.query;

      if (!leadLaborId) {
        return reply.code(400).send(errorResponse('leadLaborId is required', 400));
      }

      const result = await JobService.getJobsByLeadLabor(
        parseInt(leadLaborId),
        parseInt(page),
        parseInt(limit)
      );

      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getTodayJobsByLeadLabor(request, reply) {
    try {
      const {
        leadLaborId,
        page = 1,
        limit = 10
      } = request.query;

      if (!leadLaborId) {
        return reply.code(400).send(errorResponse('leadLaborId is required', 400));
      }

      const result = await JobService.getTodayJobsByLeadLabor(
        parseInt(leadLaborId),
        parseInt(page),
        parseInt(limit)
      );

      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async updateWorkActivity(request, reply) {
    try {
      const { id } = request.params;
      const { activity_count } = request.body;

      if (typeof activity_count !== 'number' || activity_count < 0) {
        return reply.code(400).send(errorResponse('activity_count must be a positive number', 400));
      }

      const result = await Job.updateWorkActivity(parseInt(id), activity_count);
      return reply.code(200).send({
        success: true,
        message: 'Work activity count updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async updateTotalWorkTime(request, reply) {
    try {
      const { id } = request.params;
      const { total_work_time } = request.body;

      if (!total_work_time) {
        return reply.code(400).send(errorResponse('total_work_time is required', 400));
      }

      const result = await Job.updateTotalWorkTime(parseInt(id), total_work_time);
      return reply.code(200).send({
        success: true,
        message: 'Total work time updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Invalid time format')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getWorkActivityHistory(request, reply) {
    try {
      const { id } = request.params;
      const result = await Job.getWorkActivityHistory(parseInt(id));
      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async updateWorkData(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;


      if (updateData.work_activity === undefined &&
        !updateData.total_work_time &&
        !updateData.start_timer &&
        !updateData.end_timer &&
        !updateData.pause_timer &&
        !updateData.labor_timesheet &&
        !updateData.lead_labor_timesheet &&
        !updateData.bulk_timesheets &&
        !updateData.status) {
        return reply.code(400).send(errorResponse('At least one field is required: work_activity, total_work_time, start_timer, end_timer, pause_timer, labor_timesheet, lead_labor_timesheet, bulk_timesheets, or status', 400));
      }

      if (updateData.work_activity !== undefined) {
        if (typeof updateData.work_activity !== 'string') {
          return reply.code(400).send(errorResponse('work_activity must be a string', 400));
        }
      }

      const result = await Job.updateWorkData(parseInt(id), updateData);
      return reply.code(200).send({
        success: true,
        message: 'Work data updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Invalid time format')) {
        return reply.code(400).send(errorResponse(error.message, 400));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getTimesheetSummary(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        return reply.code(400).send(errorResponse('Job ID is required', 400));
      }

      const result = await Job.getTimesheetSummary(parseInt(id));
      return reply.code(200).send({
        success: true,
        message: 'Timesheet summary retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getWeeklyTimesheetSummary(request, reply) {
    try {
      const { id } = request.params;
      const { start_date, end_date } = request.query;

      if (!id) {
        return reply.code(400).send(errorResponse('Job ID is required', 400));
      }

      if (!start_date || !end_date) {
        return reply.code(400).send(errorResponse('start_date and end_date are required', 400));
      }

      const result = await Job.getWeeklyTimesheetSummary(parseInt(id), start_date, end_date);
      return reply.code(200).send({
        success: true,
        message: 'Weekly timesheet summary retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getAllJobsWeeklyTimesheetSummary(request, reply) {
    try {
      const { start_date, end_date, page = 1, limit = 10 } = request.query;

     
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

     
      if (isNaN(pageNum) || pageNum < 1) {
        return reply.code(400).send(errorResponse('Page must be a positive number', 400));
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return reply.code(400).send(errorResponse('Limit must be between 1 and 100', 400));
      }

      const pagination = {
        page: pageNum,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum
      };

      const result = await Job.getAllJobsWeeklyTimesheetSummary(start_date, end_date, pagination);
      return reply.code(200).send({
        success: true,
        message: 'All jobs weekly timesheet summary retrieved successfully',
        data: result
      });
    } catch (error) {
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getWeeklyTimesheetView(request, reply) {
    try {
      const { labor_id, lead_labor_id, start_date, end_date } = request.query;

      if (!start_date || !end_date) {
        return reply.code(400).send(errorResponse('start_date and end_date are required', 400));
      }

      if (!labor_id && !lead_labor_id) {
        return reply.code(400).send(errorResponse('Either labor_id or lead_labor_id is required', 400));
      }

      const laborId = labor_id ? parseInt(labor_id) : null;
      const leadLaborId = lead_labor_id ? parseInt(lead_labor_id) : null;

      if (labor_id && (isNaN(laborId) || laborId < 1)) {
        return reply.code(400).send(errorResponse('Invalid labor_id', 400));
      }

      if (lead_labor_id && (isNaN(leadLaborId) || leadLaborId < 1)) {
        return reply.code(400).send(errorResponse('Invalid lead_labor_id', 400));
      }

      const result = await Job.getWeeklyTimesheetView(laborId, leadLaborId, start_date, end_date);
      
      return reply.code(200).send({
        success: true,
        message: 'Weekly timesheet view retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async approveTimesheet(request, reply) {
    try {
      const { jobId, laborId, date, status, billable } = request.body;
      const { status: queryStatus, billable: queryBillable } = request.query;

      if (!jobId || !laborId || !date) {
        return reply.code(400).send(errorResponse('jobId, laborId, and date are required', 400));
      }

      const finalStatus = status || queryStatus || 'approved';
      const finalBillable = billable !== undefined ? billable : (queryBillable !== undefined ? queryBillable : null);

      const result = await Job.approveTimesheet(
        parseInt(jobId),
        parseInt(laborId),
        date,
        finalStatus,
        finalBillable
      );

      return reply.code(200).send(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Timesheet entry not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async approveWeekTimesheet(request, reply) {
    try {
      const { jobId, laborId, lead_labor_id, startDate, endDate, status } = request.body;
      const { status: queryStatus } = request.query;

      if (!jobId || (!laborId && !lead_labor_id) || !startDate || !endDate) {
        return reply.code(400).send(errorResponse('jobId, (laborId or lead_labor_id), startDate, and endDate are required', 400));
      }

      const finalStatus = status || queryStatus || 'approved';

     
      let results = [];
      if (laborId) {
        const res = await Job.approveWeekTimesheet(
          parseInt(jobId),
          parseInt(laborId),
          startDate,
          endDate,
          finalStatus
        );
        results.push(res);
      }
      if (lead_labor_id) {
        const res = await Job.approveWeekTimesheet(
          parseInt(jobId),
          parseInt(lead_labor_id),
          startDate,
          endDate,
          finalStatus
        );
        results.push(res);
      }

      
      if (results.length === 1) {
        return reply.code(200).send(results[0]);
      }

      const totalUpdated = results.reduce((sum, r) => sum + (r?.data?.entries_updated || 0), 0);
      return reply.code(200).send({
        success: true,
        message: `${totalUpdated} timesheet entries ${finalStatus} successfully for the week (labor & lead labor)`,
        data: {
          job_id: parseInt(jobId),
          labor_id: laborId ? parseInt(laborId) : null,
          lead_labor_id: lead_labor_id ? parseInt(lead_labor_id) : null,
          start_date: startDate,
          end_date: endDate,
          status: finalStatus,
          entries_updated: totalUpdated
        }
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('No timesheet entries found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getProjectSummary(request, reply) {
    try {
      const { id } = request.params;
      const result = await Job.getProjectSummary(parseInt(id));
      return reply.code(200).send({
        success: true,
        message: 'Project summary retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobDashboard(request, reply) {
    try {
      const { id } = request.params;
      const result = await Job.getJobDashboard(parseInt(id));
      return reply.code(200).send({
        success: true,
        message: 'Job dashboard data retrieved successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return reply.code(404).send(errorResponse(error.message, 404));
      }
      if (error.message.includes('Database error')) {
        return reply.code(500).send(errorResponse('Database error occurred', 500));
      }
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getTimesheetDashboardStats(request, reply) {
    try {
      const { start_date, end_date } = request.query;
      const result = await Job.getTimesheetDashboardStats(start_date, end_date);
      
      // Use same formatTimeDisplay as getAllJobsWeeklyTimesheetSummary
      return reply.code(200).send({
        success: true,
        message: 'Timesheet dashboard statistics retrieved successfully',
        data: {
          total: result.total,
          pending: result.pending,
          totalHours: Job.formatTimeDisplay(result.totalHours),
          billableHours: Job.formatTimeDisplay(result.billableHours)
        }
      });
    } catch (error) {
      return reply.code(500).send(errorResponse(error.message));
    }
  }
}
