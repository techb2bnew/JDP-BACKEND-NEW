import { Labor } from '../models/Labor.js';
import { User } from '../models/User.js';
import { LeadLabor } from '../models/LeadLabor.js';
import { Job } from '../models/Job.js';
import { RolePermission } from '../models/RolePermission.js';
import { JobBluesheetLabor } from '../models/JobBluesheetLabor.js';
import { JobBluesheet } from '../models/JobBluesheet.js';
import { supabase } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
import { successResponse } from "../helpers/responseHelper.js";
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
        management_type: laborData.management_type
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
        hours_worked: laborData.hours_worked || 0,
        total_cost: laborData.total_cost || 0,
        supervisor_id: supervisorId,
        availability: laborData.availability || null,
        system_ip: laborData.system_ip,
        certifications: laborData.certifications ? JSON.stringify(laborData.certifications) : null,
        skills: laborData.skills ? JSON.stringify(laborData.skills) : null,
        management_type: laborData.management_type,
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

  static async getLaborByIdForMobile(laborId) {
    try {
      const data = await Labor.getLaborByIdForMobile(laborId);
      return successResponse(
        data,
        "Labor retrieved successfully for mobile app",
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async getLaborById(laborId, page = 1, limit = 50) {
    try {
      const labor = await Labor.getLaborById(laborId);

      const roleName = labor?.users?.role || labor?.user?.role || null;


      const bluesheetIdsPromise = JobBluesheetLabor.findBluesheetIdsByLaborId(laborId).catch((error) => {
        console.error(`Failed to load bluesheet ids for labor ${laborId}:`, error.message);
        return [];
      });


      const bluesheetIds = await bluesheetIdsPromise;


      const [jobsResult, permissionsResult, bluesheets] = await Promise.all([
        Job.getJobsByLabor(laborId, page, limit).catch((error) => {
          console.error(`Failed to load jobs for labor ${laborId}:`, error.message);
          return null;
        }),
        roleName
          ? RolePermission.getPermissionsByRoleName(roleName.trim())
            .catch((error) => {
              console.warn(`Failed to load permissions for role "${roleName}":`, error.message);
              return [];
            })
          : [],

        Array.isArray(bluesheetIds) && bluesheetIds.length > 0
          ? JobBluesheet.findByIds(bluesheetIds).catch((error) => {
            console.error(`Failed to load bluesheets for labor ${laborId}:`, error.message);
            return [];
          })
          : []
      ]);


      const jobSummary = jobsResult?.summary || {
        total_jobs: jobsResult?.total ?? 0,
        active_jobs: 0,
        completed_jobs: 0
      };

      return {
        ...labor,
        assigned_jobs: jobsResult
          ? {
            total: jobsResult.total,
            page: jobsResult.page,
            limit: jobsResult.limit,
            totalPages: jobsResult.totalPages,
            jobs: jobsResult.jobs
          }
          : { total: 0, page, limit, totalPages: 0, jobs: [] },
        permissions: permissionsResult || [],
        bluesheets: {
          total: bluesheets.length,
          records: bluesheets
        },
        job_summary: jobSummary
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateLabor(laborId, updateData) {
    try {

      const { data: laborCheck } = await supabase
        .from('labor')
        .select('user_id, labor_code')
        .eq('id', laborId)
        .single();

      if (!laborCheck) {
        throw new Error(`Labor not found with ID: ${laborId}`);
      }

      const userId = laborCheck.user_id;

      const userData = {};
      const laborData = {};


      let currentEmail = null;
      if (updateData.email !== undefined) {
        const { data: currentLabor } = await supabase
          .from('labor')
          .select('users!labor_user_id_fkey(email)')
          .eq('id', laborId)
          .single();
        currentEmail = currentLabor?.users?.email;

        if (updateData.email !== currentEmail) {
          const existingUser = await User.findByEmail(updateData.email, false);
          if (existingUser) {
            throw new Error('Email already exists');
          }
        }
        userData.email = updateData.email;
      }

      if (updateData.full_name !== undefined) userData.full_name = updateData.full_name;
      if (updateData.phone !== undefined) userData.phone = updateData.phone;
      if (updateData.status !== undefined) userData.status = updateData.status;
      if (updateData.role !== undefined) userData.role = updateData.role;

      if (updateData.labor_code !== undefined) {
        if (updateData.labor_code !== laborCheck.labor_code) {
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

          const [supervisorCheck, leadLaborCheck] = await Promise.all([
            supabase
              .from('users')
              .select('id')
              .eq('id', updateData.supervisor_id)
              .single(),
            LeadLabor.getLeadLaborByUserId(updateData.supervisor_id)
          ]);

          if (!supervisorCheck.data) {
            throw new Error(`Supervisor with ID ${updateData.supervisor_id} not found`);
          }

          if (!leadLaborCheck) {
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

  static async deleteLabor(laborId) {
    try {

      const relationshipCheck = await Labor.checkLaborRelationships(laborId);

      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this labor because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

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

      const { data: laborCheck } = await supabase
        .from('labor')
        .select('user_id')
        .eq('id', laborId)
        .single();

      if (!laborCheck) {
        throw new Error(`Labor not found with ID: ${laborId}`);
      }

      const userId = laborCheck.user_id;


      if (updateData.email) {
        const { data: currentLabor } = await supabase
          .from('labor')
          .select('users!labor_user_id_fkey(email)')
          .eq('id', laborId)
          .single();

        const currentEmail = currentLabor?.users?.email;
        if (updateData.email !== currentEmail) {
          const existingUser = await User.findByEmail(updateData.email, false);
          if (existingUser) {
            throw new Error('Email already exists');
          }
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

  static async searchLabor(filters, pagination) {
    try {
      const result = await Labor.search(filters, pagination);
      return successResponse(
        {
          labor: result.labor,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        },
        "Labor searched successfully"
      );
    } catch (error) {
      throw error;
    }
  }

  static async importLabor(csvContent, createdByUserId) {
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
          
          const laborData = this.mapCSVRowToLabor(row, headerMap, createdByUserId);

          if (!laborData.full_name || !laborData.email) {
            results.errors.push({
              row: i + 1,
              error: 'Full name and email are required'
            });
            continue;
          }

          results.total++;

          // Handle supervisor lookup if supervisor code is provided
          if (laborData._supervisor_code) {
            const supervisor = await LeadLabor.findByLaborCode(laborData._supervisor_code);
            if (supervisor && supervisor.user_id) {
              laborData.supervisor_id = supervisor.user_id;
            }
            delete laborData._supervisor_code;
          }

          const existingLabor = await Labor.findByIdOrCode(
            laborData.id,
            laborData.labor_code,
            laborData.email
          );

          if (existingLabor) {
            const updateData = { ...laborData };
            delete updateData.id;
            delete updateData.created_by;
            delete updateData.created_at;

            const updatedLabor = await LaborService.updateLabor(existingLabor.id, updateData);
            results.updated++;
            results.success.push({
              row: i + 1,
              action: 'updated',
              labor_id: existingLabor.id,
              full_name: updatedLabor.full_name || updatedLabor.users?.full_name
            });
          } else {
            const newLabor = await LaborService.createLaborWithUser(laborData);
            results.created++;
            results.success.push({
              row: i + 1,
              action: 'created',
              labor_id: newLabor.labor.id,
              full_name: newLabor.labor.users?.full_name || newLabor.labor.full_name
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
      if (normalized.includes('dob') || (normalized.includes('date') && normalized.includes('birth'))) {
        map['dob'] = index;
        map['date of birth'] = index;
      }
      if (normalized.includes('labor') && normalized.includes('id')) {
        map['labor id'] = index;
        map['labor_code'] = index;
      }
      if (normalized.includes('hourly') && normalized.includes('rat')) {
        map['hourly rate'] = index;
        map['hourly_rate'] = index;
      }
      if (normalized.includes('avail')) {
        map['availability'] = index;
        map['availabilit'] = index;
      }
      if (normalized.includes('supervis')) {
        map['supervisor'] = index;
        map['superviso'] = index;
      }
      if (normalized.includes('certif')) {
        map['certification'] = index;
        map['certificati'] = index;
      }
      if (normalized.includes('experienc')) {
        map['experience'] = index;
        map['experienc'] = index;
      }
    });
    return map;
  }

  static mapCSVRowToLabor(row, headerMap, createdByUserId) {
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

    const extractLaborCode = (value) => {
      if (!value) return null;
      const codeMatch = value.match(/(LB-\d{4}-\d+)/);
      return codeMatch ? codeMatch[1] : null;
    };

    const laborData = {};

    const id = getValue('id');
    if (id) {
      const parsedId = parseInteger(id);
      if (parsedId) laborData.id = parsedId;
    }

    const laborId = getValue('labor id') || getValue('labor_id');
    if (laborId) {
      const code = extractLaborCode(laborId);
      if (code) {
        laborData.labor_code = code;
      }
    }

    const name = getValue('name');
    laborData.full_name = name || null;

    laborData.email = getValue('email') || null;
    
    const phone = getValue('phone');
    if (phone) {
      if (phone.includes('E+') || phone.includes('e+')) {
        const phoneNum = parseFloat(phone);
        if (!isNaN(phoneNum)) {
          laborData.phone = phoneNum.toFixed(0);
        } else {
          laborData.phone = phone;
        }
      } else {
        laborData.phone = phone;
      }
    } else {
      laborData.phone = null;
    }

    const dob = getValue('dob') || getValue('date of birth');
    const parsedDob = dob ? parseDate(dob) : null;
    if (!parsedDob) {
      // If DOB is missing, use a default date (e.g., 25 years ago from current date)
      const defaultDob = new Date();
      defaultDob.setFullYear(defaultDob.getFullYear() - 25);
      laborData.dob = defaultDob.toISOString().split('T')[0];
    } else {
      laborData.dob = parsedDob;
    }

    const address = getValue('address');
    if (!address || address.trim() === '') {
      throw new Error('Address is required');
    }
    laborData.address = address;

    laborData.trade = getValue('trade') || null;
    laborData.experience = getValue('experienc') || getValue('experience') || null;

    const hourlyRate = getValue('hourly rat') || getValue('hourly rate') || getValue('hourly_rate');
    if (hourlyRate) {
      laborData.hourly_rate = parseNumber(hourlyRate);
    }

    const availability = getValue('availabilit') || getValue('availability');
    if (availability) {
      laborData.availability = availability.toLowerCase();
      laborData.status = availability.toLowerCase() === 'active' ? 'active' : 'inactive';
    } else {
      laborData.status = 'active';
      laborData.availability = 'active';
    }

    const dateOfJoin = getValue('date of jo') || 
                       getValue('date of joi') || 
                       getValue('date of join') || 
                       getValue('date_of_joining');
    
    const parsedDateOfJoin = dateOfJoin ? parseDate(dateOfJoin) : null;
    if (!parsedDateOfJoin) {
      // If date of join is missing, use current date as default
      laborData.date_of_joining = new Date().toISOString().split('T')[0];
    } else {
      laborData.date_of_joining = parsedDateOfJoin;
    }

    const supervisor = getValue('superviso') || getValue('supervisor');
    if (supervisor) {
      // Try to find supervisor by labor code (Lead Labor)
      const supervisorCode = extractLaborCode(supervisor) || supervisor;
      if (supervisorCode) {
        laborData._supervisor_code = supervisorCode;
      }
    }

    laborData.certifications = getValue('certificati') || getValue('certification') || null;
    laborData.skills = getValue('skills') || null;
    laborData.notes = getValue('notes') || null;

    laborData.role = 'labor';
    laborData.management_type = 'labor';

    return laborData;
  }
}
