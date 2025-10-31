import { AnalyticsService } from '../services/analyticsService.js';
import { successResponse, errorResponse } from '../helpers/responseHelper.js';

export class AnalyticsController {
  static async getOverview(req, reply) {
    try {
      const metrics = await AnalyticsService.getOverviewMetrics();
      return reply.send(successResponse(metrics, 'Analytics overview retrieved successfully'));
    } catch (error) {
      req.log.error({ err: error }, 'Failed to fetch analytics overview');
      return reply.status(500).send(errorResponse(`Failed to fetch analytics overview: ${error.message}`));
    }
  }
}

