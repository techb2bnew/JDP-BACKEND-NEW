import { LeadLabor } from '../models/LeadLabor.js';
import { User } from '../models/User.js';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
import { successResponse } from "../helpers/responseHelper.js";

export class LeadLaborService {
  static async createLeadLaborWithUser(leadLaborData, files = null) {
    try {
      const [existingUser, laborCode] = await Promise.all([
        User.findByEmail(leadLaborData.email),
        leadLaborData.labor_code ? 
          (async () => {
            const existingLabor = await LeadLabor.findByLaborCode(leadLaborData.labor_code);
            if (existingLabor) {
              throw new Error('Labor code already exists');
            }
            return leadLaborData.labor_code;
          })() : 
          LeadLabor.generateNextLaborCode()
      ]);

      if (existingUser) {
        throw new Error('Email already exists');
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await hashPassword(temporaryPassword);

      if (!leadLaborData.full_name || !leadLaborData.email) {
        throw new Error('Full name and email are required for user creation');
      }


      const userData = {
        full_name: leadLaborData.full_name,
        email: leadLaborData.email,
        phone: leadLaborData.phone || null,
        password: hashedPassword,
        role: leadLaborData.role,
        status: leadLaborData.status || 'active',
        management_type: leadLaborData.management_type

      };

      const user = await User.create(userData);

      let fileUrls = {};
      if (files) {
        try {
          fileUrls = await this.processUploadedFiles(files);
        } catch (fileError) {
        }
      }

      const leadLaborRecordData = {
        user_id: user.id,
        labor_code: laborCode,
        dob: leadLaborData.dob,
        address: leadLaborData.address,
        notes: leadLaborData.notes || null,
        department: leadLaborData.department,
        date_of_joining: leadLaborData.date_of_joining,
        specialization: leadLaborData.specialization || null,
        trade: leadLaborData.trade || null,
        experience: leadLaborData.experience || null,
        id_proof_url: fileUrls.id_proof_url || leadLaborData.id_proof_url || null,
        photo_url: fileUrls.photo_url || leadLaborData.photo_url || null,
        resume_url: fileUrls.resume_url || leadLaborData.resume_url || null,
        agreed_terms: leadLaborData.agreed_terms || false,
        management_type: leadLaborData.management_type,
        system_ip: leadLaborData.system_ip
      };



      const leadLabor = await LeadLabor.create(leadLaborRecordData);

      setImmediate(async () => {
        try {
          await sendWelcomeEmail(
            user.email,
            user.full_name,
            temporaryPassword
          );
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
        }
      });

      return {
        leadLabor: leadLabor,
        message: 'Lead Labor created successfully with user account',
        uploaded_files: fileUrls
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllLeadLabor(page = 1, limit = 10) {
    try {
      const result = await LeadLabor.getAllLeadLabor(page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getLeadLaborById(leadLaborId) {
    try {
      const leadLabor = await LeadLabor.getLeadLaborById(leadLaborId);
      return leadLabor;
    } catch (error) {
      throw error;
    }
  }

  static async updateLeadLabor(leadLaborId, updateData, files = null) {
    try {
      const currentLeadLabor = await LeadLabor.getLeadLaborById(leadLaborId);
      const userId = currentLeadLabor.user_id;

      if (updateData.email && updateData.email !== currentLeadLabor.users.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      let fileUrls = {};
      if (files) {
        try {
          fileUrls = await this.processUploadedFiles(files);
        } catch (fileError) {
        }
      }

      const userData = {};
      const leadLaborData = {};

      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.email !== undefined) userData.email = updateData.email;
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

      if (updateData.labor_code !== undefined) leadLaborData.labor_code = updateData.labor_code;
      if (updateData.dob !== undefined) leadLaborData.dob = updateData.dob;
      if (updateData.address !== undefined) leadLaborData.address = updateData.address;
      if (updateData.notes !== undefined) leadLaborData.notes = updateData.notes;
      if (updateData.department !== undefined) leadLaborData.department = updateData.department;
      if (updateData.date_of_joining !== undefined) leadLaborData.date_of_joining = updateData.date_of_joining;
      if (updateData.specialization !== undefined) leadLaborData.specialization = updateData.specialization;
      if (updateData.trade !== undefined) leadLaborData.trade = updateData.trade;
      if (updateData.experience !== undefined) leadLaborData.experience = updateData.experience;
      if (updateData.agreed_terms !== undefined) leadLaborData.agreed_terms = updateData.agreed_terms;

      if (fileUrls.id_proof_url) leadLaborData.id_proof_url = fileUrls.id_proof_url;
      if (fileUrls.photo_url) leadLaborData.photo_url = fileUrls.photo_url;
      if (fileUrls.resume_url) leadLaborData.resume_url = fileUrls.resume_url;

      if (Object.keys(userData).length > 0) {
        await User.update(userId, userData);
      }

      if (Object.keys(leadLaborData).length > 0) {
        await LeadLabor.update(leadLaborId, leadLaborData);
      }

      const updatedLeadLabor = await LeadLabor.getLeadLaborById(leadLaborId);
      return updatedLeadLabor;
    } catch (error) {
      throw error;
    }
  }

  static async deleteLeadLabor(leadLaborId) {
    try {
      const result = await LeadLabor.delete(leadLaborId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async processUploadedFiles(files) {
    try {
      const fileUrls = {};

      if (files.photo && files.photo[0]) {
        fileUrls.photo_url = files.photo[0].location;
      }

      if (files.id_proof && files.id_proof[0]) {
        fileUrls.id_proof_url = files.id_proof[0].location;
      }

      if (files.resume && files.resume[0]) {
        fileUrls.resume_url = files.resume[0].location;
      }

      return fileUrls;
    } catch (error) {
      throw error;
    }
  }

  static async updateProfile(leadLaborId, updateData, files = null) {
    try {
      const currentLeadLabor = await LeadLabor.getLeadLaborById(leadLaborId);
      const userId = currentLeadLabor.user_id;

    
      if (updateData.email && updateData.email !== currentLeadLabor.users.email) {
        const existingUser = await User.findByEmail(updateData.email);
        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      let fileUrls = {};
      if (files) {
        try {
          fileUrls = await this.processUploadedFiles(files);
        } catch (fileError) {
          console.error('File processing error:', fileError);
        }
      }

      const userData = {};
      const leadLaborData = {};

      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.email !== undefined) userData.email = updateData.email;
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

      if (updateData.labor_code !== undefined) leadLaborData.labor_code = updateData.labor_code;
      if (updateData.dob !== undefined) leadLaborData.dob = updateData.dob;
      if (updateData.address !== undefined) leadLaborData.address = updateData.address;
      if (updateData.notes !== undefined) leadLaborData.notes = updateData.notes;
      if (updateData.department !== undefined) leadLaborData.department = updateData.department;
      if (updateData.date_of_joining !== undefined) leadLaborData.date_of_joining = updateData.date_of_joining;
      if (updateData.specialization !== undefined) leadLaborData.specialization = updateData.specialization;
      if (updateData.trade !== undefined) leadLaborData.trade = updateData.trade;
      if (updateData.experience !== undefined) leadLaborData.experience = updateData.experience;
      if (updateData.agreed_terms !== undefined) leadLaborData.agreed_terms = updateData.agreed_terms;
      if (updateData.management_type !== undefined) leadLaborData.management_type = updateData.management_type;

      if (fileUrls.photo_url) userData.photo_url = fileUrls.photo_url;
      if (fileUrls.id_proof_url) leadLaborData.id_proof_url = fileUrls.id_proof_url;
      if (fileUrls.resume_url) leadLaborData.resume_url = fileUrls.resume_url;

      const updatePromises = [];
      
      if (Object.keys(userData).length > 0) {
        updatePromises.push(User.update(userId, userData));
      }

      if (Object.keys(leadLaborData).length > 0) {
        updatePromises.push(LeadLabor.update(leadLaborId, leadLaborData));
      }


      await Promise.all(updatePromises);

      const updatedLeadLabor = await LeadLabor.getLeadLaborById(leadLaborId);
      return updatedLeadLabor;
    } catch (error) {
      throw error;
    }
  }

  static validateLeadLaborData(leadLaborData) {
    const errors = [];

    if (!leadLaborData.full_name) {
      errors.push('Full name is required');
    }
    if (!leadLaborData.email) {
      errors.push('Email is required');
    }

    if (!leadLaborData.dob) {
      errors.push('Date of birth is required');
    }
    if (!leadLaborData.address) {
      errors.push('Address is required');
    }
    if (!leadLaborData.department) {
      errors.push('Department is required');
    }
    if (!leadLaborData.date_of_joining) {
      errors.push('Date of joining is required');
    }

    if (leadLaborData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadLaborData.email)) {
      errors.push('Invalid email format');
    }

    if (leadLaborData.password && leadLaborData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (leadLaborData.dob && isNaN(new Date(leadLaborData.dob).getTime())) {
      errors.push('Invalid date of birth format');
    }
    if (leadLaborData.date_of_joining && isNaN(new Date(leadLaborData.date_of_joining).getTime())) {
      errors.push('Invalid date of joining format');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  static async searchLeadLabor(filters, pagination) {
    try {
      const result = await LeadLabor.search(filters, pagination);
      return successResponse(
        {
          leadLabor: result.leadLabor,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Lead labor searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }
}
