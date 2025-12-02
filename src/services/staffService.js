import { Staff } from '../models/Staff.js';
import { User } from '../models/User.js';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
import { successResponse } from "../helpers/responseHelper.js";
import { supabase } from '../config/database.js';

export class StaffService {
  static async createStaffWithUser(staffData) {
    try {
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
      
      const { data: currentStaff, error: fetchError } = await supabase
        .from('staff')
        .select('id, user_id')
        .eq('id', staffId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!currentStaff) {
        throw new Error('Staff not found');
      }

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

 
      const updatePromises = [];
      
      if (Object.keys(userData).length > 0) {
        updatePromises.push(User.update(userId, userData));
      }

      if (Object.keys(staffData).length > 0) {
        updatePromises.push(Staff.update(staffId, staffData));
      }

   
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
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
    
      let currentStaffEmail = null;
      let userId = null;

      if (updateData.email) {
   
        const { data: currentStaff, error: fetchError } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            users!inner (
              id,
              email
            )
          `)
          .eq('id', staffId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentStaff) {
          throw new Error('Staff not found');
        }

        userId = currentStaff.user_id;
        currentStaffEmail = currentStaff.users.email;

      
        if (updateData.email !== currentStaffEmail) {
          const existingUser = await User.findByEmail(updateData.email);
          if (existingUser) {
            throw new Error('Email already exists');
          }
        }
      } else {
        
        const { data: currentStaff, error: fetchError } = await supabase
          .from('staff')
          .select('id, user_id')
          .eq('id', staffId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentStaff) {
          throw new Error('Staff not found');
        }

        userId = currentStaff.user_id;
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

  static async updateProfileImage(staffId, files) {
    try {
      if (!files || !files.profile_image || !files.profile_image[0]) {
        throw new Error('Profile image file is required');
      }

      
      const { data: staff, error: fetchError } = await supabase
        .from('staff')
        .select('id')
        .eq('id', staffId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!staff) {
        throw new Error('Staff not found');
      }

    
      const profileImageUrl = files.profile_image[0].location;

      
      const updateData = {
        profile_image: profileImageUrl
      };

      const updatedStaff = await Staff.update(staffId, updateData);
      return updatedStaff;
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

  static async searchStaff(filters, pagination) {
    try {
      const result = await Staff.search(filters, pagination);
      return successResponse(
        {
          staff: result.staff,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Staff searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async getStaffStats() {
    try {
      const stats = await Staff.getStats();
      return stats;
    } catch (error) {
      throw error;
    }
  }

  static async importStaff(csvContent, createdByUserId) {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = this.parseCSVLine(lines[0]);
      const headerMap = this.mapCSVHeaders(headers);

      const results = {
        total: 0,
        created: 0,
        updated: 0,
        errors: [],
        success: []
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const row = this.parseCSVLine(line);
          
          // Debug: Log header map for first row to help troubleshoot
          if (i === 1) {
            console.log('CSV Headers detected:', Object.keys(headerMap));
          }
          
          const staffData = this.mapCSVRowToStaff(row, headerMap, createdByUserId);

          if (!staffData.full_name || !staffData.email) {
            results.errors.push({
              row: i + 1,
              error: 'Full name and email are required'
            });
            continue;
          }

          results.total++;

          const existingStaff = await Staff.findByIdOrEmail(
            staffData.id,
            staffData.email
          );

          if (existingStaff) {
            const updateData = { ...staffData };
            delete updateData.id;
            delete updateData.created_by;
            delete updateData.created_at;

            const updatedStaff = await StaffService.updateStaff(existingStaff.id, updateData);
            results.updated++;
            results.success.push({
              row: i + 1,
              action: 'updated',
              staff_id: existingStaff.id,
              full_name: updatedStaff.full_name || updatedStaff.users?.full_name
            });
          } else {
            const newStaff = await StaffService.createStaffWithUser(staffData);
            results.created++;
            results.success.push({
              row: i + 1,
              action: 'created',
              staff_id: newStaff.staff.id,
              full_name: newStaff.staff.users?.full_name || newStaff.staff.full_name
            });
          }
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error.message
          });
        }
      }

      return {
        success: true,
        message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
        data: results
      };
    } catch (error) {
      throw error;
    }
  }

  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  static mapCSVHeaders(headers) {
    const map = {};
    headers.forEach((header, index) => {
      const normalized = header.trim().toLowerCase();
      map[normalized] = index;
      
      // Also map partial matches for truncated headers
      if (normalized.includes('date') && normalized.includes('joi')) {
        map['date of join'] = index;
        map['date of jo'] = index;
      }
      if (normalized.includes('date') && normalized.includes('join')) {
        map['date of join'] = index;
        map['date of jo'] = index;
      }
      if (normalized.includes('depart')) {
        map['department'] = index;
        map['departme'] = index;
      }
      if (normalized.includes('posit')) {
        map['position'] = index;
      }
    });
    return map;
  }

  static mapCSVRowToStaff(row, headerMap, createdByUserId) {
    const getValue = (key) => {
      let index = headerMap[key];
      
      // If exact match not found, try partial matches
      if (index === undefined) {
        const matchingKey = Object.keys(headerMap).find(h => 
          h.includes(key.toLowerCase()) || key.toLowerCase().includes(h)
        );
        if (matchingKey) {
          index = headerMap[matchingKey];
        }
      }
      
      return index !== undefined && row[index] ? row[index].trim() : null;
    };

    const parseNumber = (value) => {
      if (!value) return null;
      const cleaned = value.toString().replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    const parseInteger = (value) => {
      if (!value) return null;
      const cleaned = value.toString().replace(/[^0-9]/g, '');
      const num = parseInt(cleaned);
      return isNaN(num) ? null : num;
    };

    const parseDate = (value) => {
      if (!value || value.trim() === '' || value.includes('########') || value.includes('#')) {
        return null;
      }
      
      // Try DD-MM-YYYY format
      let dateMatch = value.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Try YYYY-MM-DD format
      dateMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Try MM/DD/YYYY format
      dateMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Try to parse as ISO date
      const isoDate = new Date(value);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
      
      return null;
    };

    const staffData = {};

    const id = getValue('id');
    if (id) {
      const parsedId = parseInteger(id);
      if (parsedId) staffData.id = parsedId;
    }

    const name = getValue('name');
    staffData.full_name = name || null;

    staffData.email = getValue('email') || null;
    
    const phone = getValue('phone');
    if (phone) {
      if (phone.includes('E+') || phone.includes('e+')) {
        const phoneNum = parseFloat(phone);
        if (!isNaN(phoneNum)) {
          staffData.phone = phoneNum.toFixed(0);
        } else {
          staffData.phone = phone;
        }
      } else {
        staffData.phone = phone;
      }
    } else {
      staffData.phone = null;
    }

    const address = getValue('address');
    staffData.address = address || null;

    staffData.position = getValue('position') || null;

    const department = getValue('departme') || getValue('department');
    staffData.department = department || null;

    const dateOfJoin = getValue('date of jo') || 
                       getValue('date of joi') || 
                       getValue('date of join') || 
                       getValue('date_of_joining');
    
    const parsedDateOfJoin = dateOfJoin ? parseDate(dateOfJoin) : null;
    if (!parsedDateOfJoin) {
      // If date of join is missing, use current date as default
      staffData.date_of_joining = new Date().toISOString().split('T')[0];
    } else {
      staffData.date_of_joining = parsedDateOfJoin;
    }

    const status = getValue('status');
    if (status) {
      staffData.status = status.toLowerCase() === 'active' ? 'active' : 'inactive';
    } else {
      staffData.status = 'active';
    }

    staffData.role = 'staff';
    staffData.management_type = 'staff';

    return staffData;
  }
}
