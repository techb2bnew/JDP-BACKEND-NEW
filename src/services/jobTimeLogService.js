import { JobTimeLog } from '../models/JobTimeLog.js';

export class JobTimeLogService {
  static async createTimeLog(timeLogData, createdByUserId) {
    try {
      if (timeLogData.hours_worked && timeLogData.hourly_rate && !timeLogData.total_cost) {
        timeLogData.total_cost = timeLogData.hours_worked * timeLogData.hourly_rate;
      }

      const timeLogWithCreator = {
        ...timeLogData,
        created_by: createdByUserId
      };

      const timeLog = await JobTimeLog.create(timeLogWithCreator);
      return {
        timeLog,
        message: 'Time log created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogs(page = 1, limit = 10, filters = {}) {
    try {
      const result = await JobTimeLog.findAll(filters, { page, limit });
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogById(timeLogId) {
    try {
      const timeLog = await JobTimeLog.findById(timeLogId);
      if (!timeLog) {
        throw new Error('Time log not found');
      }
      return timeLog;
    } catch (error) {
      throw error;
    }
  }

  static async updateTimeLog(timeLogId, updateData, updatedByUserId) {
    try {
      if (updateData.hours_worked || updateData.hourly_rate) {
        const existingTimeLog = await JobTimeLog.findById(timeLogId);
        if (!existingTimeLog) {
          throw new Error('Time log not found');
        }

        const hours = updateData.hours_worked || existingTimeLog.hours_worked;
        const rate = updateData.hourly_rate || existingTimeLog.hourly_rate;
        updateData.total_cost = hours * rate;
      }

      const timeLog = await JobTimeLog.update(timeLogId, updateData);
      return {
        timeLog,
        message: 'Time log updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteTimeLog(timeLogId) {
    try {
      const timeLog = await JobTimeLog.findById(timeLogId);
      if (!timeLog) {
        throw new Error('Time log not found');
      }

      await JobTimeLog.delete(timeLogId);
      return {
        message: `Time log for ${timeLog.worker_name} deleted successfully`,
        deletedTimeLog: {
          id: timeLog.id,
          worker_name: timeLog.worker_name,
          work_date: timeLog.work_date,
          hours_worked: timeLog.hours_worked,
          total_cost: timeLog.total_cost
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogsByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await JobTimeLog.getTimeLogsByJob(jobId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogsByLabor(laborId, page = 1, limit = 10) {
    try {
      const result = await JobTimeLog.getTimeLogsByLabor(laborId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getTimeLogStats() {
    try {
      const stats = await JobTimeLog.getStats();
      return stats;
    } catch (error) {
      throw error;
    }
  }
}
