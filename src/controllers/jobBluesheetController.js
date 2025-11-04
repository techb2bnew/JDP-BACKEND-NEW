import { JobBluesheetService } from '../services/jobBluesheetService.js';
import { responseHelper } from '../helpers/responseHelper.js';

export class JobBluesheetController {
  static async createBluesheet(request, reply) {
    try {
      const { job_id, date, notes } = request.body;
      const createdByUserId = request.user.id;

      const result = await JobBluesheetService.createBluesheet({
        job_id,
        date,
        notes,
      }, createdByUserId);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async createCompleteBluesheet(request, reply) {
    try {
      const completeData = request.body;
      const createdByUserId = request.user.id;

      const result = await JobBluesheetService.createCompleteBluesheet(completeData, createdByUserId);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getBluesheetById(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.getBluesheetById(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getBluesheetsByJobId(request, reply) {
    try {
      const { jobId } = request.params;

      const result = await JobBluesheetService.getBluesheetsByJobId(jobId);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getLeadLaborBluesheets(request, reply) {
    try {
      const userRole = (request.user?.role || '').toLowerCase();
      const managementType = (request.user?.management_type || '').toLowerCase();

      if (
        userRole !== 'lead labor' &&
        userRole !== 'lead_labor' &&
        managementType !== 'lead labor' &&
        managementType !== 'lead_labor'
      ) {
        return responseHelper.forbidden(reply, 'Lead Labor access required');
      }

      const result = await JobBluesheetService.getLeadLaborBluesheets(request.user.id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getLaborBluesheets(request, reply) {
    try {
      const userRole = (request.user?.role || '').toLowerCase();
      const managementType = (request.user?.management_type || '').toLowerCase();

      if (userRole !== 'labor' && managementType !== 'labor') {
        return responseHelper.forbidden(reply, 'Labor access required');
      }

      const result = await JobBluesheetService.getLaborBluesheets(request.user.id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async updateBluesheet(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const result = await JobBluesheetService.updateBluesheet(id, updateData);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async deleteBluesheet(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.deleteBluesheet(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async searchBluesheets(request, reply) {
    try {
      const { page = 1, limit = 10, ...filters } = request.query;

      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      
      if (isNaN(pageNum) || pageNum < 1) {
        return responseHelper.error(reply, 'Page must be a positive number', 400);
      }
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return responseHelper.error(reply, 'Limit must be between 1 and 100', 400);
      }

      const pagination = {
        page: pageNum,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum
      };

      const result = await JobBluesheetService.searchBluesheets(filters, pagination);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getLaborEntryById(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        return responseHelper.error(reply, 'Labor entry ID is required', 400);
      }

      const laborId = parseInt(id);
      if (isNaN(laborId)) {
        return responseHelper.error(reply, 'Labor entry ID must be a valid number', 400);
      }

      const result = await JobBluesheetService.getLaborEntryById(laborId);
      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async addLaborEntry(request, reply) {
    try {
      const { bluesheetId } = request.params;
      const { labor_id, lead_labor_id, employee_name, role, regular_hours, overtime_hours, hourly_rate, date, description } = request.body;

      const result = await JobBluesheetService.addLaborEntry(bluesheetId, {
        labor_id,
        lead_labor_id,
        employee_name,
        role: role || 'Labor',
        regular_hours: regular_hours || '0h',
        overtime_hours: overtime_hours || '0h',
        hourly_rate,
        date: date || null,
        description: description || null
      });

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async updateLaborEntry(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const result = await JobBluesheetService.updateLaborEntry(id, updateData);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async deleteLaborEntry(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.deleteLaborEntry(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getLaborEntries(request, reply) {
    try {
      const { bluesheetId } = request.params;

      const result = await JobBluesheetService.getLaborEntries(bluesheetId);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getMaterialEntryById(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        return responseHelper.error(reply, 'Material entry ID is required', 400);
      }

      const materialId = parseInt(id);
      if (isNaN(materialId)) {
        return responseHelper.error(reply, 'Material entry ID must be a valid number', 400);
      }

      const result = await JobBluesheetService.getMaterialEntryById(materialId);
      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      if (error.message.includes('not found')) {
        return responseHelper.error(reply, error.message, 404);
      }
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async addMaterialEntry(request, reply) {
    try {
      const { bluesheetId } = request.params;
      const { product_id, material_name, unit, total_ordered, material_used, supplier_order_id, return_to_warehouse, unit_cost, date } = request.body;

      const result = await JobBluesheetService.addMaterialEntry(bluesheetId, {
        product_id,
        material_name,
        unit: unit || 'pieces',
        total_ordered: total_ordered || 0,
        material_used: material_used || 0,
        supplier_order_id,
        return_to_warehouse: return_to_warehouse || false,
        unit_cost,
        date: date || null
      });

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async updateMaterialEntry(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const result = await JobBluesheetService.updateMaterialEntry(id, updateData);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async deleteMaterialEntry(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.deleteMaterialEntry(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getMaterialEntries(request, reply) {
    try {
      const { bluesheetId } = request.params;

      const result = await JobBluesheetService.getMaterialEntries(bluesheetId);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getBluesheetSummary(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.getBluesheetSummary(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async getMaterialUsageStats(request, reply) {
    try {
      const { productId } = request.params;
      const { start_date, end_date } = request.query;

      if (!start_date || !end_date) {
        return responseHelper.error(reply, 'start_date and end_date are required', 400);
      }

      const result = await JobBluesheetService.getMaterialUsageStats(productId, start_date, end_date);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async submitBluesheetForApproval(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.submitBluesheetForApproval(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async updateAdditionalCharges(request, reply) {
    try {
      const { id } = request.params;
      const { additional_charges } = request.body;

      const result = await JobBluesheetService.updateAdditionalCharges(id, additional_charges);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async calculateAndUpdateTotalCost(request, reply) {
    try {
      const { id } = request.params;

      const result = await JobBluesheetService.calculateAndUpdateTotalCost(id);

      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }

  static async approveBluesheet(request, reply) {
    try {
      const { id } = request.params;
      const { status } = request.body || {};
      const approvedByUserId = request.user.id; 

      if (status) {
        const result = await JobBluesheetService.updateBluesheet(id, { 
          status,
          approved_by: approvedByUserId 
        });
        return responseHelper.success(reply, result.data, 'Bluesheet status updated successfully');
      }

      const result = await JobBluesheetService.approveBluesheet(id, approvedByUserId);
      return responseHelper.success(reply, result.data, result.message);
    } catch (error) {
      return responseHelper.error(reply, error.message, 500);
    }
  }
}
