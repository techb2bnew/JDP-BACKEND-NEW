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
}


