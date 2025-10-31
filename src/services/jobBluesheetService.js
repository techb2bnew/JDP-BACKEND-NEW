import { JobBluesheet } from '../models/JobBluesheet.js';
import { JobBluesheetLabor } from '../models/JobBluesheetLabor.js';
import { JobBluesheetMaterial } from '../models/JobBluesheetMaterial.js';
import { LeadLabor } from '../models/LeadLabor.js';
import { Labor } from '../models/Labor.js';

export class JobBluesheetService {
  static async createBluesheet(bluesheetData, createdByUserId) {
    try {
      // Create main bluesheet entry
      const bluesheet = await JobBluesheet.create({
        ...bluesheetData,
        created_by: createdByUserId
      });

      return {
        success: true,
        data: bluesheet,
        message: 'Job bluesheet created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Create Complete Bluesheet with Labor and Material Entries
  static async createCompleteBluesheet(completeData, createdByUserId) {
    try {
      const { 
        job_id, 
        date, 
        notes, 
        status,
        additional_charges = 0,
        labor_entries = [],
        material_entries = []
      } = completeData;

      // Create main bluesheet entry
      const bluesheet = await JobBluesheet.create({
        job_id,
        date,
        notes,
        status,
        additional_charges,
        created_by: createdByUserId
      });

      const bluesheetId = bluesheet.id;

      // Create labor entries
      const createdLaborEntries = [];
      if (labor_entries && labor_entries.length > 0) {
        for (const laborEntry of labor_entries) {
          const labor = await JobBluesheetLabor.create({
            ...laborEntry,
            job_bluesheet_id: bluesheetId
          });
          createdLaborEntries.push(labor);
        }
      }

      // Create material entries
      const createdMaterialEntries = [];
      if (material_entries && material_entries.length > 0) {
        for (const materialEntry of material_entries) {
          const material = await JobBluesheetMaterial.create({
            ...materialEntry,
            job_bluesheet_id: bluesheetId
          });
          createdMaterialEntries.push(material);
        }
      }

      // Calculate totals
      const laborTotalCost = await JobBluesheetLabor.calculateTotalCost(bluesheetId);
      const materialTotalCost = await JobBluesheetMaterial.calculateTotalCost(bluesheetId);
      const grandTotal = laborTotalCost + materialTotalCost + additional_charges;

      // Update bluesheet with calculated total
      const updatedBluesheet = await JobBluesheet.update(bluesheetId, {
        total_cost: grandTotal
      });

      return {
        success: true,
        data: {
          bluesheet: updatedBluesheet,
          labor_entries: createdLaborEntries,
          material_entries: createdMaterialEntries,
          cost_breakdown: {
            labor_total_cost: laborTotalCost,
            material_total_cost: materialTotalCost,
            additional_charges: additional_charges,
            grand_total: grandTotal
          }
        },
        message: 'Complete bluesheet created successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getBluesheetById(id) {
    try {
      const bluesheet = await JobBluesheet.findById(id);
      
      if (!bluesheet) {
        throw new Error('Job bluesheet not found');
      }

      return {
        success: true,
        data: bluesheet,
        message: 'Job bluesheet retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getBluesheetsByJobId(jobId) {
    try {
      const bluesheets = await JobBluesheet.findByJobId(jobId);

      return {
        success: true,
        data: bluesheets,
        message: 'Job bluesheets retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateBluesheet(id, updateData) {
    try {
      const bluesheet = await JobBluesheet.update(id, updateData);

      return {
        success: true,
        data: bluesheet,
        message: 'Job bluesheet updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteBluesheet(id) {
    try {
      const result = await JobBluesheet.delete(id);

      return {
        success: true,
        data: result,
        message: 'Job bluesheet deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async searchBluesheets(filters, pagination = {}) {
    try {
      const result = await JobBluesheet.search(filters, pagination);

      return {
        success: true,
        data: result,
        message: 'Job bluesheets retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Labor Entry Methods
  static async getLaborEntryById(id) {
    try {
      const laborEntry = await JobBluesheetLabor.findById(id);

      return {
        success: true,
        data: laborEntry,
        message: 'Labor entry retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async addLaborEntry(bluesheetId, laborData) {
    try {
      const laborEntry = await JobBluesheetLabor.create({
        ...laborData,
        job_bluesheet_id: bluesheetId
      });

      return {
        success: true,
        data: laborEntry,
        message: 'Labor entry added successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateLaborEntry(id, updateData) {
    try {
      const laborEntry = await JobBluesheetLabor.update(id, updateData);

      return {
        success: true,
        data: laborEntry,
        message: 'Labor entry updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteLaborEntry(id) {
    try {
      const result = await JobBluesheetLabor.delete(id);

      return {
        success: true,
        data: result,
        message: 'Labor entry deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLaborEntries(bluesheetId) {
    try {
      const laborEntries = await JobBluesheetLabor.findByBluesheetId(bluesheetId);

      return {
        success: true,
        data: laborEntries,
        message: 'Labor entries retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Material Entry Methods
  static async getMaterialEntryById(id) {
    try {
      const materialEntry = await JobBluesheetMaterial.findById(id);

      return {
        success: true,
        data: materialEntry,
        message: 'Material entry retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async addMaterialEntry(bluesheetId, materialData) {
    try {
      const materialEntry = await JobBluesheetMaterial.create({
        ...materialData,
        job_bluesheet_id: bluesheetId
      });

      return {
        success: true,
        data: materialEntry,
        message: 'Material entry added successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateMaterialEntry(id, updateData) {
    try {
      const materialEntry = await JobBluesheetMaterial.update(id, updateData);

      return {
        success: true,
        data: materialEntry,
        message: 'Material entry updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteMaterialEntry(id) {
    try {
      const result = await JobBluesheetMaterial.delete(id);

      return {
        success: true,
        data: result,
        message: 'Material entry deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getMaterialEntries(bluesheetId) {
    try {
      const materialEntries = await JobBluesheetMaterial.findByBluesheetId(bluesheetId);

      return {
        success: true,
        data: materialEntries,
        message: 'Material entries retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Summary and Statistics
  static async getBluesheetSummary(bluesheetId) {
    try {
      const bluesheet = await JobBluesheet.findById(bluesheetId);
      
      if (!bluesheet) {
        throw new Error('Job bluesheet not found');
      }

      // Calculate totals
      const laborTotalCost = await JobBluesheetLabor.calculateTotalCost(bluesheetId);
      const materialTotalCost = await JobBluesheetMaterial.calculateTotalCost(bluesheetId);
      const grandTotal = laborTotalCost + materialTotalCost;

      return {
        success: true,
        data: {
          bluesheet: bluesheet,
          summary: {
            labor_total_cost: laborTotalCost,
            material_total_cost: materialTotalCost,
            grand_total: grandTotal,
            labor_entries_count: bluesheet.labor_entries?.length || 0,
            material_entries_count: bluesheet.material_entries?.length || 0
          }
        },
        message: 'Bluesheet summary retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getMaterialUsageStats(productId, startDate, endDate) {
    try {
      const stats = await JobBluesheetMaterial.getMaterialUsageStats(productId, startDate, endDate);

      return {
        success: true,
        data: stats,
        message: 'Material usage statistics retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLeadLaborBluesheets(userId) {
    try {
      const leadLabor = await LeadLabor.getLeadLaborByUserId(userId);

      if (!leadLabor) {
        return {
          success: true,
          data: {
            lead_labor: null,
            bluesheets: []
          },
          message: 'No lead labor profile found for the current user'
        };
      }

      const bluesheetIds = await JobBluesheetLabor.findBluesheetIdsByLeadLaborId(leadLabor.id);

      if (bluesheetIds.length === 0) {
        return {
          success: true,
          data: {
            lead_labor: leadLabor,
            bluesheets: []
          },
          message: 'No bluesheets assigned to this lead labor yet'
        };
      }

      const bluesheets = await JobBluesheet.findByIds(bluesheetIds);

      return {
        success: true,
        data: {
          lead_labor: leadLabor,
          bluesheets,
          total: bluesheets.length
        },
        message: 'Lead labor bluesheets retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getLaborBluesheets(userId) {
    try {
      const labor = await Labor.getLaborByUserId(userId);

      if (!labor) {
        return {
          success: true,
          data: {
            labor: null,
            bluesheets: []
          },
          message: 'No labor profile found for the current user'
        };
      }

      const bluesheetIds = await JobBluesheetLabor.findBluesheetIdsByLaborId(labor.id);

      if (bluesheetIds.length === 0) {
        return {
          success: true,
          data: {
            labor,
            bluesheets: []
          },
          message: 'No bluesheets assigned to this labor yet'
        };
      }

      const bluesheets = await JobBluesheet.findByIds(bluesheetIds);

      return {
        success: true,
        data: {
          labor,
          bluesheets,
          total: bluesheets.length
        },
        message: 'Labor bluesheets retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Submit Bluesheet for Approval
  static async submitBluesheetForApproval(id) {
    try {
      // Get current bluesheet
      const bluesheet = await JobBluesheet.findById(id);
      
      if (!bluesheet) {
        throw new Error('Job bluesheet not found');
      }

      // Calculate totals
      const laborTotalCost = await JobBluesheetLabor.calculateTotalCost(id);
      const materialTotalCost = await JobBluesheetMaterial.calculateTotalCost(id);
      const additionalCharges = bluesheet.additional_charges || 0;
      const grandTotal = laborTotalCost + materialTotalCost + additionalCharges;

      // Update bluesheet with calculated totals and status
      const updatedBluesheet = await JobBluesheet.update(id, {
        total_cost: grandTotal,
        status: 'submitted'
      });

      return {
        success: true,
        data: {
          bluesheet: updatedBluesheet,
          cost_breakdown: {
            labor_total_cost: laborTotalCost,
            material_total_cost: materialTotalCost,
            additional_charges: additionalCharges,
            grand_total: grandTotal
          }
        },
        message: 'Bluesheet submitted for approval successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Update Additional Charges
  static async updateAdditionalCharges(id, additionalCharges) {
    try {
      const bluesheet = await JobBluesheet.update(id, {
        additional_charges: additionalCharges
      });

      return {
        success: true,
        data: bluesheet,
        message: 'Additional charges updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate and Update Total Cost
  static async calculateAndUpdateTotalCost(id) {
    try {
      const bluesheet = await JobBluesheet.findById(id);
      
      if (!bluesheet) {
        throw new Error('Job bluesheet not found');
      }

      // Calculate totals
      const laborTotalCost = await JobBluesheetLabor.calculateTotalCost(id);
      const materialTotalCost = await JobBluesheetMaterial.calculateTotalCost(id);
      const additionalCharges = bluesheet.additional_charges || 0;
      const grandTotal = laborTotalCost + materialTotalCost + additionalCharges;

      // Update total cost
      const updatedBluesheet = await JobBluesheet.update(id, {
        total_cost: grandTotal
      });

      return {
        success: true,
        data: {
          bluesheet: updatedBluesheet,
          cost_breakdown: {
            labor_total_cost: laborTotalCost,
            material_total_cost: materialTotalCost,
            additional_charges: additionalCharges,
            grand_total: grandTotal
          }
        },
        message: 'Total cost calculated and updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}
