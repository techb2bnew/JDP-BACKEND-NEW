import { DashboardService } from '../services/dashboardService.js';
import { errorResponse } from '../helpers/responseHelper.js';

export class DashboardController {
  static async getSummary(request, reply) {
    try {
      const result = await DashboardService.getSummary();
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getJobStatusDistribution(request, reply) {
    try {
      const result = await DashboardService.getJobStatusDistribution();
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(error.message));
    }
  }

  static async getRecentActivities(request, reply) {
    try {
      const { limit } = request.query || {};
      const result = await DashboardService.getRecentActivities(limit ? parseInt(limit) : 20);
      return reply.code(200).send(result);
    } catch (error) {
      return reply.code(500).send(errorResponse(error.message));
    }
  }
}


