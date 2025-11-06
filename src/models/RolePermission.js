import { supabase } from '../config/database.js';

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for getAllRolesWithAllPermissions
const rolesWithPermissionsCache = new Map();
const ROLES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes 

export class RolePermission {
  static async getPermissionsByRoleName(roleName) {
    try {
      const cacheKey = `permissions_${roleName}`;
      const cached = permissionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
      }

      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', roleName)
        .single();

      if (roleError || !role) {
        throw new Error(`Role "${roleName}" not found`);
      }

      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          id,
          allowed,
          permissions (
            id,
            module,
            action,
            display_name,
            description
          )
        `)
        .eq('role_id', role.id);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const permissions = data
        .filter(rp => rp.allowed === true && rp.permissions)
        .map(rp => ({
          ...rp.permissions,
          allowed: rp.allowed
        }));

      permissionCache.set(cacheKey, {
        data: permissions,
        timestamp: Date.now()
      });

      return permissions;
    } catch (error) {
      throw error;
    }
  }

  static async bulkUpdateRolePermissions(roleId, permissions, roleName) {
    try {

      if (roleName) {
        const { error: roleUpdateError } = await supabase
          .from('roles')
          .update({ role_name: roleName })
          .eq('id', roleId);

        if (roleUpdateError) {
          throw new Error(`Database error: ${roleUpdateError.message}`);
        }

      }


      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) {
        throw new Error(`Database error: ${deleteError.message}`);
      }


      if (permissions.length > 0) {
        const permissionsToInsert = [];

        for (const perm of permissions) {

          const permissionId = perm.permission_id || perm.id;

          if (permissionId) {
            permissionsToInsert.push({
              role_id: roleId,
              permission_id: permissionId,
              allowed: perm.allowed
            });
          }
        }


        if (permissionsToInsert.length > 0) {
          const { data, error: insertError } = await supabase
            .from('role_permissions')
            .insert(permissionsToInsert)
            .select();

          if (insertError) {
            throw new Error(`Database error: ${insertError.message}`);
          }


          const permissionIds = data.map(rp => rp.permission_id);
          const { data: allPermissions, error: allPermError } = await supabase
            .from('permissions')
            .select('id, module, action, display_name, description')
            .in('id', permissionIds);

          const permissionsWithDetails = data.map(rp => {
            const permData = allPermissions?.find(p => p.id === rp.permission_id);
            if (permData) {
              return {
                ...rp,
                module: permData.module,
                action: permData.action,
                display_name: permData.display_name,
                description: permData.description
              };
            }
            return rp;
          });

          this.clearRolePermissionCache(roleId);
          
          return permissionsWithDetails;
        }
      }

      return [];
    } catch (error) {
      throw error;
    }
  }

  static clearRolePermissionCache(roleId) {
    permissionCache.clear();
    rolesWithPermissionsCache.clear(); // Also clear roles with permissions cache
  }

  static async getAllRolesWithAllPermissions(page = 1, limit = 50) {
    try {
      // Check cache first
      const cacheKey = `roles_permissions_${page}_${limit}`;
      const cached = rolesWithPermissionsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < ROLES_CACHE_TTL) {
        return cached.data;
      }

      const offset = (page - 1) * limit;

      // Fetch roles with pagination
      const { data: roles, error: rolesError, count } = await supabase
        .from('roles')
        .select('*', { count: 'exact' })
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      if (rolesError) {
        throw new Error(`Database error: ${rolesError.message}`);
      }

      if (!roles || roles.length === 0) {
        return [];
      }

      // Get role IDs for efficient querying
      const roleIds = roles.map(r => r.id);

      // Fetch all role_permissions for these roles in a single optimized query
      const { data: allRolePermissions, error: allRpError } = await supabase
        .from('role_permissions')
        .select(`
          id,
          role_id,
          allowed,
          permissions (
            id,
            module,
            action,
            display_name,
            description
          )
        `)
        .in('role_id', roleIds);

      if (allRpError) {
        throw new Error(`Database error: ${allRpError.message}`);
      }

      // Use Map for O(1) lookups - pre-initialize for all roles
      const permissionsByRole = new Map();
      roles.forEach(role => {
        permissionsByRole.set(role.id, []);
      });

      // Process permissions in single pass - calculate counts during processing
      if (allRolePermissions && allRolePermissions.length > 0) {
        for (const rp of allRolePermissions) {
          if (rp.permissions && rp.role_id) {
            const rolePermissions = permissionsByRole.get(rp.role_id);
            if (rolePermissions) {
              rolePermissions.push({
                ...rp.permissions,
                allowed: rp.allowed
              });
            }
          }
        }
      }

      // Build response efficiently - pre-calculate counts to avoid double iteration
      const rolesWithPermissions = new Array(roles.length);
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const permissions = permissionsByRole.get(role.id) || [];
        
        // Calculate counts in single pass
        let allowedCount = 0;
        let deniedCount = 0;
        for (let j = 0; j < permissions.length; j++) {
          if (permissions[j].allowed) {
            allowedCount++;
          } else {
            deniedCount++;
          }
        }
        
        rolesWithPermissions[i] = {
          ...role,
          permissions: permissions,
          totalPermissions: permissions.length,
          allowedPermissions: allowedCount,
          deniedPermissions: deniedCount
        };
      }

      // Cache the result
      rolesWithPermissionsCache.set(cacheKey, {
        data: rolesWithPermissions,
        timestamp: Date.now()
      });

      return rolesWithPermissions;
    } catch (error) {
      throw error;
    }
  }

  static clearRolesWithPermissionsCache() {
    rolesWithPermissionsCache.clear();
  }
}
