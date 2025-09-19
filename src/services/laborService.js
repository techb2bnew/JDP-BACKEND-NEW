import { Labor } from '../models/Labor.js';
import { User } from '../models/User.js';
import { LeadLabor } from '../models/LeadLabor.js';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
export class LaborService {
  static async createLaborWithUser(laborData) {
    try {

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await hashPassword(temporaryPassword);


      if (!laborData.full_name || !laborData.email) {
        throw new Error('Full name, email,  are required for user creation');
      }

      const [existingUser, laborCode] = await Promise.all([
        User.findByEmail(laborData.email),
        laborData.labor_code ? 
          (async () => {
            const existingLabor = await Labor.findByLaborCode(laborData.labor_code);
            if (existingLabor) {
              throw new Error('Labor code already exists');
            }
            return laborData.labor_code;
          })() : 
          Labor.generateNextLaborCode()
      ]);

      if (existingUser) {
        throw new Error('Email already exists');
      }

      const userData = {
        full_name: laborData.full_name,
        email: laborData.email,
        phone: laborData.phone || null,
        password: hashedPassword,
        role: laborData.role || 'labor',
        status: laborData.status || 'active',
        management_type:laborData.management_type
      };

      const user = await User.create(userData);

      let supervisorId = null;
      if (laborData.supervisor_id) {
        const supervisor = await User.findById(laborData.supervisor_id);
        if (!supervisor) {
          throw new Error(`Supervisor with ID ${laborData.supervisor_id} not found`);
        }
        
        const leadLabor = await LeadLabor.getLeadLaborByUserId(laborData.supervisor_id);
        if (!leadLabor) {
          throw new Error(`User with ID ${laborData.supervisor_id} is not a lead labor. Only lead labors can be supervisors.`);
        }
        
        supervisorId = laborData.supervisor_id;
      }

      const laborRecordData = {
        user_id: user.id,
        labor_code: laborCode,
        dob: laborData.dob || '1990-01-01',
        address: laborData.address || 'Default Address',
        notes: laborData.notes || null,
        date_of_joining: laborData.date_of_joining || new Date().toISOString().split('T')[0],
        trade: laborData.trade || null,
        experience: laborData.experience || null,
        hourly_rate: laborData.hourly_rate || null,
        supervisor_id: supervisorId,
        availability: laborData.availability || null,
        system_ip: laborData.system_ip,
        certifications: laborData.certifications ? JSON.stringify(laborData.certifications) : null,
        skills: laborData.skills ? JSON.stringify(laborData.skills) : null,
        management_type:laborData.management_type,
        is_custom: laborData.is_custom || false,
        job_id: laborData.job_id || null
      };

      const labor = await Labor.create(laborRecordData);

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
        labor: labor,
        message: 'Labor created successfully with user account'
      };
    } catch (error) {
      throw error;
    }
  }

    static async getAllLabor(page = 1, limit = 10) {
        try {
            const result = await Labor.getAllLabor(page, limit);
            return result;
        } catch (error) {
            throw error;
        }
    }

  static async getLaborById(laborId) {
    try {
      const labor = await Labor.getLaborById(laborId);
      return labor;
    } catch (error) {
      throw error;
    }
  }

  static async updateLabor(laborId, updateData) {
    try {
      const currentLabor = await Labor.getLaborById(laborId);
      const userId = currentLabor.user_id;

      const userData = {};
      const laborData = {};

      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.email !== undefined) {
        if (updateData.email !== currentLabor.users.email) {
          const existingUser = await User.findByEmail(updateData.email);
          if (existingUser) {
            throw new Error('Email already exists');
          }
        }
        userData.email = updateData.email;
      }
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

      if (updateData.labor_code !== undefined) {
        if (updateData.labor_code !== currentLabor.labor_code) {
          const existingLabor = await Labor.findByLaborCode(updateData.labor_code);
          if (existingLabor) {
            throw new Error('Labor code already exists');
          }
        }
        laborData.labor_code = updateData.labor_code;
      }
      if (updateData.dob !== undefined) laborData.dob = updateData.dob;
      if (updateData.address !== undefined) laborData.address = updateData.address;
      if (updateData.notes !== undefined) laborData.notes = updateData.notes;
      if (updateData.date_of_joining !== undefined) laborData.date_of_joining = updateData.date_of_joining;
      if (updateData.trade !== undefined) laborData.trade = updateData.trade;
      if (updateData.experience !== undefined) laborData.experience = updateData.experience;
      if (updateData.hourly_rate !== undefined) laborData.hourly_rate = updateData.hourly_rate;
      if (updateData.hours_worked !== undefined) laborData.hours_worked = updateData.hours_worked;
      if (updateData.supervisor_id !== undefined) {
        if (updateData.supervisor_id) {
          const supervisor = await User.findById(updateData.supervisor_id);
          if (!supervisor) {
            throw new Error(`Supervisor with ID ${updateData.supervisor_id} not found`);
          }
          
          const leadLabor = await LeadLabor.getLeadLaborByUserId(updateData.supervisor_id);
          if (!leadLabor) {
            throw new Error(`User with ID ${updateData.supervisor_id} is not a lead labor. Only lead labors can be supervisors.`);
          }
        }
        laborData.supervisor_id = updateData.supervisor_id;
      }
      if (updateData.availability !== undefined) laborData.availability = updateData.availability;
      if (updateData.certifications !== undefined) laborData.certifications = updateData.certifications ? JSON.stringify(updateData.certifications) : null;
      if (updateData.skills !== undefined) laborData.skills = updateData.skills ? JSON.stringify(updateData.skills) : null;
      if (updateData.is_custom !== undefined) laborData.is_custom = updateData.is_custom;
      if (updateData.job_id !== undefined) laborData.job_id = updateData.job_id;

      if (Object.keys(userData).length > 0) {
        await User.update(userId, userData);
      }

      if (Object.keys(laborData).length > 0) {
        await Labor.update(laborId, laborData);
      }

      const updatedLabor = await Labor.getLaborById(laborId);
      return updatedLabor;
    } catch (error) {
      throw error;
    }
  }

  static async deleteLabor(laborId) {
    try {
      const result = await Labor.delete(laborId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static validateLaborData(laborData) {
    const errors = [];

    if (!laborData.full_name) {
      errors.push('Full name is required');
    }
    if (!laborData.email) {
      errors.push('Email is required');
    }
    
    if (laborData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(laborData.email)) {
      errors.push('Invalid email format');
    }

    if (laborData.password && laborData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (laborData.certifications && !Array.isArray(laborData.certifications)) {
      errors.push('Certifications must be an array');
    }

    if (laborData.skills && !Array.isArray(laborData.skills)) {
      errors.push('Skills must be an array');
    }

    if (laborData.dob && isNaN(new Date(laborData.dob).getTime())) {
      errors.push('Invalid date of birth format');
    }
    
    if (laborData.date_of_joining && isNaN(new Date(laborData.date_of_joining).getTime())) {
      errors.push('Invalid date of joining format');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  static async updateProfile(laborId, updateData, files = null) {
    try {
      const currentLabor = await Labor.getLaborById(laborId);
      const userId = currentLabor.user_id;

      if (updateData.email && updateData.email !== currentLabor.users.email) {
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
      const laborData = {};

      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.email !== undefined) userData.email = updateData.email;
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

      if (updateData.labor_code !== undefined) laborData.labor_code = updateData.labor_code;
      if (updateData.dob !== undefined) laborData.dob = updateData.dob;
      if (updateData.address !== undefined) laborData.address = updateData.address;
      if (updateData.notes !== undefined) laborData.notes = updateData.notes;
      if (updateData.date_of_joining !== undefined) laborData.date_of_joining = updateData.date_of_joining;
      if (updateData.trade !== undefined) laborData.trade = updateData.trade;
      if (updateData.experience !== undefined) laborData.experience = updateData.experience;
      if (updateData.hourly_rate !== undefined) laborData.hourly_rate = updateData.hourly_rate;
      if (updateData.supervisor_id !== undefined) laborData.supervisor_id = updateData.supervisor_id;
      if (updateData.availability !== undefined) laborData.availability = updateData.availability;
      if (updateData.management_type !== undefined) laborData.management_type = updateData.management_type;

      if (updateData.certifications !== undefined) {
        laborData.certifications = updateData.certifications ? JSON.stringify(updateData.certifications) : null;
      }
      if (updateData.skills !== undefined) {
        laborData.skills = updateData.skills ? JSON.stringify(updateData.skills) : null;
      }


      if (fileUrls.photo_url) userData.photo_url = fileUrls.photo_url;
      if (fileUrls.id_proof_url) laborData.id_proof_url = fileUrls.id_proof_url;
      if (fileUrls.resume_url) laborData.resume_url = fileUrls.resume_url;


      const updatePromises = [];
      
      if (Object.keys(userData).length > 0) {
        updatePromises.push(User.update(userId, userData));
      }

      if (Object.keys(laborData).length > 0) {
        updatePromises.push(Labor.update(laborId, laborData));
      }


      await Promise.all(updatePromises);

      const updatedLabor = await Labor.getLaborById(laborId);
      return updatedLabor;
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

  static async getCustomLabor(page = 1, limit = 10) {
    try {
      const result = await Labor.getCustomLabor(page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getLaborByJob(jobId, page = 1, limit = 10) {
    try {
      const result = await Labor.getLaborByJob(jobId, page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
