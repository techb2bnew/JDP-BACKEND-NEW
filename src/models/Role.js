import { supabase } from '../config/database.js';
import { RolePermission } from './RolePermission.js';

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
    
      const cacheKey = `role_permissions_${roleId}`;
      const cached = RolePermission.permissionCache?.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < (RolePermission.CACHE_TTL || 5 * 60 * 1000)) {
        return cached.data;
      }

      
      const [roleResult, permissionsResult] = await Promise.all([
        supabase
          .from('roles')
          .select('*')
          .eq('id', roleId)
          .single(),
        supabase
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
          .order('permissions(action)', { ascending: true })
      ]);

      if (roleResult.error) {
        throw new Error(`Role not found with ID: ${roleId}`);
      }

      if (permissionsResult.error) {
        throw new Error(`Database error: ${permissionsResult.error.message}`);
      }

      const role = roleResult.data;
      const rolePermissions = permissionsResult.data || [];

      
      const formattedPermissions = new Array(rolePermissions.length);
      let allowedCount = 0;
      let deniedCount = 0;

      for (let i = 0; i < rolePermissions.length; i++) {
        const rp = rolePermissions[i];
        formattedPermissions[i] = {
          id: rp.id,
          allowed: rp.allowed,
          permission_id: rp.permission_id,
          permission: rp.permissions
        };
        
        
        if (rp.allowed) {
          allowedCount++;
        } else {
          deniedCount++;
        }
      }

      const result = {
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
        allowed_permissions: allowedCount,
        denied_permissions: deniedCount
      };

     
      if (RolePermission.permissionCache) {
        RolePermission.permissionCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async checkRoleRelationships(roleId) {
    try {
      if (!roleId) {
        throw new Error('Role ID is required');
      }

     
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('role_name')
        .eq('id', roleId)
        .single();

      if (roleError || !role) {
        throw new Error('Role not found');
      }

      const relationships = [];

     
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('role', role.role_name)
        .limit(100); 

      if (!usersError && usersData && usersData.length > 0) {
        relationships.push({
          table: 'users',
          count: usersData.length,
          message: `This role is assigned to ${usersData.length} user(s)`
        });
      }

     
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('id')
        .eq('role_id', roleId)
        .limit(1);

      if (!permissionsError && permissionsData && permissionsData.length > 0) {
        relationships.push({
          table: 'role_permissions',
          count: permissionsData.length,
          message: 'This role has associated permissions'
        });
      }

      return {
        hasRelationships: relationships.length > 0,
        relationships: relationships,
        canDelete: relationships.length === 0
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
