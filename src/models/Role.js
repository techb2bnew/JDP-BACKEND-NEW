import { supabase } from '../config/database.js';

export class Role {
  static async create(roleData) {
    try {
      const existingRole = await this.findByName(roleData.role_name);
      if (existingRole) {
        return existingRole;
      }

      const { data, error } = await supabase
        .from('roles')
        .insert([roleData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByName(roleName) {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('role_name', roleName)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async getRoleWithPermissions(roleId) {
    try {
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) {
        throw new Error(`Database error: ${roleError.message}`);
      }

      const { data: rolePermissions, error: rpError } = await supabase
        .from('role_permissions')
        .select(`
          id,
          allowed,
          permission_id,
          permissions!inner (
            id,
            module,
            action,
            display_name,
            description
          )
        `)
        .eq('role_id', roleId);

      if (rpError) {
        return {
          ...role,
          role_permissions: []
        };
      }

      const formattedPermissions = rolePermissions.map(rp => ({
        id: rp.id,
        allowed: rp.allowed,
        permissions: rp.permissions
      }));

      return {
        ...role,
        role_permissions: formattedPermissions
      };
    } catch (error) {
      throw error;
    }
  }

  static async getRolePermissionsById(roleId) {
    try {
      
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) {
        throw new Error(`Role not found with ID: ${roleId}`);
      }

      const { data: rolePermissions, error: rpError } = await supabase
        .from('role_permissions')
        .select(`
          id,
          allowed,
          permission_id,
          permissions!inner (
            id,
            module,
            action,
            display_name,
            description
          )
        `)
        .eq('role_id', roleId)
        .order('permissions(module)', { ascending: true })
        .order('permissions(action)', { ascending: true });

      if (rpError) {
        throw new Error(`Database error: ${rpError.message}`);
      }

      const formattedPermissions = rolePermissions.map(rp => ({
        id: rp.id,
        allowed: rp.allowed,
        permission_id: rp.permission_id,
        permission: rp.permissions
      }));

      return {
        role: {
          id: role.id,
          role_name: role.role_name,
          role_type: role.role_type,
          description: role.description,
          is_active: role.is_active,
          created_at: role.created_at,
          updated_at: role.updated_at
        },
        permissions: formattedPermissions,
        total_permissions: formattedPermissions.length,
        allowed_permissions: formattedPermissions.filter(p => p.allowed).length,
        denied_permissions: formattedPermissions.filter(p => !p.allowed).length
      };
    } catch (error) {
      throw error;
    }
  }

  static async deleteRole(roleId) {
    try {
      
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) {
        throw new Error(`Role not found with ID: ${roleId}`);
      }

      const { error: deletePermissionsError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deletePermissionsError) {
        throw new Error(`Failed to delete role permissions: ${deletePermissionsError.message}`);
      }


      const { error: deleteRoleError } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (deleteRoleError) {
        throw new Error(`Failed to delete role: ${deleteRoleError.message}`);
      }

      
      return {
        success: true,
        message: `Role "${role.role_name}" deleted successfully`,
        deleted_role: {
          id: role.id,
          role_name: role.role_name,
          role_type: role.role_type
        }
      };
    } catch (error) {
      throw error;
    }
  }
}
