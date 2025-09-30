import { Contractor } from "../models/Contractor.js";
import { successResponse } from "../helpers/responseHelper.js";

export class ContractorService {
  static async createContractor(contractorData, createdByUserId) {
    try {
      if (contractorData.email) {
        const existingContractor = await Contractor.findByEmail(contractorData.email);
        if (existingContractor) {
          throw new Error("Contractor with this email already exists");
        }
      }

      const contractorWithCreator = {
        ...contractorData,
        created_by: createdByUserId
      };

      const contractor = await Contractor.create(contractorWithCreator);

      return successResponse(
        contractor,
        "Contractor created successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getContractors(filters, pagination) {
    try {
      // If include_jobs is true, use the contractor listing method
      if (filters.include_jobs) {
        console.log('Getting contractors with jobs...');
        const result = await Contractor.getContractorListing(filters, pagination);
        
        return successResponse(
          {
            contractors: result.contractors,
            pagination: {
              page: result.page,
              limit: result.limit,
              total: result.total,
              totalPages: result.totalPages
            }
          },
          "Contractors with jobs retrieved successfully"
        );
      } else {
        // Use the original method for basic contractor listing
        const result = await Contractor.findAll(filters, pagination);

        return successResponse(
          {
            contractors: result.contractors,
            pagination: {
              page: result.page,
              limit: result.limit,
              total: result.total,
              totalPages: result.totalPages
            }
          },
          "Contractors retrieved successfully"
        );
      }
    } catch (error) {
      throw error;
    }
  }

  static async getContractorById(contractorId) {
    try {
      const contractor = await Contractor.findById(contractorId);
      if (!contractor) {
        throw new Error("Contractor not found");
      }

      return successResponse(
        contractor,
        "Contractor retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getContractorsByJobId(jobId) {
    try {
      const contractors = await Contractor.findByJobId(jobId);

      return successResponse(
        contractors,
        "Contractors retrieved successfully for job"
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateContractor(contractorId, updateData) {
    try {
      const existingContractor = await Contractor.findById(contractorId);
      if (!existingContractor) {
        throw new Error("Contractor not found");
      }

      if (updateData.email && updateData.email !== existingContractor.email) {
        const contractorWithEmail = await Contractor.findByEmail(updateData.email);
        if (contractorWithEmail) {
          throw new Error("Contractor with this email already exists");
        }
      }

      const updatedContractor = await Contractor.update(contractorId, updateData);

      return successResponse(
        updatedContractor,
        "Contractor updated successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async deleteContractor(contractorId) {
    try {
      const existingContractor = await Contractor.findById(contractorId);
      if (!existingContractor) {
        throw new Error("Contractor not found");
      }

      const relationshipCheck = await Contractor.checkContractorRelationships(contractorId);
      
      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this contractor because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

      await Contractor.delete(contractorId);

      return successResponse(
        null,
        "Contractor deleted successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getContractorStats() {
    try {
      const stats = await Contractor.getStats();

      return successResponse(
        stats,
        "Contractor statistics retrieved successfully"
      );
    } catch (error) {
      throw error;
    }
  }


  // Get job details with sub-jobs, materials, and timesheet
  static async getJobDetails(jobId) {
    try {
      console.log(`Getting job details for job ID: ${jobId}`);
      
      const result = await Contractor.getJobDetails(jobId);
      
      return successResponse(
        result,
        "Job details retrieved successfully"
      );
    } catch (error) {
      console.error('Error in getJobDetails service:', error);
      throw error;
    }
  }
}
