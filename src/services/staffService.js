import { Staff } from '../models/Staff.js';
import { User } from '../models/User.js';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
export class StaffService {
  static async createStaffWithUser(staffData) {
    try {
      // Check if email already exists
      const existingUser = await User.findByEmail(staffData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await hashPassword(temporaryPassword);

      const userData = {
        full_name: staffData.full_name,
        email: staffData.email,
        password: hashedPassword,
        phone: staffData.phone,
        role: staffData.role,
        status: staffData.status,
        management_type: staffData.management_type

      };

      const user = await User.create(userData);

      const staffRecordData = {
        user_id: user.id,
        position: staffData.position,
        department: staffData.department,
        date_of_joining: staffData.date_of_joining,
        address: staffData.address,
        management_type: staffData.management_type,
        dob: staffData.dob,
        system_ip: staffData.system_ip
      };

      const staff = await Staff.create(staffRecordData);
      const completeStaff = await Staff.getStaffById(staff.id);

      // Send email asynchronously without blocking response
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
        staff: completeStaff,
        message: 'Staff created successfully with user account'
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllStaff(page = 1, limit = 10) {
    try {
      const result = await Staff.getAllStaff(page, limit);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getStaffById(staffId) {
    try {
      const staff = await Staff.getStaffById(staffId);
      return staff;
    } catch (error) {
      throw error;
    }
  }

  static async updateStaff(staffId, updateData) {
    try {

      const currentStaff = await Staff.getStaffById(staffId);
      const userId = currentStaff.user_id;

      const userData = {};
      const staffData = {};

      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.email !== undefined) userData.email = updateData.email;
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

      if (updateData.position !== undefined) staffData.position = updateData.position;
      if (updateData.department !== undefined) staffData.department = updateData.department;
      if (updateData.date_of_joining !== undefined) staffData.date_of_joining = updateData.date_of_joining;
      if (updateData.address !== undefined) staffData.address = updateData.address;
      if (updateData.dob !== undefined) staffData.dob = updateData.dob;


      if (Object.keys(userData).length > 0) {
        await User.update(userId, userData);
      }

      if (Object.keys(staffData).length > 0) {
        await Staff.update(staffId, staffData);
      }

      const updatedStaff = await Staff.getStaffById(staffId);
      return updatedStaff;
    } catch (error) {
      throw error;
    }
  }

  static async deleteStaff(staffId) {
    try {
      const result = await Staff.delete(staffId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updateProfile(staffId, updateData, files = null) {
    try {
      const currentStaff = await Staff.getStaffById(staffId);
      const userId = currentStaff.user_id;


      if (updateData.email && updateData.email !== currentStaff.users.email) {
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
      const staffData = {};


      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.email !== undefined) userData.email = updateData.email;
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

  
      if (updateData.position !== undefined) staffData.position = updateData.position;
      if (updateData.department !== undefined) staffData.department = updateData.department;
      if (updateData.date_of_joining !== undefined) staffData.date_of_joining = updateData.date_of_joining;
      if (updateData.address !== undefined) staffData.address = updateData.address;
      if (updateData.management_type !== undefined) staffData.management_type = updateData.management_type;


      if (fileUrls.photo_url) userData.photo_url = fileUrls.photo_url;
      if (fileUrls.id_proof_url) staffData.id_proof_url = fileUrls.id_proof_url;
      if (fileUrls.resume_url) staffData.resume_url = fileUrls.resume_url;


      const updatePromises = [];
      
      if (Object.keys(userData).length > 0) {
        updatePromises.push(User.update(userId, userData));
      }

      if (Object.keys(staffData).length > 0) {
        updatePromises.push(Staff.update(staffId, staffData));
      }


      await Promise.all(updatePromises);

      const updatedStaff = await Staff.getStaffById(staffId);
      return updatedStaff;
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

  static validateStaffData(staffData) {
    const errors = [];

    if (!staffData.full_name) {
      errors.push('Full name is required');
    }
    if (!staffData.email) {
      errors.push('Email is required');
    }

    if (!staffData.position) {
      errors.push('Position is required');
    }
    if (!staffData.department) {
      errors.push('Department is required');
    }

    if (staffData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffData.email)) {
      errors.push('Invalid email format');
    }
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }
}
