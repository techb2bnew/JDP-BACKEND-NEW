import { LeadLabor } from '../models/LeadLabor.js';
import { User } from '../models/User.js';
import { Job } from '../models/Job.js';
import { RolePermission } from '../models/RolePermission.js';
import { JobBluesheetLabor } from '../models/JobBluesheetLabor.js';
import { JobBluesheet } from '../models/JobBluesheet.js';
import { generateTemporaryPassword } from "../lib/generateTemporaryPassword.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  sendWelcomeEmail
} from "../helpers/authHelper.js";
import { successResponse } from "../helpers/responseHelper.js";
import { supabase } from '../config/database.js';

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
        hourly_rate: leadLaborData.hourly_rate || null,
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

  static async getLeadLaborByIdForMobile(leadLaborId) {
    try {
      const data = await LeadLabor.getLeadLaborByIdForMobile(leadLaborId);
      return successResponse(
        data,
        "Lead labor retrieved successfully for mobile app",
        200
      );
    } catch (error) {
      throw error;
    }
  }

  static async getLeadLaborById(leadLaborId, page = 1, limit = 50) {
    try {
      const leadLabor = await LeadLabor.getLeadLaborById(leadLaborId);

      const roleName = leadLabor?.users?.role || leadLabor?.user?.role || null;

     
      const allJobsResult = await Job.getJobsByLeadLabor(leadLaborId, 1, 99999).catch((error) => {
        console.error(`Failed to load jobs for lead labor ${leadLaborId}:`, error.message);
        return null;
      });

      
      const jobsResult = await Job.getJobsByLeadLabor(leadLaborId, page, limit).catch((error) => {
        console.error(`Failed to load paginated jobs for lead labor ${leadLaborId}:`, error.message);
        return null;
      });

      const [permissionsResult, bluesheetIds] = await Promise.all([
        roleName
          ? RolePermission.getPermissionsByRoleName(roleName.trim()).catch((error) => {
              console.warn(`Failed to load permissions for role "${roleName}":`, error.message);
              return [];
            })
          : [],
        JobBluesheetLabor.findBluesheetIdsByLeadLaborId(leadLaborId).catch((error) => {
          console.error(`Failed to load bluesheet ids for lead labor ${leadLaborId}:`, error.message);
          return [];
        })
      ]);

      let bluesheets = [];
      if (Array.isArray(bluesheetIds) && bluesheetIds.length > 0) {
        try {
          bluesheets = await JobBluesheet.findByIds(bluesheetIds);
        } catch (error) {
          console.error(`Failed to load bluesheets for lead labor ${leadLaborId}:`, error.message);
        }
      }

    
      const activeJobStatuses = new Set(['active', 'in_progress']);
      const completedJobStatuses = new Set(['completed', 'done', 'closed']);
      
      let totalJobs = 0;
      let activeJobs = 0;
      let completedJobs = 0;

      if (allJobsResult && allJobsResult.jobs) {
        totalJobs = allJobsResult.total || allJobsResult.jobs.length;
        allJobsResult.jobs.forEach(job => {
          const status = (job.status || '').toLowerCase();
          if (activeJobStatuses.has(status)) {
            activeJobs++;
          } else if (completedJobStatuses.has(status)) {
            completedJobs++;
          }
        });
      }

      return {
        ...leadLabor,
        assigned_jobs: jobsResult
          ? {
              total: totalJobs,
              active: activeJobs,
              completed: completedJobs,
              page: jobsResult.page,
              limit: jobsResult.limit,
              totalPages: jobsResult.totalPages,
              jobs: jobsResult.jobs
            }
          : { total: 0, active: 0, completed: 0, page, limit, totalPages: 0, jobs: [] },
        permissions: permissionsResult || [],
        bluesheets: {
          total: bluesheets.length,
          records: bluesheets
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateLeadLabor(leadLaborId, updateData, files = null) {
    try {
    
      let currentLeadLaborEmail = null;
      let userId = null;

      if (updateData.email) {
     
        const { data: currentLeadLabor, error: fetchError } = await supabase
          .from('lead_labor')
          .select(`
            id,
            user_id,
            users!inner (
              id,
              email
            )
          `)
          .eq('id', leadLaborId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentLeadLabor) {
          throw new Error('Lead Labor not found');
        }

        userId = currentLeadLabor.user_id;
        currentLeadLaborEmail = currentLeadLabor.users.email;

       
        if (updateData.email !== currentLeadLaborEmail) {
          const existingUser = await User.findByEmail(updateData.email);
          if (existingUser) {
            throw new Error('Email already exists');
          }
        }
      } else {
       
        const { data: currentLeadLabor, error: fetchError } = await supabase
          .from('lead_labor')
          .select('id, user_id')
          .eq('id', leadLaborId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentLeadLabor) {
          throw new Error('Lead Labor not found');
        }

        userId = currentLeadLabor.user_id;
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
      if (updateData.hourly_rate !== undefined) leadLaborData.hourly_rate = updateData.hourly_rate;
      if (updateData.agreed_terms !== undefined) leadLaborData.agreed_terms = updateData.agreed_terms;

      if (fileUrls.id_proof_url) leadLaborData.id_proof_url = fileUrls.id_proof_url;
      if (fileUrls.photo_url) leadLaborData.photo_url = fileUrls.photo_url;
      if (fileUrls.resume_url) leadLaborData.resume_url = fileUrls.resume_url;

     
      const updatePromises = [];
      
      if (Object.keys(userData).length > 0) {
        updatePromises.push(User.update(userId, userData));
      }

      if (Object.keys(leadLaborData).length > 0) {
        updatePromises.push(LeadLabor.update(leadLaborId, leadLaborData));
      }

      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      const updatedLeadLabor = await LeadLabor.getLeadLaborById(leadLaborId);
      return updatedLeadLabor;
    } catch (error) {
      throw error;
    }
  }

  static async deleteLeadLabor(leadLaborId) {
    try {
      
      const relationshipCheck = await LeadLabor.checkLeadLaborRelationships(leadLaborId);

      if (!relationshipCheck.canDelete) {
        const relationshipMessages = relationshipCheck.relationships.map(rel => rel.message).join(', ');
        throw new Error(`Cannot delete this lead labor because it has related data: ${relationshipMessages}. Please remove all related data first.`);
      }

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
      
      let currentLeadLaborEmail = null;
      let userId = null;

      if (updateData.email) {
       
        const { data: currentLeadLabor, error: fetchError } = await supabase
          .from('lead_labor')
          .select(`
            id,
            user_id,
            users!inner (
              id,
              email
            )
          `)
          .eq('id', leadLaborId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentLeadLabor) {
          throw new Error('Lead Labor not found');
        }

        userId = currentLeadLabor.user_id;
        currentLeadLaborEmail = currentLeadLabor.users.email;

      
        if (updateData.email !== currentLeadLaborEmail) {
          const existingUser = await User.findByEmail(updateData.email);
          if (existingUser) {
            throw new Error('Email already exists');
          }
        }
      } else {

        const { data: currentLeadLabor, error: fetchError } = await supabase
          .from('lead_labor')
          .select('id, user_id')
          .eq('id', leadLaborId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!currentLeadLabor) {
          throw new Error('Lead Labor not found');
        }

        userId = currentLeadLabor.user_id;
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
      if (updateData.hourly_rate !== undefined) leadLaborData.hourly_rate = updateData.hourly_rate;
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

  static async importLeadLabor(csvContent, createdByUserId) {
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
          
          const leadLaborData = this.mapCSVRowToLeadLabor(row, headerMap, createdByUserId);

          if (!leadLaborData.full_name || !leadLaborData.email) {
            results.errors.push({
              row: i + 1,
              error: 'Full name and email are required'
            });
            continue;
          }

          results.total++;

          const existingLeadLabor = await LeadLabor.findByIdOrCode(
            leadLaborData.id,
            leadLaborData.labor_code,
            leadLaborData.email
          );

          if (existingLeadLabor) {
            const updateData = { ...leadLaborData };
            delete updateData.id;
            delete updateData.created_by;
            delete updateData.created_at;

            const updatedLeadLabor = await LeadLaborService.updateLeadLabor(existingLeadLabor.id, updateData);
            results.updated++;
            results.success.push({
              row: i + 1,
              action: 'updated',
              lead_labor_id: existingLeadLabor.id,
              full_name: updatedLeadLabor.full_name || updatedLeadLabor.users?.full_name
            });
          } else {
            const newLeadLabor = await LeadLaborService.createLeadLaborWithUser(leadLaborData);
            results.created++;
            results.success.push({
              row: i + 1,
              action: 'created',
              lead_labor_id: newLeadLabor.leadLabor.id,
              full_name: newLeadLabor.leadLabor.users?.full_name || newLeadLabor.leadLabor.full_name
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
      // e.g., "Date of Joi" should match "date of join"
      if (normalized.includes('date') && normalized.includes('joi')) {
        map['date of join'] = index;
        map['date of joi'] = index;
      }
      if (normalized.includes('date') && normalized.includes('join')) {
        map['date of join'] = index;
        map['date of joi'] = index;
      }
      if (normalized.includes('dob') || (normalized.includes('date') && normalized.includes('birth'))) {
        map['dob'] = index;
        map['date of birth'] = index;
      }
      if (normalized.includes('depart')) {
        map['department'] = index;
        map['departmei'] = index;
      }
      if (normalized.includes('special')) {
        map['specialization'] = index;
        map['specializa'] = index;
      }
      if (normalized.includes('lead') && normalized.includes('labo')) {
        map['lead labo name'] = index;
        map['lead labo'] = index;
        map['name'] = index;
      }
      if (normalized.includes('hourly') && normalized.includes('rate')) {
        map['hourly rate'] = index;
        map['hourly_rate'] = index;
        map['hourlyrate'] = index;
      }
    });
    return map;
  }

  static mapCSVRowToLeadLabor(row, headerMap, createdByUserId) {
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

    const extractLaborCode = (name) => {
      if (!name) return null;
      const codeMatch = name.match(/(LL-\d{4}-\d+)/);
      return codeMatch ? codeMatch[1] : null;
    };

    const leadLaborData = {};

    const id = getValue('id');
    if (id) {
      const parsedId = parseInteger(id);
      if (parsedId) leadLaborData.id = parsedId;
    }

    const leadLaboName = getValue('lead labo') || getValue('lead labo name') || getValue('name');
    leadLaborData.full_name = leadLaboName || null;
    
    const laborCode = extractLaborCode(leadLaboName);
    if (laborCode) {
      leadLaborData.labor_code = laborCode;
    }

    leadLaborData.email = getValue('email') || null;
    
    const phone = getValue('phone');
    if (phone) {
      if (phone.includes('E+') || phone.includes('e+')) {
        const phoneNum = parseFloat(phone);
        if (!isNaN(phoneNum)) {
          leadLaborData.phone = phoneNum.toFixed(0);
        } else {
          leadLaborData.phone = phone;
        }
      } else {
        leadLaborData.phone = phone;
      }
    } else {
      leadLaborData.phone = null;
    }

    const dob = getValue('dob') || getValue('date of birth');
    const parsedDob = dob ? parseDate(dob) : null;
    if (!parsedDob) {
      throw new Error('DOB (Date of Birth) is required and must be in valid format (DD-MM-YYYY, YYYY-MM-DD, or MM/DD/YYYY)');
    }
    leadLaborData.dob = parsedDob;

    const address = getValue('address');
    if (!address || address.trim() === '') {
      throw new Error('Address is required');
    }
    leadLaborData.address = address;

    const department = getValue('departmei') || getValue('department');
    if (!department || department.trim() === '') {
      throw new Error('Department is required');
    }
    leadLaborData.department = department;

    // Try multiple variations of "Date of Join" column name
    const dateOfJoin = getValue('date of joi') || 
                       getValue('date of join') || 
                       getValue('date_of_joining') ||
                       getValue('date of jo') ||
                       getValue('dateofjoin') ||
                       getValue('joining date') ||
                       getValue('join date');
    
    const parsedDateOfJoin = dateOfJoin ? parseDate(dateOfJoin) : null;
    if (!parsedDateOfJoin) {
      // If date of join is missing, use current date as default
      leadLaborData.date_of_joining = new Date().toISOString().split('T')[0];
    } else {
      leadLaborData.date_of_joining = parsedDateOfJoin;
    }

    leadLaborData.specialization = getValue('specializa') || getValue('specialization') || null;
    leadLaborData.experience = getValue('experience') || null;
    
    const hourlyRate = getValue('hourly rate') || getValue('hourly_rate') || getValue('hourlyrate');
    leadLaborData.hourly_rate = hourlyRate ? parseNumber(hourlyRate) : null;

    const availability = getValue('availability');
    if (availability) {
      leadLaborData.status = availability.toLowerCase() === 'available' ? 'active' : 'inactive';
    } else {
      leadLaborData.status = 'active';
    }

    leadLaborData.role = 'lead_labor';
    leadLaborData.management_type = 'lead_labor';

    return leadLaborData;
  }
}
