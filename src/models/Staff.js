import { supabase } from '../config/database.js';

export class Staff {
  static async create(staffData) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([staffData])
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getAllStaff(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

     
      const [countResult, dataResult] = await Promise.all([
        supabase
          .from('staff')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('staff')
          .select(`
            *,
            users (
              id,
              full_name,
              email,
              phone,
              role,
              status,
              photo_url,
              created_at
            )
          `)
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1)
      ]);

      if (countResult.error) {
        throw new Error(`Database error: ${countResult.error.message}`);
      }

      if (dataResult.error) {
        throw new Error(`Database error: ${dataResult.error.message}`);
      }

      const count = countResult.count || 0;
      const data = dataResult.data || [];
      const totalPages = Math.ceil(count / limit);

      return {
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStaffById(staffId) {
    try {      
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .eq('id', staffId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Staff not found with ID: ${staffId}`);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(staffId, updateData) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', staffId)
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(staffId) {
    try {
     
      const { data: staff, error: fetchError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          position,
          department,
          users!inner (
            id,
            full_name,
            email
          )
        `)
        .eq('id', staffId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      if (!staff) {
        throw new Error('Staff not found');
      }

      const userId = staff.user_id;

      
      const [staffDeleteResult, userDeleteResult] = await Promise.all([
        supabase
          .from('staff')
          .delete()
          .eq('id', staffId),
        supabase
          .from('users')
          .delete()
          .eq('id', userId)
      ]);

      if (staffDeleteResult.error) {
        throw new Error(`Database error: ${staffDeleteResult.error.message}`);
      }

      if (userDeleteResult.error) {
        throw new Error(`Database error: ${userDeleteResult.error.message}`);
      }

      return {
        success: true,
        message: `Staff "${staff.users.full_name}" deleted successfully`,
        deleted_staff: {
          id: staff.id,
          full_name: staff.users.full_name,
          email: staff.users.email,
          position: staff.position,
          department: staff.department
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStaffByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          users!inner (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getStaffByUserIdForLogin(userId) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          position,
          department,
          date_of_joining,
          address,
          management_type,
          system_ip,
          created_at
        `)
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      return data || null;
    } catch (error) {
      throw error;
    }
  }

  static async search(filters, pagination = {}) {
    try {
      const q = (filters.q || '').toLowerCase().trim();

      
      const { data, error } = await supabase
        .from("staff")
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            role,
            status,
            photo_url,
            created_at
          )
        `);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const inStr = (s) => (s || '').toString().toLowerCase().includes(q);

      const matches = (staff) => {
       
        if (q) {
          const staffMatch = inStr(staff.users?.full_name) || 
                            inStr(staff.users?.email) || 
                            inStr(staff.users?.phone) || 
                            inStr(staff.address) ||
                            inStr(staff.position) ||
                            inStr(staff.department);
          if (!staffMatch) return false;
        }

   
        if (filters.name && !inStr(staff.users?.full_name)) return false;
        if (filters.phone && !inStr(staff.users?.phone)) return false;
        if (filters.email && !inStr(staff.users?.email)) return false;
        if (filters.address && !inStr(staff.address)) return false;
        if (filters.position && !inStr(staff.position)) return false;
        if (filters.department && !inStr(staff.department)) return false;
        if (filters.status && staff.users?.status !== filters.status) return false;
        if (filters.role && staff.users?.role !== filters.role) return false;

      
        if (filters.dob_from && staff.dob && new Date(staff.dob) < filters.dob_from) return false;
        if (filters.dob_to && staff.dob && new Date(staff.dob) > filters.dob_to) return false;
        if (filters.date_of_joining_from && staff.date_of_joining && new Date(staff.date_of_joining) < filters.date_of_joining_from) return false;
        if (filters.date_of_joining_to && staff.date_of_joining && new Date(staff.date_of_joining) > filters.date_of_joining_to) return false;

        return true;
      };

      let filtered = (data || []).filter(matches);

    
      filtered = filtered.sort((a, b) => {
        const dateA = new Date(a.users?.created_at || 0);
        const dateB = new Date(b.users?.created_at || 0);
        return dateB - dateA;
      });

      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const sliced = filtered.slice(offset, offset + limit);

      return {
        staff: sliced,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit) || 1
      };
    } catch (error) {
      throw error;
    }
  }

  static async getStats() {
    try {
  
      const [
        { count: totalStaff },
        { count: staffCount },
        { count: leadLaborCount },
        { count: laborCount },
        { count: supplierCount }
      ] = await Promise.all([
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('lead_labor').select('*', { count: 'exact', head: true }),
        supabase.from('labor').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true })
      ]);

      
      const totalStaffAll = (totalStaff || 0) + (leadLaborCount || 0) + (laborCount || 0) + (supplierCount || 0);

      return {
        total_staff: totalStaffAll,
        staff: staffCount || 0,
        lead_labor: leadLaborCount || 0,
        labor: laborCount || 0,
        suppliers: supplierCount || 0
      };
    } catch (error) {
      throw error;
    }
  }
}
